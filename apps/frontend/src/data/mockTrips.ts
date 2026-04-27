import { colors } from "@/src/theme";
import type { ItineraryState } from "@/src/types/itinerary";

export type Member = {
  id: string;
  initials: string;
  color: string;
};

export type MockTrip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: ItineraryState;
  cardColor: string;
  members: Member[];
};

export const MOCK_TRIPS: MockTrip[] = [
  {
    id: "trip-1",
    title: "Greek Islands",
    destination: "Greece",
    startDate: "2026-08-14",
    endDate: "2026-08-21",
    status: "planning",
    cardColor: colors.beachYellow,
    members: [
      { id: "1", initials: "HV", color: "#FF8A65" },
      { id: "2", initials: "MB", color: "#4FC3F7" },
    ],
  },
  {
    id: "trip-2",
    title: "Barcelona Weekend",
    destination: "Spain",
    startDate: "2026-09-02",
    endDate: "2026-09-05",
    status: "voting",
    cardColor: colors.sunsetPink,
    members: [
      { id: "1", initials: "HV", color: "#FF8A65" },
      { id: "2", initials: "MB", color: "#4FC3F7" },
    ],
  },
  {
    id: "trip-3",
    title: "Alps Escape",
    destination: "Austria",
    startDate: "2026-10-12",
    endDate: "2026-10-15",
    status: "final",
    cardColor: colors.neonGreen,
    members: [
      { id: "1", initials: "HV", color: "#FF8A65" },
      { id: "2", initials: "MB", color: "#4FC3F7" },
    ],
  },
];
