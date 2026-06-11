import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import {
  AccessibilityInfo,
  Alert,
  findNodeHandle,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Modal,
  TextInput,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar as RangeCalendar } from "react-native-calendars";
import * as Clipboard from "expo-clipboard";
import { AppText } from "@/src/components/common/AppText";
import { AppInput } from "@/src/components/common/AppInput";
import { AppButton } from "@/src/components/common/AppButton";
import {
  ActionCard,
  ACTION_CARD_HEIGHT,
} from "@/src/components/common/ActionCard";
import { BackLink } from "@/src/components/common/BackLink";
import {
  deleteTrip,
  fetchTripForUser,
  getMemberPreferences,
  isTripNotFoundError,
  removeMember,
  updateMemberPreferences,
  updateTrip,
  type Trip,
} from "@/src/api/trips";
import { PreferenceChips } from "@/src/components/common/PreferenceChips";
import { DestinationAutocomplete } from "@/src/components/common/DestinationAutocomplete";
import { auth, db } from "@/src/lib/firebase";
import { colors, spacing, radius, typography } from "@/src/theme";
import { useSinglePress } from "@/src/hooks/useSinglePress";
import { invalidateTripsCache } from "./home";
import {
  formatTripDurationText,
  formatTripTimerText,
} from "@/src/utils/tripTimer";
import Plane from "@/assets/icons/plane.svg";
import TripTitle from "@/assets/icons/trip_title.svg";
import Calendar from "@/assets/icons/calendar.svg";
import Location from "@/assets/icons/location.svg";
import AddPeople from "@/assets/icons/add_people.svg";
import RemovePerson from "@/assets/icons/remove_person.svg";
import ArrowUp from "@/assets/icons/arrow_up.svg";
import ArrowDown from "@/assets/icons/arrow_down.svg";
import Hourglass0 from "@/assets/icons/hourglass_0.svg";
import Hourglass1 from "@/assets/icons/hourglass_1.svg";
import Timepoint from "@/assets/icons/timepoint.svg";
import CheckMark from "@/assets/icons/check_mark.svg";
import Unchecked from "@/assets/icons/unchecked.svg";
import Trash from "@/assets/icons/trash.svg";
import KeyFrame from "@/assets/icons/key_frame.svg";
import Settings from "@/assets/icons/settings.svg";
import Copy from "@/assets/icons/copy.svg";
import Timer from "@/assets/icons/timer.svg";
import ArrowItinerary from "@/assets/icons/arrow-itinerary.svg";
import VoteyYellow from "@/assets/mascots/Votey_Yellow.svg";
import VoteyPink from "@/assets/mascots/Votey_Pink.svg";
import VoteyGreen from "@/assets/mascots/Votey_Green.svg";
import VoteyBlueMemory from "@/assets/mascots/Votey-Blue-Memory.svg";
import {
  hiddenFromAccessibility,
  nativeImportantForAccessibility,
} from "@/src/utils/accessibility";
import {
  getChecklistDisplayState,
  getPhaseStatus,
  isPastTripByEndDate,
  isTripStartedByStartDate,
} from "@/src/utils/tripState";
import type { TripState } from "@/src/types/trip";

type FieldKey = "name" | "date" | "destination" | "members" | "code" | "preferences";
type PhaseKey = "planning" | "voting" | "final" | "memories";

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

type CalendarDay = {
  dateString: string;
};

type PhaseStatus = "past" | "active" | "future";

const CHECKBOX_SIZE = 24;
const TIMELINE_LINE_WIDTH = 1;

function getChecklistSubtitle(tripState: TripState): string {
  switch (tripState) {
    case "Memories":
      return "Here you can upload your photos of the trip and share it to the other members.";
    case "Voting":
      return "Vote on conflicting activities in the itinerary.";
    case "Final":
      return "Here you find your final itinerary of your group.";
    case "Planning":
    default:
      return "Let's plan your trip step by step by adding activities to your itinerary.";
  }
}

function getChecklistMascot(tripState: TripState) {
  switch (tripState) {
    case "Memories":
      return VoteyBlueMemory;
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

  if (isActive) {
    // While active: show remaining time until end
    return formatTripTimerText(phaseEnd, now);
  }

  // For past or future phases: no time remaining
  return "0 hours";
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
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

function parseTripDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const dateOnly = value.split("T")[0];
  if (!dateOnly) return fallback;
  const parsed = fromDateString(dateOnly);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function isDeadlinePast(deadline?: string): boolean {
  if (!deadline) return false;
  const parsed = new Date(deadline);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
}

function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function normalizeTimeInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
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

type MemberRowProps = {
  member: MemberParam;
  onRemove: (id: string, name: string) => void;
  isRemoving: boolean;
};

function MemberRow({ member, onRemove, isRemoving }: MemberRowProps) {
  const handleRemove = useSinglePress(() => onRemove(member.id, member.name));

  return (
    <View style={styles.memberRow}>
      <AppText variant="body" style={styles.memberName}>
        {member.name}
      </AppText>
      <Pressable
        onPress={handleRemove}
        disabled={isRemoving}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={
          isRemoving ? `Removing ${member.name}` : `Remove ${member.name}`
        }
        style={isRemoving ? styles.removingIcon : undefined}
      >
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <RemovePerson width={22} height={22} />
        </View>
      </Pressable>
    </View>
  );
}

function PhaseCheckbox({
  phaseId,
  status,
  isTripPast,
}: {
  phaseId: PhaseKey;
  status: PhaseStatus;
  isTripPast?: boolean;
}) {
  const isChecked =
    status === "past" || (status === "active" && phaseId !== "voting");
  const isMuted =
    status === "past" ||
    (phaseId === "final" && status === "active" && isTripPast);

  if (isChecked) {
    return (
      <CheckMark
        width={CHECKBOX_SIZE}
        height={CHECKBOX_SIZE}
        style={isMuted ? styles.mutedIcon : undefined}
      />
    );
  }

  return (
    <Unchecked
      width={CHECKBOX_SIZE}
      height={CHECKBOX_SIZE}
      style={status === "future" ? styles.mutedIcon : undefined}
    />
  );
}

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView
      style={styles.modalSafeArea}
      edges={["top", "right", "bottom", "left"]}
    >
      <View style={styles.calendarOverlay}>
        <View style={styles.calendarModal}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

function StickyHeader() {
  const router = useRouter();

  return (
    <View style={styles.stickyHeaderBlock}>
      <View style={styles.header}>
        <View style={styles.backButtonSlot}>
          <BackLink onPress={() => router.replace("/home")} />
        </View>

        <View style={styles.headerTitle} {...hiddenFromAccessibility}>
          <Plane width={24} height={24} />
          <AppText variant="body" style={styles.headerLabel}>
            Trip Overview
          </AppText>
        </View>
      </View>
    </View>
  );
}
export default function TripOverviewAdminScreen() {
  const raw = useLocalSearchParams<{
    tripId: string;
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    members: string;
    inviteCode: string;
    state?: TripState;
    planningStartedAt?: string;
    planningEndAt?: string;
    votingEndAt?: string;
  }>();

  const tripId = String(raw.tripId ?? "");
  const title = String(raw.title ?? "");
  const destinationParam = String(raw.destination ?? "");
  const startDate = String(raw.startDate ?? "");
  const endDate = String(raw.endDate ?? "");
  const membersParam = String(raw.members ?? "");
  const inviteCodeParam = String(raw.inviteCode ?? "");
  const initialTripState: TripState = raw.state ?? "Planning";
  const planningStartedAt = String(raw.planningStartedAt ?? "");
  const planningEndAt = String(raw.planningEndAt ?? "");
  const votingEndAt = String(raw.votingEndAt ?? "");

  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteTripModal, setShowDeleteTripModal] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [showRemoveMemberErrorModal, setShowRemoveMemberErrorModal] =
    useState(false);
  const [removeMemberErrorMessage, setRemoveMemberErrorMessage] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const blinkingDotAnim = useRef(new Animated.Value(1)).current;

  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const safeTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutRefs.current.push(id);
    return id;
  };

  useEffect(() => {
    const timeouts = timeoutRefs.current;
    return () => timeouts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTimerNow(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkingDotAnim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(blinkingDotAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [blinkingDotAnim]);

  const deleteRef = useRef<View>(null);

  function skipToDelete() {
    if (!deleteRef.current) return;

    if (Platform.OS === "web") {
      const el = deleteRef.current as unknown as { focus?: () => void };
      el?.focus?.();
      return;
    }

    const node = findNodeHandle(deleteRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }

  const parsedMembers: MemberParam[] = (() => {
    try {
      return membersParam ? JSON.parse(membersParam) : [];
    } catch {
      return [];
    }
  })();

  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const [openPhase, setOpenPhase] = useState<PhaseKey | null>(null);

  const [tripName, setTripName] = useState(title);
  const [tripNameInput, setTripNameInput] = useState(title);
  const [tripNameUpdated, setTripNameUpdated] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const [tripStart, setTripStart] = useState(
    startDate ? fromDateString(startDate) : new Date()
  );
  const [tripEnd, setTripEnd] = useState(
    endDate ? fromDateString(endDate) : new Date()
  );
  const [tripDateUpdated, setTripDateUpdated] = useState(false);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);

  const [destination, setDestination] = useState(destinationParam);
  const [destinationInput, setDestinationInput] = useState(destinationParam);
  const [destinationUpdated, setDestinationUpdated] = useState(false);
  const [isUpdatingDestination, setIsUpdatingDestination] = useState(false);

  const [members, setMembers] = useState<MemberParam[]>(parsedMembers);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [tripState, setTripState] = useState<TripState>(initialTripState);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tripTiming, setTripTiming] = useState({
    planningStartedAt,
    planningEndAt,
    votingEndAt,
  });

  const checklistTripState = tripState;
  const isTripStarted = isTripStartedByStartDate(toLocalDateString(tripStart));
  const isTripEnded = isPastTripByEndDate(toLocalDateString(tripEnd));
  const checklistDisplayState = getChecklistDisplayState(
    checklistTripState,
    isTripStarted
  );

  const planningStartDate = parseIsoToDate(tripTiming.planningStartedAt);
  const planningEndDate = parseIsoToDate(tripTiming.planningEndAt);
  const votingEndDate = parseIsoToDate(tripTiming.votingEndAt);
  const votingStartDate = planningEndDate ?? tripStart;
  const finalDisplayDate = votingEndDate ?? tripEnd;

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
      status: getPhaseStatus("planning", checklistTripState, isTripEnded, isTripStarted),
    },
    {
      id: "voting",
      label: "Voting",
      color: colors.sunsetPink,
      disabledColor: "#F0B8FB",
      status: getPhaseStatus("voting", checklistTripState, isTripEnded, isTripStarted),
    },
    {
      id: "final",
      label: "Final",
      color: colors.neonGreen,
      disabledColor: "#C8F5BE",
      status: getPhaseStatus("final", checklistTripState, isTripEnded, isTripStarted),
    },
    {
      id: "memories",
      label: "Memory",
      color: colors.seaBlue,
      disabledColor: "#A8D4F0",
      status: getPhaseStatus("memories", checklistTripState, isTripEnded, isTripStarted),
    },
  ];

  const [phaseDates, setPhaseDates] = useState<PhaseDates>({
    planning: {
      start: planningStartDate ?? tripStart,
      end: planningEndDate ?? tripStart,
      time: parseIsoToTimeString(tripTiming.planningEndAt),
    },
    voting: {
      start: votingStartDate,
      end: votingEndDate ?? tripStart,
      time: parseIsoToTimeString(tripTiming.votingEndAt),
    },
    final: {
      start: finalDisplayDate,
      end: finalDisplayDate,
      time: parseIsoToTimeString(tripTiming.votingEndAt),
    },
    memories: {
      start: tripEnd,
      end: tripEnd,
      time: "00:00",
    },
  });

  const syncTripResponse = useCallback((trip: Trip) => {
    const nextTripStart = parseTripDate(trip.start_date, new Date());
    const nextTripEnd = parseTripDate(trip.end_date, nextTripStart);
    const nextPlanningStart =
      parseIsoToDate(trip.planning_started_at) ?? nextTripStart;
    const nextPlanningEnd =
      parseIsoToDate(trip.planning_end_at) ?? nextTripStart;
    const nextVotingEnd = parseIsoToDate(trip.voting_end_at) ?? nextTripEnd;

    setTripState(trip.state);
    setTripName(trip.title);
    setTripNameInput(trip.title);
    setDestination(trip.destination);
    setDestinationInput(trip.destination);
    setTripStart(nextTripStart);
    setTripEnd(nextTripEnd);
    setTripTiming({
      planningStartedAt: trip.planning_started_at ?? "",
      planningEndAt: trip.planning_end_at ?? "",
      votingEndAt: trip.voting_end_at ?? "",
    });
    setPhaseDates({
      planning: {
        start: nextPlanningStart,
        end: nextPlanningEnd,
        time: parseIsoToTimeString(trip.planning_end_at),
      },
      voting: {
        start: nextPlanningEnd,
        end: nextVotingEnd,
        time: parseIsoToTimeString(trip.voting_end_at),
      },
      final: {
        start: nextVotingEnd,
        end: nextVotingEnd,
        time: parseIsoToTimeString(trip.voting_end_at),
      },
      memories: {
        start: nextTripEnd,
        end: nextTripEnd,
        time: "00:00",
      },
    });
  }, []);

  const refreshTripSnapshot = useCallback(
    async (
      options: {
        forceRefresh?: boolean;
        shouldApply?: () => boolean;
      } = {}
    ) => {
      const currentUser = auth.currentUser;
      if (!currentUser?.uid || !tripId) return null;

      try {
        const currentTrip = await fetchTripForUser(currentUser.uid, tripId, {
          forceRefresh: options.forceRefresh ?? false,
          allowStaleOnError: true,
        });
        if (!currentTrip || options.shouldApply?.() === false) return null;

        syncTripResponse(currentTrip);
        return currentTrip;
      } catch (error) {
        if (isTripNotFoundError(error)) {
          invalidateTripsCache();
          if (options.shouldApply?.() !== false) {
            router.replace("/home");
          }
          return null;
        }

        console.log("Could not refresh trip overview:", error);
        return null;
      }
    },
    [router, syncTripResponse, tripId]
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      void refreshTripSnapshot({ shouldApply: () => isActive });

      return () => {
        isActive = false;
      };
    }, [refreshTripSnapshot])
  );

  useEffect(() => {
    if (!tripId) {
      return;
    }

    let isInitialSnapshot = true;
    const unsubscribe = onSnapshot(
      doc(db, "trips", tripId),
      (snapshot) => {
        if (!snapshot.exists()) {
          invalidateTripsCache();
          router.replace("/home");
          return;
        }

        if (isInitialSnapshot) {
          isInitialSnapshot = false;
          return;
        }

        void refreshTripSnapshot({ forceRefresh: true });
      },
      (error) => {
        console.log("Trip deletion listener error:", error);
      }
    );

    return unsubscribe;
  }, [refreshTripSnapshot, router, tripId]);

  useEffect(() => {
    if (!tripId || (tripState !== "Planning" && tripState !== "Voting")) {
      return;
    }

    let deadlineTimeout: ReturnType<typeof setTimeout> | null = null;
    const activeDeadline =
      tripState === "Planning"
        ? tripTiming.planningEndAt
        : tripTiming.votingEndAt;

    const forceRefresh = () => {
      setTimerNow(Date.now());
      void refreshTripSnapshot({ forceRefresh: true });
    };

    if (activeDeadline) {
      if (isDeadlinePast(activeDeadline)) {
        forceRefresh();
      } else {
        const delay = Math.max(
          0,
          new Date(activeDeadline).getTime() - Date.now() + 1000
        );
        deadlineTimeout = setTimeout(forceRefresh, delay);
      }
    }

    return () => {
      if (deadlineTimeout) clearTimeout(deadlineTimeout);
    };
  }, [
    refreshTripSnapshot,
    tripId,
    tripState,
    tripTiming.planningEndAt,
    tripTiming.votingEndAt,
  ]);

  const [tempPhaseTime, setTempPhaseTime] = useState("12:00");
  const [phaseUpdated, setPhaseUpdated] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const nextPlanningStart =
      parseIsoToDate(tripTiming.planningStartedAt) ?? tripStart;
    const nextPlanningEnd =
      parseIsoToDate(tripTiming.planningEndAt) ?? tripStart;
    const nextVotingEnd = parseIsoToDate(tripTiming.votingEndAt) ?? tripEnd;

    const safePlanningEnd =
      nextPlanningEnd < nextPlanningStart
        ? nextPlanningStart
        : nextPlanningEnd > tripEnd
          ? tripEnd
          : nextPlanningEnd;

    const safeVotingEnd =
      nextVotingEnd < safePlanningEnd
        ? safePlanningEnd
        : nextVotingEnd > tripEnd
          ? tripEnd
          : nextVotingEnd;

    setPhaseDates({
      planning: {
        start: nextPlanningStart,
        end: safePlanningEnd,
        time: parseIsoToTimeString(tripTiming.planningEndAt),
      },
      voting: {
        start: safePlanningEnd,
        end: safeVotingEnd,
        time: parseIsoToTimeString(tripTiming.votingEndAt),
      },
      final: {
        start: safeVotingEnd,
        end: safeVotingEnd,
        time: parseIsoToTimeString(tripTiming.votingEndAt),
      },
      memories: {
        start: tripEnd,
        end: tripEnd,
        time: "00:00",
      },
    });
  }, [
    tripTiming.planningStartedAt,
    tripTiming.planningEndAt,
    tripTiming.votingEndAt,
    tripStart,
    tripEnd,
  ]);

  useEffect(() => {
    getIdToken().then((idToken) => {
      if (!idToken) return;
      getMemberPreferences(tripId, idToken).then(setPreferences).catch(() => {});
    });
  }, [tripId]);

  const disabledTripOrange = "#facbb8";
  const disabledPlanningYellow = "#F6E08F";

  const [showPhaseDateCalendar, setShowPhaseDateCalendar] =
    useState<PhaseKey | null>(null);
  const [activePhaseCalendar, setActivePhaseCalendar] =
    useState<PhaseKey | null>(null);
  const [showPhaseTimePicker, setShowPhaseTimePicker] =
    useState<PhaseKey | null>(null);
  const [showTripDateCalendar, setShowTripDateCalendar] = useState(false);
  const [tripRangeStart, setTripRangeStart] = useState<string | null>(
    toLocalDateString(tripStart)
  );
  const [tripRangeEnd, setTripRangeEnd] = useState<string | null>(
    toLocalDateString(tripEnd)
  );

  const getIdToken = async (): Promise<string | null> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Not logged in", "Please log in again.");
      return null;
    }
    return currentUser.getIdToken();
  };

  const toggleField = (key: FieldKey) => {
    setOpenField((prev) => (prev === key ? null : key));
    setTripNameUpdated(false);
    setTripDateUpdated(false);
    setDestinationUpdated(false);
  };

  const closePhaseCalendar = () => {
    setShowPhaseDateCalendar(null);
    safeTimeout(() => setActivePhaseCalendar(null), 200);
  };

  const togglePhase = (key: PhaseKey) => {
    closePhaseCalendar();
    setShowPhaseTimePicker(null);
    setOpenPhase((prev) => (prev === key ? null : key));
  };

  const handleCopyCodeFn = async () => {
    await Clipboard.setStringAsync(inviteCodeParam);
    setCodeCopied(true);
    safeTimeout(() => setCodeCopied(false), 2000);
  };

  const handleCopyCode = useSinglePress(handleCopyCodeFn);
  const handleNameRow = useSinglePress(() => toggleField("name"));
  const handleDateRow = useSinglePress(() => toggleField("date"));
  const handleDestRow = useSinglePress(() => toggleField("destination"));
  const handleMembersRow = useSinglePress(() => toggleField("members"));
  const handlePrefsRow = useSinglePress(async () => {
    if (openField === "preferences") {
      toggleField("preferences");
      return;
    }
    const idToken = await getIdToken();
    if (idToken) {
      try {
        const prefs = await getMemberPreferences(tripId, idToken);
        setPreferences(prefs);
      } catch {}
    }
    toggleField("preferences");
  });

  const handleSavePreferences = async () => {
    if (isSavingPrefs) return;
    const idToken = await getIdToken();
    if (!idToken) return;
    try {
      setIsSavingPrefs(true);
      await updateMemberPreferences(tripId, preferences, idToken);
      setOpenField(null);
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Failed to update preferences"
      );
    } finally {
      setIsSavingPrefs(false);
    }
  };
  const handlePlanningPhase = useSinglePress(() => togglePhase("planning"));
  const handleVotingPhase = useSinglePress(() => togglePhase("voting"));

  const handleUpdateName = async () => {
    if (!tripNameInput.trim() || isUpdatingName) return;
    const idToken = await getIdToken();
    if (!idToken) return;

    try {
      setIsUpdatingName(true);
      const updatedTrip = await updateTrip({
        idToken,
        tripId,
        title: tripNameInput.trim(),
      });
      syncTripResponse(updatedTrip);
      setTripNameUpdated(true);
      safeTimeout(() => {
        setTripNameUpdated(false);
        setOpenField(null);
      }, 1500);
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Failed to update name"
      );
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateDestination = async () => {
    if (!destinationInput.trim() || isUpdatingDestination) return;
    const idToken = await getIdToken();
    if (!idToken) return;

    try {
      setIsUpdatingDestination(true);
      const updatedTrip = await updateTrip({
        idToken,
        tripId,
        destination: destinationInput.trim(),
      });
      syncTripResponse(updatedTrip);
      invalidateTripsCache();
      setDestinationUpdated(true);
      safeTimeout(() => {
        setDestinationUpdated(false);
        setOpenField(null);
      }, 1500);
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Failed to update destination"
      );
    } finally {
      setIsUpdatingDestination(false);
    }
  };

  const handleUpdateTripDate = async () => {
    if (isUpdatingDate) return;
    const idToken = await getIdToken();
    if (!idToken) return;

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
          "Invalid trip end",
          "Trip end cannot be before the planning end date."
        );
        return;
      }

      if (planningEnd >= votingEnd) {
        Alert.alert(
          "Invalid phase order",
          "Voting end must be after planning end."
        );
        return;
      }

      if (votingEnd > tripEndBoundary) {
        Alert.alert(
          "Invalid trip end",
          "Trip end cannot be before the voting end date."
        );
        return;
      }

      setIsUpdatingDate(true);
      const updatedTrip = await updateTrip({
        idToken,
        tripId,
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

      syncTripResponse(updatedTrip);
      setTripDateUpdated(true);
      safeTimeout(() => {
        setTripDateUpdated(false);
        setOpenField(null);
      }, 1500);
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Failed to update dates"
      );
    } finally {
      setIsUpdatingDate(false);
    }
  };

  const openRemoveMemberModal = (id: string, name: string) => {
    if (removingMemberId) return;
    setMemberToRemove({ id, name });
    setShowRemoveMemberModal(true);
  };

  const handleRemoveMember = (id: string, name: string) => {
    openRemoveMemberModal(id, name);
  };

  async function handleConfirmRemoveMember() {
    if (!memberToRemove) return;

    try {
      setRemovingMemberId(memberToRemove.id);
      setShowRemoveMemberModal(false);

      const idToken = await getIdToken();
      if (!idToken) return;

      await removeMember({
        idToken,
        tripId,
        memberId: memberToRemove.id,
      });

      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
      setMemberToRemove(null);
    } catch (error) {
      setRemoveMemberErrorMessage(
        error instanceof Error ? error.message : "Failed to remove member."
      );
      setShowRemoveMemberErrorModal(true);
    } finally {
      setRemovingMemberId(null);
    }
  }

  const openTripCalendar = () => {
    setTripRangeStart(toLocalDateString(tripStart));
    setTripRangeEnd(toLocalDateString(tripEnd));
    setShowTripDateCalendar(true);
  };

  const handleOpenTripCalendar = useSinglePress(openTripCalendar);

  const handleTripDayPress = (day: CalendarDay) => {
    const selected = day.dateString;

    if (!tripRangeStart) {
      setTripRangeStart(selected);
      setTripRangeEnd(null);
      return;
    }

    if (!tripRangeEnd) {
      if (selected < tripRangeStart) {
        setTripRangeStart(selected);
        setTripRangeEnd(null);
        return;
      }
      if (selected === tripRangeStart) return;
      setTripRangeEnd(selected);
      return;
    }

    setTripRangeStart(selected);
    setTripRangeEnd(null);
  };

  const applyTripRange = () => {
    if (!tripRangeStart) return;

    const nextTripStart = fromDateString(tripRangeStart);
    const nextTripEnd = fromDateString(tripRangeEnd ?? tripRangeStart);

    setTripStart(nextTripStart);
    setTripEnd(nextTripEnd);

    setPhaseDates((prev) => {
      const planningStart = prev.planning.start;
      const planningEnd =
        prev.planning.end > nextTripEnd ? nextTripEnd : prev.planning.end;
      const safePlanningEnd =
        planningEnd < planningStart ? planningStart : planningEnd;

      const votingEnd =
        prev.voting.end > nextTripEnd ? nextTripEnd : prev.voting.end;
      const safeVotingEnd =
        votingEnd < safePlanningEnd ? safePlanningEnd : votingEnd;

      return {
        planning: {
          ...prev.planning,
          start: planningStart,
          end: safePlanningEnd,
        },
        voting: {
          ...prev.voting,
          start: safePlanningEnd,
          end: safeVotingEnd,
        },
        final: {
          ...prev.final,
          start: safeVotingEnd,
          end: safeVotingEnd,
          time: prev.voting.time,
        },
        memories: {
          ...prev.memories,
          start: nextTripEnd,
          end: nextTripEnd,
        },
      };
    });

    setShowTripDateCalendar(false);
  };

  const markedTripDates = useMemo(
    () =>
      getMarkedRange(
        tripRangeStart,
        tripRangeEnd,
        colors.sunsetOrange,
        colors.sunsetOrange
      ),
    [tripRangeStart, tripRangeEnd]
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
          start: combineDateAndTimeToDate(selectedDate, prev.planning.time),
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
    const isPlanningEditor = activePhaseCalendar === "planning";
    const isVotingEditor = activePhaseCalendar === "voting";

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
    if (isVotingEditor)
      return { ...tripRange, ...planningRange, ...votingRange };
    return tripRange;
  }, [
    activePhaseCalendar,
    phaseDates,
    tripStart,
    tripEnd,
    disabledTripOrange,
    disabledPlanningYellow,
  ]);

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
      ...(showPhaseTimePicker === "planning"
        ? {
            voting: {
              ...prev.voting,
              start: combineDateAndTimeToDate(prev.planning.end, tempPhaseTime),
            },
          }
        : {}),
    }));

    setShowPhaseTimePicker(null);
  };

  const handleUpdatePhaseDate = async (phaseId: PhaseKey) => {
    const idToken = await getIdToken();
    if (!idToken) return;

    try {
      const phase = phaseDates[phaseId];
      const nextEnd = new Date(combineDateAndTime(phase.end, phase.time));
      const tripEndBoundary = endOfDay(tripEnd);

      if (phaseId === "planning") {
        const nextPlanningEnd = new Date(
          combineDateAndTime(phase.end, phase.time)
        );

        if (nextPlanningEnd > tripEndBoundary) {
          Alert.alert(
            "Invalid planning end",
            "Planning end cannot be after the trip end date."
          );
          return;
        }

        const currentVotingEnd = new Date(
          combineDateAndTime(phaseDates.voting.end, phaseDates.voting.time)
        );

        if (currentVotingEnd <= nextPlanningEnd) {
          Alert.alert(
            "Invalid phase order",
            "Voting end must be after planning end."
          );
          return;
        }

        const updatedTrip = await updateTrip({
          idToken,
          tripId,
          planning_end_at: combineDateAndTime(phase.end, phase.time),
        });

        syncTripResponse(updatedTrip);
      }

      if (phaseId === "voting") {
        const currentPlanningEnd = new Date(
          combineDateAndTime(phaseDates.planning.end, phaseDates.planning.time)
        );

        if (nextEnd < currentPlanningEnd) {
          Alert.alert(
            "Invalid voting end",
            "Voting end cannot be before planning end."
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

        const updatedTrip = await updateTrip({
          idToken,
          tripId,
          start_date: toLocalDateString(tripStart),
          end_date: toLocalDateString(tripEnd),
          planning_end_at: combineDateAndTime(
            phaseDates.planning.end,
            phaseDates.planning.time
          ),
          voting_end_at: combineDateAndTime(phase.end, phase.time),
        });

        syncTripResponse(updatedTrip);
      }

      setPhaseUpdated((prev) => ({ ...prev, [phaseId]: false }));
      setPhaseUpdated((prev) => ({ ...prev, [phaseId]: true }));

      safeTimeout(() => {
        setPhaseUpdated((prev: Record<string, boolean>) => ({
          ...prev,
          [phaseId]: false,
        }));
        setOpenPhase(null);
      }, 1500);
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error ? error.message : "Failed to update phase"
      );
    }
  };

  const navigateToItinerary = useCallback(
    (targetState: "planning" | "voting" | "final" | "memories") => {
      router.push({
        pathname: "/itinerary",
        params: {
          tripId,
          state: targetState,
          title: tripName,
          destination,
          startDate: toLocalDateString(tripStart),
          endDate: toLocalDateString(tripEnd),
          members: membersParam,
          planningEndAt: tripTiming.planningEndAt,
          votingEndAt: tripTiming.votingEndAt,
          role: "admin",
        },
      });
    },
    [
      destination,
      membersParam,
      router,
      tripEnd,
      tripId,
      tripName,
      tripStart,
      tripTiming.planningEndAt,
      tripTiming.votingEndAt,
    ]
  );

  const handleNavigateToItinerary = useSinglePress(() => {
    navigateToItinerary(
      checklistTripState.toLowerCase() as
        | "planning"
        | "voting"
        | "final"
        | "memories"
    );
  });

  const handleNavigateToFinal = useSinglePress(() => {
    navigateToItinerary("final");
  });

  const handleNavigateToMemories = useSinglePress(() => {
    navigateToItinerary("memories");
  });

  const openDeleteTripModal = useSinglePress(() => {
    if (isDeleting) return;
    setShowDeleteTripModal(true);
  });

  const handleRefresh = useCallback(async () => {
    if (
      isRefreshing ||
      isDeleting ||
      isUpdatingName ||
      isUpdatingDate ||
      isUpdatingDestination ||
      removingMemberId
    ) {
      return;
    }

    setIsRefreshing(true);
    try {
      setTimerNow(Date.now());
      await refreshTripSnapshot({ forceRefresh: true });
    } finally {
      setIsRefreshing(false);
    }
  }, [
    isDeleting,
    isRefreshing,
    isUpdatingDate,
    isUpdatingDestination,
    isUpdatingName,
    refreshTripSnapshot,
    removingMemberId,
  ]);

  async function handleConfirmDeleteTrip() {
    try {
      setIsDeleting(true);
      setShowDeleteTripModal(false);

      const idToken = await getIdToken();
      if (!idToken) return;

      await deleteTrip({ idToken, tripId });
      invalidateTripsCache();
      router.replace("/home");
    } catch (error) {
      Alert.alert(
        "Delete failed",
        error instanceof Error ? error.message : "Failed to delete trip"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <View style={styles.fullScreen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            onPress={skipToDelete}
            accessibilityRole="button"
            accessibilityLabel="Skip to delete trip button"
            accessibilityHint="Moves focus directly to the delete trip action"
            style={styles.skipButton}
            {...nativeImportantForAccessibility}
          >
            <AppText variant="caption" style={styles.skipButtonText}>
              Skip to delete trip
            </AppText>
          </Pressable>

          <StickyHeader />

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
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.nightBlack}
                colors={[colors.nightBlack]}
              />
            }
          >
            <View style={styles.fieldGroup}>
              {openField === "name" ? (
                <View style={[styles.infoRow, styles.infoRowEditing]}>
                  <View style={styles.infoLeft}>
                    <View
                      style={styles.infoLabelRow}
                      {...hiddenFromAccessibility}
                    >
                      <TripTitle width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>
                        Trip name
                      </AppText>
                    </View>
                    <AppInput
                      value={tripNameInput}
                      onChangeText={(t) => {
                        setTripNameInput(t);
                        setTripNameUpdated(false);
                      }}
                      placeholder="Enter trip name"
                      autoFocus
                      accessibilityLabel="Trip name"
                      style={[styles.inputBlackStroke, styles.inlineInput]}
                    />
                  </View>
                  <Pressable
                    style={styles.rowChevronButton}
                    onPress={handleNameRow}
                    accessibilityRole="button"
                    accessibilityLabel="Collapse trip name editor"
                    accessibilityState={{ expanded: true }}
                  >
                    <View {...hiddenFromAccessibility}>
                      <ArrowUp width={20} height={20} />
                    </View>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.infoRow}
                  onPress={handleNameRow}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit trip name, current value: ${tripName}`}
                  accessibilityState={{ expanded: false }}
                >
                  <View style={styles.infoLeft}>
                    <View
                      style={styles.infoLabelRow}
                      {...hiddenFromAccessibility}
                    >
                      <TripTitle width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>
                        Trip name
                      </AppText>
                    </View>
                    <AppText
                      variant="caption"
                      style={styles.infoValue}
                      accessible={false}
                    >
                      {tripName}
                    </AppText>
                  </View>
                  <View {...hiddenFromAccessibility}>
                    <ArrowDown width={20} height={20} />
                  </View>
                </Pressable>
              )}

              {openField === "name" && (
                <View style={styles.expandedField}>
                  <AppButton
                    title={isUpdatingName ? "Updating..." : "Update"}
                    onPress={handleUpdateName}
                    loading={isUpdatingName}
                    disabled={!tripNameInput.trim() || isUpdatingName}
                    style={styles.updateButton}
                    textStyle={styles.updateButtonText}
                    accessibilityLabel="Update trip name"
                  />
                  {tripNameUpdated && (
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
                        Name is updated!
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Pressable
                style={[
                  styles.infoRow,
                  openField === "date" && styles.infoRowEditing,
                ]}
                onPress={openField === "date" ? undefined : handleDateRow}
                accessibilityRole="button"
                accessibilityLabel={`Edit trip dates, current value: ${formatDateDisplay(
                  tripStart
                )} to ${formatDateDisplay(tripEnd)}`}
                accessibilityState={{ expanded: openField === "date" }}
              >
                <View style={styles.infoLeft}>
                  <View
                    style={styles.infoLabelRow}
                    {...hiddenFromAccessibility}
                  >
                    <Calendar width={20} height={20} />
                    <AppText variant="body" style={styles.fieldLabel}>
                      Trip date
                    </AppText>
                  </View>
                  {openField === "date" ? (
                    <Pressable
                      style={[styles.dateInput, styles.inlineInput]}
                      onPress={handleOpenTripCalendar}
                      accessibilityRole="button"
                      accessibilityLabel={`Trip start date, currently ${formatDateDisplay(
                        tripStart
                      )}. Tap to change`}
                    >
                      <AppText variant="body" style={styles.dateText}>
                        {formatDateDisplay(tripStart)} -{" "}
                        {formatDateDisplay(tripEnd)}
                      </AppText>
                      <View {...hiddenFromAccessibility}>
                        <Calendar width={20} height={20} />
                      </View>
                    </Pressable>
                  ) : (
                    <AppText
                      variant="caption"
                      style={styles.infoValue}
                      accessible={false}
                    >
                      {formatDateDisplay(tripStart)} –{" "}
                      {formatDateDisplay(tripEnd)}
                    </AppText>
                  )}
                </View>
                {openField === "date" ? (
                  <Pressable
                    style={styles.rowChevronButton}
                    onPress={handleDateRow}
                    accessibilityRole="button"
                    accessibilityLabel="Collapse trip date editor"
                    accessibilityState={{ expanded: true }}
                  >
                    <View {...hiddenFromAccessibility}>
                      <ArrowUp width={20} height={20} />
                    </View>
                  </Pressable>
                ) : (
                  <View {...hiddenFromAccessibility}>
                    <ArrowDown width={20} height={20} />
                  </View>
                )}
              </Pressable>

              {openField === "date" && (
                <View style={styles.expandedField}>
                  <AppButton
                    title={isUpdatingDate ? "Updating..." : "Update"}
                    onPress={handleUpdateTripDate}
                    loading={isUpdatingDate}
                    disabled={isUpdatingDate}
                    style={styles.updateButton}
                    textStyle={styles.updateButtonText}
                    accessibilityLabel="Update trip dates"
                  />
                  {tripDateUpdated && (
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
                        Trip dates are updated!
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              {openField === "destination" ? (
                <View style={[styles.infoRow, styles.infoRowEditing, { zIndex: 9999 }]}>
                  <View style={[styles.infoLeft, { zIndex: 9999 }]}>
                    <View
                      style={styles.infoLabelRow}
                      {...hiddenFromAccessibility}
                    >
                      <Location width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>
                        Destination
                      </AppText>
                    </View>
                    <DestinationAutocomplete
                      value={destinationInput}
                      onChange={(t) => {
                        setDestinationInput(t);
                        setDestinationUpdated(false);
                      }}
                      placeholder="Enter destination"
                      inputStyle={[styles.inputBlackStroke, styles.inlineInput]}
                      accessibilityLabel="Destination"
                    />
                  </View>
                  <Pressable
                    style={styles.rowChevronButton}
                    onPress={handleDestRow}
                    accessibilityRole="button"
                    accessibilityLabel="Collapse destination editor"
                    accessibilityState={{ expanded: true }}
                  >
                    <View {...hiddenFromAccessibility}>
                      <ArrowUp width={20} height={20} />
                    </View>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.infoRow}
                  onPress={handleDestRow}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit destination, current value: ${destination}`}
                  accessibilityState={{ expanded: false }}
                >
                  <View style={styles.infoLeft}>
                    <View
                      style={styles.infoLabelRow}
                      {...hiddenFromAccessibility}
                    >
                      <Location width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>
                        Destination
                      </AppText>
                    </View>
                    <AppText
                      variant="caption"
                      style={styles.infoValue}
                      accessible={false}
                    >
                      {destination}
                    </AppText>
                  </View>
                  <View {...hiddenFromAccessibility}>
                    <ArrowDown width={20} height={20} />
                  </View>
                </Pressable>
              )}

              {openField === "destination" && (
                <View style={styles.expandedField}>
                  <AppButton
                    title={isUpdatingDestination ? "Updating..." : "Update"}
                    onPress={handleUpdateDestination}
                    loading={isUpdatingDestination}
                    disabled={!destinationInput.trim() || isUpdatingDestination}
                    style={styles.updateButton}
                    textStyle={styles.updateButtonText}
                    accessibilityLabel="Update destination"
                  />
                  {destinationUpdated && (
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
                        Destination is updated!
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Pressable
                style={[
                  styles.infoRow,
                  openField === "members" && styles.infoRowEditing,
                ]}
                onPress={openField === "members" ? undefined : handleMembersRow}
                accessibilityRole="button"
                accessibilityLabel={`View members, current value: ${
                  members.map((m) => m.name).join(", ") || "none"
                }`}
                accessibilityState={{ expanded: openField === "members" }}
              >
                <View style={styles.infoLeft}>
                  <View
                    style={styles.infoLabelRow}
                    {...hiddenFromAccessibility}
                  >
                    <AddPeople width={20} height={20} />
                    <AppText variant="body" style={styles.fieldLabel}>
                      Members
                    </AppText>
                  </View>
                  {openField === "members" ? (
                    <View style={styles.inlineMembersList}>
                      {members.length > 0 ? (
                        members.map((member) => (
                          <MemberRow
                            key={member.id}
                            member={member}
                            onRemove={handleRemoveMember}
                            isRemoving={removingMemberId === member.id}
                          />
                        ))
                      ) : (
                        <AppText variant="caption" style={styles.infoValue}>
                          No members yet.
                        </AppText>
                      )}
                    </View>
                  ) : (
                    <AppText
                      variant="caption"
                      style={styles.infoValue}
                      accessible={false}
                    >
                      {members.map((m) => m.name).join(", ") || "—"}
                    </AppText>
                  )}
                </View>
                {openField === "members" ? (
                  <Pressable
                    style={styles.rowChevronButton}
                    onPress={handleMembersRow}
                    accessibilityRole="button"
                    accessibilityLabel="Collapse members list"
                    accessibilityState={{ expanded: true }}
                  >
                    <View {...hiddenFromAccessibility}>
                      <ArrowUp width={20} height={20} />
                    </View>
                  </Pressable>
                ) : (
                  <View {...hiddenFromAccessibility}>
                    <ArrowDown width={20} height={20} />
                  </View>
                )}
              </Pressable>
            </View>

            {/* Preferences */}
            <View style={styles.fieldGroup}>
              <Pressable
                style={[
                  styles.infoRow,
                  openField === "preferences" && styles.infoRowEditing,
                ]}
                onPress={openField === "preferences" ? undefined : handlePrefsRow}
                accessibilityRole="button"
                accessibilityLabel="Edit your activity preferences"
                accessibilityState={{ expanded: openField === "preferences" }}
              >
                <View style={styles.infoLeft}>
                  <View style={styles.infoLabelRow} {...hiddenFromAccessibility}>
                    <Settings width={20} height={20} />
                    <AppText variant="body" style={styles.fieldLabel}>
                      Preferences
                    </AppText>
                  </View>
                  {openField !== "preferences" && (
                    <AppText variant="caption" style={styles.infoValue} accessible={false}>
                      {preferences.length > 0 ? `${preferences.length} selected` : "Not set"}
                    </AppText>
                  )}
                  {openField === "preferences" && (
                    <View style={{ marginTop: spacing.sm }}>
                      <PreferenceChips
                        selected={preferences}
                        onChange={setPreferences}
                        showGroups
                      />
                    </View>
                  )}
                </View>
                {openField === "preferences" ? (
                  <Pressable
                    style={styles.rowChevronButton}
                    onPress={handlePrefsRow}
                    accessibilityRole="button"
                    accessibilityLabel="Collapse preferences"
                    accessibilityState={{ expanded: true }}
                  >
                    <View {...hiddenFromAccessibility}>
                      <ArrowUp width={20} height={20} />
                    </View>
                  </Pressable>
                ) : (
                  <View {...hiddenFromAccessibility}>
                    <ArrowDown width={20} height={20} />
                  </View>
                )}
              </Pressable>
              {openField === "preferences" && (
                <Pressable
                  style={[styles.saveBtn, isSavingPrefs && { opacity: 0.6 }]}
                  onPress={handleSavePreferences}
                  disabled={isSavingPrefs}
                  accessibilityRole="button"
                  accessibilityLabel="Save preferences"
                >
                  <AppText variant="body" style={styles.saveBtnText}>
                    {isSavingPrefs ? "Saving..." : "Save preferences"}
                  </AppText>
                </Pressable>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <View
                    style={styles.infoLabelRow}
                    {...hiddenFromAccessibility}
                  >
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
                    {inviteCodeParam}
                  </AppText>
                </View>

                <Pressable
                  onPress={handleCopyCode}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    codeCopied ? "Trip code copied" : "Copy trip code"
                  }
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

            <View style={styles.checklistSection}>
              <View
                style={styles.checklistHeader}
                accessible
                accessibilityRole="header"
                accessibilityLabel={`Checklist. ${getChecklistSubtitle(
                  checklistDisplayState
                )}`}
              >
                <View style={styles.checklistTitleBlock}>
                  <AppText
                    variant="title"
                    style={styles.checklistTitle}
                    accessible={false}
                  >
                    Checklist
                  </AppText>
                  <AppText
                    variant="body"
                    style={styles.checklistSubtitle}
                    accessible={false}
                  >
                    {getChecklistSubtitle(checklistDisplayState)}
                  </AppText>
                </View>

                <View style={styles.mascotWrapper} {...hiddenFromAccessibility}>
                  {(() => {
                    const Mascot = getChecklistMascot(checklistDisplayState);
                    return <Mascot width={80} height={80} />;
                  })()}
                </View>
              </View>

              <View style={styles.timeline}>
                {phases.map((phase, index) => {
                  const phaseId = phase.id;
                  const isActive = phase.status === "active";
                  const isPast = phase.status === "past";
                  const isMuted = !isActive;
                  const isOpen = openPhase === phaseId;
                  const dates = phaseDates[phaseId];
                  const timerText = formatPhaseTimerText(
                    dates,
                    isActive,
                    timerNow
                  );
                  const badgeColor = isMuted
                    ? phase.disabledColor
                    : phase.color;
                  const isLast = index === phases.length - 1;
                  const canExpand =
                    isActive && phaseId !== "final" && phaseId !== "memories";
                  const showItineraryLink = isActive;

                  const activeShadowStyle =
                    phaseId === "planning"
                      ? styles.phaseCardShadowPlanning
                      : phaseId === "voting"
                        ? styles.phaseCardShadowVoting
                        : phaseId === "memories"
                          ? styles.phaseCardShadowMemories
                          : styles.phaseCardShadowFinal;

                  const nextPhase = phases[index + 1];
                  const prevPhase = phases[index - 1];
                  const extendLineToNextCheckbox =
                    !isLast &&
                    nextPhase?.status === "active" &&
                    (nextPhase.id === "final" || nextPhase.id === "memories");
                  const isFinalBeforeActiveMemory =
                    phaseId === "final" &&
                    isActive &&
                    nextPhase?.status === "active" &&
                    nextPhase.id === "memories";
                  const isMemoryAfterActiveFinal =
                    phaseId === "memories" &&
                    isActive &&
                    prevPhase?.status === "active" &&
                    prevPhase.id === "final";

                  const alignsCheckboxToBadge =
                    isActive && (phaseId === "final" || phaseId === "memories");
                  const checkboxTopOffset = spacing.xl + 32;

                  return (
                    <View
                      key={phaseId}
                      style={[
                        styles.timelineItem,
                        isFinalBeforeActiveMemory &&
                          styles.timelineItemAboveMemoryGlow,
                        isMemoryAfterActiveFinal &&
                          styles.timelineItemBelowFinalGlow,
                      ]}
                    >
                      <View
                        style={[
                          styles.timelineLeft,
                          isActive && isOpen && styles.timelineLeftActiveOpen,
                        ]}
                        {...hiddenFromAccessibility}
                      >
                        <View
                          style={[
                            styles.checkboxAligner,
                            alignsCheckboxToBadge &&
                              styles.checkboxAlignerBadgeRow,
                          ]}
                        >
                          <PhaseCheckbox
                            phaseId={phaseId}
                            status={phase.status}
                            isTripPast={isTripEnded}
                          />
                        </View>

                        {!isLast && (
                          <View
                            style={[
                              styles.timelineLine,
                              alignsCheckboxToBadge && {
                                top: checkboxTopOffset,
                              },
                              extendLineToNextCheckbox &&
                                styles.timelineLineExtended,
                              isPast
                                ? styles.timelineLineSolid
                                : styles.timelineLineDashed,
                            ]}
                          />
                        )}
                      </View>

                      <View style={styles.timelineContent}>
                        <View
                          style={[
                            isActive && styles.phaseCardShadowWrap,
                            isActive && activeShadowStyle,
                          ]}
                        >
                          <View
                            style={[
                              styles.phaseRow,
                              isActive && styles.phaseRowActiveCard,
                            ]}
                          >
                            <Pressable
                              style={styles.phaseTopPressable}
                              onPress={
                                canExpand
                                  ? phaseId === "planning"
                                    ? handlePlanningPhase
                                    : handleVotingPhase
                                  : undefined
                              }
                              disabled={!canExpand}
                              accessible
                              accessibilityRole={canExpand ? "button" : "text"}
                              accessibilityLabel={
                                phaseId === "final"
                                  ? `Final phase, starts ${formatDateDisplay(dates.start)}`
                                  : phaseId === "memories"
                                    ? `${phase.label} phase, ${
                                        isActive
                                          ? "upload trip photos"
                                          : isTripStarted
                                            ? "upload available"
                                            : "available when trip starts"
                                      }`
                                    : `${phase.label} phase, ${timerText} ${
                                        isActive
                                          ? "remaining"
                                          : isPast
                                            ? "completed"
                                            : "upcoming"
                                      }`
                              }
                              accessibilityHint={
                                canExpand
                                  ? `Tap to edit ${phase.label} end date and time`
                                  : undefined
                              }
                              accessibilityState={
                                canExpand ? { expanded: isOpen } : undefined
                              }
                            >
                              <View style={styles.phaseRowInner}>
                                <View style={styles.phaseTopRow}>
                                  <View
                                    style={[
                                      styles.phaseTopLeft,
                                      (phaseId === "final" ||
                                        phaseId === "memories") &&
                                        styles.phaseTopLeftBadgeRow,
                                    ]}
                                  >
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
                                          isMuted && styles.phaseBadgeTextMuted,
                                        ]}
                                      >
                                        {phase.label}
                                      </AppText>
                                    </View>

                                    {phaseId === "planning" || phaseId === "voting" ? (
                                      <View style={styles.phaseTimerBlock}>
                                        <View
                                          style={styles.hourglassCol}
                                          {...hiddenFromAccessibility}
                                        >
                                          {isActive ? (
                                            <Hourglass1
                                              width={32}
                                              height={32}
                                            />
                                          ) : (
                                            <Hourglass0
                                              width={32}
                                              height={32}
                                              style={
                                                isMuted
                                                  ? styles.mutedIcon
                                                  : undefined
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
                                                isMuted &&
                                                  styles.phaseDaysMuted,
                                              ]}
                                            >
                                              {timerText}
                                            </AppText>

                                            {isActive ? (
                                              <Animated.View
                                                style={[
                                                  styles.timepointWrapper,
                                                  { opacity: blinkingDotAnim },
                                                ]}
                                                {...hiddenFromAccessibility}
                                              >
                                                <Timepoint
                                                  width={7}
                                                  height={7}
                                                />
                                              </Animated.View>
                                            ) : null}
                                          </View>

                                          <AppText
                                            variant="caption"
                                            style={[
                                              styles.timerLabel,
                                              isMuted && styles.timerLabelMuted,
                                            ]}
                                          >
                                            Timer
                                          </AppText>
                                        </View>
                                      </View>
                                    ) : phaseId === "final" ? (
                                      <View
                                        style={styles.finalPlaceholderBlock}
                                      >
                                        <AppText
                                          variant="caption"
                                          style={[
                                            styles.finalPlaceholderTopLine,
                                            isMuted &&
                                              styles.phaseDateLabelMuted,
                                          ]}
                                        >
                                          Itinerary shown
                                        </AppText>

                                        <AppText
                                          variant="caption"
                                          style={[
                                            styles.finalPlaceholderBottomLine,
                                            isMuted &&
                                              styles.phaseDateLabelMuted,
                                          ]}
                                        >
                                          {`${formatDateDisplay(dates.start)} at ${dates.time}`}
                                        </AppText>
                                      </View>
                                    ) : !isTripStarted ? (
                                      <View
                                        style={styles.memoriesInactiveTextBlock}
                                      >
                                        <AppText
                                          variant="caption"
                                          style={[
                                            styles.memoriesInactiveLine,
                                            styles.memoriesInactiveLineMuted,
                                          ]}
                                        >
                                          Available when
                                        </AppText>
                                        <AppText
                                          variant="caption"
                                          style={[
                                            styles.memoriesInactiveLine,
                                            styles.memoriesInactiveLineMuted,
                                          ]}
                                        >
                                          trip starts
                                        </AppText>
                                      </View>
                                    ) : (
                                      <View
                                        style={styles.memoriesPlaceholderBlock}
                                      >
                                        <AppText
                                          variant="caption"
                                          style={[
                                            styles.memoriesPlaceholderText,
                                            isMuted &&
                                              styles.phaseDateLabelMuted,
                                          ]}
                                        >
                                          Image folder
                                        </AppText>
                                      </View>
                                    )}
                                  </View>

                                  {canExpand ? (
                                    <View
                                      style={styles.phaseChevronWrap}
                                      {...hiddenFromAccessibility}
                                    >
                                      {isOpen ? (
                                        <ArrowUp width={20} height={20} />
                                      ) : (
                                        <ArrowDown width={20} height={20} />
                                      )}
                                    </View>
                                  ) : null}
                                </View>

                                {phaseId === "planning" || phaseId === "voting" ? (
                                  <AppText
                                    variant="caption"
                                    style={[
                                      styles.phaseDateLabel,
                                      isMuted && styles.phaseDateLabelMuted,
                                    ]}
                                  >
                                    {formatDateDisplay(dates.start)}
                                    {dates.start.getTime() !==
                                    dates.end.getTime()
                                      ? ` - ${formatDateDisplay(dates.end)}`
                                      : ""}
                                  </AppText>
                                ) : null}
                              </View>
                            </Pressable>

                            {isOpen && canExpand ? (
                              <View style={styles.phaseExpandedInside}>
                                <AppText
                                  variant="body"
                                  style={styles.phaseEndLabel}
                                >
                                  End date of {phase.label} state
                                </AppText>

                                <View style={styles.dateTimeRow}>
                                  <Pressable
                                    style={[
                                      styles.dateInput,
                                      styles.dateTimeHalf,
                                    ]}
                                    onPress={() => openPhaseCalendar(phaseId)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${phase.label} end date, currently ${formatDateDisplay(
                                      dates.end
                                    )}. Tap to change`}
                                  >
                                    <AppText
                                      variant="body"
                                      style={styles.dateText}
                                    >
                                      {formatDateDisplay(dates.end)}
                                    </AppText>
                                    <View {...hiddenFromAccessibility}>
                                      <Calendar width={18} height={18} />
                                    </View>
                                  </Pressable>

                                  <Pressable
                                    style={[
                                      styles.dateInput,
                                      styles.dateTimeHalf,
                                    ]}
                                    onPress={() => {
                                      setTempPhaseTime(dates.time);
                                      setShowPhaseTimePicker(phaseId);
                                      closePhaseCalendar();
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${phase.label} end time, currently ${dates.time}. Tap to change`}
                                  >
                                    <AppText
                                      variant="body"
                                      style={styles.dateText}
                                    >
                                      {dates.time}
                                    </AppText>
                                    <View {...hiddenFromAccessibility}>
                                      <Timer width={20} height={20} />
                                    </View>
                                  </Pressable>
                                </View>

                                <AppButton
                                  title="Update"
                                  onPress={() => handleUpdatePhaseDate(phaseId)}
                                  style={
                                    phaseId === "planning"
                                      ? styles.updateButtonPlanning
                                      : styles.updateButtonVoting
                                  }
                                  textStyle={styles.updateButtonText}
                                  accessibilityLabel={`Update ${phase.label} phase`}
                                />

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
                            ) : null}

                            {showItineraryLink ? (
                              <Pressable
                                onPress={
                                  phaseId === "memories"
                                    ? handleNavigateToMemories
                                    : phaseId === "final"
                                      ? handleNavigateToFinal
                                      : handleNavigateToItinerary
                                }
                                accessibilityRole="button"
                                accessibilityLabel={
                                  phaseId === "memories"
                                    ? "Go to memories"
                                    : `Go to itinerary for ${phase.label} phase`
                                }
                                style={styles.itineraryLinkRow}
                                hitSlop={{
                                  top: 24,
                                  bottom: 24,
                                  left: 24,
                                  right: 24,
                                }}
                              >
                                <View
                                  style={styles.itineraryLinkInner}
                                  {...hiddenFromAccessibility}
                                >
                                  <ArrowItinerary width={24} height={24} />
                                  <AppText
                                    variant="body"
                                    style={styles.itineraryLinkText}
                                  >
                                    {phaseId === "memories"
                                      ? "Go to Memories"
                                      : "Go to Itinerary"}
                                  </AppText>
                                </View>
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
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
              styles.deleteSafeArea,
              Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null,
            ]}
            ref={deleteRef}
            {...(Platform.OS === "web" ? ({ tabIndex: -1 } as any) : {})}
          >
            <View style={styles.deleteWrapper}>
              <ActionCard
                label={isDeleting ? "Deleting..." : "Delete trip"}
                icon={<Trash width={20} height={20} />}
                onPress={openDeleteTripModal}
                accessibilityHint="Permanently deletes this trip"
              />
            </View>
          </SafeAreaView>

          <Modal
            visible={showDeleteTripModal}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setShowDeleteTripModal(false)}
          >
            <ModalShell>
              <AppText variant="body" style={styles.calendarTitle}>
                Delete trip
              </AppText>

              <View style={styles.timeModalContent}>
                <AppText variant="caption" style={styles.timeModalHint}>
                  Are you sure you want to delete this trip? This action cannot
                  be undone.
                </AppText>
              </View>

              <View style={styles.calendarActions}>
                <AppButton
                  title="Cancel"
                  onPress={() => setShowDeleteTripModal(false)}
                  style={styles.calendarCancelButton}
                  textStyle={styles.calendarCancelButtonText}
                  accessibilityLabel="Cancel deleting trip"
                />
                <AppButton
                  title={isDeleting ? "Deleting..." : "Delete"}
                  onPress={handleConfirmDeleteTrip}
                  style={styles.deleteTripButton}
                  textStyle={styles.calendarApplyButtonText}
                  accessibilityLabel="Confirm deleting trip"
                />
              </View>
            </ModalShell>
          </Modal>

          <Modal
            visible={showRemoveMemberModal}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => {
              setShowRemoveMemberModal(false);
              setMemberToRemove(null);
            }}
          >
            <ModalShell>
              <AppText variant="body" style={styles.calendarTitle}>
                Remove member
              </AppText>

              <View style={styles.timeModalContent}>
                <AppText variant="caption" style={styles.timeModalHint}>
                  {memberToRemove
                    ? `Are you sure you want to remove ${memberToRemove.name}?`
                    : "Are you sure you want to remove this member?"}
                </AppText>
              </View>

              <View style={styles.calendarActions}>
                <AppButton
                  title="Cancel"
                  onPress={() => {
                    setShowRemoveMemberModal(false);
                    setMemberToRemove(null);
                  }}
                  style={styles.calendarCancelButton}
                  textStyle={styles.calendarCancelButtonText}
                  accessibilityLabel="Cancel removing member"
                />
                <AppButton
                  title={
                    removingMemberId && memberToRemove?.id === removingMemberId
                      ? "Removing..."
                      : "Remove"
                  }
                  onPress={handleConfirmRemoveMember}
                  style={styles.deleteTripButton}
                  textStyle={styles.calendarApplyButtonText}
                  accessibilityLabel="Confirm removing member"
                />
              </View>
            </ModalShell>
          </Modal>

          <Modal
            visible={showRemoveMemberErrorModal}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setShowRemoveMemberErrorModal(false)}
          >
            <ModalShell>
              <AppText variant="body" style={styles.calendarTitle}>
                Remove failed
              </AppText>

              <View style={styles.timeModalContent}>
                <AppText variant="caption" style={styles.timeModalHint}>
                  {removeMemberErrorMessage ||
                    "Admin cannot remove themselves. Delete the trip instead."}
                </AppText>
              </View>

              <View style={styles.calendarActions}>
                <AppButton
                  title="OK"
                  onPress={() => setShowRemoveMemberErrorModal(false)}
                  style={styles.deleteTripButton}
                  textStyle={styles.calendarApplyButtonText}
                  accessibilityLabel="Close remove member error"
                />
              </View>
            </ModalShell>
          </Modal>

          <Modal
            visible={showPhaseTimePicker !== null}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setShowPhaseTimePicker(null)}
          >
            <ModalShell>
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
                  <View {...hiddenFromAccessibility}>
                    <Timer width={20} height={20} />
                  </View>
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
            </ModalShell>
          </Modal>

          <Modal
            visible={showTripDateCalendar}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => setShowTripDateCalendar(false)}
          >
            <ModalShell>
              <AppText variant="body" style={styles.calendarTitle}>
                Update trip dates
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
              </View>

              <View style={styles.calendarActions}>
                <AppButton
                  title="Cancel"
                  onPress={() => setShowTripDateCalendar(false)}
                  style={styles.calendarCancelButton}
                  textStyle={styles.calendarCancelButtonText}
                  accessibilityLabel="Cancel trip date selection"
                />
                <AppButton
                  title="Apply"
                  onPress={applyTripRange}
                  style={styles.calendarApplyButton}
                  textStyle={styles.calendarApplyButtonText}
                  accessibilityLabel="Apply selected trip dates"
                />
              </View>
            </ModalShell>
          </Modal>

          <Modal
            visible={showPhaseDateCalendar !== null}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={closePhaseCalendar}
          >
            <ModalShell>
              <AppText variant="body" style={styles.calendarTitle}>
                {activePhaseCalendar === "planning"
                  ? "Select planning end date"
                  : "Select voting end date"}
              </AppText>

              <RangeCalendar
                markingType="period"
                minDate={
                  activePhaseCalendar === "planning"
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
                          activePhaseCalendar === "planning" ||
                          activePhaseCalendar === "voting"
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
                          activePhaseCalendar === "voting"
                            ? disabledPlanningYellow
                            : colors.beachYellow,
                      },
                    ]}
                  />
                  <AppText variant="caption" style={styles.legendLabel}>
                    Planning state
                  </AppText>
                </View>

                {activePhaseCalendar === "voting" && (
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
                  onPress={closePhaseCalendar}
                  style={styles.calendarCancelButton}
                  textStyle={styles.calendarCancelButtonText}
                  accessibilityLabel="Close timer date selection"
                />
              </View>
            </ModalShell>
          </Modal>
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
    paddingTop: 0,
    gap: spacing.xl,
  },

  skipButton: {
    opacity: 0,
    height: 1,
    overflow: "hidden",
    marginBottom: -1,
  },
  skipButtonText: {
    color: colors.textPrimary,
  },

  stickyHeaderBlock: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.lightWhite,
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
    backgroundColor: colors.lightWhite,
  },

  backButtonSlot: {
    position: "absolute",
    left: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "flex-start",
    zIndex: 2,
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
  fieldGroup: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    position: "relative",
  },
  infoRowEditing: {
    minHeight: 64,
  },
  infoLeft: {
    gap: spacing.xs,
    flex: 1,
    paddingRight: spacing.xl,
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
  codeValue: {
    fontFamily: typography.fontFamily.bodyBold,
    letterSpacing: 2,
  },
  copiedHint: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    paddingLeft: 28,
  },

  expandedField: {
    gap: spacing.md,
  },
  inputBlackStroke: {
    borderWidth: 2,
    borderColor: colors.nightBlack,
  },
  inlineInput: {
    marginTop: spacing.xs,
  },
  inlineMembersList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rowChevronButton: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 28,
    minHeight: typography.lineHeight.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    backgroundColor: colors.beachYellow,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  saveBtnText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    color: colors.nightBlack,
  },

  dateTimeRow: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  dateTimeHalf: {
    flexBasis: "100%",
    minWidth: 0,
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
    width: "100%",
  },
  dateText: {
    flex: 1,
    textAlign: "center",
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textPrimary,
    paddingRight: spacing.sm,
  },

  updateButton: {
    backgroundColor: colors.beachYellow,
  },
  updateButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  updateButtonPlanning: {
    backgroundColor: colors.beachYellow,
  },
  updateButtonVoting: {
    backgroundColor: colors.sunsetPink,
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

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.sunsetOrange,
  },
  memberName: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textPrimary,
  },
  removingIcon: {
    opacity: 0.3,
  },

  checklistSection: {
    gap: spacing.lg,
  },
  checklistHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  checklistTitleBlock: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
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
  mascotWrapper: {
    alignSelf: "flex-start",
  },

  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.md,
  },
  timelineItemAboveMemoryGlow: {
    position: "relative",
    zIndex: 1,
  },
  timelineItemBelowFinalGlow: {
    position: "relative",
    zIndex: 2,
  },
  timelineLeft: {
    width: CHECKBOX_SIZE,
    alignItems: "center",
    position: "relative",
  },
  mutedIcon: {
    opacity: 0.35,
  },
  checkboxAligner: {
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  checkboxAlignerBadgeRow: {
    height: 32,
    marginTop: spacing.lg,
    justifyContent: "center",
  },
  checkboxAlignerActive: {
    marginTop: 0,
  },
  timelineLine: {
    position: "absolute",
    top: 36,
    bottom: 0,
    width: TIMELINE_LINE_WIDTH,
    backgroundColor: colors.grayedOut,
  },
  timelineLineSolid: {
    opacity: 0.2,
  },
  timelineLineDashed: {
    opacity: 0.35,
  },
  timelineLineExtended: {
    bottom: -spacing.lg,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },

  phaseRow: {
    borderRadius: radius.xl,
  },
  phaseRowActiveCard: {
    backgroundColor: colors.lightWhite,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  phaseCardShadowWrap: {
    borderRadius: 32,
  },
  phaseCardShadowPlanning: {
    shadowColor: "#ebb822",
    shadowOpacity: 0.16,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0,
    boxShadow: "0px 0px 40px rgba(240, 201, 59, 0.75)",
  },
  phaseCardShadowVoting: {
    shadowColor: colors.sunsetPink,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0,
    boxShadow: "0px 0px 40px rgba(223, 133, 240, 0.75)",
  },
  phaseCardShadowFinal: {
    shadowColor: colors.neonGreen,
    shadowOpacity: 0.85,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0,
    boxShadow: "0px 10px 40px rgba(149, 235, 122, 0.85)",
  },
  phaseCardShadowMemories: {
    shadowColor: colors.seaBlue,
    shadowOpacity: 0.85,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0,
    boxShadow: "0px 10px 40px rgba(120, 196, 232, 0.85)",
  },
  phaseTopPressable: {
    width: "100%",
  },
  phaseRowInner: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: spacing.sm,
    flex: 1,
  },
  phaseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  phaseTopLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    minWidth: 0,
  },
  phaseTopLeftBadgeRow: {
    alignItems: "center",
  },
  phaseBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignSelf: "flex-start",
  },
  phaseBadgeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.nightBlack,
  },
  phaseBadgeTextMuted: {
    color: colors.grayedOut,
  },
  phaseTimerBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
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
  phaseDaysMuted: {
    color: colors.grayedOut,
    opacity: 0.34,
  },
  timepointWrapper: {
    marginTop: -5,
  },
  timerLabel: {
    color: colors.nightBlack,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
  },
  timerLabelMuted: {
    color: colors.grayedOut,
    opacity: 0.6,
  },
  phaseChevronWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  phaseDateLabel: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  phaseDateLabelMuted: {
    color: colors.grayedOut,
    opacity: 0.5,
  },
  finalPlaceholderBlock: {
    justifyContent: "center",
    flexShrink: 1,
    gap: 2,
  },
  finalPlaceholderTopLine: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.bodyBold,
  },
  finalPlaceholderBottomLine: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  memoriesPlaceholderBlock: {
    justifyContent: "center",
    flexShrink: 1,
  },
  memoriesPlaceholderText: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.bodyBold,
    flexShrink: 1,
  },
  memoriesInactiveTextBlock: {
    justifyContent: "center",
    flexShrink: 1,
  },
  memoriesInactiveLine: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.bodyBold,
  },
  memoriesInactiveLineMuted: {
    color: colors.grayedOut,
    opacity: 0.5,
  },
  itineraryLinkRow: {
    alignSelf: "flex-start",
    marginTop: spacing.lg,
  },
  itineraryLinkInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itineraryLinkText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  phaseExpandedInside: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  phaseEndLabel: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  timelineLeftActiveOpen: {
    paddingTop: 0,
  },

  deleteSafeArea: {
    backgroundColor: colors.lightWhite,
  },
  deleteWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  modalSafeArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
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
  deleteTripButton: {
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
    color: colors.nightBlack,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.body,
  },
  timeInputModalBox: {
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
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
});
