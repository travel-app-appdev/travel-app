import type { Activity, TimeSlot } from "@/src/types/itinerary";

export type SlotActivityMapItem = {
  slot: TimeSlot;
  activity?: Activity;
};

export function mapActivitiesToSlots(
  slots: TimeSlot[],
  activities: Activity[],
  selectedDayId: string
): SlotActivityMapItem[] {
  return slots.map((slot) => {
    const activity = activities.find(
      (item) => item.dayId === selectedDayId && item.slotId === slot.id
    );

    return {
      slot,
      activity,
    };
  });
}
