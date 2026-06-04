import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  findNodeHandle,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { doc, onSnapshot } from "firebase/firestore";

import { colors, spacing } from "@/src/theme";
import { db, auth } from "@/src/lib/firebase";
import { generateTimeSlots } from "@/src/utils/itinerary/generateTimeSlots";
import { generateTripDays } from "@/src/utils/itinerary/generateTripDays";
import { mapActivitiesToSlots } from "@/src/utils/itinerary/mapActivitiesToSlots";
import { getActiveTripTimerText } from "@/src/utils/tripTimer";
import { useAuth } from "@/src/context/AuthContext";
import { useSinglePress } from "@/src/hooks/useSinglePress";

import type {
  TripItinerary,
  ItineraryState,
  Activity,
} from "@/src/types/itinerary";

import { AppText } from "@/src/components/common/AppText";
import { ItineraryHeader } from "@/src/components/itinerary/ItineraryHeader";
import { ItineraryDaySelector } from "@/src/components/itinerary/ItineraryDaySelector";
import { PlanningSlotCard } from "@/src/components/itinerary/PlanningSlotCard";
import { SkeletonSlotCard } from "@/src/components/itinerary/SkeletonSlotCard";
import { PlanningDoneBar } from "@/src/components/itinerary/PlanningDoneBar";
import { VotingDoneBar } from "@/src/components/itinerary/VotingDoneBar";
import { VotingSlotCard } from "@/src/components/itinerary/VoteSlotCard";
import { VotingTimeFilter } from "@/src/components/itinerary/VotingTimeFilter";
import { FinalSlotCard } from "@/src/components/itinerary/FinalSlotCard";
import { FinalSuggestedActivitiesSection } from "@/src/components/itinerary/FinalSuggestedActivitiesSection";
import { ActivityDetailModal } from "@/src/components/itinerary/ActivityDetailModal";
import {
  fetchTripForUser,
  finishPlanning,
  isTripNotFoundError,
  type Trip,
} from "@/src/api/trips";
import { invalidateTripsCache } from "./home";
import {
  getActivitiesBySlot,
  getFinalItineraryActivities,
  toggleActivityAttendance,
  toggleAddedAlternativeToItinerary,
  voteForActivity,
  type FinalItineraryResponseDto,
} from "@/src/services/activityService";

const DEV_FORCE_STATE: ItineraryState | null = null;
const TRANSITION_OVERLAY_MS = 1800;
const TRIP_STATE_POLL_INTERVAL_MS = 30 * 1000;

const activitiesCache = new Map<string, Activity[]>();

function parseActivitiesJson(value?: string): Activity[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function splitBackendSlotId(slotId: string) {
  const [dayId, ...slotParts] = slotId.split("_");
  return {
    dayId,
    slotId: slotParts.length > 0 ? slotParts.join("_") : slotId,
  };
}

function formatSlotLabel(slotId: string) {
  return slotId.replace(/_/g, ":");
}

function selectVoteForActivity(
  activities: Activity[],
  dayId: string,
  slotId: string,
  activityId: string
) {
  return activities.map((activity) => {
    if (activity.dayId !== dayId || activity.slotId !== slotId) {
      return activity;
    }

    const wasSelected = activity.hasCurrentUserVote === true;
    const isSelected = activity.id === activityId;
    const voteDelta =
      isSelected && !wasSelected ? 1 : !isSelected && wasSelected ? -1 : 0;

    return {
      ...activity,
      hasCurrentUserVote: isSelected,
      voteCount: Math.max(0, (activity.voteCount ?? 0) + voteDelta),
    };
  });
}

function updateCachedActivities(
  tripId: string,
  updater: (activities: Activity[]) => Activity[]
) {
  const prefix = `${tripId}_`;

  activitiesCache.forEach((activities, key) => {
    if (key.startsWith(prefix)) {
      activitiesCache.set(key, updater(activities));
    }
  });
}

function mapBackendActivity(
  activity: any,
  fallback: { dayId: string; slotId: string }
): Activity {
  const backendSlot = activity.slot_id
    ? splitBackendSlotId(activity.slot_id)
    : fallback;

  return {
    id: activity.activity_id,
    dayId: backendSlot.dayId || fallback.dayId,
    slotId: backendSlot.slotId || fallback.slotId,
    name: activity.name,
    address: activity.address ?? "",
    googleMapsUrl: activity.googleMapsUrl ?? "",
    description: activity.description ?? "",
    voteCount: activity.voteCount ?? 0,
    hasCurrentUserVote: activity.hasCurrentUserVote ?? false,
    startTime: activity.startTime ?? "",
    endTime: activity.endTime ?? "",
    joinedCount: activity.joinedCount ?? 0,
    hasCurrentUserJoined: activity.hasCurrentUserJoined ?? false,
    joinedMembers: activity.joinedMembers ?? [],
    isAddedToFinalItinerary: activity.isAddedToFinalItinerary ?? false,
  };
}

type FinalSlotUi = {
  slotId: string;
  dayId: string;
  slotKey: string;
  selectedActivity: Activity;
  alternativeActivities: Activity[];
  addedAlternativeActivities: Activity[];
  alternativeCount: number;
};

function mapBackendFinalSlot(slot: any): FinalSlotUi {
  const split = splitBackendSlotId(slot.slot_id);

  const selectedActivity = mapBackendActivity(slot.selectedActivity, {
    dayId: split.dayId,
    slotId: split.slotId,
  });

  const alternativeActivities = Array.isArray(slot.alternativeActivities)
    ? slot.alternativeActivities.map((activity: any) =>
        mapBackendActivity(activity, {
          dayId: split.dayId,
          slotId: split.slotId,
        })
      )
    : [];

  const addedAlternativeActivities = Array.isArray(
    slot.addedAlternativeActivities
  )
    ? slot.addedAlternativeActivities.map((activity: any) =>
        mapBackendActivity(activity, {
          dayId: split.dayId,
          slotId: split.slotId,
        })
      )
    : [];

  return {
    slotId: split.slotId,
    dayId: split.dayId,
    slotKey: slot.slot_id,
    selectedActivity,
    alternativeActivities,
    addedAlternativeActivities,
    alternativeCount: slot.alternativeCount ?? alternativeActivities.length,
  };
}

function mergeAlternativeLists(
  alternativeActivities: Activity[],
  addedAlternativeActivities: Activity[]
): Activity[] {
  const byId = new Map<string, Activity>();

  [...alternativeActivities, ...addedAlternativeActivities].forEach(
    (activity) => {
      byId.set(activity.id, activity);
    }
  );

  return Array.from(byId.values());
}

type RouteMember = {
  id?: string;
  userId?: string;
  planning_done?: boolean;
  hasFinishedPlanning?: boolean;
};

function parsePlanningStatusJson(value?: string) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;
    return parsed
      .map((member: RouteMember) => ({
        userId: member.id ?? member.userId ?? "",
        hasFinishedPlanning:
          member.planning_done ?? member.hasFinishedPlanning ?? false,
      }))
      .filter((member) => member.userId);
  } catch {
    return undefined;
  }
}

function toUiState(state: "Planning" | "Voting" | "Final"): ItineraryState {
  switch (state) {
    case "Voting":
      return "voting";
    case "Final":
      return "final";
    case "Planning":
    default:
      return "planning";
  }
}

function setPlanningDoneForUser(
  planningStatus: TripItinerary["planningStatus"],
  userId: string,
  planningDone: boolean
): TripItinerary["planningStatus"] {
  const hasExistingUser = planningStatus.some(
    (member) => member.userId === userId
  );
  if (!hasExistingUser) {
    return [...planningStatus, { userId, hasFinishedPlanning: planningDone }];
  }
  return planningStatus.map((member) =>
    member.userId === userId
      ? { ...member, hasFinishedPlanning: planningDone }
      : member
  );
}

function resetPlanningStatus(
  planningStatus: TripItinerary["planningStatus"]
): TripItinerary["planningStatus"] {
  return planningStatus.map((member) => ({
    ...member,
    hasFinishedPlanning: false,
  }));
}

function mapTripMembersToPlanningStatus(
  members?: Trip["members"]
): TripItinerary["planningStatus"] | undefined {
  if (!members || members.length === 0) return undefined;

  return members
    .map((member) => ({
      userId: member.id,
      hasFinishedPlanning: member.planning_done ?? false,
    }))
    .filter((member) => member.userId);
}

function isDeadlinePast(deadline?: string): boolean {
  if (!deadline) return false;

  const parsed = new Date(deadline);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
}

function shouldSkipVoting(memberCount: number) {
  return memberCount <= 1;
}

function buildItineraryFromParams(params: {
  tripId?: string;
  title?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  state?: ItineraryState;
  planningStatus?: TripItinerary["planningStatus"];
}): TripItinerary {
  const fallbackDate = new Date().toISOString().split("T")[0];
  return {
    tripId: params.tripId ?? "trip-fallback",
    title: params.title ?? "Untitled Trip",
    destination: params.destination ?? "Unknown destination",
    startDate: params.startDate ?? fallbackDate,
    endDate: params.endDate ?? fallbackDate,
    state: params.state ?? "planning",
    planningStatus: params.planningStatus ?? [
      { userId: "user-1", hasFinishedPlanning: false },
      { userId: "user-2", hasFinishedPlanning: true },
      { userId: "user-3", hasFinishedPlanning: false },
      { userId: "user-4", hasFinishedPlanning: false },
    ],
    activities: [],
  };
}

function getIntroText(state: ItineraryState): string {
  switch (state) {
    case "voting":
      return "Vote on conflicting times of activities here.";
    case "final":
      return "Here you find your final itinerary with your group.";
    case "planning":
    default:
      return "You can add your activities here for each day.";
  }
}

type TransitionOverlayProps = {
  title: string;
  text: string;
};

function TransitionOverlay({ title, text }: TransitionOverlayProps) {
  return (
    <View
      style={styles.finalizingOverlay}
      accessibilityViewIsModal={true}
      accessible={true}
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`${title}. ${text}`}
    >
      <View style={styles.finalizingCard}>
        <ActivityIndicator color={colors.nightBlack} />
        <AppText
          variant="subtitle"
          style={styles.finalizingTitle}
          accessible={false}
        >
          {title}
        </AppText>
        <AppText
          variant="caption"
          style={styles.finalizingText}
          accessible={false}
        >
          {text}
        </AppText>
      </View>
    </View>
  );
}

export default function ItineraryScreen() {
  const { user, idToken: authToken } = useAuth();
  const currentUserId = user?.uid ?? null;

  const {
    tripId,
    state,
    title,
    destination,
    startDate,
    endDate,
    members,
    activitiesJson,
    newActivityId,
    newActivityDayId,
    newActivitySlotId,
    newActivityName,
    newActivityDescription,
    newActivityAddress,
    newActivityGoogleMapsUrl,
    newActivityStartTime,
    newActivityEndTime,
    planningEndAt,
    votingEndAt,
    selectedDay,
    role,
  } = useLocalSearchParams<{
    tripId?: string;
    state?: "planning" | "voting" | "final";
    title?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    members?: string;
    activitiesJson?: string;
    newActivityId?: string;
    newActivityDayId?: string;
    newActivitySlotId?: string;
    newActivityName?: string;
    newActivityDescription?: string;
    newActivityAddress?: string;
    newActivityGoogleMapsUrl?: string;
    newActivityStartTime?: string;
    newActivityEndTime?: string;
    planningEndAt?: string;
    votingEndAt?: string;
    selectedDay?: string;
    role?: "admin" | "member";
  }>();

  const routeState: ItineraryState | undefined =
    state === "planning" || state === "voting" || state === "final"
      ? state
      : undefined;

  const routePlanningStatus = useMemo(
    () => parsePlanningStatusJson(members),
    [members]
  );

  const [itinerary, setItinerary] = useState<TripItinerary>(() => ({
    ...buildItineraryFromParams({
      tripId,
      title,
      destination,
      startDate,
      endDate,
      state: routeState,
      planningStatus: routePlanningStatus,
    }),
    activities: parseActivitiesJson(activitiesJson),
  }));

  const [apiActivities, setApiActivities] = useState<Activity[]>(() => {
    const keys = [...activitiesCache.keys()];
    const matchingKey = keys.find((k) => k.startsWith(`${tripId}_`));
    return matchingKey ? (activitiesCache.get(matchingKey) ?? []) : [];
  });

  const [finalSlots, setFinalSlots] = useState<FinalSlotUi[]>([]);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [isLoadingActivities, setIsLoadingActivities] = useState(() => {
    const keys = [...activitiesCache.keys()];
    return !keys.some((k) => k.startsWith(`${tripId}_`));
  });

  const [showPlanningInfoPopup, setShowPlanningInfoPopup] = useState(false);
  const [isSubmittingPlanning, setIsSubmittingPlanning] = useState(false);
  const [isSubmittingVoting, setIsSubmittingVoting] = useState(false);

  const isAdmin = role === "admin";

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [selectedActivitySlotLabel, setSelectedActivitySlotLabel] =
    useState("");
  const [, setSelectedAlternativeActivities] = useState<Activity[]>([]);
  const [
    selectedDisplayedAlternativeActivities,
    setSelectedDisplayedAlternativeActivities,
  ] = useState<Activity[]>([]);
  const [
    selectedAddedAlternativeActivityIds,
    setSelectedAddedAlternativeActivityIds,
  ] = useState<string[]>([]);
  const [showActivityDetailModal, setShowActivityDetailModal] = useState(false);

  const planningInfoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const finalizingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const votingTransitionTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const initialTripRefreshKeyRef = useRef<string | null>(null);
  const lastFinalUpdateRef = useRef<string | null>(null);

  const [isPreparingFinalItinerary, setIsPreparingFinalItinerary] =
    useState(false);
  const [isPreparingVoting, setIsPreparingVoting] = useState(false);

  const popupRef = useRef<View>(null);

  const slots = useMemo(() => generateTimeSlots(), []);

  const activeState: ItineraryState =
    DEV_FORCE_STATE ?? routeState ?? itinerary.state;
  const activeStateRef = useRef<ItineraryState>(activeState);
  const transitionTargetStateRef = useRef<ItineraryState | null>(null);

  const [timerDeadlines, setTimerDeadlines] = useState(() => ({
    planningEndAt,
    votingEndAt,
  }));

  const [timerText, setTimerText] = useState(() =>
    getActiveTripTimerText(activeState, planningEndAt, votingEndAt)
  );

  const tripDays = useMemo(
    () => generateTripDays(itinerary.startDate, itinerary.endDate),
    [itinerary.startDate, itinerary.endDate]
  );

  const [selectedDayId, setSelectedDayId] = useState<string>("");
  const requestedSelectedDayId = newActivityDayId ?? selectedDay;

  useEffect(() => {
    if (
      requestedSelectedDayId &&
      tripDays.some((day) => day.id === requestedSelectedDayId)
    ) {
      setSelectedDayId(requestedSelectedDayId);
      return;
    }

    if (tripDays.length > 0) {
      setSelectedDayId(tripDays[0].id);
    } else {
      setSelectedDayId(itinerary.startDate);
    }
  }, [tripDays, itinerary.startDate, requestedSelectedDayId]);

  useEffect(() => {
    setItinerary((current) => ({
      ...buildItineraryFromParams({
        tripId,
        title,
        destination,
        startDate,
        endDate,
        state: routeState,
        planningStatus: routePlanningStatus,
      }),
      activities:
        parseActivitiesJson(activitiesJson).length > 0
          ? parseActivitiesJson(activitiesJson)
          : current.activities,
    }));
  }, [
    tripId,
    title,
    destination,
    startDate,
    endDate,
    routeState,
    routePlanningStatus,
    activitiesJson,
  ]);

  useEffect(() => {
    setTimerDeadlines({
      planningEndAt,
      votingEndAt,
    });
  }, [planningEndAt, votingEndAt]);

  useEffect(() => {
    activeStateRef.current = activeState;
  }, [activeState]);

  const refreshTripTimerFields = useCallback(
    async (options: { forceRefresh?: boolean } = {}) => {
      if (!currentUserId || !tripId) return;

      try {
        const currentTrip = await fetchTripForUser(currentUserId, tripId, {
          forceRefresh: options.forceRefresh,
          allowStaleOnError: true,
        });
        if (!currentTrip) return;

        const refreshedPlanningStatus = mapTripMembersToPlanningStatus(
          currentTrip.members
        );
        const nextState = toUiState(currentTrip.state);
        const nextPlanningEndAt = currentTrip.planning_end_at ?? planningEndAt;
        const nextVotingEndAt = currentTrip.voting_end_at ?? votingEndAt;
        const currentState = activeStateRef.current;

        setTimerDeadlines({
          planningEndAt: nextPlanningEndAt,
          votingEndAt: nextVotingEndAt,
        });

        const applyRefreshedTrip = (stateToApply: ItineraryState) => {
          setItinerary((current) => ({
            ...current,
            title: currentTrip.title ?? current.title,
            destination: currentTrip.destination ?? current.destination,
            startDate: currentTrip.start_date ?? current.startDate,
            endDate: currentTrip.end_date ?? current.endDate,
            state: stateToApply,
            planningStatus:
              refreshedPlanningStatus ??
              (stateToApply === "planning" &&
              nextPlanningEndAt &&
              nextPlanningEndAt !== timerDeadlines.planningEndAt
                ? resetPlanningStatus(current.planningStatus)
                : current.planningStatus),
          }));

          router.setParams({
            state: stateToApply,
            title: currentTrip.title,
            destination: currentTrip.destination,
            startDate: currentTrip.start_date,
            endDate: currentTrip.end_date,
            planningEndAt: nextPlanningEndAt ?? "",
            votingEndAt: nextVotingEndAt ?? "",
            members: refreshedPlanningStatus
              ? JSON.stringify(refreshedPlanningStatus)
              : members,
            role: role ?? "admin",
          });
        };

        const shouldShowTransitionOverlay =
          currentState !== nextState &&
          ((currentState === "planning" &&
            (nextState === "voting" || nextState === "final")) ||
            (currentState === "voting" && nextState === "final"));

        if (shouldShowTransitionOverlay) {
          if (transitionTargetStateRef.current === nextState) return;

          transitionTargetStateRef.current = nextState;

          const finishTransition = () => {
            applyRefreshedTrip(nextState);
            setActivityRefreshKey((value) => value + 1);
            transitionTargetStateRef.current = null;
          };

          if (nextState === "voting") {
            setIsPreparingVoting(true);
            if (votingTransitionTimeoutRef.current) {
              clearTimeout(votingTransitionTimeoutRef.current);
            }
            votingTransitionTimeoutRef.current = setTimeout(() => {
              finishTransition();
              setIsPreparingVoting(false);
            }, TRANSITION_OVERLAY_MS);
            return;
          }

          setIsPreparingFinalItinerary(true);
          if (finalizingTimeoutRef.current) {
            clearTimeout(finalizingTimeoutRef.current);
          }
          finalizingTimeoutRef.current = setTimeout(() => {
            finishTransition();
            setIsPreparingFinalItinerary(false);
          }, TRANSITION_OVERLAY_MS);
          return;
        }

        applyRefreshedTrip(nextState);
      } catch (error) {
        if (isTripNotFoundError(error)) {
          invalidateTripsCache();
          router.replace("/home");
          return;
        }

        console.log("Could not refresh trip timer:", error);
      }
    },
    [
      currentUserId,
      members,
      planningEndAt,
      timerDeadlines.planningEndAt,
      tripId,
      votingEndAt,
      role,
    ]
  );

  useEffect(() => {
    if (!currentUserId || !tripId) return;

    let deadlineTimeout: ReturnType<typeof setTimeout> | null = null;
    const refreshKey = `${currentUserId}:${tripId}`;

    if (initialTripRefreshKeyRef.current !== refreshKey) {
      initialTripRefreshKeyRef.current = refreshKey;
      void refreshTripTimerFields();
    }

    const activeDeadline =
      activeState === "planning"
        ? timerDeadlines.planningEndAt
        : activeState === "voting"
          ? timerDeadlines.votingEndAt
          : undefined;

    if (
      (activeState === "planning" || activeState === "voting") &&
      activeDeadline
    ) {
      if (isDeadlinePast(activeDeadline)) {
        void refreshTripTimerFields({ forceRefresh: true });
      } else {
        const delay = Math.max(
          0,
          new Date(activeDeadline).getTime() - Date.now() + 1000
        );
        deadlineTimeout = setTimeout(() => {
          void refreshTripTimerFields({ forceRefresh: true });
        }, delay);
      }
    }

    return () => {
      if (deadlineTimeout) {
        clearTimeout(deadlineTimeout);
      }
    };
  }, [
    activeState,
    currentUserId,
    tripId,
    planningEndAt,
    votingEndAt,
    members,
    refreshTripTimerFields,
    timerDeadlines.planningEndAt,
    timerDeadlines.votingEndAt,
  ]);

  useEffect(() => {
    if (
      !currentUserId ||
      !tripId ||
      (activeState !== "planning" && activeState !== "voting")
    ) {
      return;
    }

    const interval = setInterval(() => {
      void refreshTripTimerFields({ forceRefresh: true });
    }, TRIP_STATE_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [activeState, currentUserId, refreshTripTimerFields, tripId]);

  useEffect(() => {
    const updateTimer = () => {
      setTimerText(
        getActiveTripTimerText(
          activeState,
          timerDeadlines.planningEndAt,
          timerDeadlines.votingEndAt
        )
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60 * 1000);
    return () => clearInterval(interval);
  }, [activeState, timerDeadlines]);

  useEffect(() => {
    return () => {
      if (planningInfoTimeoutRef.current) {
        clearTimeout(planningInfoTimeoutRef.current);
      }
      if (finalizingTimeoutRef.current) {
        clearTimeout(finalizingTimeoutRef.current);
      }
      if (votingTransitionTimeoutRef.current) {
        clearTimeout(votingTransitionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showPlanningInfoPopup || !popupRef.current) {
      return;
    }

    if (Platform.OS === "web") {
      requestAnimationFrame(() => {
        const popupElement = popupRef.current as unknown as {
          focus?: () => void;
        };
        popupElement?.focus?.();
      });
      return;
    }

    const node = findNodeHandle(popupRef.current);
    if (node) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  }, [showPlanningInfoPopup]);

  const refreshFinalItinerary = useCallback(async () => {
    if (!tripId) return;

    try {
      const refreshed = await getFinalItineraryActivities(
        tripId,
        currentUserId ?? undefined
      );

      const mappedSlots = (refreshed.slots ?? []).map(mapBackendFinalSlot);
      setFinalSlots(mappedSlots);

      const flatMappedActivities = mappedSlots.flatMap((slot) => [
        slot.selectedActivity,
        ...slot.alternativeActivities,
        ...slot.addedAlternativeActivities,
      ]);

      activitiesCache.set(`${tripId}_final`, flatMappedActivities);
      setApiActivities(flatMappedActivities);
    } catch (error) {
      console.log("Could not refresh final itinerary:", error);
    }
  }, [tripId, currentUserId]);

  useEffect(() => {
    if (!tripId) {
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "trips", tripId),
      (snapshot) => {
        if (!snapshot.exists()) {
          invalidateTripsCache();
          router.replace("/home");
        }
      },
      (error) => {
        console.log("Trip deletion listener error:", error);
      }
    );

    return unsubscribe;
  }, [tripId]);

  useEffect(() => {
    if (!tripId || activeState !== "final") {
      return;
    }

    const tripRef = doc(db, "trips", tripId);

    const unsubscribe = onSnapshot(
      tripRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const data = snapshot.data();
        const nextValue =
          data?.final_itinerary_updated_at?.toMillis?.()?.toString?.() ?? null;

        if (nextValue && nextValue === lastFinalUpdateRef.current) {
          return;
        }

        lastFinalUpdateRef.current = nextValue;
        await refreshFinalItinerary();
      },
      (error) => {
        console.log("Final itinerary listener error:", error);
      }
    );

    return unsubscribe;
  }, [tripId, activeState, refreshFinalItinerary]);

  useEffect(() => {
    async function loadActivities() {
      if (!tripId || tripDays.length === 0) return;

      if (activeState !== "final" && !selectedDayId) {
        return;
      }

      if (activeState === "planning" && !currentUserId) {
        return;
      }

      const resolvedDayId =
        selectedDayId || tripDays[0]?.id || itinerary.startDate;

      const cacheKey =
        activeState === "final"
          ? `${tripId}_${activeState}`
          : activeState === "voting"
            ? `${tripId}_${activeState}`
            : `${tripId}_${activeState}_${resolvedDayId}`;

      const cached = activitiesCache.get(cacheKey);

      if (cached) {
        setApiActivities(cached);
        setIsLoadingActivities(false);
      } else {
        setIsLoadingActivities(true);
      }

      try {
        if (activeState === "final") {
          const finalResponse: FinalItineraryResponseDto =
            await getFinalItineraryActivities(
              tripId,
              currentUserId ?? undefined
            );

          const mappedSlots = (finalResponse.slots ?? []).map(
            mapBackendFinalSlot
          );

          const flatMappedActivities = mappedSlots.flatMap((slot) => [
            slot.selectedActivity,
            ...slot.alternativeActivities,
            ...slot.addedAlternativeActivities,
          ]);

          const hasChanged =
            JSON.stringify(cached) !== JSON.stringify(flatMappedActivities);

          setFinalSlots(mappedSlots);

          if (hasChanged) {
            activitiesCache.set(cacheKey, flatMappedActivities);
            setApiActivities(flatMappedActivities);
          } else if (!cached) {
            setApiActivities(flatMappedActivities);
          }

          setIsLoadingActivities(false);
          return;
        }

        if (activeState === "voting") {
          const allActivities = (
            await Promise.all(
              tripDays.flatMap((day) =>
                slots.map(async (slot) => {
                  const slotIdWithDate = `${day.id}_${slot.id}`;
                  const slotActivities = await getActivitiesBySlot(
                    tripId,
                    slotIdWithDate,
                    currentUserId ?? undefined
                  );

                  return slotActivities.map((activity: any) =>
                    mapBackendActivity(activity, {
                      dayId: day.id,
                      slotId: slot.id,
                    })
                  );
                })
              )
            )
          ).flat();

          const hasChanged =
            JSON.stringify(cached) !== JSON.stringify(allActivities);

          if (hasChanged) {
            activitiesCache.set(cacheKey, allActivities);
            setApiActivities(allActivities);
          } else if (!cached) {
            setApiActivities(allActivities);
          }

          setIsLoadingActivities(false);
          return;
        }

        const allActivities = (
          await Promise.all(
            slots.map(async (slot) => {
              const slotIdWithDate = `${resolvedDayId}_${slot.id}`;
              const slotActivities = await getActivitiesBySlot(
                tripId,
                slotIdWithDate,
                currentUserId ?? undefined
              );

              return slotActivities.map((activity: any) =>
                mapBackendActivity(activity, {
                  dayId: resolvedDayId,
                  slotId: slot.id,
                })
              );
            })
          )
        ).flat();

        const hasChanged =
          JSON.stringify(cached) !== JSON.stringify(allActivities);

        if (hasChanged) {
          activitiesCache.set(cacheKey, allActivities);
          setApiActivities(allActivities);
        } else if (!cached) {
          setApiActivities(allActivities);
        }

        setIsLoadingActivities(false);
      } catch (error) {
        console.log("Could not load activities:", error);
        setIsLoadingActivities(false);
      }
    }

    void loadActivities();
  }, [
    tripId,
    newActivityId,
    activeState,
    currentUserId,
    selectedDayId,
    tripDays,
    slots,
    itinerary.startDate,
    activityRefreshKey,
  ]);

  useEffect(() => {
    if (activeState !== "final") {
      setFinalSlots([]);
      lastFinalUpdateRef.current = null;
    }
  }, [activeState]);

  function handlePlanningInfoPress() {
    if (showPlanningInfoPopup) {
      if (planningInfoTimeoutRef.current) {
        clearTimeout(planningInfoTimeoutRef.current);
      }
      setShowPlanningInfoPopup(false);
      return;
    }

    setShowPlanningInfoPopup(true);

    if (planningInfoTimeoutRef.current) {
      clearTimeout(planningInfoTimeoutRef.current);
    }

    planningInfoTimeoutRef.current = setTimeout(() => {
      setShowPlanningInfoPopup(false);
    }, 3500);
  }

  const lastAppliedActivitySignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !newActivityId ||
      !newActivityDayId ||
      !newActivitySlotId ||
      !newActivityName
    ) {
      return;
    }

    const incomingSignature = [
      newActivityId,
      newActivityDayId,
      newActivitySlotId,
      newActivityName,
      newActivityDescription ?? "",
      newActivityAddress ?? "",
      newActivityGoogleMapsUrl ?? "",
      newActivityStartTime ?? "",
      newActivityEndTime ?? "",
    ].join("|");

    if (lastAppliedActivitySignatureRef.current === incomingSignature) {
      return;
    }

    lastAppliedActivitySignatureRef.current = incomingSignature;
  }, [
    newActivityId,
    newActivityDayId,
    newActivitySlotId,
    newActivityName,
    newActivityDescription,
    newActivityAddress,
    newActivityGoogleMapsUrl,
    newActivityStartTime,
    newActivityEndTime,
  ]);

  const slotItems = useMemo(() => {
    return mapActivitiesToSlots(slots, apiActivities, selectedDayId);
  }, [slots, apiActivities, selectedDayId]);

  const planningStatusParam = useMemo(
    () =>
      JSON.stringify(
        itinerary.planningStatus.map((member) => ({
          userId: member.userId,
          hasFinishedPlanning: member.hasFinishedPlanning,
        }))
      ),
    [itinerary.planningStatus]
  );

  const currentUserStatus = itinerary.planningStatus.find(
    (m) => m.userId === currentUserId
  );
  const hasCurrentUserFinished =
    currentUserStatus?.hasFinishedPlanning ?? false;
  const tripMemberCount = itinerary.planningStatus.length;

  function handleAddActivity(slotId: string) {
    if (hasCurrentUserFinished) {
      handlePlanningInfoPress();
      return;
    }

    router.push({
      pathname: "/add-activity",
      params: {
        tripId: itinerary.tripId,
        title: itinerary.title,
        destination: itinerary.destination,
        startDate: itinerary.startDate,
        endDate: itinerary.endDate,
        state: activeState,
        members: planningStatusParam,
        dayId: selectedDayId,
        slotId: `${selectedDayId}_${slotId}`,
        selectedDay: selectedDayId,
        activitiesJson: JSON.stringify(itinerary.activities),
        planningEndAt: timerDeadlines.planningEndAt ?? "",
        votingEndAt: timerDeadlines.votingEndAt ?? "",
      },
    });
  }

  function handleEditActivity(activity: Activity) {
    if (hasCurrentUserFinished) {
      handlePlanningInfoPress();
      return;
    }

    router.push({
      pathname: "/add-activity",
      params: {
        tripId: itinerary.tripId,
        title: itinerary.title,
        destination: itinerary.destination,
        startDate: itinerary.startDate,
        endDate: itinerary.endDate,
        state: activeState,
        members: planningStatusParam,
        dayId: activity.dayId,
        slotId: activity.slotId,
        selectedDay: activity.dayId,
        activityId: activity.id,
        initialName: activity.name,
        initialDescription: activity.description ?? "",
        initialAddress: activity.address ?? "",
        initialGoogleMapsUrl: activity.googleMapsUrl ?? "",
        initialStartTime: activity.startTime ?? "",
        initialEndTime: activity.endTime ?? "",
        activitiesJson: JSON.stringify(itinerary.activities),
        planningEndAt: timerDeadlines.planningEndAt ?? "",
        votingEndAt: timerDeadlines.votingEndAt ?? "",
      },
    });
  }

  async function handleFinishPlanning() {
    if (isSubmittingPlanning) return;
    if (!currentUserId) return;

    const nextPlanningDone = !hasCurrentUserFinished;

    // Local-only fallback trip
    if (itinerary.tripId === "trip-fallback") {
      const nextState =
        nextPlanningDone && shouldSkipVoting(tripMemberCount)
          ? "final"
          : "planning";

      setItinerary((current) => ({
        ...current,
        state: nextState === "final" ? current.state : nextState,
        planningStatus: setPlanningDoneForUser(
          current.planningStatus,
          currentUserId,
          nextPlanningDone
        ),
      }));

      if (nextState === "final") {
        setIsPreparingFinalItinerary(true);
        if (finalizingTimeoutRef.current) {
          clearTimeout(finalizingTimeoutRef.current);
        }
        finalizingTimeoutRef.current = setTimeout(() => {
          setItinerary((current) => ({ ...current, state: "final" }));
          setIsPreparingFinalItinerary(false);
          setActivityRefreshKey((value) => value + 1);
          router.setParams({ state: "final" });
        }, 1800);
      }
      return;
    }

    // Always try to refresh the ID token before calling the API
    let token = authToken;

    try {
      const user = auth.currentUser;
      if (user) {
        token = await user.getIdToken(true);
      }
    } catch {
      // ignore, will fall back to authToken if present
    }

    if (!token) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }

    setIsSubmittingPlanning(true);
    // show overlay immediately
    setIsPreparingVoting(true);

    try {
      const result = await finishPlanning({
        idToken: token,
        tripId: itinerary.tripId,
        planningDone: nextPlanningDone,
      });

      setItinerary((current) => ({
        ...current,
        planningStatus: setPlanningDoneForUser(
          current.planningStatus,
          currentUserId,
          result.planningDone
        ),
      }));

      // First immediate refresh
      await refreshTripTimerFields({ forceRefresh: true });

      // Short retry window to catch a state change triggered by someone else
      const maxAttempts = 5;
      const delayMs = 1000;

      for (let i = 0; i < maxAttempts; i++) {
        if (activeStateRef.current !== "planning") break;

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        await refreshTripTimerFields({ forceRefresh: true });
      }
    } catch (error) {
      setIsPreparingVoting(false);
      Alert.alert(
        "Could not finish planning",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsSubmittingPlanning(false);
    }
  }

  async function handleFinishVoting() {
    if (isSubmittingVoting) return;

    if (!authToken || itinerary.tripId === "trip-fallback") {
      setIsPreparingFinalItinerary(true);
      if (finalizingTimeoutRef.current) {
        clearTimeout(finalizingTimeoutRef.current);
      }
      finalizingTimeoutRef.current = setTimeout(() => {
        setItinerary((current) => ({ ...current, state: "final" }));
        setIsPreparingFinalItinerary(false);
        setActivityRefreshKey((value) => value + 1);
        router.setParams({ state: "final" });
      }, TRANSITION_OVERLAY_MS);
      return;
    }

    setIsSubmittingVoting(true);
    try {
      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/trips/${itinerary.tripId}/finish-voting`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken: authToken }),
        }
      );
    } catch {
    } finally {
      setIsSubmittingVoting(false);
    }

    setIsPreparingFinalItinerary(true);
    if (finalizingTimeoutRef.current) {
      clearTimeout(finalizingTimeoutRef.current);
    }
    finalizingTimeoutRef.current = setTimeout(() => {
      setItinerary((current) => ({ ...current, state: "final" }));
      setIsPreparingFinalItinerary(false);
      setActivityRefreshKey((value) => value + 1);
      router.setParams({ state: "final" });
    }, TRANSITION_OVERLAY_MS);
  }

  const votingActivities = useMemo(() => {
    const all = apiActivities.length > 0 ? apiActivities : itinerary.activities;
    const groups = new Map<string, Activity[]>();

    all.forEach((a) => {
      const key = `${a.dayId}_${a.slotId}`;
      groups.set(key, [...(groups.get(key) ?? []), a]);
    });

    return Array.from(groups.values())
      .filter((group) => group.length > 1)
      .flat();
  }, [apiActivities, itinerary.activities]);

  const daysWithVotingActivities = useMemo(() => {
    const set = new Set<string>();
    votingActivities.forEach((a) => set.add(a.dayId));
    return set;
  }, [votingActivities]);

  const votingTimeChips = useMemo(() => {
    const seen = new Map<string, string>();
    votingActivities
      .filter((a) => a.dayId === selectedDayId)
      .forEach((a) => {
        if (!seen.has(a.slotId)) {
          seen.set(a.slotId, formatSlotLabel(a.slotId));
        }
      });

    return Array.from(seen.entries()).map(([slotId, label]) => ({
      slotId,
      label,
    }));
  }, [votingActivities, selectedDayId]);

  const [selectedVotingSlotId, setSelectedVotingSlotId] = useState<string>("");

  useEffect(() => {
    if (votingTimeChips.length === 0) {
      setSelectedVotingSlotId("");
      return;
    }

    const selectedSlotStillExists = votingTimeChips.some(
      (chip) => chip.slotId === selectedVotingSlotId
    );

    if (!selectedSlotStillExists) {
      setSelectedVotingSlotId(votingTimeChips[0].slotId);
    }
  }, [selectedVotingSlotId, votingTimeChips]);

  const votingSlotActivities = useMemo(() => {
    return votingActivities.filter(
      (a) => a.dayId === selectedDayId && a.slotId === selectedVotingSlotId
    );
  }, [votingActivities, selectedDayId, selectedVotingSlotId]);

  const handleOpenVotingActivityDetails = useCallback(
    (activity: Activity) => {
      const slotChip = votingTimeChips.find(
        (chip) => chip.slotId === activity.slotId
      );

      setSelectedActivity(activity);
      setSelectedActivitySlotLabel(
        slotChip?.label ?? formatSlotLabel(activity.slotId)
      );
      setSelectedAlternativeActivities([]);
      setSelectedDisplayedAlternativeActivities([]);
      setSelectedAddedAlternativeActivityIds([]);
      setShowActivityDetailModal(true);
    },
    [votingTimeChips]
  );

  const handleOpenFinalActivityDetails = useCallback(
    (activity: Activity, slotLabel: string) => {
      setSelectedActivity(activity);
      setSelectedActivitySlotLabel(slotLabel);

      const matchingFinalSlot = finalSlots.find((slot) => {
        if (slot.selectedActivity.id === activity.id) return true;

        if (
          slot.alternativeActivities.some((item) => item.id === activity.id)
        ) {
          return true;
        }

        if (
          slot.addedAlternativeActivities.some(
            (item) => item.id === activity.id
          )
        ) {
          return true;
        }

        return false;
      });

      const alternativeActivities =
        matchingFinalSlot?.alternativeActivities ?? [];
      const addedAlternativeActivities =
        matchingFinalSlot?.addedAlternativeActivities ?? [];

      setSelectedAlternativeActivities(alternativeActivities);
      setSelectedDisplayedAlternativeActivities(
        mergeAlternativeLists(alternativeActivities, addedAlternativeActivities)
      );
      setSelectedAddedAlternativeActivityIds(
        addedAlternativeActivities.map((item) => item.id)
      );
      setShowActivityDetailModal(true);
    },
    [finalSlots]
  );

  const handleCloseActivityDetails = useCallback(() => {
    setShowActivityDetailModal(false);
    setSelectedActivity(null);
    setSelectedActivitySlotLabel("");
    setSelectedAlternativeActivities([]);
    setSelectedDisplayedAlternativeActivities([]);
    setSelectedAddedAlternativeActivityIds([]);
  }, []);

  const handleAddAlternativeToItinerary = useCallback(
    async (activityToToggle: Activity) => {
      if (!authToken || !tripId) {
        Alert.alert("Could not update itinerary", "Please log in again.");
        return;
      }

      try {
        const fullSlotId = `${activityToToggle.dayId}_${activityToToggle.slotId}`;

        await toggleAddedAlternativeToItinerary({
          idToken: authToken,
          tripId,
          slotId: fullSlotId,
          activityId: activityToToggle.id,
        });

        const refreshed = await getFinalItineraryActivities(
          tripId,
          currentUserId ?? undefined
        );

        const mappedSlots = (refreshed.slots ?? []).map(mapBackendFinalSlot);
        setFinalSlots(mappedSlots);

        const flatMappedActivities = mappedSlots.flatMap((slot) => [
          slot.selectedActivity,
          ...slot.alternativeActivities,
          ...slot.addedAlternativeActivities,
        ]);

        activitiesCache.set(`${tripId}_final`, flatMappedActivities);
        setApiActivities(flatMappedActivities);

        const matchingFinalSlot = mappedSlots.find((slot) => {
          if (slot.selectedActivity.id === activityToToggle.id) return true;

          if (
            slot.alternativeActivities.some(
              (item) => item.id === activityToToggle.id
            )
          ) {
            return true;
          }

          if (
            slot.addedAlternativeActivities.some(
              (item) => item.id === activityToToggle.id
            )
          ) {
            return true;
          }

          return false;
        });

        const alternativeActivities =
          matchingFinalSlot?.alternativeActivities ?? [];
        const addedAlternativeActivities =
          matchingFinalSlot?.addedAlternativeActivities ?? [];
        const nextAddedIds = addedAlternativeActivities.map((item) => item.id);

        setSelectedAlternativeActivities(alternativeActivities);
        setSelectedDisplayedAlternativeActivities(
          mergeAlternativeLists(
            alternativeActivities,
            addedAlternativeActivities
          )
        );
        setSelectedAddedAlternativeActivityIds(nextAddedIds);

        setSelectedActivity((current) =>
          current?.id === activityToToggle.id
            ? {
                ...current,
                isAddedToFinalItinerary: nextAddedIds.includes(
                  activityToToggle.id
                ),
              }
            : current
        );
      } catch (error) {
        Alert.alert(
          "Could not update itinerary",
          error instanceof Error ? error.message : "Please try again."
        );
      }
    },
    [authToken, tripId, currentUserId]
  );

  async function handleAddVote(activityId: string) {
    if (!authToken || !tripId || !selectedVotingSlotId) {
      Alert.alert("Could not vote", "Please log in again.");
      return;
    }

    try {
      const fullSlotId = `${selectedDayId}_${selectedVotingSlotId}`;
      const result = await voteForActivity({
        idToken: authToken,
        tripId,
        slotId: fullSlotId,
        activityId,
      });

      const applyVote = (activities: Activity[]) =>
        selectVoteForActivity(
          activities,
          selectedDayId,
          selectedVotingSlotId,
          activityId
        );

      if (result.voteAccepted !== false) {
        updateCachedActivities(tripId, applyVote);
        setApiActivities((current) => applyVote(current));
      }

      if (result.tripState === "Final") {
        setIsPreparingFinalItinerary(true);
        if (finalizingTimeoutRef.current) {
          clearTimeout(finalizingTimeoutRef.current);
        }
        finalizingTimeoutRef.current = setTimeout(() => {
          setItinerary((current) => ({ ...current, state: "final" }));
          setIsPreparingFinalItinerary(false);
          setActivityRefreshKey((value) => value + 1);
          router.setParams({ state: "final" });
        }, 1800);
      }
    } catch (error) {
      Alert.alert(
        "Could not add vote",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  }

  useEffect(() => {
    if (activeState === "voting" && tripDays.length > 0) {
      const firstVotingDay = tripDays.find((d) =>
        daysWithVotingActivities.has(d.id)
      );
      const selectedDayStillHasVotingActivities =
        daysWithVotingActivities.has(selectedDayId);

      if (firstVotingDay && !selectedDayStillHasVotingActivities) {
        setSelectedDayId(firstVotingDay.id);
      }
    }
  }, [activeState, tripDays, daysWithVotingActivities, selectedDayId]);

  const finalActivities = useMemo(
    () => (apiActivities.length > 0 ? apiActivities : itinerary.activities),
    [apiActivities, itinerary.activities]
  );

  const finalSlotsForSelectedDay = useMemo(
    () => finalSlots.filter((slot) => slot.dayId === selectedDayId),
    [finalSlots, selectedDayId]
  );

  const finalSlotMap = useMemo(() => {
    const map = new Map<string, FinalSlotUi>();
    finalSlotsForSelectedDay.forEach((slot) => map.set(slot.slotId, slot));
    return map;
  }, [finalSlotsForSelectedDay]);

  async function handleJoinGroup(activityId: string) {
    const activity = finalActivities.find((item) => item.id === activityId);

    if (!authToken || !tripId || !activity) {
      Alert.alert("Could not update group", "Please log in again.");
      return;
    }

    try {
      const fullSlotId = `${activity.dayId}_${activity.slotId}`;
      const result = await toggleActivityAttendance({
        idToken: authToken,
        tripId,
        slotId: fullSlotId,
        activityId,
      });

      const applyAttendanceUpdate = (activities: Activity[]) =>
        activities.map((item) => {
          const sameSlot =
            item.dayId === activity.dayId && item.slotId === activity.slotId;

          if (!sameSlot) return item;

          if (item.id === activityId) {
            return {
              ...item,
              hasCurrentUserJoined: result.joined,
              joinedCount: result.joinedCount,
              joinedMembers: result.joinedMembers ?? item.joinedMembers,
            };
          }

          if (result.joined) {
            return {
              ...item,
              hasCurrentUserJoined: false,
            };
          }

          return item;
        });

      updateCachedActivities(tripId, applyAttendanceUpdate);
      setApiActivities((current) => applyAttendanceUpdate(current));

      setFinalSlots((current) =>
        current.map((slot) => {
          if (
            slot.dayId !== activity.dayId ||
            slot.slotId !== activity.slotId
          ) {
            return slot;
          }

          const updateItem = (item: Activity): Activity => {
            if (item.id === activityId) {
              return {
                ...item,
                hasCurrentUserJoined: result.joined,
                joinedCount: result.joinedCount,
                joinedMembers: result.joinedMembers ?? item.joinedMembers,
              };
            }

            if (result.joined) {
              return {
                ...item,
                hasCurrentUserJoined: false,
              };
            }

            return item;
          };

          return {
            ...slot,
            selectedActivity: updateItem(slot.selectedActivity),
            alternativeActivities: slot.alternativeActivities.map(updateItem),
            addedAlternativeActivities:
              slot.addedAlternativeActivities.map(updateItem),
          };
        })
      );

      setSelectedActivity((current) =>
        current &&
        current.id === activityId &&
        current.dayId === activity.dayId &&
        current.slotId === activity.slotId
          ? {
              ...current,
              hasCurrentUserJoined: result.joined,
              joinedCount: result.joinedCount,
              joinedMembers: result.joinedMembers ?? current.joinedMembers,
            }
          : current
      );

      setSelectedAlternativeActivities((current) =>
        current.map((item) => {
          if (
            item.dayId !== activity.dayId ||
            item.slotId !== activity.slotId
          ) {
            return item;
          }

          if (item.id === activityId) {
            return {
              ...item,
              hasCurrentUserJoined: result.joined,
              joinedCount: result.joinedCount,
              joinedMembers: result.joinedMembers ?? item.joinedMembers,
            };
          }

          if (result.joined) {
            return {
              ...item,
              hasCurrentUserJoined: false,
            };
          }

          return item;
        })
      );

      setSelectedDisplayedAlternativeActivities((current) =>
        current.map((item) => {
          if (
            item.dayId !== activity.dayId ||
            item.slotId !== activity.slotId
          ) {
            return item;
          }

          if (item.id === activityId) {
            return {
              ...item,
              hasCurrentUserJoined: result.joined,
              joinedCount: result.joinedCount,
              joinedMembers: result.joinedMembers ?? item.joinedMembers,
            };
          }

          if (result.joined) {
            return {
              ...item,
              hasCurrentUserJoined: false,
            };
          }

          return item;
        })
      );
    } catch (error) {
      Alert.alert(
        "Could not update group",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  }

  const handleDismissPopup = useSinglePress(() => {
    if (planningInfoTimeoutRef.current) {
      clearTimeout(planningInfoTimeoutRef.current);
    }
    setShowPlanningInfoPopup(false);
  });

  const stateAccentColor =
    activeState === "voting"
      ? colors.sunsetPink
      : activeState === "final"
        ? colors.neonGreen
        : colors.beachYellow;

  const safeAreaBg =
    activeState === "voting"
      ? colors.sunsetPink
      : activeState === "final"
        ? colors.neonGreen
        : colors.beachYellow;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: safeAreaBg }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar style="dark" />

      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ItineraryHeader
            title="Itinerary"
            tripName={itinerary.title}
            startDate={itinerary.startDate}
            endDate={itinerary.endDate}
            introText={getIntroText(activeState)}
            daysLeftText={timerText}
            onBackPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/home");
              }
            }}
            state={activeState}
          />

          <View style={styles.contentPanel}>
            <ItineraryDaySelector
              days={tripDays}
              selectedDayId={selectedDayId}
              onSelectDay={setSelectedDayId}
              enabledDayIds={
                activeState === "voting" ? daysWithVotingActivities : undefined
              }
              accentColor={stateAccentColor}
            />

            {activeState === "planning" && (
              <View style={styles.planningContent}>
                <View style={styles.slotList}>
                  {isLoadingActivities
                    ? slots.map((slot) => <SkeletonSlotCard key={slot.id} />)
                    : slotItems.map(({ slot, activity }) => (
                        <PlanningSlotCard
                          key={slot.id}
                          slot={slot}
                          activity={activity}
                          onAddActivity={handleAddActivity}
                          onEditActivity={handleEditActivity}
                          disabled={hasCurrentUserFinished}
                        />
                      ))}
                </View>

                {hasCurrentUserFinished && (
                  <View
                    style={[
                      styles.planningLockOverlay,
                      { pointerEvents: "auto" },
                    ]}
                  />
                )}
              </View>
            )}

            {activeState === "voting" && (
              <View style={styles.votingSection}>
                {isLoadingActivities ? (
                  <View style={styles.slotList}>
                    {slots.slice(0, 3).map((slot) => (
                      <SkeletonSlotCard key={slot.id} />
                    ))}
                  </View>
                ) : votingTimeChips.length > 0 ? (
                  <>
                    <VotingTimeFilter
                      chips={votingTimeChips}
                      selectedSlotId={selectedVotingSlotId}
                      onSelectSlot={setSelectedVotingSlotId}
                    />

                    <View style={styles.slotList}>
                      {votingSlotActivities.map((activity) => (
                        <VotingSlotCard
                          key={activity.id}
                          activity={activity}
                          onAddVote={handleAddVote}
                          onPressDetails={handleOpenVotingActivityDetails}
                          selected={activity.hasCurrentUserVote === true}
                        />
                      ))}
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyVoting} />
                )}
              </View>
            )}

            {activeState === "final" && (
              <View style={styles.slotList}>
                {isLoadingActivities
                  ? slots.map((slot) => <SkeletonSlotCard key={slot.id} />)
                  : slots.map((slot) => {
                      const finalSlot = finalSlotMap.get(slot.id);

                      if (!finalSlot) {
                        return (
                          <FinalSlotCard
                            key={slot.id}
                            slot={slot}
                            activity={undefined}
                            onJoinGroup={handleJoinGroup}
                            onPressDetails={handleOpenFinalActivityDetails}
                          />
                        );
                      }

                      const addedAlternatives =
                        finalSlot.addedAlternativeActivities;
                      const remainingAlternativeCount =
                        finalSlot.alternativeActivities.length;

                      return (
                        <View key={slot.id} style={styles.finalSlotSection}>
                          <FinalSlotCard
                            slot={slot}
                            activity={finalSlot.selectedActivity}
                            onJoinGroup={handleJoinGroup}
                            onPressDetails={handleOpenFinalActivityDetails}
                            otherSuggestedCount={remainingAlternativeCount}
                          />

                          <FinalSuggestedActivitiesSection
                            slotLabel={slot.label}
                            activities={addedAlternatives}
                            onJoinGroup={handleJoinGroup}
                            onPressDetails={handleOpenFinalActivityDetails}
                            accentColor={stateAccentColor}
                          />
                        </View>
                      );
                    })}
              </View>
            )}
          </View>
        </ScrollView>

        {activeState === "planning" && (
          <View style={[styles.footerBackground, { pointerEvents: "none" }]} />
        )}

        <ActivityDetailModal
          visible={showActivityDetailModal}
          activity={selectedActivity}
          slotLabel={selectedActivitySlotLabel}
          state={activeState}
          alternativeActivities={selectedDisplayedAlternativeActivities}
          addedAlternativeActivityIds={selectedAddedAlternativeActivityIds}
          onAddAlternativeToItinerary={handleAddAlternativeToItinerary}
          onClose={handleCloseActivityDetails}
        />

        {showPlanningInfoPopup && (
          <>
            <Pressable
              style={styles.popupDismissArea}
              onPress={handleDismissPopup}
              accessibilityRole="button"
              accessibilityLabel="Dismiss planning information"
            />
            <View
              ref={popupRef}
              style={[
                styles.popupWrapper,
                Platform.OS === "web"
                  ? ({ outlineStyle: "none" } as any)
                  : null,
              ]}
              accessibilityViewIsModal={true}
              accessible={true}
              accessibilityLiveRegion="assertive"
              accessibilityLabel="Uncheck Planning done to edit or add activities again."
              {...(Platform.OS === "web" ? ({ tabIndex: -1 } as any) : {})}
            >
              <View style={styles.popup}>
                <AppText
                  variant="caption"
                  style={styles.popupText}
                  accessible={false}
                >
                  Uncheck Planning done to edit or add activities again.
                </AppText>
              </View>
            </View>
          </>
        )}

        {activeState === "planning" && (
          <PlanningDoneBar
            checked={hasCurrentUserFinished}
            disabled={
              isSubmittingPlanning ||
              isPreparingFinalItinerary ||
              isPreparingVoting
            }
            onPress={handleFinishPlanning}
            onInfoPress={handlePlanningInfoPress}
          />
        )}

        {activeState === "voting" && isAdmin && (
          <VotingDoneBar
            disabled={isSubmittingVoting || isPreparingFinalItinerary}
            onPress={handleFinishVoting}
          />
        )}

        {isPreparingFinalItinerary && (
          <TransitionOverlay
            title="Making your itinerary ready"
            text="We are choosing the group favorites for each time slot."
          />
        )}

        {isPreparingVoting && (
          <TransitionOverlay
            title="Getting voting ready"
            text="We are preparing the activities your group can vote on."
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.beachYellow,
  },
  screen: {
    flex: 1,
    position: "relative",
    backgroundColor: colors.lightWhite,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.lightWhite,
  },
  content: {
    paddingTop: 0,
    paddingBottom: 140,
  },
  contentPanel: {
    marginHorizontal: 0,
    backgroundColor: colors.lightWhite,
    paddingBottom: spacing.xl,
  },
  slotList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  finalSlotSection: {
    gap: spacing.sm,
  },
  planningContent: {
    position: "relative",
  },
  planningLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 5,
  },
  footerBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.lightWhite,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    height: 110,
    elevation: 4,
  },
  popupWrapper: {
    position: "absolute",
    bottom: 110,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    zIndex: 20,
  },
  popupDismissArea: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 15,
  },
  popup: {
    backgroundColor: colors.nightBlack,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: 320,
  },
  popupText: {
    color: colors.white,
    textAlign: "center",
  },
  votingSection: {
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  emptyVoting: {
    paddingVertical: spacing.xxl,
  },
  finalizingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.32)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    zIndex: 40,
  },
  finalizingCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 18,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  finalizingTitle: {
    color: colors.nightBlack,
    textAlign: "center",
  },
  finalizingText: {
    color: colors.textMuted,
    textAlign: "center",
  },
});
