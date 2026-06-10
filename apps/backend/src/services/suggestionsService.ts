import admin from "../config/firebase";
import { findTripById, findAcceptedMembersByTripId, setMemberPreferences } from "../repositories/tripsRepository";
import { ActivitySuggestion } from "../types/trip";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Maps preference chip -> Geoapify categories
const PREFERENCE_TO_CATEGORIES: Record<string, string[]> = {
    // Food & Drink
    coffee:     ["catering.cafe", "catering.cafe.coffee_shop", "catering.cafe.coffee"],
    food:       ["catering.restaurant", "catering.food_court"],
    quickbites: ["catering.fast_food", "catering.food_court"],
    desserts:   ["catering.cafe.dessert", "catering.cafe.ice_cream", "catering.cafe.cake"],
    nightlife:  ["catering.bar", "catering.pub", "catering.biergarten"],
    // Explore
    museums:    ["entertainment.museum", "entertainment.culture.gallery"],
    galleries:  ["entertainment.culture.gallery", "commercial.art"],
    viewpoints: ["tourism.attraction.viewpoint", "tourism.attraction"],
    heritage:   ["heritage", "building.historic", "tourism.sights"],
    citywalks:  ["tourism.sights", "tourism.attraction"],
    sightseeing:["tourism.sights", "tourism.attraction"],
    // Outdoors
    nature:     ["leisure.park", "natural", "national_park"],
    parks:      ["leisure.park", "leisure.park.nature_reserve"],
    gardens:    ["leisure.park.garden", "leisure.park"],
    beaches:    ["beach", "beach.beach_resort"],
    camping:    ["camping", "camping.camp_site", "camping.camp_pitch"],
    water:      ["natural.water", "natural.water.hot_spring", "tourism.attraction.viewpoint"],
    // Fun
    culture:    ["entertainment.culture", "tourism.attraction", "heritage"],
    cinema:     ["entertainment.cinema"],
    theatre:    ["entertainment.culture.theatre"],
    amusement:  ["entertainment.theme_park", "entertainment.activity_park", "entertainment.water_park"],
    zoo_aquarium: ["entertainment.zoo", "entertainment.aquarium"],
    bowling:    ["entertainment.bowling_alley"],
    escape_rooms: ["entertainment.escape_game"],
    // Active
    sports:     ["sport", "activity.sport_club"],
    fitness:    ["sport.fitness", "sport.fitness.gym", "sport.fitness.fitness_centre"],
    swimming:   ["sport.swimming_pool"],
    skiing:     ["ski", "rental.ski", "commercial.outdoor_and_sport.ski"],
    cycling:    ["rental.bicycle", "commercial.outdoor_and_sport.bicycle"],
    water_sports: ["commercial.outdoor_and_sport.water_sports", "rental.boat", "sport.dive_centre"],
    spa:        ["leisure.spa", "service.beauty.spa", "service.beauty.massage"],
    // Shopping
    shopping:   ["commercial.shopping_mall", "commercial.department_store"],
    markets:    ["commercial.marketplace"],
    souvenirs:  ["commercial.gift_and_souvenir"],
    books:      ["commercial.books"],
    vintage:    ["commercial.second_hand", "commercial.antiques"],
    // Legacy keys (backwards compat)
    relaxing:   ["leisure.spa", "beach.beach_resort", "leisure.park"],
    adventure:  ["sport", "activity", "natural", "camping"],
    budget:     ["catering.fast_food", "commercial.marketplace", "no_fee"],
};

export async function getActivitySuggestions(
    tripId: string,
    slotType: string,
    offset: number = 0
): Promise<ActivitySuggestion[]> {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) throw { status: 500, message: "Geoapify API key not configured" };

    // 1. Load trip destination
    const trip = await findTripById(tripId);
    if (!trip) throw { status: 404, message: "Trip not found" };

    // 2. Aggregate preferences from all accepted members
    const members = await findAcceptedMembersByTripId(tripId);
    const allPrefs = members.flatMap((m) => (m as any).preferences ?? []);
    const uniquePrefs = [...new Set<string>(allPrefs)];

    // 3. Check cache (only for first page)
    if (offset === 0) {
        const cacheKey = buildCacheKey(tripId, slotType, uniquePrefs);
        const cached = await readCache(cacheKey);
        if (cached) return cached;
    }

    // 4. Geocode destination
    const coords = await geocodeDestination(trip.destination, apiKey);
    if (!coords) {
        console.warn("[suggestions] Could not geocode destination:", trip.destination);
        return [];
    }

    // 5. Build category list
    const categories = uniquePrefs.length > 0
        ? [...new Set(uniquePrefs.flatMap((p) => PREFERENCE_TO_CATEGORIES[p] ?? []))]
        : ["entertainment", "catering.restaurant", "leisure.park"];

    if (categories.length === 0) {
        categories.push("entertainment", "catering.restaurant");
    }

    // 6. Fetch places from Geoapify
    const suggestions = await fetchPlaces(coords, categories, uniquePrefs, apiKey, offset);

    // 7. Cache first-page results only
    if (offset === 0) {
        const cacheKey = buildCacheKey(tripId, slotType, uniquePrefs);
        await writeCache(cacheKey, tripId, suggestions);
    }

    return suggestions;
}

export async function saveMemberPreferences(
    tripId: string,
    userId: string,
    preferences: string[]
): Promise<void> {
    await setMemberPreferences(tripId, userId, preferences);

    // Invalidate existing suggestion cache for this trip
    await invalidateTripSuggestionsCache(tripId);
}

// Helpers

function buildCacheKey(tripId: string, slotType: string, prefs: string[]): string {
    const sorted = [...prefs].sort().join(",");
    return tripId + "__" + slotType + "__" + sorted;
}

async function readCache(cacheKey: string): Promise<ActivitySuggestion[] | null> {
    const db = admin.firestore();
    const doc = await db.collection("suggestion_cache").doc(cacheKey).get();

    if (!doc.exists) return null;

    const data = doc.data()!;
    const age = Date.now() - (data.cachedAt?.toMillis?.() ?? 0);
    if (age > CACHE_TTL_MS) return null;

    const suggestions = data.suggestions as ActivitySuggestion[];
    return suggestions.length > 0 ? suggestions : null;
}

async function writeCache(cacheKey: string, tripId: string, suggestions: ActivitySuggestion[]): Promise<void> {
    const db = admin.firestore();
    await db.collection("suggestion_cache").doc(cacheKey).set({
        tripId,
        suggestions,
        cachedAt: admin.firestore.Timestamp.now(),
    });
}

export async function invalidateTripSuggestionsCache(tripId: string): Promise<void> {
    const db = admin.firestore();
    const snapshot = await db
        .collection("suggestion_cache")
        .where("tripId", "==", tripId)
        .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
}

async function geocodeDestination(
    destination: string,
    apiKey: string
): Promise<{ lat: number; lon: number } | null> {
    const url = "https://api.geoapify.com/v1/geocode/search?text=" + encodeURIComponent(destination) + "&limit=1&apiKey=" + apiKey;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json() as any;
    const feature = json?.features?.[0];
    if (!feature) return null;

    const [lon, lat] = feature.geometry.coordinates;
    return { lat, lon };
}

async function fetchPlaces(
    coords: { lat: number; lon: number },
    categories: string[],
    matchedPrefs: string[],
    apiKey: string,
    offset: number = 0
): Promise<ActivitySuggestion[]> {
    const categoryParam = categories.slice(0, 8).join(",");
    const radius = 5000; // 5km radius
    const limit = 10;
    const url = "https://api.geoapify.com/v2/places?categories=" + encodeURIComponent(categoryParam) + "&filter=circle:" + coords.lon + "," + coords.lat + "," + radius + "&limit=" + limit + "&offset=" + offset + "&apiKey=" + apiKey;

    const res = await fetch(url);
    if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        console.warn("[suggestions] Geoapify places request failed:", res.status, errorText);
        return [];
    }

    const json = await res.json() as any;
    const features: any[] = json?.features ?? [];

    return features.map((f): ActivitySuggestion => {
        const props = f.properties ?? {};
        const [lon, lat] = f.geometry?.coordinates ?? [0, 0];
        const name = props.name ?? props.address_line1 ?? "Unknown place";
        const address = props.formatted ?? props.address_line2;
        const placeCategories = Array.isArray(props.categories)
            ? props.categories.filter((category: unknown): category is string => typeof category === "string")
            : [];
        const placeMatchedPrefs = matchedPrefs.filter((pref) =>
            categoryMatchesPreference(placeCategories, pref)
        );

        return {
            name,
            address,
            googleMapsUrl: buildGoogleMapsUrl(name, address),
            latitude: lat,
            longitude: lon,
            source: "geoapify",
            sourcePlaceId: props.place_id ?? "",
            matchedPreferences: placeMatchedPrefs,
            categories: placeCategories,
        };
    });
}

function categoryMatchesPreference(placeCategories: string[], preference: string): boolean {
    const preferenceCategories = PREFERENCE_TO_CATEGORIES[preference] ?? [];
    return preferenceCategories.some((preferenceCategory) =>
        placeCategories.some((placeCategory) =>
            placeCategory === preferenceCategory ||
            placeCategory.startsWith(preferenceCategory + ".") ||
            preferenceCategory.startsWith(placeCategory + ".")
        )
    );
}

function buildGoogleMapsUrl(name: string, address?: string): string {
    const query = encodeURIComponent(name + (address ? ", " + address : ""));
    return "https://www.google.com/maps/search/?api=1&query=" + query;
}
