import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { colors, spacing } from "@/src/theme";
import { generateTimeSlots } from "@/src/utils/itinerary/generateTimeSlots";
import { generateTripDays } from "@/src/utils/itinerary/generateTripDays";
import { mapActivitiesToSlots } from "@/src/utils/itinerary/mapActivitiesToSlots";

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

const DEV_FORCE_STATE: ItineraryState | null = null;
const MOCK_CURRENT_USER_ID = "user-1";

// ---------------------------------------------------------------------------
// Mock data — replace with real API data later
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------

function buildItineraryFromParams(params: {
  tripId?: string;
  title?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  state?: ItineraryState;
}): TripItinerary {
  const fallbackDate = new Date().toISOString().split("T")[0];

  return {
    tripId: params.tripId ?? "trip-fallback",
    title: params.title ?? "Untitled Trip",
    destination: params.destination ?? "Unknown destination",
    startDate: params.startDate ?? fallbackDate,
    endDate: params.endDate ?? fallbackDate,
    state: params.state ?? "planning",
    planningStatus: [
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
  const {
    tripId,
    state,
    title,
    destination,
    startDate,
    endDate,
    newActivityId,
    newActivityDayId,
    newActivitySlotId,
    newActivityName,
    newActivityAddress,
    newActivityGoogleMapsUrl,
  } = useLocalSearchParams<{
    tripId?: string;
    state?: "planning" | "voting" | "final";
    title?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    newActivityId?: string;
    newActivityDayId?: string;
    newActivitySlotId?: string;
    newActivityName?: string;
    newActivityAddress?: string;
    newActivityGoogleMapsUrl?: string;
  }>();

  const routeState: ItineraryState | undefined =
    state === "planning" || state === "voting" || state === "final"
      ? state
      : undefined;

  const [itinerary, setItinerary] = useState<TripItinerary>(() =>
    buildItineraryFromParams({
      tripId,
      title,
      destination,
      startDate,
      endDate,
      state: routeState,
    })
  );

  const [showPlanningInfoPopup, setShowPlanningInfoPopup] = useState(false);
  const planningInfoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    setItinerary((current) => ({
      ...buildItineraryFromParams({
        tripId,
        title,
        destination,
        startDate,
        endDate,
        state: routeState,
      }),
      activities: current.activities,
    }));
  }, [tripId, title, destination, startDate, endDate, routeState]);

  useEffect(() => {
    return () => {
      if (planningInfoTimeoutRef.current) {
        clearTimeout(planningInfoTimeoutRef.current);
      }
    };
  }, []);

  function handlePlanningInfoPress() {
    setShowPlanningInfoPopup(true);

    if (planningInfoTimeoutRef.current) {
      clearTimeout(planningInfoTimeoutRef.current);
    }

    planningInfoTimeoutRef.current = setTimeout(() => {
      setShowPlanningInfoPopup(false);
    }, 110000);
  }

  const lastAppliedActivityIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !newActivityId ||
      !newActivityDayId ||
      !newActivitySlotId ||
      !newActivityName
    ) {
      return;
    }

    if (lastAppliedActivityIdRef.current === newActivityId) {
      return;
    }

    const activityAlreadyExists = itinerary.activities.some(
      (activity) => activity.id === newActivityId
    );

    if (activityAlreadyExists) {
      lastAppliedActivityIdRef.current = newActivityId;
      return;
    }

    const newActivity: Activity = {
      id: newActivityId,
      dayId: newActivityDayId,
      slotId: newActivitySlotId,
      name: newActivityName,
      address: newActivityAddress ?? "",
      googleMapsUrl: newActivityGoogleMapsUrl ?? "",
    };

    setItinerary((current) => ({
      ...current,
      activities: [...current.activities, newActivity],
    }));

    lastAppliedActivityIdRef.current = newActivityId;
  }, [
    itinerary.activities,
    newActivityId,
    newActivityDayId,
    newActivitySlotId,
    newActivityName,
    newActivityAddress,
    newActivityGoogleMapsUrl,
  ]);

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

  // -------------------------------------------------------------------------
  // Planning state
  // -------------------------------------------------------------------------

  const slots = useMemo(() => generateTimeSlots(), []);

  const slotItems = useMemo(() => {
    return mapActivitiesToSlots(slots, itinerary.activities, selectedDayId);
  }, [slots, itinerary.activities, selectedDayId]);

  const currentUserStatus = itinerary.planningStatus.find(
    (m) => m.userId === MOCK_CURRENT_USER_ID
  );
  const hasCurrentUserFinished =
    currentUserStatus?.hasFinishedPlanning ?? false;

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
        dayId: selectedDayId,
        slotId,
      },
    });
  }

  function handleFinishPlanning() {
    if (hasCurrentUserFinished) return;

    const updatedStatus = itinerary.planningStatus.map((m) =>
      m.userId === MOCK_CURRENT_USER_ID
        ? { ...m, hasFinishedPlanning: true }
        : m
    );

    setItinerary((current) => ({
      ...current,
      planningStatus: updatedStatus,
    }));
  }

  // -------------------------------------------------------------------------
  // Voting state
  // -------------------------------------------------------------------------

  const votingActivities = MOCK_VOTING_ACTIVITIES;

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

  // -------------------------------------------------------------------------
  // Final state
  // -------------------------------------------------------------------------

  const finalActivities = MOCK_FINAL_ACTIVITIES;

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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

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

        {showPlanningInfoPopup && (
          <View style={styles.popupWrapper} pointerEvents="none">
            <View style={styles.popup}>
              <AppText variant="caption" style={styles.popupText}>
                You can no longer add activities after submitting.
              </AppText>
            </View>
          </View>
        )}

        {activeState === "planning" && (
          <PlanningDoneBar
            checked={hasCurrentUserFinished}
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
  popupWrapper: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
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
});
