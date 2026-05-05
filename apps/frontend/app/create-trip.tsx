import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Modal,
  TextInput,
  Animated,
  Text
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Calendar as RangeCalendar } from "react-native-calendars";
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

type PhaseValue = {
  start: Date;
  end: Date;
  time: string;
};

type PhaseDates = Record<PhaseKey, PhaseValue>;

type CalendarDay = {
  dateString: string;
};

function formatDateDisplay(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function toDateOnlyString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
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

function getMarkedRange(
  start: string | null,
  end: string | null,
  edgeColor: string,
  fillColor: string
) {
  if (!start) return {};

  if (!end || start === end) {
    return {
      [start]: {
        startingDay: true,
        endingDay: true,
        color: edgeColor,
        textColor: colors.nightBlack,
      },
    };
  }

  const marked: Record<string, any> = {};
  let current = fromDateString(start);
  const last = fromDateString(end);

  while (current <= last) {
    const dateString = toLocalDateString(current);
    const isStart = dateString === start;
    const isEnd = dateString === end;

    marked[dateString] = {
      startingDay: isStart,
      endingDay: isEnd,
      color: isStart || isEnd ? edgeColor : fillColor,
      textColor: colors.nightBlack,
    };

    current.setDate(current.getDate() + 1);
  }

  return marked;
}

function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function normalizeTimeInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
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
  const [showTripCalendar, setShowTripCalendar] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(
    toLocalDateString(new Date())
  );
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

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
  const [showPhaseDateCalendar, setShowPhaseDateCalendar] =
    useState<PhaseKey | null>(null);
  const [showPhaseTimePicker, setShowPhaseTimePicker] =
    useState<PhaseKey | null>(null);
  const [tempPhaseTime, setTempPhaseTime] = useState("12:00");

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
    setShowPhaseDateCalendar(null);
    setShowPhaseTimePicker(null);
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

    const planningStart = today;
    const planningEnd = nextTripStart < today ? today : nextTripStart;
    const votingStart = planningEnd;
    const votingEnd = nextTripEnd;

    setPhaseDates((prev) => ({
      planning: {
        start: planningStart,
        end: planningEnd,
        time: prev.planning.time || "12:00",
      },
      voting: {
        start: votingStart,
        end: votingEnd,
        time: prev.voting.time || "18:00",
      },
      final: {
        start: votingEnd,
        end: votingEnd,
        time: "00:00",
      },
    }));
  };

  const openTripCalendar = () => {
    setRangeStart(toLocalDateString(tripStart));
    setRangeEnd(null);
    setShowTripCalendar(true);
  };

  const handleTripDayPress = (day: CalendarDay) => {
    const selected = day.dateString;

    if (!rangeStart) {
      setRangeStart(selected);
      setRangeEnd(null);
      return;
    }

    if (!rangeEnd) {
      if (selected < rangeStart) {
        setRangeStart(selected);
        setRangeEnd(null);
        return;
      }

      if (selected === rangeStart) {
        return;
      }

      setRangeEnd(selected);
      return;
    }

    setRangeStart(selected);
    setRangeEnd(null);
  };

  const applyTripRange = () => {
    if (!rangeStart) return;

    const finalEnd = rangeEnd ?? rangeStart;
    const start = fromDateString(rangeStart);
    const end = fromDateString(finalEnd);

    setTripStart(start);
    setTripEnd(end);
    setShowTripCalendar(false);
  };

  const markedTripDates = useMemo(
    () =>
      getMarkedRange(
        rangeStart,
        rangeEnd,
        colors.sunsetOrange,
        colors.sunsetOrange
      ),
    [rangeStart, rangeEnd]
  );

  const openPhaseCalendar = (phaseId: PhaseKey) => {
    if (phaseId === "final") return;
    setShowPhaseDateCalendar(phaseId);
    setShowPhaseTimePicker(null);
  };

  const handlePhaseCalendarDayPress = (day: CalendarDay) => {
    if (!showPhaseDateCalendar) return;

    const selectedDate = fromDateString(day.dateString);

    if (showPhaseDateCalendar === "planning") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tripEndOnly = new Date(tripEnd);
      tripEndOnly.setHours(0, 0, 0, 0);

      if (selectedDate < today || selectedDate > tripEndOnly) {
        return;
      }

      setPhaseDates((prev) => ({
        ...prev,
        planning: {
          ...prev.planning,
          end: selectedDate,
        },
        voting: {
          ...prev.voting,
          start: selectedDate,
          end: prev.voting.end < selectedDate ? selectedDate : prev.voting.end,
        },
        final: {
          ...prev.final,
          start:
            prev.voting.end < selectedDate ? selectedDate : prev.final.start,
          end: prev.voting.end < selectedDate ? selectedDate : prev.final.end,
        },
      }));
      return;
    }

    if (showPhaseDateCalendar === "voting") {
      const planningEndOnly = new Date(phaseDates.planning.end);
      planningEndOnly.setHours(0, 0, 0, 0);

      const tripEndOnly = new Date(tripEnd);
      tripEndOnly.setHours(0, 0, 0, 0);

      if (selectedDate < planningEndOnly || selectedDate > tripEndOnly) {
        return;
      }

      setPhaseDates((prev) => ({
        ...prev,
        voting: {
          ...prev.voting,
          end: selectedDate,
        },
        final: {
          ...prev.final,
          start: selectedDate,
          end: selectedDate,
        },
      }));
    }
  };

  const getPhaseMarkedDates = useMemo(() => {
    const tripRange = getMarkedRange(
      toLocalDateString(tripStart),
      toLocalDateString(tripEnd),
      colors.sunsetOrange,
      colors.sunsetOrange
    );

    const planningRange = getMarkedRange(
      toLocalDateString(phaseDates.planning.start),
      toLocalDateString(phaseDates.planning.end),
      colors.beachYellow,
      colors.beachYellow
    );

    const votingRange = getMarkedRange(
      toLocalDateString(phaseDates.voting.start),
      toLocalDateString(phaseDates.voting.end),
      colors.sunsetPink,
      colors.sunsetPink
    );

    if (showPhaseDateCalendar === "planning") {
      return {
        ...tripRange,
        ...planningRange,
      };
    }

    if (showPhaseDateCalendar === "voting") {
      return {
        ...tripRange,
        ...planningRange,
        ...votingRange,
      };
    }

    return tripRange;
  }, [showPhaseDateCalendar, phaseDates, tripStart, tripEnd]);

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
        setPhaseDates((prev: PhaseDates) => ({
          ...prev,
          planning: { ...prev.planning, end: phase.end, time: phase.time },
          voting: {
            ...prev.voting,
            start: phase.end,
            end: prev.voting.end < phase.end ? new Date(phase.end) : prev.voting.end,
          },
          final: {
            ...prev.final,
            start: prev.voting.end < phase.end ? new Date(phase.end) : prev.final.start,
            end: prev.voting.end < phase.end ? new Date(phase.end) : prev.final.end,
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
        setPhaseDates((prev: PhaseDates) => ({
          ...prev,
          voting: { ...prev.voting, end: phase.end, time: phase.time },
          final: { ...prev.final, start: nextFinalDisplay, end: nextFinalDisplay },
        }));
      }

      setPhaseUpdated((prev: Record<string, boolean>) => ({
        ...prev,
        [phaseId]: true,
      }));
      safeTimeout(() => {
        setPhaseUpdated((prev: Record<string, boolean>) => ({
          ...prev,
          [phaseId]: false,
        }));
        setOpenPhase(null);
      }, 1500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update phase";
      Alert.alert("Update failed", message);
    }
  };

  const handleApplyPhaseTime = () => {
    if (!showPhaseTimePicker) return;

    if (!isValidTimeString(tempPhaseTime)) {
      Alert.alert("Invalid time", "Please enter a valid time as HH:MM.");
      return;
    }

    setPhaseDates((prev) => ({
      ...prev,
      [showPhaseTimePicker]: {
        ...prev[showPhaseTimePicker],
        time: tempPhaseTime,
      },
    }));

    setShowPhaseTimePicker(null);
  };

  const handleCreateTrip = async () => {
    if (isCreating) return;
    if (!user) {
      Alert.alert("Not logged in", "Please log in again and try creating a trip.");
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
        Alert.alert("Invalid planning end", "Planning end cannot be after the trip end date.");
        return;
      }
      if (planningEnd >= votingEnd) {
        Alert.alert("Invalid voting end", "Voting end must be after planning end.");
        return;
      }
      if (votingEnd > tripEndBoundary) {
        Alert.alert("Invalid voting end", "Voting end cannot be after the trip end date.");
        return;
      }

      setIsCreating(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Authentication error", "No Firebase user found. Please log in again.");
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
    <View style={{ width: "100%" }}>
      {/* Progress bar */}
      <View
        style={{
          width: "100%",
          height: 20,
          borderRadius: 20,
          
          backgroundColor:
            currentStep === 3 ? colors.grayedOut : colors.lightWhite,

          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            height: "100%",
            borderRadius: 20,
            backgroundColor: colors.seaBlue,
            width: progressWidth,
          }}
        />
      </View>

      {/* Text underneath */}
      <Text
        style={{
          marginTop: 6,
          alignSelf: "center",
          color: colors.nightBlack,
          fontSize: 14,
          fontWeight: "600",
        }}
      >
        {currentStep}/{totalSteps}
      </Text>
    </View>
  );
};

  // Step 3 — timer setup
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
                <View
                  style={styles.headerTitle}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                >
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
                      accessibilityLabel={`${phase.label} phase, ${dayLabel(days, phase.active)}`}
                      accessibilityHint={`Tap to edit ${phase.label} end date and time`}
                      accessibilityState={{ expanded: isOpen }}
                    >
                      <View
                        style={styles.phaseLeft}
                        accessible={false}
                        importantForAccessibility="no-hide-descendants"
                      >
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

                      <View
                        accessible={false}
                        importantForAccessibility="no-hide-descendants"
                      >
                        {isOpen ? (
                          <ArrowUp width={20} height={20} />
                        ) : (
                          <ArrowDown width={20} height={20} />
                        )}
                      </View>
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
                          {/* Fix 9: context-aware label */}
                          <Pressable
                            style={[styles.dateInput, styles.dateTimeHalf]}
                            onPress={() => openPhaseCalendar(phaseId)}
                            accessibilityRole="button"
                            accessibilityLabel={`${phase.label} end date, currently ${formatDateDisplay(dates.end)}. Tap to change`}
                          >
                            <AppText variant="body" style={styles.dateText}>
                              {formatDateDisplay(dates.end)}
                            </AppText>
                            <View
                              accessible={false}
                              importantForAccessibility="no-hide-descendants"
                            >
                              <Calendar width={18} height={18} />
                            </View>
                          </Pressable>

                          {/* Fix 9: context-aware label */}
                          <Pressable
                            style={[styles.dateInput, styles.dateTimeHalf]}
                            onPress={() => {
                              setTempPhaseTime(dates.time);
                              setShowPhaseTimePicker(phaseId);
                              setShowPhaseDateCalendar(null);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`${phase.label} end time, currently ${dates.time}. Tap to change`}
                          >
                            <AppText variant="body" style={styles.dateText}>
                              {dates.time}
                            </AppText>
                            <View
                              accessible={false}
                              importantForAccessibility="no-hide-descendants"
                            >
                              <Timer width={18} height={18} />
                            </View>
                          </Pressable>
                        </View>

                        {phaseId === "planning" ? (
                          <AppButton
                            title="Confirm"
                            onPress={() => handleUpdatePhaseDate("planning")}
                            style={styles.updateButtonPlanning}
                            textStyle={styles.updateButtonText}
                            accessibilityLabel="Update Planning phase"
                          />
                        ) : (
                          <AppButton
                            title="Confirm"
                            onPress={() => handleUpdatePhaseDate("voting")}
                            style={styles.updateButtonVoting}
                            textStyle={styles.updateButtonText}
                            accessibilityLabel="Update Voting phase"
                          />
                        )}

                        {phaseUpdated[phaseId] && (
                          <View
                            style={styles.successRow}
                            accessible={false}
                            importantForAccessibility="no-hide-descendants"
                          >
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

              {/* Info box — icon is decorative */}
              <View
                style={styles.finalInfoBox}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
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
                accessibilityLabel={isCreating ? "Creating trip" : "Create trip"}
              />
            </View>

            <Modal
              visible={showPhaseDateCalendar !== null}
              transparent
              animationType="fade"
              onRequestClose={() => setShowPhaseDateCalendar(null)}
            >
              <View style={styles.calendarOverlay}>
                <View style={styles.calendarModal}>
                  <AppText variant="body" style={styles.calendarTitle}>
                    {showPhaseDateCalendar === "planning"
                      ? "Select planning end date"
                      : "Select voting end date"}
                  </AppText>

                  <RangeCalendar
                    markingType="period"
                    minDate={
                      showPhaseDateCalendar === "planning"
                        ? toLocalDateString(phaseDates.planning.start)
                        : toLocalDateString(phaseDates.voting.start)
                    }
                    maxDate={toLocalDateString(tripEnd)}
                    markedDates={getPhaseMarkedDates}
                    onDayPress={handlePhaseCalendarDayPress}
                    enableSwipeMonths
                    hideExtraDays
                    firstDay={1}
                    renderArrow={(direction) => (
                      <AppText variant="body" style={styles.calendarArrow}>
                        {direction === "left" ? "‹" : "›"}
                      </AppText>
                    )}
                    theme={{
                      backgroundColor: colors.lightWhite,
                      calendarBackground: colors.lightWhite,
                      textSectionTitleColor: colors.textMuted,
                      dayTextColor: colors.nightBlack,
                      textDisabledColor: colors.textMuted,
                      monthTextColor: colors.nightBlack,
                      arrowColor: colors.nightBlack,
                      todayTextColor: colors.sunsetOrange,
                      textDayFontFamily: typography.fontFamily.body,
                      textMonthFontFamily: typography.fontFamily.bodyBold,
                      textDayHeaderFontFamily: typography.fontFamily.bodyBold,
                      textDayFontSize: typography.size.md,
                      textMonthFontSize: typography.size.lg,
                      textDayHeaderFontSize: typography.size.sm,
                    }}
                    style={styles.calendarCard}
                  />

                  <View style={styles.calendarLegend}>
                    <View style={styles.legendRow}>
                      <View
                        style={[
                          styles.legendSwatch,
                          { backgroundColor: colors.sunsetOrange },
                        ]}
                      />
                      <AppText variant="caption" style={styles.legendLabel}>
                        Trip dates
                      </AppText>
                    </View>

                    <View style={styles.legendRow}>
                      <View
                        style={[
                          styles.legendSwatch,
                          { backgroundColor: colors.beachYellow },
                        ]}
                      />
                      <AppText variant="caption" style={styles.legendLabel}>
                        Planning state
                      </AppText>
                    </View>

                    <View style={styles.legendRow}>
                      <View
                        style={[
                          styles.legendSwatch,
                          { backgroundColor: colors.sunsetPink },
                        ]}
                      />
                      <AppText variant="caption" style={styles.legendLabel}>
                        Voting state
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.calendarActions}>
                    <AppButton
                      title="Close"
                      onPress={() => setShowPhaseDateCalendar(null)}
                      style={styles.calendarCancelButton}
                      textStyle={styles.calendarCancelButtonText}
                      accessibilityLabel="Close timer date selection"
                    />
                  </View>
                </View>
              </View>
            </Modal>

            <Modal
              visible={showPhaseTimePicker !== null}
              transparent
              animationType="fade"
              onRequestClose={() => setShowPhaseTimePicker(null)}
            >
              <View style={styles.calendarOverlay}>
                <View style={styles.calendarModal}>
                  <AppText variant="body" style={styles.calendarTitle}>
                    {showPhaseTimePicker === "planning"
                      ? "Select planning end time"
                      : "Select voting end time"}
                  </AppText>

                  <View style={styles.timeModalContent}>
                    <AppText variant="caption" style={styles.timeModalHint}>
                      Enter the exact time in 24-hour format
                    </AppText>

                    <View style={styles.timeInputModalBox}>
                      <TextInput
                        value={tempPhaseTime}
                        onChangeText={(value) =>
                          setTempPhaseTime(normalizeTimeInput(value))
                        }
                        placeholder="HH:MM"
                        placeholderTextColor={colors.textMuted}
                        keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                        maxLength={5}
                        style={styles.timeInputModal}
                        textAlign="center"
                        accessibilityLabel="Enter time in HH colon MM format"
                      />
                      <Timer width={20} height={20} />
                    </View>
                  </View>

                  <View style={styles.calendarActions}>
                    <AppButton
                      title="Cancel"
                      onPress={() => setShowPhaseTimePicker(null)}
                      style={styles.calendarCancelButton}
                      textStyle={styles.calendarCancelButtonText}
                      accessibilityLabel="Cancel time selection"
                    />
                    <AppButton
                      title="Apply time"
                      onPress={handleApplyPhaseTime}
                      style={styles.calendarApplyButton}
                      textStyle={styles.calendarApplyButtonText}
                      accessibilityLabel="Apply selected time"
                    />
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Step 4 — share code
  if (step === 4) {
    return (
      <View style={[styles.fullScreen, styles.bgStep1]}>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <View style={[styles.root, styles.bgStep1]}>
            <View
              style={[styles.curlyOrangeWrapper, { pointerEvents: "none" }]}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
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
                <View
                  style={styles.headerTitle}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                >
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
                <View
                  style={styles.fieldLabelRow}
                  accessible={false}
                  importantForAccessibility="no-hide-descendants"
                >
                  <KeyFrame width={20} height={20} />
                  <AppText variant="body" style={styles.fieldLabel}>
                    Code
                  </AppText>
                </View>

                <Pressable
                  style={styles.codeInput}
                  onPress={handleCopyCode}
                  accessibilityRole="button"
                  accessibilityLabel={copied ? "Trip code copied" : "Copy trip code"}
                  accessibilityHint="Copies the trip invite code to your clipboard"
                >
                  <AppText
                    variant="body"
                    style={styles.codeText}
                    accessible={false}
                  >
                    {tripCode}
                  </AppText>
                  <View
                    style={styles.copyActionArea}
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                  >
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

            <View
              style={[styles.continueWrapper, { pointerEvents: "box-none" }]}
            >
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

  // Steps 1 and 2
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
                    <View
                      style={styles.headerTitle}
                      accessible={false}
                      importantForAccessibility="no-hide-descendants"
                    >
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
                    <View
                      style={styles.fieldLabelRow}
                      accessible={false}
                      importantForAccessibility="no-hide-descendants"
                    >
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

              <View
                style={[styles.continueWrapper, { pointerEvents: "box-none" }]}
              >
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
                style={[styles.cityScapeWrapper, { pointerEvents: "none" }]}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
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
                style={[styles.curlyWrapper, { pointerEvents: "none" }]}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
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
                    <View
                      style={styles.headerTitle}
                      accessible={false}
                      importantForAccessibility="no-hide-descendants"
                    >
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
                    <View
                      style={styles.fieldLabelRow}
                      accessible={false}
                      importantForAccessibility="no-hide-descendants"
                    >
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
                    <View
                      style={styles.fieldLabelRow}
                      accessible={false}
                      importantForAccessibility="no-hide-descendants"
                    >
                      <Calendar width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>
                        Trip date
                      </AppText>
                    </View>

                    {/* Fix 9: context-aware label */}
                    <Pressable
                      style={styles.dateInput}
                      onPress={openTripCalendar}
                      accessibilityRole="button"
                      accessibilityLabel={`Trip start date, currently ${formatDate(tripStart)}. Tap to change`}
                      accessibilityHint="Opens the calendar to select a date range"
                    >
                      <AppText variant="body" style={styles.dateText}>
                        {formatDate(tripStart)} - {formatDate(tripEnd)}
                      </AppText>
                      <View
                        accessible={false}
                        importantForAccessibility="no-hide-descendants"
                      >
                        <Calendar width={20} height={20} />
                      </View>
                    </Pressable>
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

          <Modal
            visible={showTripCalendar}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTripCalendar(false)}
          >
            <View style={styles.calendarOverlay}>
              <View style={styles.calendarModal}>
                <AppText variant="body" style={styles.calendarTitle}>
                  Select your trip dates
                </AppText>

                <RangeCalendar
                  markingType="period"
                  minDate={toLocalDateString(new Date())}
                  markedDates={markedTripDates}
                  onDayPress={handleTripDayPress}
                  enableSwipeMonths
                  hideExtraDays
                  firstDay={1}
                  renderArrow={(direction) => (
                    <AppText variant="body" style={styles.calendarArrow}>
                      {direction === "left" ? "‹" : "›"}
                    </AppText>
                  )}
                  theme={{
                    backgroundColor: colors.lightWhite,
                    calendarBackground: colors.lightWhite,
                    textSectionTitleColor: colors.textMuted,
                    dayTextColor: colors.nightBlack,
                    textDisabledColor: colors.textMuted,
                    monthTextColor: colors.nightBlack,
                    arrowColor: colors.nightBlack,
                    todayTextColor: colors.sunsetOrange,
                    textDayFontFamily: typography.fontFamily.body,
                    textMonthFontFamily: typography.fontFamily.bodyBold,
                    textDayHeaderFontFamily: typography.fontFamily.bodyBold,
                    textDayFontSize: typography.size.md,
                    textMonthFontSize: typography.size.lg,
                    textDayHeaderFontSize: typography.size.sm,
                  }}
                  style={styles.calendarCard}
                />

                <View style={styles.calendarActions}>
                  <AppButton
                    title="Cancel"
                    onPress={() => setShowTripCalendar(false)}
                    style={styles.calendarCancelButton}
                    textStyle={styles.calendarCancelButtonText}
                    accessibilityLabel="Cancel date selection"
                  />
                  <AppButton
                    title="Apply dates"
                    onPress={applyTripRange}
                    style={styles.calendarApplyButton}
                    textStyle={styles.calendarApplyButtonText}
                    accessibilityLabel="Apply selected trip dates"
                  />
                </View>
              </View>
            </View>
          </Modal>
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
  updateButtonVoting: {
    backgroundColor: colors.sunsetPink,
  },

  updateButtonPlanning: {
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
  calendarOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  calendarModal: {
    backgroundColor: colors.lightWhite,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.nightBlack,
  },
  calendarTitle: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  calendarCard: {
    paddingBottom: spacing.sm,
  },
  calendarArrow: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    paddingHorizontal: spacing.sm,
  },
  calendarLegend: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 16,
    height: 16,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.nightBlack,
  },
  legendLabel: {
    color: colors.nightBlack,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    fontFamily: typography.fontFamily.body,
  },
  calendarActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  calendarCancelButton: {
    flex: 1,
    backgroundColor: colors.beachYellow,
  },
  calendarCancelButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  calendarApplyButton: {
    flex: 1,
    backgroundColor: colors.sunsetOrange,
  },
  calendarApplyButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  timeModalContent: {
    gap: spacing.md,
  },
  timeModalHint: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.body,
  },
  timeInputModalBox: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.nightBlack,
    minHeight: 64,
  },
  timeInputModal: {
    flex: 1,
    minHeight: 44,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  quickTimeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  quickTimeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.nightBlack,
  },
  quickTimeChipActive: {
    backgroundColor: colors.beachYellow,
  },
  quickTimeChipText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  quickTimeChipTextActive: {
    color: colors.nightBlack,
  },
});