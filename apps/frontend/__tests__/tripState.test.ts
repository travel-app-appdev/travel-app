import {
  getEffectiveTripState,
  isPastTripByEndDate,
  isTripStartedByStartDate,
  parseLocalTripDate,
} from "@/src/utils/tripState";

describe("trip state helpers", () => {
  const today = new Date(2026, 5, 9);

  it("treats trips whose end date is before today as past", () => {
    expect(isPastTripByEndDate("2026-06-08", today)).toBe(true);
    expect(isPastTripByEndDate("2026-06-09", today)).toBe(false);
    expect(isPastTripByEndDate("2026-06-10", today)).toBe(false);
  });

  it("forces ended trips to Memories for the home screen", () => {
    expect(
      getEffectiveTripState(
        { state: "Planning", end_date: "2026-04-23" },
        today
      )
    ).toBe("Memories");
  });

  it("treats trips whose start date is today or earlier as started", () => {
    expect(isTripStartedByStartDate("2026-06-08", today)).toBe(true);
    expect(isTripStartedByStartDate("2026-06-09", today)).toBe(true);
    expect(isTripStartedByStartDate("2026-06-10", today)).toBe(false);
  });

  it("parses date-only strings as local calendar dates", () => {
    const parsed = parseLocalTripDate("2026-04-23");

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(3);
    expect(parsed.getDate()).toBe(23);
  });
});
