import { useCallback, useRef } from "react";
import type { ItineraryState } from "@/src/types/itinerary";
import {
  useTripDocumentListener,
  type TripDocumentSnapshot,
} from "@/src/hooks/useTripDocumentListener";

type RefreshTripTimerFields = (options: {
  forceRefresh?: boolean;
}) => void | Promise<void>;

type UseItineraryTripOptions = {
  tripId?: string | null;
  activeState: ItineraryState;
  onMissing: () => void;
  refreshFinalItinerary: () => void | Promise<void>;
  refreshTripTimerFields: RefreshTripTimerFields;
};

export function useItineraryTrip({
  tripId,
  activeState,
  onMissing,
  refreshFinalItinerary,
  refreshTripTimerFields,
}: UseItineraryTripOptions) {
  const lastFinalUpdateRef = useRef<string | null | undefined>(undefined);

  const handleTripChanged = useCallback(
    async (snapshot: TripDocumentSnapshot, isInitialSnapshot: boolean) => {
      const data = snapshot.data();

      if (activeState === "final") {
        const nextValue =
          data?.final_itinerary_updated_at?.toMillis?.()?.toString?.() ?? null;

        if (lastFinalUpdateRef.current === undefined) {
          lastFinalUpdateRef.current = nextValue;
        } else if (nextValue !== lastFinalUpdateRef.current) {
          lastFinalUpdateRef.current = nextValue;
          await refreshFinalItinerary();
        }
      }

      if (isInitialSnapshot) {
        return;
      }

      if (activeState === "planning" || activeState === "voting") {
        void refreshTripTimerFields({ forceRefresh: true });
      }
    },
    [activeState, refreshFinalItinerary, refreshTripTimerFields]
  );

  const handleTripListenerError = useCallback((error: Error) => {
    console.log("Trip listener error:", error);
  }, []);

  useTripDocumentListener({
    tripId,
    skipInitialSnapshot: false,
    onMissing,
    onChange: handleTripChanged,
    onError: handleTripListenerError,
  });

  const resetFinalUpdateTracking = useCallback(() => {
    lastFinalUpdateRef.current = undefined;
  }, []);

  return { resetFinalUpdateTracking };
}
