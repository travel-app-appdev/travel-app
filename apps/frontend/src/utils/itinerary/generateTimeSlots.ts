import type { TimeSlot } from "@/src/types/itinerary";

const SLOT_LABELS = [
  "Breakfast",
  "Morning Activity",
  "Lunch",
  "Midday Activity",
  "Dinner",
  "Evening Activity",
];

export function generateTimeSlots(): TimeSlot[] {
  return SLOT_LABELS.map((label, index) => ({
    id: label,
    label,
    startHour: index,
  }));
}
