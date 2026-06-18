import type { TripMember } from "@/src/api/trips";
import { colors } from "@/src/theme/colors";

export type TripMemberDisplay = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getMemberColor(index: number): string {
  const palette = [
    colors.sunsetOrange,
    colors.plantGreen,
    colors.sunsetPink,
    colors.seaBlue,
  ];
  return palette[index % palette.length];
}

export function mapTripMembersForDisplay(
  members: TripMember[]
): TripMemberDisplay[] {
  return members.map((member, index) => ({
    id: member.id,
    name: member.name,
    initials: getInitials(member.name),
    color: getMemberColor(index),
  }));
}
