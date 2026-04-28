// apps/frontend/app/itinerary.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
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
import { PlanningDoneBar } from "@/src/components/itinerary/PlanningDoneBar";
import { VotingSlotCard } from "@/src/components/itinerary/VoteSlotCard";
import { VotingTimeFilter } from "@/src/components/itinerary/VotingTimeFilter";
import { FinalSlotCard } from "@/src/components/itinerary/FinalSlotCard";
import { finishPlanning } from "@/src/api/trips";
import { auth } from "@/src/lib/firebase";

const DEV_FORCE_STATE: ItineraryState | null = null;
const FALLBACK_CURRENT_USER_ID = "user-1";

const MOCK_VOTING_ACTIVITIES: Activity[] = [
  {
    id: "act-1",
    slotId: "06:00-08:00",
    dayId: "2024-08-14",
    name: "Tempel of Hephaistos",
    address: "Athina 105 55",
    googleMapsUrl: "https://maps.google.com",
  },
  {
    id: "act-2",
    slotId: "06:00-08:00",
    dayId: "2024-08-14",
    name: "Roman Agora",
    address: "Polignotou 3, Athina 105 55",
    googleMapsUrl: "https://maps.google.com",
  },
  {
    id: "act-3",
    slotId: "10:00-12:00",
    dayId: "2024-08-14",
    name: "Acropolis Museum",
    address: "Dionysiou Areopagitou 15, Athina 117 42",
    googleMapsUrl: "https://maps.google.com",
  },
  {
    id: "act-4",
    slotId: "10:00-12:00",
    dayId: "2024-08-14",
    name: "National Archaeological Museum",
    address: "Patision 44, Athina 106 82",
    googleMapsUrl: "https://maps.google.com",
  },
  {
    id: "act-5",
    slotId: "14:00-16:00",
    dayId: "2024-08-17",
    name: "Monastiraki Flea Market",
    address: "Monastiraki Square, Athina",
    googleMapsUrl: "https://maps.google.com",
  },
];

const MOCK_FINAL_ACTIVITIES: Activity[] = [
  {
    id: "fin-1",
    slotId: "06:00-08:00",
    dayId: "2024-08-14",
    name: "Tempel of Hephaistos",
    address: "Athina 105 55",
    googleMapsUrl: "https://maps.google.com",
    joinedCount: 3,
  },
  {
    id: "fin-2",
    slotId: "08:00-10:00",
    dayId: "2024-08-14",
    name: "Vryssaki (artFix Athens)",
    address: "Vrisakiou 17, Athina 105 55",
    googleMapsUrl: "https://maps.google.com",
    joinedCount: 0,
  },
];

function parseActivitiesJson(value?: string): Activity[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

function getConflictingActivities(activities: Activity[]): Activity[] {
  const groups = new Map<string, Activity[]>();

  activities.forEach((activity) => {
    const key = `${activity.dayId}|${activity.slotId}`;
    groups.set(key, [...(groups.get(key) ?? []), activity]);
  });

  return Array.from(groups.values())
    .filter((group) => group.length > 1)
    .flat();
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
  const { user } = useAuth();
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
  const [showPlanningInfoPopup, setShowPlanningInfoPopup] = useState(false);
  const [isSubmittingPlanning, setIsSubmittingPlanning] = useState(false);
  const planningInfoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

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
    };
  }, []);

  // Load activities from API
  useEffect(() => {
    async function loadActivities() {
      if (!tripId || !selectedDayId) return;

      try {
        const allActivities: Activity[] = [];

        for (const slot of slots) {
          const slotIdWithDate = `${selectedDayId}_${slot.id}`;
          const baseUrl = `${process.env.EXPO_PUBLIC_API_URL}/itinerary/${tripId}/slots/${slotIdWithDate}/activities`;

          const url =
            activeState === "planning" && currentUserId
              ? `${baseUrl}?userId=${currentUserId}`
              : baseUrl;

          const response = await fetch(url);
          const slotActivities = await response.json();

          const mapped = slotActivities.map((a: any) => ({
            id: a.activity_id,
            dayId: selectedDayId,
            slotId: slot.id,
            name: a.name,
            address: a.address ?? "",
            googleMapsUrl: a.googleMapsUrl ?? "",
            description: a.description ?? "",
          }));
          allActivities.push(...mapped);
        }

        setApiActivities(allActivities);
      } catch (error) {
        console.log("Could not load activities:", error);
      }
    }

    loadActivities();
  }, [tripId, newActivityId, activeState, currentUserId, selectedDayId]);

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
    }, 110000);
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

  //const currentUserId = auth.currentUser?.uid ?? FALLBACK_CURRENT_USER_ID;
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

    const currentUser = auth.currentUser;
    if (!currentUserId) return;

    if (!currentUser || itinerary.tripId === "trip-fallback") {
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

    setIsSubmittingPlanning(true);

    try {
      const idToken = await currentUser.getIdToken();
      const result = await finishPlanning({
        idToken,
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
    } catch {
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
    } finally {
      setIsSubmittingPlanning(false);
    }
  }

  const conflictingActivities = useMemo(
    () => getConflictingActivities(itinerary.activities),
    [itinerary.activities]
  );

  const votingActivities =
    conflictingActivities.length > 0
      ? conflictingActivities
      : itinerary.activities.length > 0
        ? []
        : MOCK_VOTING_ACTIVITIES;

  const daysWithConflicts = useMemo(() => {
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
    if (votingTimeChips.length > 0) {
      setSelectedVotingSlotId(votingTimeChips[0].slotId);
    } else {
      setSelectedVotingSlotId("");
    }
  }, [votingTimeChips]);

  const votingSlotActivities = useMemo(() => {
    return votingActivities.filter(
      (a) => a.dayId === selectedDayId && a.slotId === selectedVotingSlotId
    );
  }, [votingActivities, selectedDayId, selectedVotingSlotId]);

  function handleAddVote(activityId: string) {
    Alert.alert("Vote added", `Voted for activity ${activityId}`);
  }

  useEffect(() => {
    if (activeState === "voting" && tripDays.length > 0) {
      const firstConflictDay = tripDays.find((d) =>
        daysWithConflicts.has(d.id)
      );
      if (firstConflictDay) {
        setSelectedDayId(firstConflictDay.id);
      }
    }
  }, [activeState, tripDays, daysWithConflicts]);

  const finalActivities =
    itinerary.activities.length > 0
      ? itinerary.activities
      : MOCK_FINAL_ACTIVITIES;

  const finalActivityMap = useMemo(() => {
    const map = new Map<string, Activity>();
    finalActivities
      .filter((a) => a.dayId === selectedDayId)
      .forEach((a) => map.set(a.slotId, a));
    return map;
  }, [finalActivities, selectedDayId]);

  function handleJoinGroup(activityId: string) {
    Alert.alert("Joined group", `Joined activity ${activityId}`);
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
                activeState === "voting" ? daysWithConflicts : undefined
              }
            />

            {activeState === "planning" && (
              <View style={styles.slotList}>
                {slotItems.map(({ slot, activity }) => (
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
            )}

            {activeState === "voting" && (
              <View style={styles.votingSection}>
                {votingTimeChips.length > 0 ? (
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
                {slots.map((slot) => (
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
          <View pointerEvents="none" style={styles.footerBackground} />
        )}

        {showPlanningInfoPopup && (
          <View style={styles.popupWrapper} pointerEvents="none">
            <View style={styles.popup}>
              <AppText variant="caption" style={styles.popupText}>
                You can no longer add activities after submitting.
              </AppText>
            </View>
          </View>
        )}

        {activeState === "planning" && hasCurrentUserFinished && (
          <View style={styles.lockOverlay} pointerEvents="auto" />
        )}

        {activeState === "planning" && (
          <PlanningDoneBar
            checked={hasCurrentUserFinished}
            disabled={isSubmittingPlanning}
            onPress={handleFinishPlanning}
            onInfoPress={handlePlanningInfoPress}
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
  footerBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: 110,
    shadowColor: colors.beachYellow,
    shadowOpacity: 5,
    shadowRadius: 10,
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
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 5,
  },
  votingSection: {
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  emptyVoting: {
    paddingVertical: spacing.xxl,
  },
});
