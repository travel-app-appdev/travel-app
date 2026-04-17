import { useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams } from "expo-router";

import { colors, spacing } from "@/src/theme";
import { generateTimeSlots } from "@/src/utils/itinerary/generateTimeSlots";
import { generateTripDays } from "@/src/utils/itinerary/generateTripDays";
import { mapActivitiesToSlots } from "@/src/utils/itinerary/mapActivitiesToSlots";

import type { TripItinerary, ItineraryState } from "@/src/types/itinerary";
import { ItineraryHeader } from "@/src/components/itinerary/ItineraryHeader";
import { ItineraryDaySelector } from "@/src/components/itinerary/ItineraryDaySelector";
import { PlanningSlotCard } from "@/src/components/itinerary/PlanningSlotCard";
import { FinishPlanningSection } from "@/src/components/itinerary/FinishPlanningSection";

const DEV_FORCE_STATE: "planning" | "voting" | "final" | null = null;
const MOCK_CURRENT_USER_ID = "user-1";

const MOCK_ITINERARY: TripItinerary = {
  tripId: "trip-1",
  title: "Itinerary",
  destination: "Greek Islands",
  startDate: "2026-08-14",
  endDate: "2026-08-21",
  state: "planning",
  planningStatus: [
    { userId: "user-1", hasFinishedPlanning: false },
    { userId: "user-2", hasFinishedPlanning: true },
    { userId: "user-3", hasFinishedPlanning: false },
    { userId: "user-4", hasFinishedPlanning: false },
  ],
  activities: [],
};

export default function ItineraryScreen() {
  const { tripId, state } = useLocalSearchParams<{
    tripId?: string;
    state?: "planning" | "voting" | "final";
  }>();

  const [itinerary, setItinerary] = useState<TripItinerary>(MOCK_ITINERARY);

  const routeState: ItineraryState | undefined =
    state === "planning" || state === "voting" || state === "final"
      ? state
      : undefined;

  const activeState = DEV_FORCE_STATE ?? routeState ?? itinerary.state;

  const tripDays = useMemo(
    () => generateTripDays(itinerary.startDate, itinerary.endDate),
    [itinerary.startDate, itinerary.endDate]
  );

  const [selectedDayId, setSelectedDayId] = useState<string>(
    tripDays[0]?.id ?? itinerary.startDate
  );

  const slots = useMemo(() => generateTimeSlots(), []);

  const slotItems = useMemo(() => {
    return mapActivitiesToSlots(slots, itinerary.activities, selectedDayId);
  }, [slots, itinerary.activities, selectedDayId]);

  const completedCount = itinerary.planningStatus.filter(
    (member) => member.hasFinishedPlanning
  ).length;

  const totalCount = itinerary.planningStatus.length;

  const currentUserStatus = itinerary.planningStatus.find(
    (member) => member.userId === MOCK_CURRENT_USER_ID
  );

  const hasCurrentUserFinished =
    currentUserStatus?.hasFinishedPlanning ?? false;

  function handleAddActivity(slotId: string) {
    Alert.alert(
      "Add activity",
      `Trip ${tripId ?? itinerary.tripId} | state: ${activeState} | slot: ${slotId}`
    );
  }

  function handleFinishPlanning() {
    if (hasCurrentUserFinished) return;

    const updatedStatus = itinerary.planningStatus.map((member) =>
      member.userId === MOCK_CURRENT_USER_ID
        ? { ...member, hasFinishedPlanning: true }
        : member
    );

    setItinerary({
      ...itinerary,
      planningStatus: updatedStatus,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

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
        />

        <ItineraryDaySelector
          days={tripDays}
          selectedDayId={selectedDayId}
          onSelectDay={setSelectedDayId}
        />

        <View style={styles.slotList}>
          {activeState === "planning" &&
            slotItems.map(({ slot }) => (
              <PlanningSlotCard
                key={slot.id}
                slot={slot}
                onAddActivity={handleAddActivity}
              />
            ))}
        </View>

        {activeState === "planning" && (
          <FinishPlanningSection
            completedCount={completedCount}
            totalCount={totalCount}
            hasCurrentUserFinished={hasCurrentUserFinished}
            onFinishPlanning={handleFinishPlanning}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  slotList: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
});
