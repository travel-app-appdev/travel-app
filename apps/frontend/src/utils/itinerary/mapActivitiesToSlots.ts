import type { ItineraryActivity, TimeSlot } from "@/src/types/itinerary";

export type SlotActivityMapItem = {
  slot: TimeSlot;
  activity?: ItineraryActivity;
};

export function mapActivitiesToSlots(
  slots: TimeSlot[],
  activities: ItineraryActivity[],
  selectedDayIsoDate: string
): SlotActivityMapItem[] {
  return slots.map((slot) => {
    const activity = activities.find(
      (item) =>
        item.dayIsoDate === selectedDayIsoDate && item.slotId === slot.id
    );

    return {
      slot,
      activity,
    };
  });
}
