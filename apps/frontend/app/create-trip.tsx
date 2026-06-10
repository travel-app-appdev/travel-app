import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { createTrip, updateMemberPreferences } from "@/src/api/trips";
import { PreferenceChips } from "@/src/components/common/PreferenceChips";
import { auth } from "@/src/lib/firebase";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Modal,
  TextInput,
  Animated,
  Text,
  useWindowDimensions,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar as RangeCalendar } from "react-native-calendars";
import { AppText } from "@/src/components/common/AppText";
import { AppInput } from "@/src/components/common/AppInput";
import { AppButton } from "@/src/components/common/AppButton";
import { BackLink } from "@/src/components/common/BackLink";
import { colors, spacing, radius, typography } from "@/src/theme";
import { useSinglePress } from "@/src/hooks/useSinglePress";
import { PressLock } from "@/src/utils/PressLock";
import { toLocalDateString } from "@/src/utils/tripDate";
import { invalidateTripsCache } from "./home";
import Plane from "@/assets/icons/plane.svg";
import LeafUp from "@/assets/visuals/leaf_up.svg";
import LeafDown from "@/assets/visuals/leaf_down.svg";
import CityScape from "@/assets/visuals/city_scape.svg";
import CurlyYellow from "@/assets/visuals/curly-yellow.svg";
import CurlyOrange from "@/assets/visuals/curly-orange.svg";
import Location from "@/assets/icons/location.svg";
import ShareLink from "@/assets/icons/share_link.svg";
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
import Question from "@/assets/icons/question.svg";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";

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

function addMinutesFromNow(minutes: number): Date {
  const next = new Date();
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

function formatTimeValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getFutureTimeForDate(
  date: Date,
  preferredTime: string,
  minutesAhead: number
): string {
  const preferredEnd = new Date(combineDateAndTime(date, preferredTime));
  if (preferredEnd > new Date()) return preferredTime;

  const fallback = addMinutesFromNow(minutesAhead);
  return isSameLocalDate(date, fallback)
    ? formatTimeValue(fallback)
    : preferredTime;
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

const CalendarModalWrapper = ({
                                children,
                                isLandscape,
                              }: {
  children: React.ReactNode;
  isLandscape: boolean;
}) => (
  <SafeAreaView
    style={styles.modalSafeArea}
    edges={["top", "right", "bottom", "left"]}
  >
    <View style={styles.calendarOverlay}>
      <ScrollView
        contentContainerStyle={[
          { flexGrow: 1 },
          isLandscape
            ? { justifyContent: "flex-start" }
            : { justifyContent: "center" },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.calendarModal}>{children}</View>
      </ScrollView>
    </View>
  </SafeAreaView>
);

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
    <View style={styles.progressBarContainer}>
      <View
        style={{
          width: "100%",
          height: 8,
          borderRadius: 8,
          backgroundColor:
            currentStep === 3 ? colors.grayedOut : colors.lightWhite,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            height: "100%",
            borderRadius: 8,
            backgroundColor: colors.seaBlue,
            width: progressWidth,
          }}
        />
      </View>
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

function StickyHeader({
  backgroundStyle,
  showBack = true,
  onBackPress,
  progressWidth,
  currentStep,
  totalSteps,
}: {
  backgroundStyle: any;
  showBack?: boolean;
  onBackPress?: () => void;
  progressWidth: Animated.AnimatedInterpolation<string>;
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <View style={[styles.stickyHeaderBlock, backgroundStyle]}>
      <View style={styles.header}>
        {showBack && (
          <View style={styles.backButtonSlot}>
            <BackLink onPress={onBackPress} />
          </View>
        )}

        <View style={styles.headerTitle} {...hiddenFromAccessibility}>
          <View style={styles.planeWrap}>
            <Plane width={25} height={25} />
          </View>
          <AppText variant="body" style={styles.headerLabel}>
            Create trip
          </AppText>
        </View>
      </View>

      <View style={styles.progressWrap}>
        <ProgressBar
          progressWidth={progressWidth}
          currentStep={currentStep}
          totalSteps={totalSteps}
        />
      </View>
    </View>
  );
}

export default function CreateTripScreen() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [destination, setDestination] = useState("");
  const [tripName, setTripName] = useState("");
  const [tripStart, setTripStart] = useState<Date>(new Date());
  const [tripEnd, setTripEnd] = useState<Date>(new Date());

  const [showTripCalendar, setShowTripCalendar] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(
    toLocalDateString(new Date())
  );
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const [tripCode, setTripCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showOnboardingHint, setShowOnboardingHint] = useState(false);
  const [showNotLoggedInModal, setShowNotLoggedInModal] = useState(false);

  const blinkingDotAnim = useRef(new Animated.Value(2)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkingDotAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(blinkingDotAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [blinkingDotAnim]);

  const disabledTripOrange = "#facbb8";
  const disabledPlanningYellow = "#F6E08F";

  const [activePhaseCalendar, setActivePhaseCalendar] =
    useState<PhaseKey | null>(null);

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

  const [phaseDates, setPhaseDates] = useState<PhaseDates>(() => {
    const planningEnd = addMinutesFromNow(60);
    const votingEnd = addMinutesFromNow(120);

    return {
      planning: {
        start: new Date(),
        end: planningEnd,
        time: formatTimeValue(planningEnd),
      },
      voting: {
        start: planningEnd,
        end: votingEnd,
        time: formatTimeValue(votingEnd),
      },
      final: { start: votingEnd, end: votingEnd, time: "00:00" },
    };
  });

  const handleQuestionPress = useCallback(() => {
    if (!PressLock.acquire()) return;
    Promise.resolve()
      .then(() => setShowOnboardingHint((prev) => !prev))
      .finally(() => setTimeout(() => PressLock.release(), 300));
  }, []);

  const [phaseUpdated, setPhaseUpdated] = useState<Record<string, boolean>>({});
  const [openPhase, setOpenPhase] = useState<PhaseKey | null>(null);
  const [showPhaseDateCalendar, setShowPhaseDateCalendar] =
    useState<PhaseKey | null>(null);
  const [showPhaseTimePicker, setShowPhaseTimePicker] =
    useState<PhaseKey | null>(null);
  const [tempPhaseTime, setTempPhaseTime] = useState("12:00");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);

  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  const handleOnboardingPress = useCallback(() => {
    if (!PressLock.acquire()) return;
    Promise.resolve()
      .then(() =>
        router.push({
          pathname: "/onboarding",
          params: { returnTo: "create-trip" },
        })
      )
      .finally(() => setTimeout(() => PressLock.release(), 300));
  }, [router]);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const cityScapeHeight = width * (221 / 393);
  const curlySize = width * 1.1;

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

  const handleShareCode = useSinglePress(async () => {
    try {
      await Share.share({
        message: `Join my trip on Votey! Use invite code: ${tripCode} or open: https://cc231023-11019.node.ustp.cloud/invite?code=${tripCode}`,
      });
    } catch {}
  });

  const syncPhasesFromTripDates = (nextTripStart: Date, nextTripEnd: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const planningStart = today;
    const planningEnd = nextTripStart < today ? today : nextTripStart;
    const votingStart = planningEnd;
    const votingEnd = planningEnd;

    setPhaseDates((prev) => {
      const planningTime = getFutureTimeForDate(
        planningEnd,
        prev.planning.time || "12:00",
        60
      );
      const planningEndAt = new Date(
        combineDateAndTime(planningEnd, planningTime)
      );
      const preferredVotingTime = prev.voting.time || "18:00";
      const preferredVotingEnd = new Date(
        combineDateAndTime(votingEnd, preferredVotingTime)
      );
      const votingFallback = new Date(planningEndAt);
      votingFallback.setMinutes(votingFallback.getMinutes() + 60);
      const votingTime =
        preferredVotingEnd > planningEndAt ||
        !isSameLocalDate(votingEnd, votingFallback)
          ? preferredVotingTime
          : formatTimeValue(votingFallback);

      return {
        planning: {
          start: planningStart,
          end: planningEnd,
          time: planningTime,
        },
        voting: {
          start: votingStart,
          end: votingEnd,
          time: votingTime,
        },
        final: {
          start: votingEnd,
          end: votingEnd,
          time: "00:00",
        },
      };
    });
  };

  const openTripCalendar = () => {
    setRangeStart(toLocalDateString(tripStart));
    setRangeEnd(null);
    setShowTripCalendar(true);
  };

  const handleOpenTripCalendar = useSinglePress(openTripCalendar);

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
      if (selected === rangeStart) return;
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
    setActivePhaseCalendar(phaseId);
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
      if (selectedDate < today || selectedDate > tripEndOnly) return;

      setPhaseDates((prev) => ({
        ...prev,
        planning: { ...prev.planning, end: selectedDate },
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
      if (selectedDate < planningEndOnly || selectedDate > tripEndOnly) return;

      setPhaseDates((prev) => ({
        ...prev,
        voting: { ...prev.voting, end: selectedDate },
        final: { ...prev.final, start: selectedDate, end: selectedDate },
      }));
    }
  };

  const getPhaseMarkedDates = useMemo(() => {
    const isPlanningEditor = showPhaseDateCalendar === "planning";
    const isVotingEditor = showPhaseDateCalendar === "voting";

    const tripRange = getMarkedRange(
      toLocalDateString(tripStart),
      toLocalDateString(tripEnd),
      isPlanningEditor || isVotingEditor
        ? disabledTripOrange
        : colors.sunsetOrange,
      isPlanningEditor || isVotingEditor
        ? disabledTripOrange
        : colors.sunsetOrange
    );

    const planningRange = getMarkedRange(
      toLocalDateString(phaseDates.planning.start),
      toLocalDateString(phaseDates.planning.end),
      isVotingEditor ? disabledPlanningYellow : colors.beachYellow,
      isVotingEditor ? disabledPlanningYellow : colors.beachYellow
    );

    const votingRange = getMarkedRange(
      toLocalDateString(phaseDates.voting.start),
      toLocalDateString(phaseDates.voting.end),
      colors.sunsetPink,
      colors.sunsetPink
    );

    if (isPlanningEditor) return { ...tripRange, ...planningRange };
    if (isVotingEditor) return { ...tripRange, ...planningRange, ...votingRange };
    return tripRange;
  }, [
    showPhaseDateCalendar,
    phaseDates,
    tripStart,
    tripEnd,
    disabledTripOrange,
    disabledPlanningYellow,
  ]);

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
        if (nextEnd <= new Date()) {
          Alert.alert(
            "Invalid planning end",
            "Planning end must be in the future."
          );
          return;
        }
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
        setPhaseDates((prev: PhaseDates) => ({
          ...prev,
          voting: { ...prev.voting, end: phase.end, time: phase.time },
          final: {
            ...prev.final,
            start: phase.end,
            end: phase.end,
          },
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
      setShowNotLoggedInModal(true);
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

      if (planningEnd <= new Date()) {
        Alert.alert(
          "Invalid planning end",
          "Planning end must be in the future."
        );
        return;
      }

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
        start_date: toLocalDateString(tripStart),
        end_date: toLocalDateString(tripEnd),
        planning_end_at: combineDateAndTime(
          phaseDates.planning.end,
          phaseDates.planning.time
        ),
        voting_end_at: combineDateAndTime(
          phaseDates.voting.end,
          phaseDates.voting.time
        ),
      });

      invalidateTripsCache();
      setTripCode(result.invite_code ?? "");
      setCreatedTripId(result.trip_id ?? null);
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
  }, [step, progress]);

  const progressAnim = progress.interpolate({
    inputRange: [1, TOTAL_STEPS],
    outputRange: ["25%", "100%"],
  });

  if (step === 3) {
    return (
      <View style={[styles.fullScreen, styles.bgStep3]}>
        <SafeAreaView
          style={styles.safeArea}
          edges={["top", "left", "right", "bottom"]}
        >
          <View style={[styles.root, styles.bgStep3]}>
            <ScrollView
              stickyHeaderIndices={[0]}
              contentContainerStyle={styles.containerStep3}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <StickyHeader
                backgroundStyle={styles.headerStep3}
                onBackPress={() => setStep(2)}
                progressWidth={progressAnim}
                currentStep={step}
                totalSteps={TOTAL_STEPS}
              />

              <AppText variant="title" style={styles.titleStep3}>
                Set up the timers
              </AppText>

              <View style={styles.setupSection}>
                {showOnboardingHint && (
                  <View style={styles.onboardingTooltip}>
                    <AppText variant="body" style={styles.onboardingTooltipText}>
                      Need a refresher? Open{" "}
                      <AppText
                        variant="body"
                        style={styles.onboardingTooltipLink}
                        onPress={handleOnboardingPress}
                        accessibilityRole="link"
                      >
                        onboarding
                      </AppText>{" "}
                      to see how planning, voting, and the final itinerary work.
                    </AppText>
                  </View>
                )}

                <View style={styles.setupRow}>
                  <AppText variant="body" style={styles.setupText}>
                    Set an end time for each state so the next one starts
                    automatically.
                  </AppText>
                  <Pressable
                    style={styles.questionButton}
                    onPress={handleQuestionPress}
                    accessibilityRole="button"
                    accessibilityLabel="Show timer setup help"
                    accessibilityHint="Shows a short explanation and link to onboarding"
                  >
                    <Question width={24} height={24} />
                  </Pressable>
                </View>
              </View>

              {TIMER_PHASES.map((phase) => {
                const phaseId = phase.id as PhaseKey;
                const isOpen = openPhase === phaseId;
                const dates = phaseDates[phaseId];
                const days = phase.active
                  ? calcDaysLeft(dates.end)
                  : calcCalendarDays(dates.start, dates.end);

                return (
                  <View key={phaseId} style={styles.phaseGroup}>
                    <Pressable
                      style={styles.phaseRow}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => togglePhase(phaseId)}
                      accessibilityRole="button"
                      accessibilityLabel={`${phase.label} phase, ${dayLabel(
                        days,
                        phase.active
                      )}`}
                      accessibilityHint={`Tap to edit ${phase.label} end date and time`}
                      accessibilityState={{ expanded: isOpen }}
                    >
                      <View
                        style={styles.phaseLeft}
                        {...hiddenFromAccessibility}
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
                              <Hourglass1 width={24} height={24} />
                            ) : (
                              <Hourglass0 width={24} height={24} />
                            )}
                          </View>
                          <View style={styles.phaseTextCol}>
                            <View style={styles.daysRow}>
                              <AppText variant="body" style={styles.phaseDays}>
                                {dayLabel(days, phase.active)}
                              </AppText>
                              {phase.active && (
                                <Animated.View
                                  style={[
                                    styles.timepointWrapper,
                                    { opacity: blinkingDotAnim },
                                  ]}
                                >
                                  <Timepoint width={7} height={7} />
                                </Animated.View>
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

                      <View {...hiddenFromAccessibility}>
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
                          <Pressable
                            style={[styles.dateInput, styles.dateTimeHalf]}
                            onPress={() => openPhaseCalendar(phaseId)}
                            accessibilityRole="button"
                            accessibilityLabel={`${phase.label} end date, currently ${formatDateDisplay(
                              dates.end
                            )}. Tap to change`}
                          >
                            <AppText variant="body" style={styles.dateText}>
                              {formatDateDisplay(dates.end)}
                            </AppText>
                            <View {...hiddenFromAccessibility}>
                              <Calendar width={18} height={18} />
                            </View>
                          </Pressable>

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
                            <View {...hiddenFromAccessibility}>
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
                            {...hiddenFromAccessibility}
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

              <View style={styles.finalInfoBox} {...hiddenFromAccessibility}>
                <Info width={24} height={24} />
                <AppText variant="body" style={styles.finalInfoText}>
                  Final itinerary is shown automatically after Voting ends.
                </AppText>
              </View>
            </ScrollView>

            <View style={styles.step3Footer}>
              <AppButton
                title={isCreating ? "Continuing..." : "Continue"}
                onPress={handleCreateTrip}
                loading={isCreating}
                disabled={isCreating}
                style={styles.nextButton}
                textStyle={styles.nextButtonText}
                accessibilityLabel={
                  isCreating ? "Continuing" : "Continue"
                }
              />
            </View>

            <Modal
              visible={showPhaseDateCalendar !== null}
              transparent
              animationType="fade"
              statusBarTranslucent
              onRequestClose={() => setShowPhaseDateCalendar(null)}
            >
              <CalendarModalWrapper isLandscape={isLandscape}>
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
                        {
                          backgroundColor:
                            showPhaseDateCalendar === "planning" ||
                            showPhaseDateCalendar === "voting"
                              ? disabledTripOrange
                              : colors.sunsetOrange,
                        },
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
                        {
                          backgroundColor:
                            showPhaseDateCalendar === "voting"
                              ? disabledPlanningYellow
                              : colors.beachYellow,
                        },
                      ]}
                    />
                    <AppText variant="caption" style={styles.legendLabel}>
                      Planning state
                    </AppText>
                  </View>

                  {showPhaseDateCalendar === "voting" && (
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
                  )}
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
              </CalendarModalWrapper>
            </Modal>

            <Modal
              visible={showPhaseTimePicker !== null}
              transparent
              animationType="fade"
              statusBarTranslucent
              onRequestClose={() => setShowPhaseTimePicker(null)}
            >
              <CalendarModalWrapper isLandscape={isLandscape}>
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
                      keyboardType={
                        Platform.OS === "ios"
                          ? "numbers-and-punctuation"
                          : "numeric"
                      }
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
              </CalendarModalWrapper>
            </Modal>

            <Modal
              visible={showNotLoggedInModal}
              transparent
              animationType="fade"
              statusBarTranslucent
              onRequestClose={() => setShowNotLoggedInModal(false)}
            >
              <SafeAreaView
                style={styles.modalSafeArea}
                edges={["top", "right", "bottom", "left"]}
              >
                <View style={styles.calendarOverlay}>
                  <View style={styles.authModal}>
                    <AppText variant="body" style={styles.calendarTitle}>
                      Not logged in
                    </AppText>

                    <AppText variant="caption" style={styles.authModalText}>
                      Please log in again and try creating a trip.
                    </AppText>

                    <View style={styles.authModalActions}>
                      <AppButton
                        title="Okay"
                        onPress={() => setShowNotLoggedInModal(false)}
                        style={styles.authModalButton}
                        textStyle={styles.authModalButtonText}
                        accessibilityLabel="Close not logged in popup"
                      />
                    </View>
                  </View>
                </View>
              </SafeAreaView>
            </Modal>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (step === 4) {
    const handlePreferencesContinue = async () => {
      if (isSavingPrefs) return;
      if (createdTripId && preferences.length > 0) {
        try {
          setIsSavingPrefs(true);
          const currentUser = auth.currentUser;
          if (currentUser) {
            const token = await currentUser.getIdToken();
            await updateMemberPreferences(createdTripId, preferences, token);
          }
        } catch {
          // non-blocking
        } finally {
          setIsSavingPrefs(false);
        }
      }
      setStep(5);
    };

    return (
      <View style={styles.prefsScreen}>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          {/* Decorative leaves */}
          <View
            style={[styles.prefsLeafTopRight, { pointerEvents: "none" }]}
            {...hiddenFromAccessibility}
          >
            <LeafUp width={width * 0.38} height={width * 0.38} />
          </View>
          <View
            style={[styles.prefsLeafBottomLeft, { pointerEvents: "none" }]}
            {...hiddenFromAccessibility}
          >
            <LeafDown width={width * 0.42} height={width * 0.42} />
          </View>

          {/* Progress bar only — no full StickyHeader */}
          <View style={styles.prefsProgressBlock}>
            <ProgressBar
              progressWidth={progressAnim}
              currentStep={step}
              totalSteps={TOTAL_STEPS}
            />
          </View>

          <ScrollView
            style={styles.prefsScroll}
            contentContainerStyle={styles.prefsContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back button */}
            <Pressable
              onPress={() => setStep(3)}
              style={styles.prefsBackBtn}
              accessibilityRole="button"
              accessibilityLabel="Back to timers"
            >
              <View {...hiddenFromAccessibility}>
                <AppText variant="body" style={styles.prefsBackArrow}>‹</AppText>
              </View>
            </Pressable>

            {/* Title block */}
            <View style={styles.prefsTitleBlock}>
              <AppText variant="title" style={styles.prefsTitle}>
                Your preferences
              </AppText>
              <AppText variant="body" style={styles.prefsSubtitle}>
                What do you enjoy{" "}
                <AppText variant="body" style={styles.prefsSubtitleBold}>
                  most?
                </AppText>
              </AppText>
              <AppText variant="caption" style={styles.prefsHintText}>
                {"Pick up to 5 categories. We'll use them to suggest activities for your trip."}
              </AppText>
            </View>

            {/* Chips */}
            <PreferenceChips
              selected={preferences}
              onChange={setPreferences}
              showGroups
            />

            <View style={styles.prefsSpacer} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.prefsFooter}>
            <Pressable
              onPress={handlePreferencesContinue}
              disabled={isSavingPrefs}
              style={[styles.prefsContinueBtn, isSavingPrefs && styles.prefsContinueBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              {isSavingPrefs ? (
                <ActivityIndicator color={colors.lightWhite} />
              ) : (
                <AppText variant="body" style={styles.prefsContinueBtnText}>
                  Continue
                </AppText>
              )}
            </Pressable>
            <Pressable
              onPress={() => setStep(5)}
              style={styles.prefsSkipBtn}
              accessibilityRole="button"
              accessibilityLabel="Skip"
            >
              <AppText variant="body" style={styles.prefsSkipText}>
                Skip for now
              </AppText>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (step === 5) {
    return (
      <View style={[styles.fullScreen, styles.bgStep1]}>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <View style={[styles.root, styles.bgStep1]}>
            <View
              style={[
                styles.curlyOrangeWrapper,
                {
                  width: curlySize,
                  height: curlySize,
                  bottom: -width * 0.3,
                  left: -width * 0.1,
                  pointerEvents: "none",
                },
              ]}
              {...hiddenFromAccessibility}
            >
              <CurlyOrange width={curlySize} height={curlySize} />
            </View>

            <ScrollView
              style={styles.scroll}
              stickyHeaderIndices={[0]}
              contentContainerStyle={[
                styles.containerStep4,
                { paddingBottom: isLandscape ? spacing.xxxl : spacing.xl },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <StickyHeader
                backgroundStyle={styles.headerStep1}
                onBackPress={() => router.replace("/home")}
                progressWidth={progressAnim}
                currentStep={step}
                totalSteps={TOTAL_STEPS}
              />

              <AppText variant="title" style={styles.titleStep3}>
                Add members to the trip
              </AppText>

              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow} {...hiddenFromAccessibility}>
                  <KeyFrame width={20} height={20} />
                  <AppText variant="body" style={styles.fieldLabel}>
                    Invite-Code
                  </AppText>
                </View>

                <Pressable
                  style={styles.codeInput}
                  onPress={handleShareCode}
                  accessibilityRole="button"
                  accessibilityLabel="Share trip invite code"
                  accessibilityHint="Opens the share sheet to invite members"
                >
                  <AppText
                    variant="body"
                    style={styles.codeText}
                    accessible={false}
                  >
                    {tripCode}
                  </AppText>
                  <View
                    style={styles.shareIconArea}
                    {...hiddenFromAccessibility}
                  >
                    <ShareLink width={22} height={22} />
                  </View>
                </Pressable>

                <AppText variant="caption" style={styles.codeCaption}>
                  Share the trip with your members.
                </AppText>
              </View>

              <View style={styles.inlineButtonWrapper}>
                <AppButton
                  title="Create trip"
                  onPress={() => router.replace("/home")}
                  style={styles.backToLandingButton}
                  textStyle={styles.backToLandingText}
                  accessibilityLabel="Create trip"
                />
              </View>
            </ScrollView>
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
                  stickyHeaderIndices={[0]}
                  contentContainerStyle={[
                    styles.containerStep1,
                    { paddingBottom: cityScapeHeight + spacing.xxxl },
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <StickyHeader
                    backgroundStyle={styles.headerStep1}
                    onBackPress={() => router.replace("/home")}
                    progressWidth={progressAnim}
                    currentStep={step}
                    totalSteps={TOTAL_STEPS}
                  />

                  <AppText variant="title" style={styles.titleStep1}>
                    Where is your trip taking place?
                  </AppText>

                  <View style={[styles.fieldGroup, { marginTop: 20 }]}>
                    <View
                      style={styles.fieldLabelRow}
                      {...hiddenFromAccessibility}
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

                  <View style={styles.inlineButtonWrapper}>
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
                </ScrollView>
              </KeyboardAvoidingView>

              {!isLandscape && (
                <View
                  style={[
                    styles.cityScapeWrapper,
                    {
                      width,
                      height: cityScapeHeight,
                      bottom: 0,
                      left: 0,
                      pointerEvents: "none",
                    },
                  ]}
                  {...hiddenFromAccessibility}
                >
                  <CityScape width={width} height={cityScapeHeight} />
                </View>
              )}
            </>
          ) : (
            <>
              <View
                style={[
                  styles.curlyWrapper,
                  {
                    width: curlySize,
                    height: curlySize,
                    bottom: -width * 0.3,
                    left: -width * 0.1,
                    pointerEvents: "none",
                  },
                ]}
                {...hiddenFromAccessibility}
              >
                <CurlyYellow width={curlySize} height={curlySize} />
              </View>

              <KeyboardAvoidingView
                style={styles.scroll}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                <ScrollView
                  stickyHeaderIndices={[0]}
                  contentContainerStyle={[
                    styles.containerStep2,
                    { paddingBottom: spacing.xxxl + width * 0.18 },
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <StickyHeader
                    backgroundStyle={styles.headerStep2}
                    onBackPress={() => setStep(1)}
                    progressWidth={progressAnim}
                    currentStep={step}
                    totalSteps={TOTAL_STEPS}
                  />

                  <AppText variant="title" style={styles.titleStep2}>
                    Give your trip a name and choose a date
                  </AppText>

                  <View style={[styles.fieldGroup, styles.tripNameGroup]}>
                    <View
                      style={styles.fieldLabelRow}
                      {...hiddenFromAccessibility}
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
                      {...hiddenFromAccessibility}
                    >
                      <Calendar width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>
                        Trip date
                      </AppText>
                    </View>

                    <Pressable
                      style={styles.dateInput}
                      onPress={handleOpenTripCalendar}
                      accessibilityRole="button"
                      accessibilityLabel={`Trip start date, currently ${formatDate(
                        tripStart
                      )}. Tap to change`}
                      accessibilityHint="Opens the calendar to select a date range"
                    >
                      <AppText variant="body" style={styles.dateText}>
                        {formatDate(tripStart)} - {formatDate(tripEnd)}
                      </AppText>
                      <View {...hiddenFromAccessibility}>
                        <Calendar width={20} height={20} />
                      </View>
                    </Pressable>
                  </View>

                  <View style={styles.inlineButtonWrapper}>
                    <AppButton
                      title="Continue"
                      onPress={handleContinueToTimers}
                      disabled={!tripName.trim()}
                      style={styles.createButton}
                      textStyle={styles.createButtonText}
                      accessibilityLabel="Continue to timer setup"
                    />
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </>
          )}

          <Modal
            visible={showTripCalendar}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setShowTripCalendar(false)}
          >
            <CalendarModalWrapper isLandscape={isLandscape}>
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
            </CalendarModalWrapper>
          </Modal>

          <Modal
            visible={showNotLoggedInModal}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setShowNotLoggedInModal(false)}
          >
            <SafeAreaView
              style={styles.modalSafeArea}
              edges={["top", "right", "bottom", "left"]}
            >
              <View style={styles.calendarOverlay}>
                <View style={styles.authModal}>
                  <AppText variant="body" style={styles.calendarTitle}>
                    Not logged in
                  </AppText>

                  <AppText variant="caption" style={styles.authModalText}>
                    Please log in again and try creating a trip.
                  </AppText>

                  <View style={styles.authModalActions}>
                    <AppButton
                      title="Okay"
                      onPress={() => setShowNotLoggedInModal(false)}
                      style={styles.authModalButton}
                      textStyle={styles.authModalButtonText}
                      accessibilityLabel="Close not logged in popup"
                    />
                  </View>
                </View>
              </View>
            </SafeAreaView>
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
    paddingTop: 0,
    gap: spacing.sm,
  },
  containerStep2: {
    paddingHorizontal: spacing.xl,
    paddingTop: 0,
    gap: spacing.sm,
  },
  containerStep3: {
    paddingHorizontal: spacing.xl,
    paddingTop: 0,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  containerStep4: {
    paddingHorizontal: spacing.xl,
    paddingTop: 0,
    gap: spacing.sm,
  },
  stickyHeaderBlock: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.beachYellow,
    zIndex: 20,
    elevation: 0,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  header: {
    position: "relative",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  headerStep1: {
    backgroundColor: colors.beachYellow,
  },
  headerStep2: {
    backgroundColor: colors.sunsetOrange,
  },
  headerStep3: {
    backgroundColor: colors.lightWhite,
  },
  backButtonSlot: {
    position: "absolute",
    left: 0,
    top: 2,
    bottom: 0,
    justifyContent: "center",
    alignItems: "flex-start",
    zIndex: 2,
  },
  planeWrap: {
    justifyContent: "center",
    alignItems: "center",
    transform: [{ translateY: -1 }],
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    alignSelf: "center",
  },
  headerLabel: {
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.textPrimary,
    textAlignVertical: "center",
  },
  progressWrap: {
    width: "100%",
    marginTop: spacing.xs,
  },
  progressBarContainer: {
    width: "100%",
  },
  titleStep1: {
    fontFamily: typography.fontFamily.bodyBlack,
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displaySm,
    color: colors.textPrimary,
    textAlign: "left",
    alignSelf: "stretch",
    marginBottom: spacing.xl,
  },
  titleStep2: {
    fontFamily: typography.fontFamily.bodyBlack,
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displaySm,
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
    textAlign: "left",
    alignSelf: "stretch",
  },
  titleStep3: {
    fontFamily: typography.fontFamily.bodyBlack,
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displaySm,
    color: colors.textPrimary,
    textAlign: "left",
    alignSelf: "stretch",
    marginBottom: spacing.xxl,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  phaseGroup: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
  tripNameGroup: {
    marginBottom: spacing.sm,
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
    backgroundColor: colors.lightWhite,
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
  shareIconArea: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32,
    minHeight: 32,
  },
  codeCaption: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.body,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  inlineButtonWrapper: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
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
    zIndex: 0,
  },
  curlyWrapper: {
    position: "absolute",
    zIndex: 0,
  },
  createButton: {
    backgroundColor: colors.seaBlue,
  },
  createButtonText: {
    color: colors.lightWhite,
    fontFamily: typography.fontFamily.bodyBold,
  },
  curlyOrangeWrapper: {
    position: "absolute",
    zIndex: 0,
  },
  setupText: {
    flex: 1,
    fontSize: 18,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    lineHeight: typography.lineHeight.md,
    marginBottom: spacing.xl,
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
    borderRadius: radius.lg,
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
    color: colors.nightBlack,
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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
  modalSafeArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  calendarOverlay: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    justifyContent: "center",
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
    backgroundColor: colors.lightWhite,
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
  setupRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  onboardingTooltip: {
    position: "absolute",
    top: -100,
    right: -10,
    maxWidth: 250,
    backgroundColor: colors.nightBlack,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    zIndex: 40,
  },
  onboardingTooltipText: {
    color: colors.lightWhite,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.size.sm,
  },
  onboardingTooltipLink: {
    color: colors.beachYellow,
    textDecorationLine: "underline",
    fontSize: typography.size.sm,
    fontFamily: typography.fontFamily.bodyBold,
    lineHeight: typography.size.lg,
  },
  setupSection: {
    position: "relative",
    marginBottom: spacing.lg,
  },
  questionButton: {
    marginTop: 3,
  },
  authModal: {
    backgroundColor: colors.lightWhite,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.nightBlack,
  },
  authModalText: {
    color: colors.nightBlack,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.md,
    fontFamily: typography.fontFamily.body,
  },
  authModalActions: {
    marginTop: spacing.sm,
  },
  authModalButton: {
    backgroundColor: colors.sunsetOrange,
  },
  authModalButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  // ── Preferences step (step 4) ── matches preferences.tsx exactly
  prefsScreen: {
    flex: 1,
    backgroundColor: colors.lightWhite,
  },
  prefsLeafTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 0,
    opacity: 0.55,
  },
  prefsLeafBottomLeft: {
    position: "absolute",
    bottom: "8%",
    left: 0,
    zIndex: 0,
    opacity: 0.55,
    transform: [{ rotate: "5deg" }],
  },
  prefsProgressBlock: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    zIndex: 1,
  },
  prefsScroll: {
    flex: 1,
    zIndex: 1,
  },
  prefsContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xxl,
  },
  prefsBackBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  prefsBackArrow: {
    fontSize: 32,
    lineHeight: 36,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  prefsTitleBlock: {
    gap: spacing.sm,
  },
  prefsTitle: {
    fontFamily: typography.fontFamily.bodyBlack,
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displaySm,
    color: colors.nightBlack,
  },
  prefsSubtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.xl,
    color: colors.nightBlack,
  },
  prefsSubtitleBold: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    textDecorationLine: "underline",
    color: colors.nightBlack,
  },
  prefsHintText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.grayedOut,
    lineHeight: typography.lineHeight.md,
  },
  prefsSpacer: {
    height: spacing.xl,
  },
  prefsFooter: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
    zIndex: 1,
    backgroundColor: colors.lightWhite,
  },
  prefsContinueBtn: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.sunsetOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  prefsContinueBtnDisabled: {
    opacity: 0.7,
  },
  prefsContinueBtnText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    color: colors.lightWhite,
  },
  prefsSkipBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  prefsSkipText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    color: colors.grayedOut,
    textDecorationLine: "underline",
  },
});
