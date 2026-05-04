import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { createTrip } from "@/src/api/trips";
import { auth } from "@/src/lib/firebase";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  Alert,
  Animated,
  Text
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { AppText } from "@/src/components/common/AppText";
import { AppInput } from "@/src/components/common/AppInput";
import { AppButton } from "@/src/components/common/AppButton";
import { BackLink } from "@/src/components/common/BackLink";
import { colors, spacing, radius, typography } from "@/src/theme";
import Plane from "@/assets/icons/plane.svg";
import CityScape from "@/assets/visuals/city_scape.svg";
import CurlyYellow from "@/assets/visuals/curly-yellow.svg";
import CurlyOrange from "@/assets/visuals/curly-orange.svg";
import Location from "@/assets/icons/location.svg";
import Copy from "@/assets/icons/copy.svg";
import Calendar from "@/assets/icons/calendar.svg";
import TripTitle from "@/assets/icons/trip_title.svg";
import KeyFrame from "@/assets/icons/key_frame.svg";
import ArrowUp from "@/assets/icons/arrow_up.svg";
import ArrowDown from "@/assets/icons/arrow_down.svg";
import Hourglass0 from "@/assets/icons/hourglass_0.svg";
import Hourglass1 from "@/assets/icons/hourglass_1.svg";
import Timepoint from "@/assets/icons/timepoint.svg";
import CheckMark from "@/assets/icons/check_mark.svg";
import Timer from "@/assets/icons/timer.svg";
import Info from "@/assets/icons/info.svg";

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

function formatDateDisplay(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function toDateOnlyString(date: Date): string {
  return date.toISOString().split("T")[0];
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

function timeStringToDate(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function combineDateAndTime(date: Date, timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined.toISOString();
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CreateTripScreen() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [destination, setDestination] = useState("");
  const [tripName, setTripName] = useState("");
  const [tripStart, setTripStart] = useState<Date>(new Date());
  const [tripEnd, setTripEnd] = useState<Date>(new Date());

  const [showTripStartPicker, setShowTripStartPicker] = useState(false);
  const [showTripEndPicker, setShowTripEndPicker] = useState(false);

  const [tripCode, setTripCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const phases = [
    {
      id: "planning" as const,
      label: "Planning",
      color: colors.beachYellow,
      active: true,
    },
    {
      id: "voting" as const,
      label: "Voting",
      color: colors.sunsetPink,
      active: false,
    },
    {
      id: "final" as const,
      label: "Final",
      color: colors.neonGreen,
      active: false,
    },
  ];

  const [phaseDates, setPhaseDates] = useState<PhaseDates>({
    planning: {
      start: new Date(),
      end: new Date(),
      time: "12:00",
    },
    voting: {
      start: new Date(),
      end: new Date(),
      time: "18:00",
    },
    final: {
      start: new Date(),
      end: new Date(),
      time: "00:00",
    },
  });

  const [phaseUpdated, setPhaseUpdated] = useState<Record<string, boolean>>({});
  const [openPhase, setOpenPhase] = useState<PhaseKey | null>(null);
  const [showPhaseStartPicker, setShowPhaseStartPicker] =
    useState<PhaseKey | null>(null);
  const [showPhaseTimePicker, setShowPhaseTimePicker] =
    useState<PhaseKey | null>(null);

  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  const TIMER_PHASES = phases.filter(
    (phase) => phase.id === "planning" || phase.id === "voting"
  );

  const safeTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutRefs.current.push(id);
    return id;
  };

  useEffect(() => {
    return () => timeoutRefs.current.forEach(clearTimeout);
  }, []);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB").replace(/\//g, ".");

  const togglePhase = (key: PhaseKey) => {
    setOpenPhase((prev) => (prev === key ? null : key));
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(tripCode);
    setCopied(true);
    safeTimeout(() => setCopied(false), 2000);
  };

  const syncPhasesFromTripDates = (nextTripStart: Date, nextTripEnd: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Planning runs from "today" until the trip start date
    const planningStart = today;
    const planningEnd = nextTripStart < today ? today : nextTripStart; // just in case start is in the past

    // Voting runs from trip start until trip end by default
    const votingStart = planningEnd;
    const votingEnd = nextTripEnd;

    setPhaseDates({
      planning: {
        start: planningStart,
        end: planningEnd,
        // keep whatever default time you want for planning
        time: phaseDates.planning.time || "12:00",
      },
      voting: {
        start: votingStart,
        end: votingEnd,
        time: phaseDates.voting.time || "18:00",
      },
      final: {
        start: votingEnd,
        end: votingEnd,
        time: "00:00",
      },
    });
  };
  const handleContinueFromDestination = () => {
    if (!destination.trim()) {
      Alert.alert("Missing destination", "Please enter a destination first.");
      return;
    }
    setStep(2);
  };

  const handleContinueToTimers = () => {
    if (!tripName.trim()) {
      Alert.alert("Missing trip name", "Please enter a trip name.");
      return;
    }

    if (tripEnd < tripStart) {
      Alert.alert("Invalid dates", "End date cannot be before start date.");
      return;
    }

    syncPhasesFromTripDates(tripStart, tripEnd);
    setStep(3);
  };

  const handleUpdatePhaseDate = (phaseId: PhaseKey) => {
    try {
      const phase = phaseDates[phaseId];
      const nextEnd = new Date(combineDateAndTime(phase.end, phase.time));
      const tripEndBoundary = endOfDay(tripEnd);

      if (phaseId === "planning") {
        const currentVotingEnd = new Date(
          combineDateAndTime(phaseDates.voting.end, phaseDates.voting.time)
        );

        if (nextEnd > tripEndBoundary) {
          Alert.alert(
            "Invalid planning end",
            "Planning end cannot be after the trip end date."
          );
          return;
        }

        if (nextEnd >= currentVotingEnd) {
          Alert.alert(
            "Invalid planning end",
            "Planning end must be before voting end."
          );
          return;
        }

        setPhaseDates((prev) => ({
          ...prev,
          planning: {
            ...prev.planning,
            end: phase.end,
            time: phase.time,
          },
          voting: {
            ...prev.voting,
            start: phase.end,
            end:
              prev.voting.end < phase.end
                ? new Date(phase.end)
                : prev.voting.end,
          },
          final: {
            ...prev.final,
            start:
              prev.voting.end < phase.end
                ? new Date(phase.end)
                : prev.final.start,
            end:
              prev.voting.end < phase.end
                ? new Date(phase.end)
                : prev.final.end,
          },
        }));
      }

      if (phaseId === "voting") {
        const currentPlanningEnd = new Date(
          combineDateAndTime(phaseDates.planning.end, phaseDates.planning.time)
        );

        if (nextEnd <= currentPlanningEnd) {
          Alert.alert(
            "Invalid voting end",
            "Voting end must be after planning end."
          );
          return;
        }

        if (nextEnd > tripEndBoundary) {
          Alert.alert(
            "Invalid voting end",
            "Voting end cannot be after the trip end date."
          );
          return;
        }

        const nextFinalDisplay = phase.end;

        setPhaseDates((prev) => ({
          ...prev,
          voting: {
            ...prev.voting,
            end: phase.end,
            time: phase.time,
          },
          final: {
            ...prev.final,
            start: nextFinalDisplay,
            end: nextFinalDisplay,
          },
        }));
      }

      setPhaseUpdated((prev) => ({ ...prev, [phaseId]: true }));
      safeTimeout(() => {
        setPhaseUpdated((prev) => ({ ...prev, [phaseId]: false }));
        setOpenPhase(null);
      }, 1500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update phase";
      Alert.alert("Update failed", message);
    }
  };

  const handleCreateTrip = async () => {
    if (isCreating) return;

    if (!user) {
      Alert.alert(
        "Not logged in",
        "Please log in again and try creating a trip."
      );
      return;
    }

    if (!destination.trim()) {
      Alert.alert("Missing destination", "Please enter a destination.");
      return;
    }

    if (!tripName.trim()) {
      Alert.alert("Missing trip name", "Please enter a trip name.");
      return;
    }

    if (tripEnd < tripStart) {
      Alert.alert("Invalid dates", "End date cannot be before start date.");
      return;
    }

    try {
      const planningEnd = new Date(
        combineDateAndTime(phaseDates.planning.end, phaseDates.planning.time)
      );
      const votingEnd = new Date(
        combineDateAndTime(phaseDates.voting.end, phaseDates.voting.time)
      );
      const tripEndBoundary = endOfDay(tripEnd);

      if (planningEnd > tripEndBoundary) {
        Alert.alert(
          "Invalid planning end",
          "Planning end cannot be after the trip end date."
        );
        return;
      }

      if (planningEnd >= votingEnd) {
        Alert.alert(
          "Invalid voting end",
          "Voting end must be after planning end."
        );
        return;
      }

      if (votingEnd > tripEndBoundary) {
        Alert.alert(
          "Invalid voting end",
          "Voting end cannot be after the trip end date."
        );
        return;
      }

      setIsCreating(true);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert(
          "Authentication error",
          "No Firebase user found. Please log in again."
        );
        return;
      }

      const idToken = await currentUser.getIdToken();

      const result = await createTrip({
        idToken,
        title: tripName.trim(),
        destination: destination.trim(),
        start_date: toDateOnlyString(tripStart),
        end_date: toDateOnlyString(tripEnd),
        planning_end_at: combineDateAndTime(
          phaseDates.planning.end,
          phaseDates.planning.time
        ),
        voting_end_at: combineDateAndTime(
          phaseDates.voting.end,
          phaseDates.voting.time
        ),
      });

      setTripCode(result.invite_code ?? "");
      setStep(4);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create trip";
      Alert.alert("Create trip failed", message);
    } finally {
      setIsCreating(false);
    }
  };

const TOTAL_STEPS = 4;

const progress = useRef(new Animated.Value(1)).current;

useEffect(() => {
  Animated.timing(progress, {
    toValue: step,
    duration: 300,
    useNativeDriver: false,
  }).start();
}, [step]);

const progressAnim = progress.interpolate({
  inputRange: [1, TOTAL_STEPS],
  outputRange: ["0%", "100%"],
});


type ProgressBarProps = {
  progressWidth: Animated.AnimatedInterpolation<string>;
  currentStep: number;
  totalSteps: number;

};

const ProgressBar: React.FC<ProgressBarProps> = ({
  progressWidth,
  currentStep,
  totalSteps,
}) => {
  return (
    <View
      style={{
        width: "100%",
        height: 20,
        borderRadius: 20,
        backgroundColor: colors.grayedOut,
        overflow: "hidden",
        justifyContent: "center",
      }}
    >
      {/* Animated fill */}
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          borderRadius: 20,
          backgroundColor: colors.seaBlue,
          width: progressWidth,
        }}
      />

      <Text 
      style={{
          alignSelf: "center",
          color: colors.nightBlack,
          fontSize: 12,
          fontWeight: "600",
      }}>
        {currentStep}/{totalSteps}
      </Text>
    </View>
  );
};

  if (step === 3) {
    return (
      <View style={[styles.fullScreen, styles.bgStep3]}>
        <SafeAreaView
          style={styles.safeArea}
          edges={["top", "left", "right", "bottom"]}
        >
          <View style={[styles.root, styles.bgStep3]}>
            <ScrollView
              contentContainerStyle={styles.containerStep3}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.header}>
                <BackLink onPress={() => setStep(2)} />
                <View style={styles.headerTitle}>
                  <Plane width={25} height={25} />
                  <AppText variant="body" style={styles.headerLabel}>
                    Create trip
                  </AppText>
                </View>
              </View>

              <View style={{ paddingHorizontal: 20, marginVertical: 12 }}>
                <ProgressBar progressWidth={progressAnim} currentStep={step} totalSteps={TOTAL_STEPS} />
              </View>

              <AppText variant="title" style={styles.titleStep3}>
                Set up the timers
              </AppText>

              <AppText variant="body" style={styles.setupText}>
                Set an end time for each state so the next one starts
                automatically.
              </AppText>

              {TIMER_PHASES.map((phase) => {
                const phaseId = phase.id as PhaseKey;
                const isOpen = openPhase === phaseId;
                const dates = phaseDates[phaseId];
                const days = phase.active
                  ? calcDaysLeft(dates.end)
                  : calcCalendarDays(dates.start, dates.end);

                return (
                  <View key={phaseId} style={styles.fieldGroup}>
                    <Pressable
                      style={styles.phaseRow}
                      onPress={() => togglePhase(phaseId)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${phase.label} phase`}
                      accessibilityState={{ expanded: isOpen }}
                    >
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
                            <AppText
                              variant="caption"
                              style={styles.timerLabel}
                            >
                              Timer
                            </AppText>
                          </View>
                        </View>
                      </View>

                      {isOpen ? (
                        <ArrowUp width={20} height={20} />
                      ) : (
                        <ArrowDown width={20} height={20} />
                      )}
                    </Pressable>

                    <AppText variant="caption" style={styles.phaseDateLabel}>
                      {formatDateDisplay(dates.start)}
                      {dates.start.getTime() !== dates.end.getTime()
                        ? ` - ${formatDateDisplay(dates.end)}`
                        : ""}
                    </AppText>

                    {isOpen && phaseId !== "final" && (
                      <View style={styles.expandedField}>
                        <AppText variant="body" style={styles.phaseEndLabel}>
                          End date of {phase.label} state
                        </AppText>

                        <View style={styles.dateTimeRow}>
                          <Pressable
                            style={[styles.dateInput, styles.dateTimeHalf]}
                            onPress={() => {
                              setShowPhaseStartPicker(phaseId);
                              setShowPhaseTimePicker(null);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${phase.label} end date`}
                          >
                            <AppText variant="body" style={styles.dateText}>
                              {formatDateDisplay(dates.end)}
                            </AppText>
                            <Calendar width={18} height={18} />
                          </Pressable>

                          <Pressable
                            style={[styles.dateInput, styles.dateTimeHalf]}
                            onPress={() => {
                              setShowPhaseTimePicker(phaseId);
                              setShowPhaseStartPicker(null);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${phase.label} end time`}
                          >
                            <AppText variant="body" style={styles.dateText}>
                              {dates.time}
                            </AppText>
                            <Timer width={18} height={18} />
                          </Pressable>
                        </View>

                        {showPhaseStartPicker === phaseId && (
                          <DateTimePicker
                            value={dates.end}
                            mode="date"
                            minimumDate={
                              phaseId === "voting"
                                ? phaseDates.planning.end
                                : undefined
                            }
                            maximumDate={tripEnd}
                            display={
                              Platform.OS === "ios" ? "spinner" : "default"
                            }
                            onChange={(_: DateTimePickerEvent, date?: Date) => {
                              setShowPhaseStartPicker(null);
                              if (date) {
                                setPhaseDates((prev) => ({
                                  ...prev,
                                  [phaseId]: {
                                    ...prev[phaseId],
                                    end: date,
                                  },
                                }));
                              }
                            }}
                          />
                        )}

                        {showPhaseTimePicker === phaseId && (
                          <DateTimePicker
                            value={timeStringToDate(dates.time)}
                            mode="time"
                            is24Hour
                            display={
                              Platform.OS === "ios" ? "spinner" : "default"
                            }
                            onChange={(_: DateTimePickerEvent, date?: Date) => {
                              setShowPhaseTimePicker(null);
                              if (date) {
                                setPhaseDates((prev) => ({
                                  ...prev,
                                  [phaseId]: {
                                    ...prev[phaseId],
                                    time: dateToTimeString(date),
                                  },
                                }));
                              }
                            }}
                          />
                        )}

                        <AppButton
                          title="Update"
                          onPress={() => handleUpdatePhaseDate(phaseId)}
                          style={styles.updateButton}
                          textStyle={styles.updateButtonText}
                          accessibilityLabel={`Update ${phase.label} phase`}
                        />

                        {phaseUpdated[phaseId] && (
                          <View style={styles.successRow}>
                            <CheckMark width={18} height={18} />
                            <AppText
                              variant="caption"
                              style={styles.successText}
                              accessibilityRole="alert"
                            >
                              Timer is updated!
                            </AppText>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              <View style={styles.finalInfoBox}>
                <Info width={24} height={24} />
                <AppText variant="body" style={styles.finalInfoText}>
                  Final itinerary is shown automatically after Voting ends.
                </AppText>
              </View>
            </ScrollView>

            <View style={styles.step3Footer}>
              <AppButton
                title={isCreating ? "Creating..." : "Create trip"}
                onPress={handleCreateTrip}
                loading={isCreating}
                disabled={isCreating}
                style={styles.nextButton}
                textStyle={styles.nextButtonText}
                accessibilityLabel="Create trip"
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (step === 4) {
    return (
      <View style={[styles.fullScreen, styles.bgStep1]}>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <View style={[styles.root, styles.bgStep1]}>
            <View
              style={styles.curlyOrangeWrapper}
              pointerEvents="none"
              {...(Platform.OS !== "web" ? { accessible: false } : {})}
            >
              <CurlyOrange
                width={SCREEN_WIDTH * 1.1}
                height={SCREEN_WIDTH * 1.1}
              />
            </View>

            <ScrollView
              contentContainerStyle={styles.containerStep3}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.header}>
                <View style={styles.headerTitle}>
                  <Plane width={25} height={25} />
                  <AppText variant="body" style={styles.headerLabel}>
                    Create trip
                  </AppText>
                </View>
              </View>

            <View style={{ paddingHorizontal: 20, marginVertical: 12 }}>
                <ProgressBar progressWidth={progressAnim} currentStep={step} totalSteps={TOTAL_STEPS} />
              </View>

              <AppText variant="title" style={styles.titleStep3}>
                Add members to the trip
              </AppText>

              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <KeyFrame width={20} height={20} />
                  <AppText variant="body" style={styles.fieldLabel}>
                    Code
                  </AppText>
                </View>

                <Pressable style={styles.codeInput} onPress={handleCopyCode}>
                  <AppText variant="body" style={styles.codeText}>
                    {tripCode}
                  </AppText>
                  <View style={styles.copyActionArea}>
                    <AppText variant="caption" style={styles.copiedText}>
                      {copied ? "✓ Copied!" : "Tap to copy"}
                    </AppText>
                    <Copy width={20} height={20} />
                  </View>
                </Pressable>

                <AppText variant="caption" style={styles.codeCaption}>
                  Copy this code to share the trip.
                </AppText>
              </View>
            </ScrollView>

            <View style={styles.continueWrapper} pointerEvents="box-none">
              <AppButton
                title="Back to Landing Page"
                onPress={() => router.replace("/home")}
                style={styles.backToLandingButton}
                textStyle={styles.backToLandingText}
                accessibilityLabel="Back to landing page"
                accessibilityHint="Goes back to the home screen"
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View
      style={[styles.fullScreen, step === 1 ? styles.bgStep1 : styles.bgStep2]}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View
          style={[styles.root, step === 1 ? styles.bgStep1 : styles.bgStep2]}
        >
          {step === 1 ? (
            <>
              <KeyboardAvoidingView
                style={styles.scroll}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                <ScrollView
                  contentContainerStyle={styles.containerStep1}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.header}>
                    <BackLink href="/home" />
                    <View style={styles.headerTitle}>
                      <Plane width={25} height={25} />
                      <AppText variant="body" style={styles.headerLabel}>
                        Create trip
                      </AppText>
                    </View>
                  </View>

                  <View style={{ paddingHorizontal: 20, marginVertical: 12 }}>
                <ProgressBar progressWidth={progressAnim} currentStep={step} totalSteps={TOTAL_STEPS} />
              </View>

                  <AppText variant="title" style={styles.titleStep1}>
                    Where is your trip taking place?
                  </AppText>

                  <View style={[styles.fieldGroup, { marginTop: 20 }]}>
                    <View style={styles.fieldLabelRow}>
                      <Location width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>
                        Destination
                      </AppText>
                    </View>

                    <AppInput
                      placeholder="Enter city or country"
                      value={destination}
                      onChangeText={setDestination}
                      accessibilityLabel="Destination"
                      accessibilityHint="Enter the city or country for the trip"
                      style={styles.inputBlackStroke}
                    />
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>

              <View style={styles.continueWrapper} pointerEvents="box-none">
                <AppButton
                  title="Continue"
                  onPress={handleContinueFromDestination}
                  disabled={!destination.trim()}
                  style={styles.continueButton}
                  textStyle={styles.continueButtonText}
                  accessibilityLabel="Continue to next step"
                  accessibilityHint="Moves to trip name and date step"
                />
              </View>

              <View
                style={styles.cityScapeWrapper}
                pointerEvents="none"
                {...(Platform.OS !== "web" ? { accessible: false } : {})}
              >
                <CityScape
                  width={SCREEN_WIDTH}
                  height={SCREEN_WIDTH * (221 / 393)}
                />
              </View>
            </>
          ) : (
            <>
              <View
                style={styles.curlyWrapper}
                pointerEvents="none"
                {...(Platform.OS !== "web" ? { accessible: false } : {})}
              >
                <CurlyYellow
                  width={SCREEN_WIDTH * 1.1}
                  height={SCREEN_WIDTH * 1.1}
                />
              </View>

              <KeyboardAvoidingView
                style={styles.scroll}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                <ScrollView
                  contentContainerStyle={styles.containerStep2}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.header}>
                    <BackLink onPress={() => setStep(1)} />
                    <View style={styles.headerTitle}>
                      <Plane width={25} height={25} />
                      <AppText variant="body" style={styles.headerLabel}>
                        Create trip
                      </AppText>
                    </View>
                  </View>

                  <View style={{ paddingHorizontal: 20, marginVertical: 12 }}>
                <ProgressBar progressWidth={progressAnim} currentStep={step} totalSteps={TOTAL_STEPS} />
              </View>

                  <AppText variant="title" style={styles.titleStep2}>
                    Give your trip a name and choose a date
                  </AppText>

                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <TripTitle width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>
                        Trip name
                      </AppText>
                    </View>

                    <AppInput
                      placeholder="Enter trip name"
                      value={tripName}
                      onChangeText={setTripName}
                      accessibilityLabel="Trip name"
                      accessibilityHint="Enter a name for the trip"
                      style={styles.inputBlackStroke}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <Calendar width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>
                        Trip date
                      </AppText>
                    </View>

                    <Pressable
                      style={styles.dateInput}
                      onPress={() => {
                        setShowTripStartPicker(true);
                        setShowTripEndPicker(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Select trip dates"
                      accessibilityHint="Opens the date picker"
                    >
                      <AppText variant="body" style={styles.dateText}>
                        {formatDate(tripStart)} - {formatDate(tripEnd)}
                      </AppText>
                      <Calendar width={20} height={20} />
                    </Pressable>

                    {showTripStartPicker && (
                      <DateTimePicker
                        value={tripStart}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(_: DateTimePickerEvent, date?: Date) => {
                          setShowTripStartPicker(false);
                          if (date) {
                            setTripStart(date);
                            if (tripEnd < date) setTripEnd(date);
                            setShowTripEndPicker(true);
                          }
                        }}
                      />
                    )}

                    {showTripEndPicker && (
                      <DateTimePicker
                        value={tripEnd}
                        mode="date"
                        minimumDate={tripStart}
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(_: DateTimePickerEvent, date?: Date) => {
                          setShowTripEndPicker(false);
                          if (date) setTripEnd(date);
                        }}
                      />
                    )}
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>

              <View style={styles.createWrapper}>
                <AppButton
                  title="Continue"
                  onPress={handleContinueToTimers}
                  disabled={!tripName.trim()}
                  style={styles.createButton}
                  textStyle={styles.createButtonText}
                  accessibilityLabel="Continue to timer setup"
                />
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
    overflow: "hidden",
  },
  bgStep1: {
    backgroundColor: colors.beachYellow,
  },
  bgStep2: {
    backgroundColor: colors.sunsetOrange,
  },
  bgStep3: {
    backgroundColor: colors.lightWhite,
  },
  scroll: {
    flex: 1,
  },
  containerStep1: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: SCREEN_HEIGHT * 0.28,
    gap: spacing.xl,
  },
  containerStep2: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: SCREEN_HEIGHT * 0.18,
    gap: spacing.xl,
  },
  containerStep3: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
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
  titleStep1: {
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displayLg,
    color: colors.textPrimary,
    textAlign: "left",
    alignSelf: "stretch",
  },
  titleStep2: {
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displayLg,
    color: colors.textPrimary,
    textAlign: "left",
    alignSelf: "stretch",
  },
  titleStep3: {
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displayLg,
    color: colors.textPrimary,
    textAlign: "left",
    alignSelf: "stretch",
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  inputBlackStroke: {
    borderWidth: 2,
    borderColor: colors.nightBlack,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  dateTimeHalf: {
    flex: 1,
  },
  dateInput: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.nightBlack,
    minHeight: 48,
  },
  dateText: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textPrimary,
  },
  codeInput: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.nightBlack,
    minHeight: 48,
  },
  codeText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    letterSpacing: 3,
  },
  copyActionArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  copiedText: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  codeCaption: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.body,
  },
  continueWrapper: {
    position: "absolute",
    bottom: SCREEN_WIDTH * (221 / 393) + 47,
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
  },
  continueButton: {
    backgroundColor: colors.sunsetOrange,
  },
  continueButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  backToLandingButton: {
    backgroundColor: colors.sunsetOrange,
  },
  backToLandingText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  cityScapeWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (221 / 393),
    zIndex: 5,
  },
  curlyWrapper: {
    position: "absolute",
    bottom: -SCREEN_WIDTH * 0.3,
    left: -SCREEN_WIDTH * 0.1,
    zIndex: 0,
  },
  createWrapper: {
    position: "absolute",
    bottom: SCREEN_WIDTH * (221 / 393) + 47,
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
  },
  createButton: {
    backgroundColor: colors.seaBlue,
  },
  createButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  curlyOrangeWrapper: {
    position: "absolute",
    bottom: -SCREEN_WIDTH * 0.3,
    left: -SCREEN_WIDTH * 0.1,
    zIndex: 0,
  },
  setupText: {
    fontSize: 18,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
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
  phaseEndLabel: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  expandedField: {
    gap: spacing.md,
  },
  updateButton: {
    backgroundColor: colors.beachYellow,
  },
  updateButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  successText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  step3Footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.lightWhite,
  },
  nextButton: {
    backgroundColor: colors.sunsetOrange,
  },
  nextButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  finalInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  finalInfoText: {
    flex: 1,
    color: colors.nightBlack,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontFamily: typography.fontFamily.body,
  },
});
