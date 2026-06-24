export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatDateDisplayFromString(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return formatDateDisplay(date);
}

export function fromDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dateToTimeString(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function combineDateAndTime(date: Date, timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined.toISOString();
}

export function combineDateAndTimeToDate(date: Date, timeStr: string): Date {
  return new Date(combineDateAndTime(date, timeStr));
}

export function parseIsoToDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseIsoToTimeString(value?: string): string {
  const parsed = parseIsoToDate(value);
  return parsed ? dateToTimeString(parsed) : "00:00";
}

export function parseTripDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const dateOnly = value.split("T")[0];
  if (!dateOnly) return fallback;
  const parsed = fromDateString(dateOnly);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function isDeadlinePast(deadline?: string): boolean {
  if (!deadline) return false;
  const parsed = new Date(deadline);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
}

export function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function normalizeTimeInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

const DEFAULT_VOTING_GAP_MS = 60 * 60 * 1000;
const MIN_VOTING_GAP_MS = 60 * 1000;

export function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function adjustVotingEndAfterPlanning(params: {
  nextPlanningEnd: Date;
  currentVotingEnd: Date;
  previousPlanningEnd?: Date | null;
  tripEndBoundary?: Date | null;
}): Date {
  const { nextPlanningEnd, currentVotingEnd, previousPlanningEnd, tripEndBoundary } =
    params;

  if (currentVotingEnd > nextPlanningEnd) {
    let result = currentVotingEnd;
    if (tripEndBoundary && result > tripEndBoundary) {
      result = tripEndBoundary;
    }
    if (result > nextPlanningEnd) {
      return result;
    }
  }

  const gapMs =
    previousPlanningEnd && currentVotingEnd > previousPlanningEnd
      ? currentVotingEnd.getTime() - previousPlanningEnd.getTime()
      : DEFAULT_VOTING_GAP_MS;
  const minGap = Math.max(gapMs, MIN_VOTING_GAP_MS);
  let adjusted = new Date(nextPlanningEnd.getTime() + minGap);

  if (tripEndBoundary && adjusted > tripEndBoundary) {
    adjusted = tripEndBoundary;
  }

  if (adjusted <= nextPlanningEnd) {
    adjusted = new Date(nextPlanningEnd.getTime() + MIN_VOTING_GAP_MS);
    if (tripEndBoundary && adjusted > tripEndBoundary) {
      adjusted = tripEndBoundary;
    }
  }

  return adjusted;
}
