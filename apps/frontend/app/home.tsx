// app/home.tsx
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppText } from "@/src/components/common/AppText";
import { TripCard } from "@/src/components/common/TripCard";
import { colors, spacing, radius, typography } from "@/src/theme";
import { fetchMyTrips, type Trip } from "@/src/api/trips";
import Settings from "@/assets/icons/settings.svg";
import ButtonCreate from "@/assets/icons/Button_Create.svg";
import ButtonJoin from "@/assets/icons/Button_Join.svg";

type Tab = "your" | "past";

type TripMemberFromApi = {
  id: string;
  name: string;
  role: "admin" | "member";
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
  status: "planning" | "voting" | "final";
  cardColor: string;
  members: {
    id: string;
    initials: string;
    color: string;
  }[];
};

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

function getUiStatus(state: Trip["state"]): "planning" | "voting" | "final" {
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
  return {
    id: trip.trip_id,
    title: trip.title,
    destination: trip.destination,
    startDate: formatDate(trip.start_date),
    endDate: formatDate(trip.end_date),
    status: getUiStatus(trip.state),
    cardColor: getCardColor(trip.trip_id),
    members: (trip.members ?? []).map(
      (member: TripMemberFromApi, index: number) => ({
        id: member.id,
        initials: getInitials(member.name),
        color: getMemberColor(index),
      })
    ),
  };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("your");
  const [yourTrips, setYourTrips] = useState<TripCardItem[]>([]);
  const [pastTrips, setPastTrips] = useState<TripCardItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadTrips = async () => {
      try {
        if (!user) {
          console.log("No logged-in user in context, skipping trip load");
          setYourTrips([]);
          setPastTrips([]);
          return;
        }

        const userId = user.uid;
        console.log("Loading trips for user");

        const backendTrips = await fetchMyTrips(userId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming: TripCardItem[] = [];
        const past: TripCardItem[] = [];

        (backendTrips as TripWithMembers[]).forEach((trip: TripWithMembers) => {
          const mappedTrip = mapTripToCardTrip(trip);
          const tripEndDate = new Date(trip.end_date);
          tripEndDate.setHours(0, 0, 0, 0);

          if (tripEndDate < today) {
            past.push(mappedTrip);
          } else {
            upcoming.push(mappedTrip);
          }
        });

        setYourTrips(upcoming);
        setPastTrips(past);
      } catch (error) {
        console.error("Error loading trips:", error);
        setYourTrips([]);
        setPastTrips([]);
      }
    };

    loadTrips();
  }, [user]);

  const trips = activeTab === "your" ? yourTrips : pastTrips;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push("/settings")}
          >
            <Settings width={24} height={24} />
            <AppText variant="caption" style={styles.settingsLabel}>
              Settings
            </AppText>
          </Pressable>
        </View>

        {/* Title */}
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

        {/* Action Cards */}
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

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab("your")}
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
            onPress={() => setActiveTab("past")}
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

        {/* Trip Cards or Empty State */}
        {trips.length > 0 ? (
          <View style={styles.tripList}>
            {trips.map((trip: TripCardItem) => (
              <TripCard
                key={trip.id}
                title={trip.title}
                destination={trip.destination}
                startDate={trip.startDate}
                endDate={trip.endDate}
                status={trip.status}
                cardColor={trip.cardColor}
                members={trip.members}
                onPress={() => {
                  router.push({
                    pathname: "/itinerary",
                    params: {
                      tripId: trip.id,
                      state: trip.status,
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
  settingsButton: {
    alignItems: "center",
    gap: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  settingsLabel: {
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
});
