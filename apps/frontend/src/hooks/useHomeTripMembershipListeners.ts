import { useEffect } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";

export type HomeTripDocumentData = DocumentData;

type UseHomeTripMembershipListenersOptions = {
  userId?: string | null;
  onTripRemoved: (tripId: string) => void;
  onTripChanged: (tripId: string, data: DocumentData) => void;
  onTripListenerError?: (error: Error) => void;
  onMembershipListenerError?: (error: Error) => void;
};

export function useHomeTripMembershipListeners({
  userId,
  onTripRemoved,
  onTripChanged,
  onTripListenerError,
  onMembershipListenerError,
}: UseHomeTripMembershipListenersOptions) {
  useEffect(() => {
    if (!userId) return;

    const membershipQuery = query(
      collection(db, "trip_members"),
      where("user_id", "==", userId)
    );
    const tripUnsubscribers = new Map<string, () => void>();

    const unsubscribeMemberships = onSnapshot(
      membershipQuery,
      (snapshot) => {
        const activeTripIds = new Set<string>();

        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          const tripId = data.trip_id;

          if (typeof tripId !== "string") return;

          if (change.type === "removed" || data.invite_status !== "accepted") {
            onTripRemoved(tripId);
            return;
          }

          activeTripIds.add(tripId);

          if (tripUnsubscribers.has(tripId)) return;

          const unsubscribeTrip = onSnapshot(
            doc(db, "trips", tripId),
            (tripSnap) => {
              if (!tripSnap.exists()) {
                onTripRemoved(tripId);
                return;
              }

              onTripChanged(tripId, tripSnap.data());
            },
            (error) => {
              onTripListenerError?.(error);
            }
          );

          tripUnsubscribers.set(tripId, unsubscribeTrip);
        });

        for (const [tripId, unsubscribeTrip] of tripUnsubscribers.entries()) {
          if (!activeTripIds.has(tripId)) {
            unsubscribeTrip();
            tripUnsubscribers.delete(tripId);
          }
        }
      },
      (error) => {
        onMembershipListenerError?.(error);
      }
    );

    return () => {
      unsubscribeMemberships();
      for (const unsubscribeTrip of tripUnsubscribers.values()) {
        unsubscribeTrip();
      }
      tripUnsubscribers.clear();
    };
  }, [
    onMembershipListenerError,
    onTripChanged,
    onTripListenerError,
    onTripRemoved,
    userId,
  ]);
}
