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

function formatShort(dateString: string) {
  const date = new Date(dateString);
  const month = MONTH_SHORT[date.getMonth()];
  const day = date.getDate();
  return `${month} ${day}`;
}

export function formatTripDateRange(startDate: string, endDate: string) {
  return `${formatShort(startDate)}-${formatShort(endDate)}`;
}
