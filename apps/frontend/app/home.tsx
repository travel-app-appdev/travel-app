import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppText } from "@/src/components/common/AppText";
import { TripCard } from "@/src/components/common/TripCard";
import { colors, spacing, radius, typography } from "@/src/theme";
import { fetchMyTrips, invalidateMyTripsCache, type Trip } from "@/src/api/trips";
import { useSinglePress } from "@/src/hooks/useSinglePress";
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
  status: "planning" | "voting" | "final";
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

const TRIPS_STALE_TIME_MS = 30_000;
const TRIPS_FOCUS_REFRESH_THROTTLE_MS = 5_000;
let tripsCache: TripsCache | null = null;

let tripsCacheForceNext = false;

export function invalidateTripsCache() {
  tripsCache = null;
  tripsCacheForceNext = true;
  invalidateMyTripsCache();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getCardColor(tripId: string): string {
  const palette = [colors.plantGreen, colors.sunsetOrange, colors.seaBlue];
  let hash = 0;

  for (let i = 0; i < tripId.length; i++) {
    hash = tripId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return palette[Math.abs(hash) % palette.length];
}

function getUiStatus(
  state: Trip["state"],
  memberCount: number
): "planning" | "voting" | "final" {
  if (state === "Voting" && memberCount <= 1) return "final";
  if (state === "Voting") return "voting";
  if (state === "Final") return "final";
  return "planning";
}

function getMemberColor(index: number): string {
  const palette = [
    colors.sunsetOrange,
    colors.plantGreen,
    colors.sunsetPink,
    colors.seaBlue,
  ];
  return palette[index % palette.length];
}

function mapTripToCardTrip(trip: TripWithMembers): TripCardItem {
  const members = (trip.members ?? []).map(
    (member: TripMemberFromApi, index: number) => ({
      id: member.id,
      name: member.name,
      planning_done: member.planning_done,
      voting_done: member.voting_done,
      initials: getInitials(member.name),
      color: getMemberColor(index),
    })
  );

  return {
    id: trip.trip_id,
    title: trip.title,
    destination: trip.destination,
    startDate: formatDate(trip.start_date),
    endDate: formatDate(trip.end_date),
    rawStartDate: trip.start_date,
    rawEndDate: trip.end_date,
    status: getUiStatus(trip.state, members.length),
    cardColor: getCardColor(trip.trip_id),
    role: trip.role === "admin" ? "admin" : "member",
    inviteCode: trip.invite_code ?? "",
    members,
    planningStartedAt: trip.planning_started_at,
    planningEndAt: trip.planning_end_at,
    votingEndAt: trip.voting_end_at,
    rawState: trip.state,
  };
}

function mapTripsToLists(backendTrips: TripWithMembers[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming: TripCardItem[] = [];
  const past: TripCardItem[] = [];

  backendTrips.forEach((trip) => {
    const mappedTrip = mapTripToCardTrip(trip);
    const tripEndDate = new Date(trip.end_date);
    tripEndDate.setHours(0, 0, 0, 0);

    if (tripEndDate < today) {
      past.push(mappedTrip);
    } else {
      upcoming.push(mappedTrip);
    }
  });

  return { upcoming, past };
}

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
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

  const [activeTab, setActiveTab] = useState<Tab>("your");
  const [yourTrips, setYourTrips] = useState<TripCardItem[]>(
    tripsCache?.yourTrips ?? []
  );
  const [pastTrips, setPastTrips] = useState<TripCardItem[]>(
    tripsCache?.pastTrips ?? []
  );
  const [isLoading, setIsLoading] = useState(!tripsCache);

  const lastFetchRef = useRef<number>(tripsCache?.fetchedAt ?? 0);
  const latestUserIdRef = useRef<string | null>(user?.uid ?? null);

  useEffect(() => {
    const newUserId = user?.uid ?? null;
    latestUserIdRef.current = newUserId;

    if (!newUserId) {
      setYourTrips([]);
      setPastTrips([]);
      setIsLoading(false);
      tripsCache = null;
      lastFetchRef.current = 0;
      return;
    }

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
    async (force = false) => {
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

      setIsLoading(true);

      try {
        const backendTrips = (await fetchMyTrips(userId, { forceRefresh: true })) as TripWithMembers[];

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
      const shouldRefresh = shouldForce || timeSinceLastFetch > TRIPS_FOCUS_REFRESH_THROTTLE_MS;
      if (shouldRefresh) {
        invalidateMyTripsCache(userId);
        void loadTrips(true);
      }
    }, [loadTrips, user?.uid])
  );

  const trips = activeTab === "your" ? yourTrips : pastTrips;

  const handleProfile = useSinglePress(() => router.push("/profile"));
  const handleYourTab = useSinglePress(() => setActiveTab("your"));
  const handlePastTab = useSinglePress(() => setActiveTab("past"));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
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
              where is the{" "}
            </AppText>

            <View>
              <AppText variant="body" style={styles.subtitleBold}>
                squad going?
              </AppText>
              <View style={styles.squadUnderline} />
            </View>
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
            accessibilityRole="button"
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
            accessibilityRole="button"
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
          <View style={styles.tripList}>
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
                onPress={() => {
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
                  } else {
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
                  }
                }}
                onStatusPress={(status) => {
                  router.push({
                    pathname: "/itinerary",
                    params: {
                      tripId: trip.id,
                      state: status,
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
                }}
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