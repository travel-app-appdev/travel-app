import { toLocalDateString } from "@/src/utils/tripDate";

describe("create trip date serialization", () => {
  it("serializes selected local trip dates without shifting to UTC", () => {
    expect(toLocalDateString(new Date(2026, 5, 4))).toBe("2026-06-04");
    expect(toLocalDateString(new Date(2026, 5, 5))).toBe("2026-06-05");
  });
});
