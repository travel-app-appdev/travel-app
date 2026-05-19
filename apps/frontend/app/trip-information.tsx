import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  View,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef, useMemo } from "react";
import { AppText } from "@/src/components/common/AppText";
import {
  ActionCard,
  ACTION_CARD_HEIGHT,
} from "@/src/components/common/ActionCard";
import { BackLink } from "@/src/components/common/BackLink";
import { leaveTrip } from "@/src/api/trips";
import { auth } from "@/src/lib/firebase";
import { invalidateTripsCache } from "./home";
import { colors, spacing, radius, typography } from "@/src/theme";
import InfoIcon from "@/assets/icons/info.svg";
import TripTitle from "@/assets/icons/trip_title.svg";
import Calendar from "@/assets/icons/calendar.svg";
import Location from "@/assets/icons/location.svg";
import AddPeople from "@/assets/icons/add_people.svg";
import Hourglass0 from "@/assets/icons/hourglass_0.svg";
import Hourglass1 from "@/assets/icons/hourglass_1.svg";
import Timepoint from "@/assets/icons/timepoint.svg";
import Exit from "@/assets/icons/exit.svg";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";

const PHASE_TEXT_COLORS: Record<string, string> = {
  planning: colors.nightBlack,
  voting: colors.nightBlack,
  final: colors.nightBlack,
};

type PhaseKey = "planning" | "voting" | "final";

type PhaseDates = Record<
  PhaseKey,
  {
    start: Date;
    end: Date;
    time: string;
  }
>;

type MemberParam = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

function formatDateDisplay(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function formatDateDisplayFromString(dateString: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return formatDateDisplay(date);
}

function calcCalendarDays(start: Date, end: Date): number {
  const startOnly = new Date(start);
  startOnly.setHours(0, 0, 0, 0);

  const endOnly = new Date(end);
  endOnly.setHours(0, 0, 0, 0);

  const ms = endOnly.getTime() - startOnly.getTime();
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}

function calcDaysLeft(end: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOnly = new Date(end);
  endOnly.setHours(0, 0, 0, 0);

  const ms = endOnly.getTime() - today.getTime();
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}

function dayLabel(days: number, active: boolean): string {
  if (active) return days === 1 ? "1 day left" : `${days} days left`;
  return days === 1 ? "1 day" : `${days} days`;
}

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function parseIsoToDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseIsoToTimeString(value?: string): string {
  const parsed = parseIsoToDate(value);
  return parsed ? dateToTimeString(parsed) : "00:00";
}

export default function TripInformationScreen() {
  const raw = useLocalSearchParams<{
    tripId: string;
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    members: string;
    state?: "Planning" | "Voting" | "Final";
    planningStartedAt?: string;
    planningEndAt?: string;
    votingEndAt?: string;
  }>();

  const tripId = String(raw.tripId ?? "");
  const title = String(raw.title ?? "");
  const destination = String(raw.destination ?? "");
  const startDate = String(raw.startDate ?? "");
  const endDate = String(raw.endDate ?? "");
  const membersParam = String(raw.members ?? "");
  const tripState = String(raw.state ?? "Planning");
  const planningStartedAt = String(raw.planningStartedAt ?? "");
  const planningEndAt = String(raw.planningEndAt ?? "");
  const votingEndAt = String(raw.votingEndAt ?? "");

  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;
  const [isLeaving, setIsLeaving] = useState(false);

  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const members: MemberParam[] = useMemo(() => {
    try {
      return membersParam ? JSON.parse(membersParam) : [];
    } catch {
      return [];
    }
  }, [membersParam]);

  const tripStart = useMemo(
    () => (startDate ? new Date(startDate) : new Date()),
    [startDate]
  );

  const tripEnd = useMemo(
    () => (endDate ? new Date(endDate) : new Date()),
    [endDate]
  );

  const phases = [
    {
      id: "planning" as const,
      label: "Planning",
      color: colors.beachYellow,
      active: tripState === "Planning",
    },
    {
      id: "voting" as const,
      label: "Voting",
      color: colors.sunsetPink,
      active: tripState === "Voting",
    },
    {
      id: "final" as const,
      label: "Final",
      color: colors.neonGreen,
      active: tripState === "Final",
    },
  ];

  const phaseDates: PhaseDates = useMemo(() => {
    const planningStartDate = parseIsoToDate(planningStartedAt);
    const planningEndDate = parseIsoToDate(planningEndAt);
    const votingEndDate = parseIsoToDate(votingEndAt);

    const votingStartDate = planningEndDate ?? tripStart;
    const finalDisplayDate = votingEndDate ?? tripEnd;

    return {
      planning: {
        start: planningStartDate ?? tripStart,
        end: planningEndDate ?? tripStart,
        time: parseIsoToTimeString(planningEndAt),
      },
      voting: {
        start: votingStartDate,
        end: votingEndDate ?? tripStart,
        time: parseIsoToTimeString(votingEndAt),
      },
      final: {
        start: finalDisplayDate,
        end: finalDisplayDate,
        time: "00:00",
      },
    };
  }, [planningStartedAt, planningEndAt, votingEndAt, tripStart, tripEnd]);

  const handleLeaveTrip = () => {
    Alert.alert("Leave trip", "Are you sure you want to leave this trip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLeaving(true);
            const currentUser = auth.currentUser;
            if (!currentUser) {
              Alert.alert("Not logged in", "Please log in again.");
              return;
            }
            const idToken = await currentUser.getIdToken();
            await leaveTrip({ idToken, tripId });
            invalidateTripsCache();
            router.replace("/home");
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Failed to leave trip";
            Alert.alert("Leave failed", message);
          } finally {
            setIsLeaving(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.fullScreen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.container,
              {
                paddingBottom:
                  ACTION_CARD_HEIGHT +
                  (isSmallScreen ? spacing.lg : spacing.xxxl),
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <BackLink href="/home" />
              <View style={styles.headerTitle}>
                <InfoIcon width={20} height={20} />
                <AppText variant="body" style={styles.headerLabel}>
                  Trip information
                </AppText>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View
                style={styles.infoLabelRow}
                {...hiddenFromAccessibility}
              >
                <TripTitle width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Trip name
                </AppText>
              </View>
              <AppText variant="caption" style={styles.infoValue}>
                {title || "—"}
              </AppText>
            </View>

            <View style={styles.fieldGroup}>
              <View
                style={styles.infoLabelRow}
                {...hiddenFromAccessibility}
              >
                <Calendar width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Trip date
                </AppText>
              </View>
              <AppText variant="caption" style={styles.infoValue}>
                {formatDateDisplayFromString(startDate)} –{" "}
                {formatDateDisplayFromString(endDate)}
              </AppText>
            </View>

            <View style={styles.fieldGroup}>
              <View
                style={styles.infoLabelRow}
                {...hiddenFromAccessibility}
              >
                <Location width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Destination
                </AppText>
              </View>
              <AppText variant="caption" style={styles.infoValue}>
                {destination || "—"}
              </AppText>
            </View>

            <View style={styles.fieldGroup}>
              <View
                style={styles.infoLabelRow}
                {...hiddenFromAccessibility}
              >
                <AddPeople width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Members
                </AppText>
              </View>
              <AppText variant="caption" style={styles.infoValue}>
                {members.length > 0
                  ? members.map((m) => m.name).join(", ")
                  : "—"}
              </AppText>
            </View>

            {phases.map((phase) => {
              const dates = phaseDates[phase.id];
              const days = phase.active
                ? calcDaysLeft(dates.end)
                : calcCalendarDays(dates.start, dates.end);

              return (
                <View key={phase.id} style={styles.fieldGroup}>
                  <View style={styles.phaseRow}>
                    <View style={styles.phaseLeft}>
                      <View
                        style={[
                          styles.phaseBadge,
                          { backgroundColor: phase.color },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          style={[
                            styles.phaseBadgeText,
                            { color: PHASE_TEXT_COLORS[phase.id] },
                          ]}
                        >
                          {phase.label}
                        </AppText>
                      </View>

                      <View style={styles.phaseTimerBlock}>
                        <View style={styles.hourglassCol}>
                          {phase.active ? (
                            <Hourglass1 width={20} height={20} />
                          ) : (
                            <Hourglass0 width={20} height={20} />
                          )}
                        </View>

                        <View style={styles.phaseTextCol}>
                          <View style={styles.daysRow}>
                            <AppText variant="body" style={styles.phaseDays}>
                              {dayLabel(days, phase.active)}
                            </AppText>
                            {phase.active && (
                              <View style={styles.timepointWrapper}>
                                <Timepoint width={7} height={7} />
                              </View>
                            )}
                          </View>
                          <AppText variant="caption" style={styles.timerLabel}>
                            Timer
                          </AppText>
                        </View>
                      </View>
                    </View>
                  </View>

                  <AppText variant="caption" style={styles.phaseDateLabel}>
                    {formatDateDisplay(dates.start)}
                    {dates.start.getTime() !== dates.end.getTime()
                      ? ` - ${formatDateDisplay(dates.end)}`
                      : ""}
                  </AppText>
                </View>
              );
            })}
          </ScrollView>

          <SafeAreaView edges={["bottom"]} style={styles.leaveSafeArea}>
            <View style={styles.leaveWrapper}>
              <ActionCard
                label={isLeaving ? "Leaving..." : "Leave trip"}
                icon={<Exit width={20} height={20} />}
                onPress={handleLeaveTrip}
                accessibilityHint="Leaves this trip"
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.lightWhite,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
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
  fieldGroup: {
    gap: spacing.sm,
  },
  infoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.textPrimary,
  },
  infoValue: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    paddingLeft: 28,
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  phaseLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  phaseBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  phaseBadgeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  phaseTimerBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  hourglassCol: {
    justifyContent: "center",
    alignItems: "center",
  },
  phaseTextCol: {
    flexDirection: "column",
    justifyContent: "center",
  },
  daysRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 3,
  },
  phaseDays: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textPrimary,
  },
  timepointWrapper: {
    marginTop: 1,
  },
  timerLabel: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
  },
  phaseDateLabel: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    paddingLeft: 4,
  },
  leaveSafeArea: {
    backgroundColor: colors.lightWhite,
  },
  leaveWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});