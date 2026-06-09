import admin from "../config/firebase";
import { findTripById, findAcceptedMembersByTripId, setMemberPreferences } from "../repositories/tripsRepository";
import { ActivitySuggestion } from "../types/trip";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Maps preference chip -> Geoapify categories
const PREFERENCE_TO_CATEGORIES: Record<string, string[]> = {
    // Food & Drink
    coffee:     ["catering.cafe", "catering.cafe.coffee_shop"],
    food:       ["catering.restaurant", "catering.fast_food", "catering.food_court"],
    nightlife:  ["catering.bar", "catering.pub", "catering.biergarten"],
    // Explore
    museums:    ["entertainment.museum", "entertainment.culture.gallery"],
    nature:     ["leisure.park", "natural", "national_park"],
    citywalks:  ["tourism.sights", "tourism.attraction"],
    shopping:   ["commercial.shopping_mall", "commercial.marketplace", "commercial.gift_and_souvenir"],
    // Activities
    culture:    ["entertainment.culture", "tourism.attraction", "heritage"],
    sports:     ["sport", "activity.sport_club"],
    sightseeing:["tourism.sights", "tourism.attraction"],
    // Legacy keys (backwards compat)
    relaxing:   ["leisure.spa", "beach.beach_resort", "leisure.park"],
    adventure:  ["sport", "activity", "natural", "camping"],
    budget:     ["catering.fast_food", "commercial.marketplace", "no_fee"],
};

export async function getActivitySuggestions(
    tripId: string,
    slotType: string
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

    // 3. Check cache
    const cacheKey = buildCacheKey(tripId, slotType, uniquePrefs);
    const cached = await readCache(cacheKey);
    if (cached) return cached;

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
    const suggestions = await fetchPlaces(coords, categories, uniquePrefs, apiKey);

    // 7. Cache and return
    await writeCache(cacheKey, tripId, suggestions);
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

async function invalidateTripSuggestionsCache(tripId: string): Promise<void> {
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
    apiKey: string
): Promise<ActivitySuggestion[]> {
    const categoryParam = categories.slice(0, 8).join(",");
    const radius = 5000; // 5km radius
    const url = "https://api.geoapify.com/v2/places?categories=" + encodeURIComponent(categoryParam) + "&filter=circle:" + coords.lon + "," + coords.lat + "," + radius + "&limit=5&apiKey=" + apiKey;

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

        return {
            name,
            address,
            googleMapsUrl: buildGoogleMapsUrl(name, address),
            latitude: lat,
            longitude: lon,
            source: "geoapify",
            sourcePlaceId: props.place_id ?? "",
            matchedPreferences: matchedPrefs,
        };
    });
}

function buildGoogleMapsUrl(name: string, address?: string): string {
    const query = encodeURIComponent(name + (address ? ", " + address : ""));
    return "https://www.google.com/maps/search/?api=1&query=" + query;
}
