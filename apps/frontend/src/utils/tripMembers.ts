import { colors } from "@/src/theme";
import type { Trip } from "@/src/api/trips";

export type MemberDisplay = {
  id: string;
  name: string;
  initials: string;
  color: string;
};

const MEMBER_COLORS = [
  colors.beachYellow,
  colors.sunsetPink,
  colors.neonGreen,
  colors.seaBlue,
];

export function getMemberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getMemberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

export function mapTripMembersToMemberParams(
  members?: Trip["members"]
): MemberDisplay[] {
  return (members ?? []).map((member, index) => ({
    id: member.id,
    name: member.name,
    initials: getMemberInitials(member.name),
    color: getMemberColor(index),
  }));
}
