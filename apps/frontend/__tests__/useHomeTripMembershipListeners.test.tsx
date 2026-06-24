import React from "react";
import { render } from "@testing-library/react-native";
import { useHomeTripMembershipListeners } from "@/src/hooks/useHomeTripMembershipListeners";

const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockOnSnapshot = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();

jest.mock("@/src/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
}));

type MembershipDocData = {
  trip_id: string;
  invite_status: string;
};

type MembershipChange = {
  type: "added" | "modified" | "removed";
  data: MembershipDocData;
};

function membershipDoc(data: MembershipDocData) {
  return {
    data: () => data,
  };
}

function membershipSnapshot(
  docs: MembershipDocData[],
  changes: MembershipChange[]
) {
  return {
    docs: docs.map(membershipDoc),
    docChanges: () =>
      changes.map((change) => ({
        type: change.type,
        doc: membershipDoc(change.data),
      })),
  };
}

function TestHarness() {
  useHomeTripMembershipListeners({
    userId: "user-1",
    onTripRemoved: jest.fn(),
    onTripChanged: jest.fn(),
  });

  return null;
}

describe("useHomeTripMembershipListeners", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue({ type: "collection" });
    mockWhere.mockReturnValue({ type: "where" });
    mockQuery.mockReturnValue({ type: "query" });
    mockDoc.mockImplementation((_db, collectionName, id) => ({
      type: "doc",
      collectionName,
      id,
    }));
    mockOnSnapshot.mockImplementation(() => jest.fn());
  });

  it("keeps existing trip listeners when later membership snapshots only report changed docs", () => {
    render(<TestHarness />);

    const membershipCallback = mockOnSnapshot.mock.calls[0][1] as (
      snapshot: ReturnType<typeof membershipSnapshot>
    ) => void;

    membershipCallback(
      membershipSnapshot(
        [
          { trip_id: "trip-a", invite_status: "accepted" },
          { trip_id: "trip-b", invite_status: "accepted" },
        ],
        [
          {
            type: "added",
            data: { trip_id: "trip-a", invite_status: "accepted" },
          },
          {
            type: "added",
            data: { trip_id: "trip-b", invite_status: "accepted" },
          },
        ]
      )
    );

    const unsubscribeTripA = mockOnSnapshot.mock.results[1].value as jest.Mock;
    const unsubscribeTripB = mockOnSnapshot.mock.results[2].value as jest.Mock;

    membershipCallback(
      membershipSnapshot(
        [
          { trip_id: "trip-a", invite_status: "accepted" },
          { trip_id: "trip-b", invite_status: "accepted" },
          { trip_id: "trip-c", invite_status: "accepted" },
        ],
        [
          {
            type: "added",
            data: { trip_id: "trip-c", invite_status: "accepted" },
          },
        ]
      )
    );

    expect(unsubscribeTripA).not.toHaveBeenCalled();
    expect(unsubscribeTripB).not.toHaveBeenCalled();
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), "trips", "trip-c");
  });
});
