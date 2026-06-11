import {
  getChecklistDisplayState,
  getEffectiveTripState,
  getPhaseStatus,
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

  it("shows final checklist copy for future final and memory trips", () => {
    expect(getChecklistDisplayState("Final", false)).toBe("Final");
    expect(getChecklistDisplayState("Memories", false)).toBe("Final");
  });

  it("shows memory checklist copy once the trip has started", () => {
    expect(getChecklistDisplayState("Final", true)).toBe("Memories");
    expect(getChecklistDisplayState("Memories", true)).toBe("Memories");
  });

  it("keeps planning and voting checklist copy unchanged", () => {
    expect(getChecklistDisplayState("Planning", false)).toBe("Planning");
    expect(getChecklistDisplayState("Voting", true)).toBe("Voting");
  });

  it("keeps memory phase inactive before the trip starts", () => {
    expect(getPhaseStatus("memories", "Memories", false, false)).toBe("future");
    expect(getPhaseStatus("memories", "Final", false, false)).toBe("future");
    expect(getPhaseStatus("final", "Memories", false, false)).toBe("active");
  });

  it("activates memory phase once the trip has started", () => {
    expect(getPhaseStatus("memories", "Memories", true, true)).toBe("active");
    expect(getPhaseStatus("memories", "Final", false, true)).toBe("active");
  });
});
