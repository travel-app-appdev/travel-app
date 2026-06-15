import { useEffect } from "react";
import {
  doc,
  onSnapshot,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";

export type TripDocumentSnapshot = DocumentSnapshot<DocumentData>;

type UseTripDocumentListenerOptions = {
  tripId?: string | null;
  skipInitialSnapshot?: boolean;
  onMissing: () => void;
  onChange: (
    snapshot: TripDocumentSnapshot,
    isInitialSnapshot: boolean
  ) => void | Promise<void>;
  onError?: (error: Error) => void;
};

export function useTripDocumentListener({
  tripId,
  skipInitialSnapshot = true,
  onMissing,
  onChange,
  onError,
}: UseTripDocumentListenerOptions) {
  useEffect(() => {
    if (!tripId) return;

    let isInitialSnapshot = true;

    const unsubscribe = onSnapshot(
      doc(db, "trips", tripId),
      (snapshot) => {
        if (!snapshot.exists()) {
          onMissing();
          return;
        }

        const isInitial = isInitialSnapshot;

        if (skipInitialSnapshot && isInitial) {
          isInitialSnapshot = false;
          return;
        }

        isInitialSnapshot = false;
        void onChange(snapshot, isInitial);
      },
      (error) => {
        onError?.(error);
      }
    );

    return unsubscribe;
  }, [onChange, onError, onMissing, skipInitialSnapshot, tripId]);
}
