import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/src/components/common/AppText";
import { colors, spacing, radius, typography } from "@/src/theme";
import Back from "@/assets/icons/back.svg";
import Settings from "@/assets/icons/settings.svg";
import Profile from "@/assets/icons/profile.svg";
import ArrowRight from "@/assets/icons/arrow_right.svg";

type CreatedTab = "created" | "createdArchive";
type JoinedTab = "joined" | "joinedArchive";

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

function getCardColor(tripId: string): string {
  const palette = [colors.plantGreen, colors.sunsetOrange, colors.seaBlue];

  let hash = 0;
  for (let i = 0; i < tripId.length; i++) {
    hash = tripId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return palette[Math.abs(hash) % palette.length];
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

export default function SettingsScreen() {
  const { user } = useAuth();
  const [createdTab, setCreatedTab] = useState<CreatedTab>("created");
  const [joinedTab, setJoinedTab] = useState<JoinedTab>("joined");

  const [createdActive, setCreatedActive] = useState<TripCardItem[]>([]);
  const [createdArchive, setCreatedArchive] = useState<TripCardItem[]>([]);
  const [joinedActive, setJoinedActive] = useState<TripCardItem[]>([]);
  const [joinedArchive, setJoinedArchive] = useState<TripCardItem[]>([]);

  useEffect(() => {
    const loadTrips = async () => {
      try {
        if (!user) {
          setCreatedActive([]);
          setCreatedArchive([]);
          setJoinedActive([]);
          setJoinedArchive([]);
          return;
        }

        const backendTrips = await fetchMyTrips(user.uid);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const createdActiveTmp: TripCardItem[] = [];
        const createdArchiveTmp: TripCardItem[] = [];
        const joinedActiveTmp: TripCardItem[] = [];
        const joinedArchiveTmp: TripCardItem[] = [];

        (backendTrips as TripWithMembers[]).forEach((trip) => {
          const mapped = mapTripToCardTrip(trip);
          const end = new Date(trip.end_date);
          end.setHours(0, 0, 0, 0);

          const isPast = end < today;
          const isAdmin = trip.role === "admin";

          if (isAdmin) {
            if (isPast) createdArchiveTmp.push(mapped);
            else createdActiveTmp.push(mapped);
          } else {
            if (isPast) joinedArchiveTmp.push(mapped);
            else joinedActiveTmp.push(mapped);
          }
        });

        setCreatedActive(createdActiveTmp);
        setCreatedArchive(createdArchiveTmp);
        setJoinedActive(joinedActiveTmp);
        setJoinedArchive(joinedArchiveTmp);
      } catch (error) {
        console.error("Error loading trips for settings:", error);
        setCreatedActive([]);
        setCreatedArchive([]);
        setJoinedActive([]);
        setJoinedArchive([]);
      }
    };

    loadTrips();
  }, [user]);

  const visibleCreated =
      createdTab === "created" ? createdActive : createdArchive;
  const visibleJoined =
      joinedTab === "joined" ? joinedActive : joinedArchive;

  return (
      <View style={styles.fullScreen}>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.container}
              showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Link href="/home" style={styles.backLink}>
                <Back width={20} height={20} />
              </Link>
              <View style={styles.headerTitle}>
                <Settings width={20} height={20} />
                <AppText variant="body" style={styles.headerLabel}>
                  Settings
                </AppText>
              </View>
            </View>

            {/* Profile Card */}
            <Link href="/profile" asChild>
              <Pressable style={styles.profileCard}>
                <View style={styles.profileLeft}>
                  <View style={styles.profileIconWrapper}>
                    <Profile width={32} height={32} />
                  </View>
                  <View style={styles.profileInfo}>
                    <AppText variant="body" style={styles.profileName}>
                      {/* TODO: replace with real user name from auth */}
                      Sophie Trudl
                    </AppText>
                    <AppText variant="caption" style={styles.profileEdit}>
                      Edit profile
                    </AppText>
                  </View>
                </View>
                <ArrowRight width={20} height={20} />
              </Pressable>
            </Link>

            {/* Trips you created */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Pressable
                    onPress={() => setCreatedTab("created")}
                    style={styles.tabItem}
                >
                  <AppText
                      variant="body"
                      style={[
                        styles.sectionTitle,
                        createdTab !== "created" && styles.sectionTitleMuted,
                      ]}
                  >
                    Trips you created

                  </AppText>
                  {createdTab === "created" && (
                      <View style={styles.tabUnderline} />
                  )}
                </Pressable>

                <Pressable
                    onPress={() => setCreatedTab("createdArchive")}
                    style={styles.tabItem}
                >
                  <AppText
                      variant="caption"
                      style={[
                        styles.archiveLabel,
                        createdTab === "createdArchive" &&
                        styles.archiveLabelActive,
                      ]}
                  >
                    Archive
                  </AppText>
                  {createdTab === "createdArchive" && (
                      <View style={styles.tabUnderline} />
                  )}
                </Pressable>
              </View>

              {visibleCreated.length > 0 ? (
                  <View style={{ gap: spacing.md }}>
                    {visibleCreated.map((trip) => (
                        <TripCard
                            key={trip.id}
                            title={trip.title}
                            destination={trip.destination}
                            startDate={trip.startDate}
                            endDate={trip.endDate}
                            status={trip.status}
                            cardColor={trip.cardColor}
                            members={trip.members}
                        />
                    ))}
                  </View>
              ) : (
                  <View style={styles.emptySection}>
                    <AppText variant="caption" style={styles.emptyText}>
                      {createdTab === "created"
                          ? "No trips created yet."
                          : "No archived trips."}
                    </AppText>
                  </View>
              )}
            </View>

            {/* Trips you joined */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Pressable
                    onPress={() => setJoinedTab("joined")}
                    style={styles.tabItem}
                >
                  <AppText
                      variant="body"
                      style={[
                        styles.sectionTitle,
                        joinedTab !== "joined" && styles.sectionTitleMuted,
                      ]}
                  >
                    Trips you joined
                  </AppText>
                  {joinedTab === "joined" && (
                      <View style={styles.tabUnderline} />
                  )}
                </Pressable>

              <Pressable
                onPress={() => setJoinedTab("joinedArchive")}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityLabel="Show archived joined trips"
                accessibilityState={{
                  selected: joinedTab === "joinedArchive",
                }}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.archiveLabel,
                    joinedTab === "joinedArchive" && styles.archiveLabelActive,
                  ]}
                >
                  <AppText
                      variant="caption"
                      style={[
                        styles.archiveLabel,
                        joinedTab === "joinedArchive" &&
                        styles.archiveLabelActive,
                      ]}
                  >
                    Archive
                  </AppText>
                  {joinedTab === "joinedArchive" && (
                      <View style={styles.tabUnderline} />
                  )}
                </Pressable>
              </View>

              {visibleJoined.length > 0 ? (
                  <View style={{ gap: spacing.md }}>
                    {visibleJoined.map((trip) => (
                        <TripCard
                            key={trip.id}
                            title={trip.title}
                            destination={trip.destination}
                            startDate={trip.startDate}
                            endDate={trip.endDate}
                            status={trip.status}
                            cardColor={trip.cardColor}
                            members={trip.members}
                        />
                    ))}
                  </View>
              ) : (
                  <View style={styles.emptySection}>
                    <AppText variant="caption" style={styles.emptyText}>
                      {joinedTab === "joined"
                          ? "No trips joined yet."
                          : "No archived trips."}
                    </AppText>
                  </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
  );
}

// keep your existing styles definition below

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.lightWhite,
  },
  safeArea: {
    flex: 1,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backLink: {
    position: "absolute",
    left: 0,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    padding: spacing.xs,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerLabel: {
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.textPrimary,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.sunsetOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: radius.xl,
    elevation: 6,
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  profileIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightWhite,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    gap: spacing.xs,
  },
  profileName: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textPrimary,
  },
  profileEdit: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  tabItem: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textPrimary,
  },
  sectionTitleMuted: {
    color: colors.textMuted,
  },
  archiveLabel: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.bodyBold,
  },
  archiveLabelActive: {
    color: colors.textPrimary,
  },
  tabUnderline: {
    height: 5,
    backgroundColor: colors.beachYellow,
    borderRadius: radius.pill,
    alignSelf: "stretch",
    marginTop: -1,
  },
  emptySection: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
  },
});
