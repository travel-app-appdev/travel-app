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
    const start = `${pad(hour)}:00`;
    const end = `${pad(hour + stepHours)}:00`;
    const label = `${start}-${end}`;

    slots.push({
      id: label,
      start,
      end,
      label,
    });
  }

  return slots;
}
