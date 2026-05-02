// apps/frontend/app/itinerary.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { colors, spacing } from "@/src/theme";
import { generateTimeSlots } from "@/src/utils/itinerary/generateTimeSlots";
import { generateTripDays } from "@/src/utils/itinerary/generateTripDays";
import { mapActivitiesToSlots } from "@/src/utils/itinerary/mapActivitiesToSlots";
import { useAuth } from "@/src/context/AuthContext";

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
import { VotingSlotCard } from "@/src/components/itinerary/VoteSlotCard";
import { VotingTimeFilter } from "@/src/components/itinerary/VotingTimeFilter";
import { FinalSlotCard } from "@/src/components/itinerary/FinalSlotCard";
import { finishPlanning } from "@/src/api/trips";
import {
  getActivitiesBySlot,
  getFinalItineraryActivities,
  toggleActivityAttendance,
  voteForActivity,
} from "@/src/services/activityService";

const DEV_FORCE_STATE: ItineraryState | null = null;

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

function mapBackendActivity(activity: any, fallback: {
  dayId: string;
  slotId: string;
}): Activity {
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
    joinedCount: activity.joinedCount ?? 0,
    hasCurrentUserJoined: activity.hasCurrentUserJoined ?? false,
  };
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

function markPlanningDoneForUser(
  planningStatus: TripItinerary["planningStatus"],
  userId: string
): TripItinerary["planningStatus"] {
  const hasExistingUser = planningStatus.some(
    (member) => member.userId === userId
  );

  if (!hasExistingUser) {
    return [...planningStatus, { userId, hasFinishedPlanning: true }];
  }

  return planningStatus.map((member) =>
    member.userId === userId ? { ...member, hasFinishedPlanning: true } : member
  );
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

function getDaysLeftText(state: ItineraryState): string {
  switch (state) {
    case "voting":
      return "3 days";
    case "final":
      return "0 days";
    case "planning":
    default:
      return "73 days";
  }
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

  const [apiActivities, setApiActivities] = useState<Activity[]>([]);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [showPlanningInfoPopup, setShowPlanningInfoPopup] = useState(false);
  const [isSubmittingPlanning, setIsSubmittingPlanning] = useState(false);
  const planningInfoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const finalizingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [isPreparingFinalItinerary, setIsPreparingFinalItinerary] =
    useState(false);

  const slots = useMemo(() => generateTimeSlots(), []);

  const activeState: ItineraryState =
    DEV_FORCE_STATE ?? routeState ?? itinerary.state;

  const tripDays = useMemo(
    () => generateTripDays(itinerary.startDate, itinerary.endDate),
    [itinerary.startDate, itinerary.endDate]
  );

  const [selectedDayId, setSelectedDayId] = useState<string>("");

  useEffect(() => {
    if (tripDays.length > 0) {
      setSelectedDayId(tripDays[0].id);
    } else {
      setSelectedDayId(itinerary.startDate);
    }
  }, [tripDays, itinerary.startDate]);

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
    return () => {
      if (planningInfoTimeoutRef.current) {
        clearTimeout(planningInfoTimeoutRef.current);
      }
      if (finalizingTimeoutRef.current) {
        clearTimeout(finalizingTimeoutRef.current);
      }
    };
  }, []);

  // Load activities from API
  useEffect(() => {
    async function loadActivities() {
      if (!tripId || tripDays.length === 0) return;
      if (activeState === "planning" && (!selectedDayId || !currentUserId)) {
        return;
      }

      const cacheKey = `${tripId}_${activeState}_${selectedDayId}`;
      const cached = activitiesCache.get(cacheKey);

      if (cached) {
        setApiActivities(cached);
        setIsLoadingActivities(false);
      } else {
        setIsLoadingActivities(true);
      }

      try {
        if (activeState === "final") {
          const finalActivities = await getFinalItineraryActivities(
            tripId,
            currentUserId ?? undefined
          );
          const mapped = finalActivities.map((activity: any) =>
            mapBackendActivity(activity, {
              dayId: selectedDayId || itinerary.startDate,
              slotId: activity.slot_id ?? "",
            })
          );
          activitiesCache.set(cacheKey, mapped);
          setApiActivities(mapped);
          setIsLoadingActivities(false);
          return;
        }

        const daysToLoad =
          activeState === "voting"
            ? tripDays.map((day) => day.id)
            : [selectedDayId];

        const allActivities = (
          await Promise.all(
            daysToLoad.flatMap((dayId) =>
              slots.map(async (slot) => {
                const slotIdWithDate = `${dayId}_${slot.id}`;
                const slotActivities = await getActivitiesBySlot(
                  tripId,
                  slotIdWithDate,
                  currentUserId ?? undefined
                );
                return slotActivities.map((activity: any) =>
                  mapBackendActivity(activity, {
                    dayId,
                    slotId: slot.id,
                  })
                );
              })
            )
          )
        ).flat();

        activitiesCache.set(cacheKey, allActivities);
        setApiActivities(allActivities);
        setIsLoadingActivities(false);
      } catch (error) {
        console.log("Could not load activities:", error);
        setIsLoadingActivities(false);
      }
    }

    loadActivities();
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
        activitiesJson: JSON.stringify(itinerary.activities),
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
        activityId: activity.id,
        initialName: activity.name,
        initialDescription: activity.description ?? "",
        initialAddress: activity.address ?? "",
        initialGoogleMapsUrl: activity.googleMapsUrl ?? "",
        activitiesJson: JSON.stringify(itinerary.activities),
      },
    });
  }

  async function handleFinishPlanning() {
    if (hasCurrentUserFinished || isSubmittingPlanning) return;

    if (!currentUserId) return;

    if (itinerary.tripId === "trip-fallback") {
      const nextState = shouldSkipVoting(tripMemberCount)
        ? "final"
        : "planning";

      setItinerary((current) => ({
        ...current,
        state: nextState,
        planningStatus: markPlanningDoneForUser(
          current.planningStatus,
          currentUserId
        ),
      }));

      if (nextState === "final") {
        router.setParams({ state: "final" });
      }

      return;
    }

    if (!authToken) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }

    setIsSubmittingPlanning(true);

    try {
      const result = await finishPlanning({
        idToken: authToken,
        tripId: itinerary.tripId,
      });
      const backendState = toUiState(result.tripState);
      const nextState =
        backendState === "voting" &&
        shouldSkipVoting(result.totalMembers || tripMemberCount)
          ? "final"
          : backendState;

      setItinerary((current) => ({
        ...current,
        state: nextState,
        planningStatus: markPlanningDoneForUser(
          current.planningStatus,
          currentUserId
        ),
      }));

      router.setParams({ state: nextState });
    } catch (error) {
      Alert.alert(
        "Could not finish planning",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsSubmittingPlanning(false);
    }
  }

  const votingActivities = useMemo(
    () => (apiActivities.length > 0 ? apiActivities : itinerary.activities),
    [apiActivities, itinerary.activities]
  );

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
        if (!seen.has(a.slotId)) seen.set(a.slotId, a.slotId);
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

      setApiActivities((current) =>
        current.map((activity) => {
          if (
            activity.dayId !== selectedDayId ||
            activity.slotId !== selectedVotingSlotId
          ) {
            return activity;
          }

          const wasSelected = activity.hasCurrentUserVote === true;
          const isSelected = activity.id === activityId;
          const voteDelta = isSelected && !wasSelected ? 1 : !isSelected && wasSelected ? -1 : 0;

          return {
            ...activity,
            hasCurrentUserVote: isSelected,
            voteCount: Math.max(0, (activity.voteCount ?? 0) + voteDelta),
          };
        })
      );
      setActivityRefreshKey((value) => value + 1);

      if (result.tripState === "Final") {
        setIsPreparingFinalItinerary(true);

        if (finalizingTimeoutRef.current) {
          clearTimeout(finalizingTimeoutRef.current);
        }

        finalizingTimeoutRef.current = setTimeout(() => {
          setItinerary((current) => ({
            ...current,
            state: "final",
          }));
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

  const finalActivityMap = useMemo(() => {
    const map = new Map<string, Activity>();
    finalActivities
      .filter((a) => a.dayId === selectedDayId)
      .forEach((a) => map.set(a.slotId, a));
    return map;
  }, [finalActivities, selectedDayId]);

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

      setApiActivities((current) =>
        current.map((item) =>
          item.id === activityId &&
          item.dayId === activity.dayId &&
          item.slotId === activity.slotId
            ? {
                ...item,
                hasCurrentUserJoined: result.joined,
                joinedCount: result.joinedCount,
              }
            : item
        )
      );
    } catch (error) {
      Alert.alert(
        "Could not update group",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  }

  const safeAreaBg =
    activeState === "voting"
      ? colors.sunsetPink
      : activeState === "final"
        ? colors.plantGreen
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
            title={itinerary.title}
            destination={itinerary.destination}
            startDate={itinerary.startDate}
            endDate={itinerary.endDate}
            introText={getIntroText(activeState)}
            daysLeftText={getDaysLeftText(activeState)}
            onBackPress={() => router.back()}
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
            />

            {/* PLANNING */}
            {activeState === "planning" && (
              <View style={styles.planningContent}>
                <View style={styles.slotList}>
                  {isLoadingActivities
                    ? slots.map((slot) => (
                        <SkeletonSlotCard key={slot.id} />
                      ))
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
                  <View style={[styles.planningLockOverlay, { pointerEvents: "auto" }]} />
                )}
              </View>
            )}

            {/* VOTING */}
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

            {/* FINAL */}
            {activeState === "final" && (
              <View style={styles.slotList}>
                {isLoadingActivities
                  ? slots.map((slot) => (
                      <SkeletonSlotCard key={slot.id} />
                    ))
                  : slots.map((slot) => (
                      <FinalSlotCard
                        key={slot.id}
                        slot={slot}
                        activity={finalActivityMap.get(slot.id)}
                        onJoinGroup={handleJoinGroup}
                      />
                    ))}
              </View>
            )}
          </View>
        </ScrollView>

        {activeState === "planning" && (
          <View style={[styles.footerBackground, { pointerEvents: "none" }]} />
        )}

        {showPlanningInfoPopup && (
          <>
            <Pressable
              style={styles.popupDismissArea}
              onPress={() => {
                if (planningInfoTimeoutRef.current) {
                  clearTimeout(planningInfoTimeoutRef.current);
                }
                setShowPlanningInfoPopup(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss planning information"
            />
            <View style={[styles.popupWrapper, { pointerEvents: "none" }]}>
              <View style={styles.popup}>
                <AppText variant="caption" style={styles.popupText}>
                  You can no longer add activities after submitting.
                </AppText>
              </View>
            </View>
          </>
        )}

        {activeState === "planning" && (
          <PlanningDoneBar
            checked={hasCurrentUserFinished}
            disabled={isSubmittingPlanning}
            onPress={handleFinishPlanning}
            onInfoPress={handlePlanningInfoPress}
          />
        )}

        {isPreparingFinalItinerary && (
          <View style={styles.finalizingOverlay}>
            <View style={styles.finalizingCard}>
              <ActivityIndicator color={colors.nightBlack} />
              <AppText variant="subtitle" style={styles.finalizingTitle}>
                Making your itinerary ready
              </AppText>
              <AppText variant="caption" style={styles.finalizingText}>
                We are choosing the group favorites for each time slot.
              </AppText>
            </View>
          </View>
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
  },
  scroll: {
    flex: 1,
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
    gap: spacing.md,
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
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: 110,
    boxShadow: `0px 0px 10px rgba(255, 214, 0, 0.5)`,
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