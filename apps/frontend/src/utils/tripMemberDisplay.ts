import type { TripMember } from "@/src/api/trips";
import {
  mapTripMembersForDisplay as mapMembersForDisplay,
  type MemberDisplay,
} from "@/src/utils/tripMembers";

export type TripMemberDisplay = MemberDisplay;

export function mapTripMembersForDisplay(
  members: TripMember[]
): TripMemberDisplay[] {
  return mapMembersForDisplay(members);
}
