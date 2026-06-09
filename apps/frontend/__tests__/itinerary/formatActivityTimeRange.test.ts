import {
  formatActivityTimeRange,
  isOvernightActivityTimeRange,
} from "@/src/utils/itinerary/formatActivityTimeRange";

describe("formatActivityTimeRange", () => {
  it("formats same-day activity time ranges unchanged", () => {
    expect(
      formatActivityTimeRange({ startTime: "18:00", endTime: "21:00" })
    ).toBe("18:00 - 21:00");
  });

  it("labels activity time ranges that end the next day", () => {
    expect(
      formatActivityTimeRange({ startTime: "18:00", endTime: "02:00" })
    ).toBe("18:00 - 02:00 (+1 day)");
  });

  it("does not label equal start and end times as next day", () => {
    expect(
      formatActivityTimeRange({ startTime: "18:00", endTime: "18:00" })
    ).toBe("18:00 - 18:00");
  });

  it("returns an empty string when either time is missing", () => {
    expect(formatActivityTimeRange({ startTime: "18:00" })).toBe("");
    expect(formatActivityTimeRange({ endTime: "02:00" })).toBe("");
  });
});

describe("isOvernightActivityTimeRange", () => {
  it("allows an activity to start in the morning and end after midnight", () => {
    expect(
      isOvernightActivityTimeRange({ startTime: "06:00", endTime: "02:00" })
    ).toBe(true);
  });
});
