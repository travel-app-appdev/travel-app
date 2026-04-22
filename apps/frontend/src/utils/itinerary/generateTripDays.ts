import type { TripDay } from "@/src/types/itinerary";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(dateString: string) {
  const date = new Date(dateString);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function generateTripDays(
  startDate: string,
  endDate: string
): TripDay[] {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  const days: TripDay[] = [];
  const current = new Date(start);

  while (current <= end) {
    days.push({
      id: toIsoDate(current),
      isoDate: toIsoDate(current),
      dayNumber: current.getDate(),
      weekdayShort: WEEKDAY_SHORT[current.getDay()],
      monthShort: MONTH_SHORT[current.getMonth()],
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}
