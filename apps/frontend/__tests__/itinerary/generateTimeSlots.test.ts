// apps/frontend/__tests__/itinerary/generateTimeSlots.test.ts
import { generateTimeSlots } from "@/src/utils/itinerary/generateTimeSlots";

describe("generateTimeSlots", () => {
  it("creates the fixed activity slots", () => {
    const slots = generateTimeSlots();

    expect(slots).toHaveLength(6);
    expect(slots.map((slot) => slot.label)).toEqual([
      "Breakfast",
      "Morning Activity",
      "Lunch",
      "Midday Activity",
      "Dinner",
      "Evening Activity",
    ]);
  });

  it("creates slot ids equal to the label", () => {
    const slots = generateTimeSlots();

    expect(slots[0].id).toBe("Breakfast");
    expect(slots[3].id).toBe("Midday Activity");
  });
});
