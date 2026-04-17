import { generateTimeSlots } from "@/src/utils/itinerary/generateTimeSlots";

describe("generateTimeSlots", () => {
  it("creates fixed 2-hour slots from 06:00 to 22:00", () => {
    const slots = generateTimeSlots();

    expect(slots).toHaveLength(8);
    expect(slots[0].label).toBe("06:00-08:00");
    expect(slots[7].label).toBe("20:00-22:00");
  });

  it("creates slot ids equal to the label", () => {
    const slots = generateTimeSlots();

    expect(slots[0].id).toBe("06:00-08:00");
    expect(slots[3].id).toBe("12:00-14:00");
  });
});
