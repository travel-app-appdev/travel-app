import type { TimeSlot } from "@/src/types/itinerary";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function generateTimeSlots(
  startHour = 6,
  endHour = 22,
  stepHours = 2
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  for (let hour = startHour; hour < endHour; hour += stepHours) {
    const label = `${pad(hour)}:00-${pad(hour + stepHours)}:00`;

    slots.push({
      id: label,
      label,
      startHour: hour,
    });
  }

  return slots;
}
