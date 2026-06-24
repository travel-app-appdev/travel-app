import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppText } from "@/src/components/common/AppText";
import { TripCard } from "@/src/components/common/TripCard";
import { colors, spacing, radius, typography } from "@/src/theme";
import {
  fetchMyTrips,
  invalidateMyTripsCache,
  removeTripFromCache,
  type Trip,
} from "@/src/api/trips";
import { useSinglePress } from "@/src/hooks/useSinglePress";
import {
  useHomeTripMembershipListeners,
  type HomeTripDocumentData,
} from "@/src/hooks/useHomeTripMembershipListeners";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";
import {
  getEffectiveTripState,
  isPastTripByEndDate,
  parseLocalTripDate,
} from "@/src/utils/tripState";
import {
  getMemberInitials,
  getTripCardMemberColor,
} from "@/src/utils/tripMembers";
import Profile from "@/assets/icons/profile.svg";
import ButtonCreate from "@/assets/icons/Button_Create.svg";
import ButtonJoin from "@/assets/icons/Button_Join.svg";

type Tab = "your" | "past";

type TripMemberFromApi = {
  id: string;
  name: string;
  role: "admin" | "member";
  planning_done?: boolean;
  voting_done?: boolean;
};

type TripWithMembers = Trip & {
  members?: TripMemberFromApi[];
};

type TripCardItem = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  rawStartDate: string;
  rawEndDate: string;
  status: "planning" | "voting" | "final" | "memories";
  cardColor: string;
  role: "admin" | "member";
  inviteCode: string;
  members: {
    id: string;
    initials: string;
    color: string;
    name: string;
    planning_done?: boolean;
    voting_done?: boolean;
  }[];
  planningStartedAt?: string;
  planningEndAt?: string;
  votingEndAt?: string;
  rawState: Trip["state"];
};

type TripsCache = {
  userId: string;
  yourTrips: TripCardItem[];
  pastTrips: TripCardItem[];
  fetchedAt: number;
};

const TRIPS_STALE_TIME_MS = 60_000;
const TRIPS_FOCUS_REFRESH_THROTTLE_MS = 60_000;
let tripsCache: TripsCache | null = null;

let tripsCacheForceNext = false;

// Remembers which tab the user was last viewing so that remounting Home (e.g.
// after deleting or leaving a trip, which does router.replace("/home"), or
// after backing out of a trip overview) restores that tab instead of always
// snapping back to "Your Trips". Keyed to the user id so it resets to "your"
// when the user changes.
let persistedHomeTab: Tab = "your";
let persistedHomeTabUserId: string | null = null;

function getPersistedHomeTab(userId: string | null): Tab {
  if (userId && persistedHomeTabUserId === userId) {
    return persistedHomeTab;
  }
  return "your";
}

function persistHomeTab(userId: string | null, tab: Tab) {
  if (!userId) {
    persistedHomeTab = "your";
    persistedHomeTabUserId = null;
    return;
  }

  persistedHomeTab = tab;
  persistedHomeTabUserId = userId;
}

export function invalidateTripsCache() {
  tripsCache = null;
  tripsCacheForceNext = true;
  invalidateMyTripsCache();
}

function formatDate(dateString: string): string {
  const date = parseLocalTripDate(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getCardColor(tripId: string): string {
  const palette = [colors.plantGreen, colors.sunsetOrange];
  let hash = 0;

  for (let i = 0; i < tripId.length; i++) {
    hash = tripId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return palette[Math.abs(hash) % palette.length];
}

function getUiStatus(
  state: Trip["state"],
  memberCount: number,
  isPast: boolean
): "planning" | "voting" | "final" | "memories" {
  if (isPast) return "memories";
  if (state === "Memories") return "final";
  if (state === "Voting" && memberCount <= 1) return "final";
  if (state === "Voting") return "voting";
  if (state === "Final") return "final";
  return "planning";
}

function mapTripToCardTrip(
  trip: TripWithMembers,
  today = new Date()
): TripCardItem {
  const members = (trip.members ?? []).map(
    (member: TripMemberFromApi, index: number) => ({
      id: member.id,
      name: member.name,
      planning_done: member.planning_done,
      voting_done: member.voting_done,
      initials: getMemberInitials(member.name),
      color: getTripCardMemberColor(index),
    })
  );
  const effectiveState = getEffectiveTripState(trip, today);
  const isPast = isPastTripByEndDate(trip.end_date, today);

  return {
    id: trip.trip_id,
    title: trip.title,
    destination: trip.destination,
    startDate: formatDate(trip.start_date),
    endDate: formatDate(trip.end_date),
    rawStartDate: trip.start_date,
    rawEndDate: trip.end_date,
    status: getUiStatus(effectiveState, members.length, isPast),
    cardColor: getCardColor(trip.trip_id),
    role: trip.role === "admin" ? "admin" : "member",
    inviteCode: trip.invite_code ?? "",
    members,
    planningStartedAt: trip.planning_started_at,
    planningEndAt: trip.planning_end_at,
    votingEndAt: trip.voting_end_at,
    rawState: effectiveState,
  };
}

function compareUpcomingTrips(a: TripCardItem, b: TripCardItem): number {
  const startDiff =
    parseLocalTripDate(a.rawStartDate).getTime() -
    parseLocalTripDate(b.rawStartDate).getTime();

  if (startDiff !== 0) return startDiff;

  return (
    parseLocalTripDate(a.rawEndDate).getTime() -
    parseLocalTripDate(b.rawEndDate).getTime()
  );
}

function comparePastTrips(a: TripCardItem, b: TripCardItem): number {
  const endDiff =
    parseLocalTripDate(b.rawEndDate).getTime() -
    parseLocalTripDate(a.rawEndDate).getTime();

  if (endDiff !== 0) return endDiff;

  return (
    parseLocalTripDate(b.rawStartDate).getTime() -
    parseLocalTripDate(a.rawStartDate).getTime()
  );
}

function mapTripsToLists(backendTrips: TripWithMembers[]) {
  const today = new Date();

  const upcoming: TripCardItem[] = [];
  const past: TripCardItem[] = [];

  backendTrips.forEach((trip) => {
    const mappedTrip = mapTripToCardTrip(trip, today);

    if (isPastTripByEndDate(trip.end_date, today)) {
      past.push(mappedTrip);
    } else {
      upcoming.push(mappedTrip);
    }
  });

  upcoming.sort(compareUpcomingTrips);
  past.sort(comparePastTrips);

  return { upcoming, past };
}

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setIsReduceMotionEnabled
    );

    AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => {
      if (isMounted) setIsReduceMotionEnabled(isEnabled);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isReduceMotionEnabled) {
      shimmer.setValue(0.55);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isReduceMotionEnabled, shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <Animated.View
      style={[styles.skeletonCard, { opacity }]}
      {...hiddenFromAccessibility}
    >
      <View style={styles.skeletonTitleRow}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonBadge} />
      </View>

      <View style={styles.skeletonMiddleRow}>
        <View style={styles.skeletonDestination} />
        <View style={styles.skeletonDate} />
      </View>

      <View style={styles.skeletonBottomRow}>
        <View style={styles.skeletonAvatars}>
          <View style={styles.skeletonAvatar} />
          <View style={[styles.skeletonAvatar, { marginLeft: -10 }]} />
          <View style={[styles.skeletonAvatar, { marginLeft: -10 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTabState] = useState<Tab>(() =>
    getPersistedHomeTab(user?.uid ?? null)
  );
  const [yourTrips, setYourTrips] = useState<TripCardItem[]>(
    tripsCache?.yourTrips ?? []
  );
  const [pastTrips, setPastTrips] = useState<TripCardItem[]>(
    tripsCache?.pastTrips ?? []
  );
  const [isLoading, setIsLoading] = useState(!tripsCache);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastFetchRef = useRef<number>(tripsCache?.fetchedAt ?? 0);
  const latestUserIdRef = useRef<string | null>(user?.uid ?? null);

  // Wraps the raw setter so the module-level persisted tab stays in sync and
  // survives remounts of this screen.
  const setActiveTab = useCallback((tab: Tab) => {
    persistHomeTab(latestUserIdRef.current, tab);
    setActiveTabState(tab);
  }, []);

  // NEW: keep latest lists in a ref to avoid stale closures in snapshot listeners
  const listsRef = useRef<{
    yourTrips: TripCardItem[];
    pastTrips: TripCardItem[];
  }>({
    yourTrips: tripsCache?.yourTrips ?? [],
    pastTrips: tripsCache?.pastTrips ?? [],
  });

  useEffect(() => {
    listsRef.current = { yourTrips, pastTrips };
  }, [yourTrips, pastTrips]);

  const removeTripFromLocalLists = useCallback((tripId: string) => {
    const userId = latestUserIdRef.current;
    const removeTrip = (trips: TripCardItem[]) =>
      trips.filter((trip) => trip.id !== tripId);

    if (userId) {
      removeTripFromCache(userId, tripId);
    }

    setYourTrips((current) => removeTrip(current));
    setPastTrips((current) => removeTrip(current));

    if (tripsCache && (!userId || tripsCache.userId === userId)) {
      tripsCache = {
        ...tripsCache,
        yourTrips: removeTrip(tripsCache.yourTrips),
        pastTrips: removeTrip(tripsCache.pastTrips),
      };
    }
  }, []);

  // NEW: helper to patch a single trip in lists and cache
  const patchTripInLocalLists = useCallback(
    (tripId: string, patch: Partial<TripCardItem>) => {
      const patchTrips = (trips: TripCardItem[]) =>
        trips.map((trip) =>
          trip.id === tripId ? { ...trip, ...patch } : trip
        );

      setYourTrips((current) => patchTrips(current));
      setPastTrips((current) => patchTrips(current));

      if (tripsCache) {
        tripsCache = {
          ...tripsCache,
          yourTrips: patchTrips(tripsCache.yourTrips),
          pastTrips: patchTrips(tripsCache.pastTrips),
        };
      }
    },
    []
  );

  useEffect(() => {
    const newUserId = user?.uid ?? null;
    latestUserIdRef.current = newUserId;

    if (!newUserId) {
      setYourTrips([]);
      setPastTrips([]);
      setIsLoading(false);
      tripsCache = null;
      lastFetchRef.current = 0;
      persistHomeTab(null, "your");
      setActiveTabState("your");
      return;
    }

    // Restore this user's persisted tab (resets to "your" if the user changed).
    setActiveTabState(getPersistedHomeTab(newUserId));

    if (!tripsCache || tripsCache.userId !== newUserId) {
      setYourTrips([]);
      setPastTrips([]);
      setIsLoading(true);
      lastFetchRef.current = 0;
      return;
    }

    setYourTrips(tripsCache.yourTrips);
    setPastTrips(tripsCache.pastTrips);
    setIsLoading(false);
    lastFetchRef.current = tripsCache.fetchedAt;
  }, [user?.uid]);

  const loadTrips = useCallback(
    async (force = false, showLoading = true) => {
      const userId = user?.uid ?? null;

      if (!userId) {
        setYourTrips([]);
        setPastTrips([]);
        setIsLoading(false);
        tripsCache = null;
        lastFetchRef.current = 0;
        return;
      }

      const now = Date.now();
      const cachedTrips = tripsCache;

      const hasFreshCache =
        !force &&
        cachedTrips !== null &&
        cachedTrips.userId === userId &&
        now - cachedTrips.fetchedAt < TRIPS_STALE_TIME_MS;

      if (hasFreshCache) {
        setYourTrips(cachedTrips.yourTrips);
        setPastTrips(cachedTrips.pastTrips);
        setIsLoading(false);
        lastFetchRef.current = cachedTrips.fetchedAt;
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const backendTrips = (await fetchMyTrips(userId, {
          forceRefresh: force,
        })) as TripWithMembers[];

        if (latestUserIdRef.current !== userId) {
          return;
        }

        const { upcoming, past } = mapTripsToLists(backendTrips);
        const fetchedAt = Date.now();

        tripsCache = {
          userId,
          yourTrips: upcoming,
          pastTrips: past,
          fetchedAt,
        };

        lastFetchRef.current = fetchedAt;
        setYourTrips(upcoming);
        setPastTrips(past);
      } catch (error) {
        console.error("Error loading trips:", error);

        if (latestUserIdRef.current === userId) {
          setYourTrips([]);
          setPastTrips([]);
        }
      } finally {
        if (latestUserIdRef.current === userId) {
          setIsLoading(false);
        }
      }
    },
    [user?.uid]
  );

  useFocusEffect(
    useCallback(() => {
      const userId = user?.uid ?? null;
      latestUserIdRef.current = userId;

      if (!userId) {
        setYourTrips([]);
        setPastTrips([]);
        setIsLoading(false);
        return;
      }

      if (tripsCache && tripsCache.userId === userId) {
        setYourTrips(tripsCache.yourTrips);
        setPastTrips(tripsCache.pastTrips);
        setIsLoading(false);
      } else {
        setYourTrips([]);
        setPastTrips([]);
        setIsLoading(true);
      }

      const shouldForce = tripsCacheForceNext;
      tripsCacheForceNext = false;
      if (shouldForce) {
        lastFetchRef.current = 0;
      }
      const timeSinceLastFetch = Date.now() - lastFetchRef.current;
      const shouldRefresh =
        shouldForce || timeSinceLastFetch > TRIPS_FOCUS_REFRESH_THROTTLE_MS;
      if (shouldRefresh) {
        invalidateMyTripsCache(userId);
        void loadTrips(true);
      }
    }, [loadTrips, user?.uid])
  );

  const handleHomeTripChanged = useCallback(
    (tripId: string, data: HomeTripDocumentData) => {
      const tripData = data as Partial<TripWithMembers>;
      const nextState = (tripData.state as Trip["state"]) ?? "Planning";

      const existingTrip =
        listsRef.current.yourTrips.find((t) => t.id === tripId) ??
        listsRef.current.pastTrips.find((t) => t.id === tripId);

      const memberCount = existingTrip?.members.length ?? 0;

      const rawEndDate = existingTrip?.rawEndDate ?? "";
      const effectiveState = rawEndDate
        ? getEffectiveTripState({
            state: nextState,
            end_date: rawEndDate,
          })
        : nextState;
      const isPast = rawEndDate ? isPastTripByEndDate(rawEndDate) : false;

      patchTripInLocalLists(tripId, {
        rawState: effectiveState,
        status: getUiStatus(effectiveState, memberCount, isPast),
        planningStartedAt: tripData.planning_started_at,
        planningEndAt: tripData.planning_end_at,
        votingEndAt: tripData.voting_end_at,
      });
    },
    [patchTripInLocalLists]
  );

  const handleTripListenerError = useCallback((error: Error) => {
    console.log("Trip listener error:", error);
  }, []);

  const handleMembershipListenerError = useCallback((error: Error) => {
    console.log("Trip membership listener error:", error);
  }, []);

  useHomeTripMembershipListeners({
    userId: user?.uid ?? null,
    onTripRemoved: removeTripFromLocalLists,
    onTripChanged: handleHomeTripChanged,
    onTripListenerError: handleTripListenerError,
    onMembershipListenerError: handleMembershipListenerError,
  });

  const trips = activeTab === "your" ? yourTrips : pastTrips;

  const handleProfile = useSinglePress(() => router.push("/profile"));
  const handleYourTab = useSinglePress(() => {
    setActiveTab("your");
  });
  const handlePastTab = useSinglePress(() => {
    setActiveTab("past");
  });
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isLoading) return;

    setIsRefreshing(true);
    try {
      await loadTrips(true, false);
    } finally {
      setIsRefreshing(false);
    }
  }, [isLoading, isRefreshing, loadTrips]);

  const handleTripPress = useCallback(
    (trip: TripCardItem) => {
      if (trip.role === "admin") {
        router.push({
          pathname: "/trip-overview-admin",
          params: {
            tripId: trip.id,
            title: trip.title,
            destination: trip.destination,
            startDate: trip.rawStartDate,
            endDate: trip.rawEndDate,
            members: JSON.stringify(trip.members),
            inviteCode: trip.inviteCode,
            state: trip.rawState,
            planningStartedAt: trip.planningStartedAt ?? "",
            planningEndAt: trip.planningEndAt ?? "",
            votingEndAt: trip.votingEndAt ?? "",
          },
        });
        return;
      }

      router.push({
        pathname: "/trip-overview-member",
        params: {
          tripId: trip.id,
          title: trip.title,
          destination: trip.destination,
          startDate: trip.rawStartDate,
          endDate: trip.rawEndDate,
          members: JSON.stringify(trip.members),
          inviteCode: trip.inviteCode,
          state: trip.rawState,
          planningStartedAt: trip.planningStartedAt ?? "",
          planningEndAt: trip.planningEndAt ?? "",
          votingEndAt: trip.votingEndAt ?? "",
        },
      });
    },
    [router]
  );

  const handleTripStatusPress = useCallback(
    (trip: TripCardItem, status: TripCardItem["status"]) => {
      router.push({
        pathname: "/itinerary",
        params: {
          tripId: trip.id,
          state: status === "memories" ? "memories" : status,
          title: trip.title,
          destination: trip.destination,
          startDate: trip.rawStartDate,
          endDate: trip.rawEndDate,
          members: JSON.stringify(trip.members),
          planningEndAt: trip.planningEndAt ?? "",
          votingEndAt: trip.votingEndAt ?? "",
          role: trip.role,
        },
      });
    },
    [router]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.nightBlack}
            colors={[colors.nightBlack]}
          />
        }
      >
        <View style={styles.headerRow}>
          <Pressable
            style={styles.profileButton}
            onPress={handleProfile}
            accessibilityRole="button"
            accessibilityLabel="Go to profile"
            accessibilityHint="Opens your profile screen"
          >
            <Profile width={24} height={24} />
            <AppText variant="caption" style={styles.profileLabel}>
              Profile
            </AppText>
          </Pressable>
        </View>

        <View style={styles.titleBlock}>
          <AppText variant="title" style={styles.helloText}>
            Helloooo
          </AppText>

          <View style={styles.subtitleRow}>
            <AppText variant="body" style={styles.subtitle}>
              where is the squad going?
            </AppText>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Link href="/create-trip" asChild>
            <Pressable
              style={styles.actionCard}
              accessibilityRole="button"
              accessibilityLabel="Create trip"
              accessibilityHint="Opens the create trip screen"
            >
              <ButtonCreate width={140} height={140} />
              <View>
                <AppText variant="body" style={styles.actionLabel}>
                  Create trip
                </AppText>
              </View>
            </Pressable>
          </Link>

          <Link href="/join-trip" asChild>
            <Pressable
              style={styles.actionCard}
              accessibilityRole="button"
              accessibilityLabel="Join trip"
              accessibilityHint="Opens the join trip screen"
            >
              <ButtonJoin width={140} height={140} />
              <View>
                <AppText variant="body" style={styles.actionLabel}>
                  Join trip
                </AppText>
              </View>
            </Pressable>
          </Link>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            onPress={handleYourTab}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityLabel="Show your trips"
            accessibilityState={{ selected: activeTab === "your" }}
          >
            <View>
              <AppText
                variant="body"
                style={[
                  styles.tabText,
                  activeTab === "your" && styles.tabTextActive,
                ]}
              >
                Your Trips
              </AppText>
              {activeTab === "your" && <View style={styles.tabUnderline} />}
            </View>
          </Pressable>

          <Pressable
            onPress={handlePastTab}
            style={styles.tabItem}
            accessibilityRole="tab"
            accessibilityLabel="Show past trips"
            accessibilityState={{ selected: activeTab === "past" }}
          >
            <View>
              <AppText
                variant="body"
                style={[
                  styles.tabText,
                  activeTab === "past" && styles.tabTextActive,
                ]}
              >
                Past Trips
              </AppText>
              {activeTab === "past" && <View style={styles.tabUnderline} />}
            </View>
          </Pressable>
        </View>

        {isLoading ? (
          <View
            style={styles.tripList}
            accessible={true}
            accessibilityLiveRegion="polite"
            accessibilityLabel="Loading trips"
            accessibilityState={{ busy: true }}
          >
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : trips.length > 0 ? (
          <View style={styles.tripList}>
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                tripId={trip.id}
                title={trip.title}
                destination={trip.destination}
                startDate={trip.startDate}
                endDate={trip.endDate}
                status={trip.status}
                cardColor={trip.cardColor}
                members={trip.members}
                role={trip.role}
                onPress={() => handleTripPress(trip)}
                onStatusPress={(status) => handleTripStatusPress(trip, status)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <AppText variant="caption" style={styles.emptyText}>
              {activeTab === "your"
                ? "No upcoming trips yet. Create or join one!"
                : "No past trips yet. Your memories will live here."}
            </AppText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.lightWhite,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  profileButton: {
    alignItems: "center",
    gap: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  profileLabel: {
    color: colors.textPrimary,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
  },
  titleBlock: {
    alignItems: "center",
    gap: spacing.xs,
  },
  helloText: {
    fontSize: typography.size.displayMd,
    lineHeight: typography.lineHeight.displayMd,
    color: colors.sunsetOrange,
    textAlign: "center",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.body,
  },
  subtitleBold: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.textPrimary,
  },
  squadUnderline: {
    height: 4,
    backgroundColor: colors.neonGreen,
    borderRadius: radius.pill,
    marginTop: -1,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.xl,
  },
  actionCard: {
    alignItems: "center",
    gap: spacing.md,
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    fontFamily: typography.fontFamily.bodyBold,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xl,
    flexWrap: "wrap",
  },
  tabItem: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  tabText: {
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bodyBold,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  tabUnderline: {
    height: 5,
    backgroundColor: colors.beachYellow,
    borderRadius: radius.pill,
    marginTop: -1,
  },
  tripList: {
    gap: spacing.md,
  },
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 260,
    lineHeight: typography.lineHeight.md,
  },
  skeletonCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    minHeight: 148,
    backgroundColor: colors.grayedOut,
  },
  skeletonTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  skeletonTitle: {
    flex: 1,
    height: 20,
    borderRadius: radius.sm,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
    maxWidth: "60%",
  },
  skeletonBadge: {
    width: 64,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  skeletonMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  skeletonDestination: {
    flex: 1,
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.textMuted,
    opacity: 0.3,
    maxWidth: "45%",
  },
  skeletonDate: {
    width: 80,
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.textMuted,
    opacity: 0.3,
  },
  skeletonBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  skeletonAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  skeletonAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.textMuted,
    opacity: 0.35,
    borderWidth: 2,
    borderColor: colors.lightWhite,
  },
});
