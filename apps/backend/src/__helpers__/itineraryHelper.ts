// apps/backend/src/__helpers__/itineraryHelper.ts
export function generateDaySlots() {
    const slots = [
        "06:00-08:00",
        "08:00-10:00",
        "10:00-12:00",
        "12:00-14:00",
        "14:00-16:00",
        "16:00-18:00",
        "18:00-20:00",
        "20:00-22:00",
    ];

    return slots.map((slot_type) => ({
        slot_type,
        activityId: null,
    }));
}

export function generateItinerary(
    tripId: string,
    startDate: string,
    endDate: string
) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = [];

    const current = new Date(start);
    while (current <= end) {
        days.push({
            date: current.toISOString().split("T")[0],
            slots: generateDaySlots(),
        });
        current.setDate(current.getDate() + 1);
    }

    return {
        trip_id: tripId,
        days,
    };
}