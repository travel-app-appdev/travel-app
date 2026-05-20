import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import {
  AccessibilityInfo,
  Alert,
  findNodeHandle,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useRef, useMemo, useEffect } from "react";
import { AppText } from "@/src/components/common/AppText";
import {
  ActionCard,
  ACTION_CARD_HEIGHT,
} from "@/src/components/common/ActionCard";
import { BackLink } from "@/src/components/common/BackLink";
import { leaveTrip, type Trip } from "@/src/api/trips";
import { auth } from "@/src/lib/firebase";
import { invalidateTripsCache } from "./home";
import { colors, spacing, radius, typography } from "@/src/theme";
import {
  formatTripDurationText,
  formatTripTimerText,
} from "@/src/utils/tripTimer";
import { nativeImportantForAccessibility, hiddenFromAccessibility } from "@/src/utils/accessibility";
import Plane from "@/assets/icons/plane.svg";
import TripTitle from "@/assets/icons/trip_title.svg";
import Calendar from "@/assets/icons/calendar.svg";
import Location from "@/assets/icons/location.svg";
import AddPeople from "@/assets/icons/add_people.svg";
import Hourglass0 from "@/assets/icons/hourglass_0.svg";
import Hourglass1 from "@/assets/icons/hourglass_1.svg";
import Timepoint from "@/assets/icons/timepoint.svg";
import CheckMark from "@/assets/icons/check_mark.svg";
import Unchecked from "@/assets/icons/unchecked.svg";
import KeyFrame from "@/assets/icons/key_frame.svg";
import Copy from "@/assets/icons/copy.svg";
import Exit from "@/assets/icons/exit.svg";
import VoteyYellow from "@/assets/mascots/Votey_Yellow.svg";
import VoteyPink from "@/assets/mascots/Votey_Pink.svg";
import VoteyGreen from "@/assets/mascots/Votey_Green.svg";

type PhaseKey = "planning" | "voting" | "final";
type PhaseStatus = "past" | "active" | "future";

type PhaseValue = {
  start: Date;
  end: Date;
  time: string;
};

type PhaseDates = Record<PhaseKey, PhaseValue>;

type MemberParam = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPhaseStatus(
  phaseId: PhaseKey,
  tripState: Trip["state"]
): PhaseStatus {
  if (tripState === "Planning") {
    if (phaseId === "planning") return "active";
    return "future";
  }
  if (tripState === "Voting") {
    if (phaseId === "planning") return "past";
    if (phaseId === "voting") return "active";
    return "future";
  }
  if (tripState === "Final") {
    if (phaseId === "final") return "active";
    return "past";
  }
  return "future";
}

function getChecklistSubtitle(tripState: Trip["state"]): string {
  switch (tripState) {
    case "Voting":
      return "Vote on conflicting activities in the itinerary.";
    case "Final":
      return "Here you find your final itinerary of your group.";
    case "Planning":
    default:
      return "Let's plan your trip step by step by adding activities to your itinerary.";
  }
}

function getChecklistMascot(tripState: Trip["state"]) {
  switch (tripState) {
    case "Voting":
      return VoteyPink;
    case "Final":
      return VoteyGreen;
    case "Planning":
    default:
      return VoteyYellow;
  }
}

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

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function combineDateAndTime(date: Date, timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined.toISOString();
}

function combineDateAndTimeToDate(date: Date, timeStr: string): Date {
  return new Date(combineDateAndTime(date, timeStr));
}

function formatPhaseTimerText(
  phase: PhaseValue,
  isActive: boolean,
  now: number
): string {
  const phaseEnd = combineDateAndTimeToDate(phase.end, phase.time);
  if (isActive) return formatTripTimerText(phaseEnd, now);
  return formatTripDurationText(phase.start, phaseEnd);
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

// ─── Checkbox (read-only, same visual as admin) ──────────────────────────────

const CHECKBOX_SIZE = 24;
const TIMELINE_LINE_WIDTH = 2;

function PhaseCheckbox({ status }: { status: PhaseStatus }) {
  if (status === "past") {
    return <CheckMark width={CHECKBOX_SIZE} height={CHECKBOX_SIZE} />;
  }
  if (status === "future") {
    return <Unchecked width={CHECKBOX_SIZE} height={CHECKBOX_SIZE} />;
  }
  // active
  return (
    <View style={[styles.checkbox, styles.checkboxChecked]}>
      <View style={styles.checkboxActiveDot} />
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TripOverviewMemberScreen() {
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
    inviteCode?: string;
  }>();

  const tripId = String(raw.tripId ?? "");
  const title = String(raw.title ?? "");
  const destination = String(raw.destination ?? "");
  const startDate = String(raw.startDate ?? "");
  const endDate = String(raw.endDate ?? "");
  const membersParam = String(raw.members ?? "");
  const tripState = (raw.state ?? "Planning") as Trip["state"];
  const planningStartedAt = String(raw.planningStartedAt ?? "");
  const planningEndAt = String(raw.planningEndAt ?? "");
  const votingEndAt = String(raw.votingEndAt ?? "");
  const inviteCodeParam = String(raw.inviteCode ?? "");

  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;
  const [isLeaving, setIsLeaving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [timerNow, setTimerNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTimerNow(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const safeTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutRefs.current.push(id);
    return id;
  };
  useEffect(() => {
    return () => timeoutRefs.current.forEach(clearTimeout);
  }, []);

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCodeParam);
    setCodeCopied(true);
    safeTimeout(() => setCodeCopied(false), 2000);
  };

  const leaveRef = useRef<View>(null);

  function skipToLeave() {
    if (!leaveRef.current) return;
    if (Platform.OS === "web") {
      const el = leaveRef.current as unknown as { focus?: () => void };
      el?.focus?.();
      return;
    }
    const node = findNodeHandle(leaveRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }

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

  const phases: {
    id: PhaseKey;
    label: string;
    color: string;
    disabledColor: string;
    status: PhaseStatus;
  }[] = [
    {
      id: "planning",
      label: "Planning",
      color: colors.beachYellow,
      disabledColor: "#F6E08F",
      status: getPhaseStatus("planning", tripState),
    },
    {
      id: "voting",
      label: "Voting",
      color: colors.sunsetPink,
      disabledColor: "#F0B8FB",
      status: getPhaseStatus("voting", tripState),
    },
    {
      id: "final",
      label: "Final",
      color: colors.neonGreen,
      disabledColor: "#C8F5BE",
      status: getPhaseStatus("final", tripState),
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

  const Mascot = getChecklistMascot(tripState);

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
            {/* Skip link for accessibility */}
            <Pressable
              onPress={skipToLeave}
              accessibilityRole="button"
              accessibilityLabel="Skip to leave trip button"
              accessibilityHint="Moves focus directly to the leave trip action"
              style={styles.skipButton}
              {...nativeImportantForAccessibility}
            >
              <AppText variant="caption" style={styles.skipButtonText}>
                Skip to leave trip
              </AppText>
            </Pressable>

            {/* Header */}
            <View style={styles.header}>
              <BackLink href="/home" />
              <View style={styles.headerTitle} {...hiddenFromAccessibility}>
                <Plane width={22} height={22} />
                <AppText variant="body" style={styles.headerLabel}>
                  Trip Overview
                </AppText>
              </View>
            </View>

            {/* Trip name — read-only */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoLabelRow} {...hiddenFromAccessibility}>
                <TripTitle width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Trip name
                </AppText>
              </View>
              <AppText
                variant="caption"
                style={styles.infoValue}
                accessibilityLabel={`Trip name: ${title || "not set"}`}
              >
                {title || "—"}
              </AppText>
            </View>

            {/* Trip date — read-only */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoLabelRow} {...hiddenFromAccessibility}>
                <Calendar width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Trip date
                </AppText>
              </View>
              <AppText
                variant="caption"
                style={styles.infoValue}
                accessibilityLabel={`Trip date: ${formatDateDisplayFromString(startDate)} to ${formatDateDisplayFromString(endDate)}`}
              >
                {formatDateDisplayFromString(startDate)} –{" "}
                {formatDateDisplayFromString(endDate)}
              </AppText>
            </View>

            {/* Destination — read-only */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoLabelRow} {...hiddenFromAccessibility}>
                <Location width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Destination
                </AppText>
              </View>
              <AppText
                variant="caption"
                style={styles.infoValue}
                accessibilityLabel={`Destination: ${destination || "not set"}`}
              >
                {destination || "—"}
              </AppText>
            </View>

            {/* Members — read-only */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoLabelRow} {...hiddenFromAccessibility}>
                <AddPeople width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Members
                </AppText>
              </View>
              <AppText
                variant="caption"
                style={styles.infoValue}
                accessibilityLabel={`Members: ${members.length > 0 ? members.map((m) => m.name).join(", ") : "none"}`}
              >
                {members.length > 0
                  ? members.map((m) => m.name).join(", ")
                  : "—"}
              </AppText>
            </View>

            {/* Invite-Code — read-only with copy */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <View style={styles.infoLabelRow} {...hiddenFromAccessibility}>
                    <KeyFrame width={20} height={20} />
                    <AppText variant="body" style={styles.fieldLabel}>
                      Invite-Code
                    </AppText>
                  </View>
                  <AppText
                    variant="caption"
                    style={[styles.infoValue, styles.codeValue]}
                    accessible={false}
                  >
                    {inviteCodeParam || "—"}
                  </AppText>
                </View>
                <Pressable
                  onPress={handleCopyCode}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={codeCopied ? "Trip code copied" : "Copy trip code"}
                  accessibilityHint="Copies the invite code to your clipboard"
                >
                  <View {...hiddenFromAccessibility}>
                    <Copy width={22} height={22} />
                  </View>
                </Pressable>
              </View>
              {codeCopied && (
                <AppText
                  variant="caption"
                  style={styles.copiedHint}
                  accessibilityRole="alert"
                >
                  ✓ Copied!
                </AppText>
              )}
            </View>

            {/* Checklist section */}
            <View style={styles.checklistSection}>
              <View style={styles.checklistHeader}>
                <View style={styles.checklistTitleBlock}>
                  <AppText variant="title" style={styles.checklistTitle}>
                    Checklist
                  </AppText>
                  <AppText variant="body" style={styles.checklistSubtitle}>
                    {getChecklistSubtitle(tripState)}
                  </AppText>
                </View>
                <View style={styles.mascotWrapper} {...hiddenFromAccessibility}>
                  <Mascot width={80} height={80} />
                </View>
              </View>

              {/* Timeline — read-only, no arrows or expand */}
              <View style={styles.timeline}>
                {phases.map((phase, index) => {
                  const phaseId = phase.id;
                  const isActive = phase.status === "active";
                  const isPast = phase.status === "past";
                  const isFuture = phase.status === "future";
                  const dates = phaseDates[phaseId];
                  const timerText = formatPhaseTimerText(dates, isActive, timerNow);
                  const badgeColor = isFuture ? phase.disabledColor : phase.color;
                  const isLast = index === phases.length - 1;

                  return (
                    <View
                      key={phaseId}
                      style={styles.timelineItem}
                      accessibilityRole="text"
                      accessibilityLabel={
                        phaseId === "final"
                          ? `Final phase, starts ${formatDateDisplay(dates.start)}`
                          : `${phase.label} phase, ${timerText}${isActive ? " remaining" : ""}, ${isPast ? "completed" : isFuture ? "upcoming" : "in progress"}`
                      }
                    >
                      {/* Left: checkbox + line */}
                      <View style={styles.timelineLeft}>
                        <View style={styles.checkboxAligner}>
                          <PhaseCheckbox status={phase.status} />
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              styles.timelineLine,
                              isPast
                                ? styles.timelineLineSolid
                                : styles.timelineLineDashed,
                            ]}
                          />
                        )}
                      </View>

                      {/* Right: phase info */}
                      <View style={styles.timelineContent}>
                        <View style={styles.phaseRow}>
                          <View style={styles.phaseRowInner}>
                            <View
                              style={[
                                styles.phaseBadge,
                                { backgroundColor: badgeColor },
                              ]}
                            >
                              <AppText
                                variant="caption"
                                style={[
                                  styles.phaseBadgeText,
                                  isFuture && styles.phaseBadgeTextMuted,
                                ]}
                              >
                                {phase.label}
                              </AppText>
                            </View>

                            {phaseId !== "final" && (
                              <View style={styles.phaseTimerBlock}>
                                <View
                                  style={styles.hourglassCol}
                                  {...hiddenFromAccessibility}
                                >
                                  {isActive ? (
                                    <Hourglass1 width={18} height={18} />
                                  ) : (
                                    <Hourglass0
                                      width={18}
                                      height={18}
                                      style={
                                        isFuture ? { opacity: 0.4 } : undefined
                                      }
                                    />
                                  )}
                                </View>
                                <View style={styles.phaseTextCol}>
                                  <View style={styles.daysRow}>
                                    <AppText
                                      variant="body"
                                      style={[
                                        styles.phaseDays,
                                        isFuture && styles.phaseDaysMuted,
                                      ]}
                                    >
                                      {timerText}
                                    </AppText>
                                    {isActive && (
                                      <View
                                        style={styles.timepointWrapper}
                                        {...hiddenFromAccessibility}
                                      >
                                        <Timepoint width={7} height={7} />
                                      </View>
                                    )}
                                  </View>
                                  <AppText
                                    variant="caption"
                                    style={[
                                      styles.timerLabel,
                                      isFuture && styles.timerLabelMuted,
                                    ]}
                                  >
                                    Timer
                                  </AppText>
                                </View>
                              </View>
                            )}
                          </View>
                          {/* No arrow for members — purely read-only */}
                        </View>

                        {/* Date range */}
                        <AppText
                          variant="caption"
                          style={[
                            styles.phaseDateLabel,
                            isFuture && styles.phaseDateLabelMuted,
                          ]}
                        >
                          {formatDateDisplay(dates.start)}
                          {dates.start.getTime() !== dates.end.getTime()
                            ? ` - ${formatDateDisplay(dates.end)}`
                            : ""}
                        </AppText>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <SafeAreaView
            edges={["bottom"]}
            style={[
              styles.leaveSafeArea,
              Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null,
            ]}
            ref={leaveRef}
            {...(Platform.OS === "web" ? ({ tabIndex: -1 } as any) : {})}
          >
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
  fullScreen: { flex: 1, backgroundColor: colors.lightWhite },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  skipButton: {
    opacity: 0,
    height: 1,
    overflow: "hidden",
    marginBottom: -1,
  },
  skipButtonText: { color: colors.textPrimary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerLabel: {
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.textPrimary,
  },

  // Read-only fields
  fieldGroup: { gap: spacing.sm },
  infoLabelRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
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

  // Invite-Code
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  infoLeft: { gap: spacing.xs, flex: 1 },
  codeValue: {
    fontFamily: typography.fontFamily.bodyBold,
    letterSpacing: 2,
  },
  copiedHint: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    paddingLeft: 28,
  },

  // Checklist
  checklistSection: { gap: spacing.lg },
  checklistHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  checklistTitleBlock: { flex: 1, gap: spacing.xs, paddingRight: spacing.md },
  checklistTitle: {
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displaySm ?? typography.lineHeight.xxl,
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.nightBlack,
  },
  checklistSubtitle: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  mascotWrapper: { alignSelf: "flex-start" },

  // Timeline
  timeline: { gap: 0 },
  timelineItem: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.md,
  },
  timelineLeft: {
    alignItems: "center",
    width: CHECKBOX_SIZE,
  },
  checkboxAligner: {
    height: 36,
    justifyContent: "center",
  },
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: colors.nightBlack,
    backgroundColor: colors.lightWhite,
  },
  checkboxUnchecked: {
    borderColor: colors.grayedOut,
    backgroundColor: "transparent",
  },
  checkboxActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.nightBlack,
  },
  timelineLine: {
    width: TIMELINE_LINE_WIDTH,
    flexGrow: 1,
    marginTop: 2,
    marginBottom: 2,
  },
  timelineLineSolid: {
    backgroundColor: colors.nightBlack,
  },
  timelineLineDashed: {
    backgroundColor: colors.grayedOut,
    opacity: 0.35,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  phaseRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  phaseBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignSelf: "flex-start",
  },
  phaseBadgeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.nightBlack,
  },
  phaseBadgeTextMuted: { color: colors.grayedOut },
  phaseTimerBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  hourglassCol: { justifyContent: "center", alignItems: "center" },
  phaseTextCol: { flexDirection: "column", justifyContent: "center" },
  daysRow: { flexDirection: "row", alignItems: "flex-start", gap: 3 },
  phaseDays: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textPrimary,
  },
  phaseDaysMuted: { color: colors.grayedOut },
  timepointWrapper: { marginTop: 1 },
  timerLabel: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
  },
  timerLabelMuted: { color: colors.grayedOut, opacity: 0.6 },
  phaseDateLabel: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  phaseDateLabelMuted: { color: colors.grayedOut },

  // Leave
  leaveSafeArea: { backgroundColor: colors.lightWhite },
  leaveWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});