// app/trip-information.tsx
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
import { useState, useEffect, useRef } from "react";
import { AppText } from "@/src/components/common/AppText";
import {
  ActionCard,
  ACTION_CARD_HEIGHT,
} from "@/src/components/common/ActionCard";
import { BackLink } from "@/src/components/common/BackLink";
import { leaveTrip } from "@/src/api/trips";
import { auth } from "@/src/lib/firebase";
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

// Placeholder phases — to be wired up later
const PLACEHOLDER_PHASES = [
  {
    id: "planning",
    label: "Planning",
    color: colors.beachYellow,
    active: true,
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: "voting",
    label: "Voting",
    color: colors.sunsetPink,
    active: false,
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: "final",
    label: "Final",
    color: colors.neonGreen,
    active: false,
    startDate: new Date(),
    endDate: new Date(),
  },
];

const PHASE_TEXT_COLORS: Record<string, string> = {
  planning: colors.nightBlack,
  voting: colors.nightBlack,
  final: colors.nightBlack,
};

type MemberParam = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

function formatDateDisplay(dateString: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function calcDays(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

function dayLabel(days: number) {
  return days === 1 ? "1 day" : `${days} days`;
}

export default function TripInformationScreen() {
  const {
    tripId,
    title,
    destination,
    startDate,
    endDate,
    members: membersParam,
  } = useLocalSearchParams<{
    tripId: string;
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    members: string;
  }>();

  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;
  const [isLeaving, setIsLeaving] = useState(false);

  // Cleanup timeouts on unmount
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const timeouts = timeoutRefs.current;

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // Parse members from JSON param
  const members: MemberParam[] = (() => {
    try {
      return membersParam ? JSON.parse(membersParam) : [];
    } catch {
      return [];
    }
  })();

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
            await leaveTrip({ idToken, tripId: tripId! });
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

            {/* Trip Name */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoLabelRow}>
                <TripTitle width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Trip name
                </AppText>
              </View>
              <AppText variant="caption" style={styles.infoValue}>
                {title ?? "—"}
              </AppText>
            </View>

            {/* Trip Date */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoLabelRow}>
                <Calendar width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Trip date
                </AppText>
              </View>
              <AppText variant="caption" style={styles.infoValue}>
                {formatDateDisplay(startDate ?? "")} –{" "}
                {formatDateDisplay(endDate ?? "")}
              </AppText>
            </View>

            {/* Destination */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoLabelRow}>
                <Location width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Destination
                </AppText>
              </View>
              <AppText variant="caption" style={styles.infoValue}>
                {destination ?? "—"}
              </AppText>
            </View>

            {/* Members */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoLabelRow}>
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

            {/* Phases — placeholder until wired up */}
            {PLACEHOLDER_PHASES.map((phase) => {
              const days = calcDays(phase.startDate, phase.endDate);
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

                      <View style={styles.phaseTimerRow}>
                        {phase.active ? (
                          <Hourglass1 width={20} height={20} />
                        ) : (
                          <Hourglass0 width={20} height={20} />
                        )}
                        <AppText variant="body" style={styles.phaseDays}>
                          {dayLabel(days)}
                        </AppText>
                        {/* <AppText variant="caption" style={styles.phaseTimerLabel}>
                          Timer
                        </AppText> */}
                        {phase.active && <Timepoint width={8} height={8} />}
                      </View>
                    </View>
                  </View>

                  <AppText variant="caption" style={styles.phaseDateLabel}>
                    {formatDate(phase.startDate)}
                    {phase.startDate.getTime() !== phase.endDate.getTime()
                      ? ` - ${formatDate(phase.endDate)}`
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
    borderRadius: radius.pill,
  },
  phaseBadgeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  phaseTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  phaseDays: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textPrimary,
  },
  phaseTimerLabel: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
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
