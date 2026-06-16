import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image as ExpoImage } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot } from "firebase/firestore";

import { colors, spacing, typography, radius } from "@/src/theme";
import { ACTION_CARD_HEIGHT } from "@/src/components/common/ActionCard";
import { db, auth } from "@/src/lib/firebase";
import { generateTimeSlots } from "@/src/utils/itinerary/generateTimeSlots";
import { generateTripDays } from "@/src/utils/itinerary/generateTripDays";
import { mapActivitiesToSlots } from "@/src/utils/itinerary/mapActivitiesToSlots";
import { getActiveTripTimerText } from "@/src/utils/tripTimer";
import { useAuth } from "@/src/context/AuthContext";

import type {
  TripItinerary,
  ItineraryState,
  Activity,
} from "@/src/types/itinerary";
import type { TripState } from "@/src/types/trip";

import { AppText } from "@/src/components/common/AppText";
import { ConfirmModal } from "@/src/components/common/ConfirmModal";
import { FeedbackModal } from "@/src/components/common/FeedbackModal";
import { ItineraryHeader } from "@/src/components/itinerary/ItineraryHeader";
import { ItineraryDaySelector } from "@/src/components/itinerary/ItineraryDaySelector";
import { PlanningSlotCard } from "@/src/components/itinerary/PlanningSlotCard";
import { SkeletonSlotCard } from "@/src/components/itinerary/SkeletonSlotCard";
import { PlanningDoneBar } from "@/src/components/itinerary/PlanningDoneBar";
import { VotingDoneBar } from "@/src/components/itinerary/VotingDoneBar";
import { ItineraryInfoModal } from "@/src/components/itinerary/ItineraryInfoModal";
import { VotingSlotCard } from "@/src/components/itinerary/VoteSlotCard";
import { VotingTimeFilter } from "@/src/components/itinerary/VotingTimeFilter";
import { FinalSlotCard } from "@/src/components/itinerary/FinalSlotCard";
import { FinalSuggestedActivitiesSection } from "@/src/components/itinerary/FinalSuggestedActivitiesSection";
import { ActivityDetailModal } from "@/src/components/itinerary/ActivityDetailModal";
import { SuggestionsModal, getAddedElsewherePlaceIds } from "@/src/components/itinerary/SuggestionsModal";
import {
  fetchTripForUser,
  finishPlanning,
  finishVoting,
  isTripNotFoundError,
  fetchActivitySuggestions,
  getMemberPreferences,
  type Trip,
  type ActivitySuggestion,
} from "@/src/api/trips";
import ImageIcon from "@/assets/icons/image.svg";
import ImageSelectedIcon from "@/assets/icons/select-image.svg";
import UnselectImageIcon from "@/assets/icons/unselect-image.svg";
import ImageDownloadIcon from "@/assets/icons/image-download.svg";
import SelectAllIcon from "@/assets/icons/select-all.svg";
import ImageDeleteIcon from "@/assets/icons/image-delete.svg";
import ImageMenuIcon from "@/assets/icons/image-menu.svg";
import { invalidateTripsCache } from "./home";
import {
  getActivitiesBySlot,
  getFinalItineraryActivities,
  toggleActivityAttendance,
  toggleAddedAlternativeToItinerary,
  voteForActivity,
  createActivity,
  updateActivity,
  type FinalItineraryResponseDto,
} from "@/src/services/activityService";
import {
  deleteMemoryPhoto,
  downloadMemoryPhotos,
  fetchMemories,
  getMemoryPhotoUrl,
  uploadMemoryPhoto,
  type MemoryPhoto,
} from "@/src/services/memoriesService";

const DEV_FORCE_STATE: ItineraryState | null = null;
const TRANSITION_OVERLAY_MS = 1800;
const MAX_MEMORY_UPLOAD_BYTES = 900 * 1024;

const activitiesCache = new Map<string, Activity[]>();

function parseActivitiesJson(value?: string): Activity[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function splitBackendSlotId(slotId: string) {
  const [dayId, ...slotParts] = slotId.split("_");
  return {
    dayId,
    slotId: slotParts.length > 0 ? slotParts.join("_") : slotId,
  };
}

function formatSlotLabel(slotId: string) {
  return slotId.replace(/_/g, ":");
}

function selectVoteForActivity(
  activities: Activity[],
  dayId: string,
  slotId: string,
  activityId: string
) {
  return activities.map((activity) => {
    if (activity.dayId !== dayId || activity.slotId !== slotId) {
      return activity;
    }

    const wasSelected = activity.hasCurrentUserVote === true;
    const isSelected = activity.id === activityId;
    const voteDelta =
      isSelected && !wasSelected ? 1 : !isSelected && wasSelected ? -1 : 0;

    return {
      ...activity,
      hasCurrentUserVote: isSelected,
      voteCount: Math.max(0, (activity.voteCount ?? 0) + voteDelta),
    };
  });
}

function upsertActivity(
  activities: Activity[],
  incoming: Activity
): Activity[] {
  const existingIndex = activities.findIndex(
    (activity) => activity.id === incoming.id
  );

  if (existingIndex === -1) {
    return [...activities, incoming];
  }

  return activities.map((activity, index) =>
    index === existingIndex ? { ...activity, ...incoming } : activity
  );
}

function updateCachedActivities(
  tripId: string,
  updater: (activities: Activity[]) => Activity[]
) {
  const prefix = `${tripId}_`;

  activitiesCache.forEach((activities, key) => {
    if (key.startsWith(prefix)) {
      activitiesCache.set(key, updater(activities));
    }
  });
}

function mapBackendActivity(
  activity: any,
  fallback: { dayId: string; slotId: string }
): Activity {
  const backendSlot = activity.slot_id
    ? splitBackendSlotId(activity.slot_id)
    : fallback;

  return {
    id: activity.activity_id,
    dayId: backendSlot.dayId || fallback.dayId,
    slotId: backendSlot.slotId || fallback.slotId,
    name: activity.name,
    address: activity.address ?? "",
    googleMapsUrl: activity.googleMapsUrl ?? "",
    description: activity.description ?? "",
    voteCount: activity.voteCount ?? 0,
    hasCurrentUserVote: activity.hasCurrentUserVote ?? false,
    startTime: activity.startTime ?? "",
    endTime: activity.endTime ?? "",
    joinedCount: activity.joinedCount ?? 0,
    hasCurrentUserJoined: activity.hasCurrentUserJoined ?? false,
    joinedMembers: activity.joinedMembers ?? [],
    isAddedToFinalItinerary: activity.isAddedToFinalItinerary ?? false,
  };
}

type FinalSlotUi = {
  slotId: string;
  dayId: string;
  slotKey: string;
  selectedActivity: Activity;
  alternativeActivities: Activity[];
  addedAlternativeActivities: Activity[];
  alternativeCount: number;
};

function mapBackendFinalSlot(slot: any): FinalSlotUi {
  const split = splitBackendSlotId(slot.slot_id);

  const selectedActivity = mapBackendActivity(slot.selectedActivity, {
    dayId: split.dayId,
    slotId: split.slotId,
  });

  const alternativeActivities = Array.isArray(slot.alternativeActivities)
    ? slot.alternativeActivities.map((activity: any) =>
        mapBackendActivity(activity, {
          dayId: split.dayId,
          slotId: split.slotId,
        })
      )
    : [];

  const addedAlternativeActivities = Array.isArray(
    slot.addedAlternativeActivities
  )
    ? slot.addedAlternativeActivities.map((activity: any) =>
        mapBackendActivity(activity, {
          dayId: split.dayId,
          slotId: split.slotId,
        })
      )
    : [];

  return {
    slotId: split.slotId,
    dayId: split.dayId,
    slotKey: slot.slot_id,
    selectedActivity,
    alternativeActivities,
    addedAlternativeActivities,
    alternativeCount: slot.alternativeCount ?? alternativeActivities.length,
  };
}

function mergeAlternativeLists(
  alternativeActivities: Activity[],
  addedAlternativeActivities: Activity[],
  stableOrder?: readonly Activity[]
): Activity[] {
  const byId = new Map<string, Activity>();

  for (const activity of alternativeActivities) {
    byId.set(activity.id, activity);
  }
  for (const activity of addedAlternativeActivities) {
    byId.set(activity.id, activity);
  }

  if (stableOrder?.length) {
    const ordered: Activity[] = [];
    const seen = new Set<string>();

    for (const activity of stableOrder) {
      const next = byId.get(activity.id);
      if (next) {
        ordered.push(next);
        seen.add(activity.id);
      }
    }

    for (const activity of alternativeActivities) {
      if (!seen.has(activity.id)) {
        ordered.push(activity);
        seen.add(activity.id);
      }
    }

    for (const activity of addedAlternativeActivities) {
      if (!seen.has(activity.id)) {
        ordered.push(activity);
      }
    }

    return ordered;
  }

  const ordered: Activity[] = [];
  const seen = new Set<string>();

  for (const activity of alternativeActivities) {
    ordered.push(activity);
    seen.add(activity.id);
  }

  for (const activity of addedAlternativeActivities) {
    if (!seen.has(activity.id)) {
      ordered.push(activity);
    }
  }

  return ordered;
}

function buildGoogleMapsUrl(name: string, address?: string): string {
  const query = encodeURIComponent(name + (address ? `, ${address}` : ""));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

async function getPhotoByteSize(uri: string): Promise<number> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error("Could not read the selected photo.");
  }

  return info.size ?? 0;
}

async function prepareMemoryPhotoForUpload(sourceUri: string) {
  let width = 1400;
  let compress = 0.6;

  let manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width } }],
    {
      compress,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const size = await getPhotoByteSize(manipulated.uri);

    if (size <= MAX_MEMORY_UPLOAD_BYTES) {
      break;
    }

    if (attempt === 3) {
      throw new Error("Photo must be 1 MB or smaller.");
    }

    width = Math.max(720, Math.round(width * 0.8));
    compress = Math.max(0.35, compress - 0.1);
    manipulated = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width } }],
      {
        compress,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
  }

  return manipulated;
}

type RouteMember = {
  id?: string;
  userId?: string;
  planning_done?: boolean;
  hasFinishedPlanning?: boolean;
};

function parsePlanningStatusJson(value?: string) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return undefined;
    return parsed
      .map((member: RouteMember) => ({
        userId: member.id ?? member.userId ?? "",
        hasFinishedPlanning:
          member.planning_done ?? member.hasFinishedPlanning ?? false,
      }))
      .filter((member) => member.userId);
  } catch {
    return undefined;
  }
}

function toUiState(state: TripState): ItineraryState {
  switch (state) {
    case "Voting":
      return "voting";
    case "Final":
      return "final";
    case "Memories":
      return "memories";
    case "Planning":
    default:
      return "planning";
  }
}

function setPlanningDoneForUser(
  planningStatus: TripItinerary["planningStatus"],
  userId: string,
  planningDone: boolean
): TripItinerary["planningStatus"] {
  const hasExistingUser = planningStatus.some(
    (member) => member.userId === userId
  );
  if (!hasExistingUser) {
    return [...planningStatus, { userId, hasFinishedPlanning: planningDone }];
  }
  return planningStatus.map((member) =>
    member.userId === userId
      ? { ...member, hasFinishedPlanning: planningDone }
      : member
  );
}

function resetPlanningStatus(
  planningStatus: TripItinerary["planningStatus"]
): TripItinerary["planningStatus"] {
  return planningStatus.map((member) => ({
    ...member,
    hasFinishedPlanning: false,
  }));
}

function mapTripMembersToPlanningStatus(
  members?: Trip["members"]
): TripItinerary["planningStatus"] | undefined {
  if (!members || members.length === 0) return undefined;

  return members
    .map((member) => ({
      userId: member.id,
      hasFinishedPlanning: member.planning_done ?? false,
    }))
    .filter((member) => member.userId);
}

function isDeadlinePast(deadline?: string): boolean {
  if (!deadline) return false;

  const parsed = new Date(deadline);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
}

function shouldSkipVoting(memberCount: number) {
  return memberCount <= 1;
}

function buildItineraryFromParams(params: {
  tripId?: string;
  title?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  state?: ItineraryState;
  planningStatus?: TripItinerary["planningStatus"];
}): TripItinerary {
  const fallbackDate = new Date().toISOString().split("T")[0];
  return {
    tripId: params.tripId ?? "trip-fallback",
    title: params.title ?? "Untitled Trip",
    destination: params.destination ?? "Unknown destination",
    startDate: params.startDate ?? fallbackDate,
    endDate: params.endDate ?? fallbackDate,
    state: params.state ?? "planning",
    planningStatus: params.planningStatus ?? [
      { userId: "user-1", hasFinishedPlanning: false },
      { userId: "user-2", hasFinishedPlanning: true },
      { userId: "user-3", hasFinishedPlanning: false },
      { userId: "user-4", hasFinishedPlanning: false },
    ],
    activities: [],
  };
}

function getIntroText(state: ItineraryState): string {
  switch (state) {
    case "voting":
      return "Vote on conflicting times of activities here.";
    case "final":
      return "Here you find your final itinerary with your group.";
    case "memories":
      return "Here you can upload your photos of the trip and share it to the other members.";
    case "planning":
    default:
      return "You can add your activities here for each day.";
  }
}

type TransitionOverlayProps = {
  visible: boolean;
  title: string;
  text: string;
};

function TransitionOverlay({ visible, title, text }: TransitionOverlayProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <SafeAreaView
        style={styles.transitionOverlaySafeArea}
        edges={["top", "right", "bottom", "left"]}
      >
        <View
          style={styles.transitionOverlayContent}
          accessibilityViewIsModal={true}
          accessible={true}
          accessibilityLiveRegion="assertive"
          accessibilityLabel={`${title}. ${text}`}
        >
          <View style={styles.finalizingCard}>
            <ActivityIndicator color={colors.nightBlack} />
            <AppText
              variant="subtitle"
              style={styles.finalizingTitle}
              accessible={false}
            >
              {title}
            </AppText>
            <AppText
              variant="caption"
              style={styles.finalizingText}
              accessible={false}
            >
              {text}
            </AppText>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function ItineraryScreen() {
  const { user, idToken: authToken } = useAuth();
  const currentUserId = user?.uid ?? null;

  const {
    tripId,
    state,
    title,
    destination,
    startDate,
    endDate,
    members,
    activitiesJson,
    newActivityId,
    newActivityDayId,
    newActivitySlotId,
    newActivityName,
    newActivityDescription,
    newActivityAddress,
    newActivityGoogleMapsUrl,
    newActivityStartTime,
    newActivityEndTime,
    planningEndAt,
    votingEndAt,
    selectedDay,
    role,
  } = useLocalSearchParams<{
    tripId?: string;
    state?: "planning" | "voting" | "final" | "memories";
    title?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    members?: string;
    activitiesJson?: string;
    newActivityId?: string;
    newActivityDayId?: string;
    newActivitySlotId?: string;
    newActivityName?: string;
    newActivityDescription?: string;
    newActivityAddress?: string;
    newActivityGoogleMapsUrl?: string;
    newActivityStartTime?: string;
    newActivityEndTime?: string;
    planningEndAt?: string;
    votingEndAt?: string;
    selectedDay?: string;
    role?: "admin" | "member";
  }>();

  const routeState: ItineraryState | undefined =
    state === "planning" ||
    state === "voting" ||
    state === "final" ||
    state === "memories"
      ? state
      : undefined;

  const routePlanningStatus = useMemo(
    () => parsePlanningStatusJson(members),
    [members]
  );
  const incomingRouteActivity = useMemo<Activity | null>(() => {
    if (
      !newActivityId ||
      !newActivityDayId ||
      !newActivitySlotId ||
      !newActivityName
    ) {
      return null;
    }

    return {
      id: newActivityId,
      dayId: newActivityDayId,
      slotId: newActivitySlotId,
      name: newActivityName,
      description: newActivityDescription ?? "",
      address: newActivityAddress ?? "",
      googleMapsUrl: newActivityGoogleMapsUrl ?? "",
      startTime: newActivityStartTime ?? "",
      endTime: newActivityEndTime ?? "",
    };
  }, [
    newActivityId,
    newActivityDayId,
    newActivitySlotId,
    newActivityName,
    newActivityDescription,
    newActivityAddress,
    newActivityGoogleMapsUrl,
    newActivityStartTime,
    newActivityEndTime,
  ]);

  const [itinerary, setItinerary] = useState<TripItinerary>(() => ({
    ...buildItineraryFromParams({
      tripId,
      title,
      destination,
      startDate,
      endDate,
      state: routeState,
      planningStatus: routePlanningStatus,
    }),
    activities: parseActivitiesJson(activitiesJson),
  }));

  const [apiActivities, setApiActivities] = useState<Activity[]>(() => {
    const keys = [...activitiesCache.keys()];
    const matchingKey = keys.find((k) => k.startsWith(`${tripId}_`));
    return matchingKey ? (activitiesCache.get(matchingKey) ?? []) : [];
  });

  const [finalSlots, setFinalSlots] = useState<FinalSlotUi[]>([]);
  const [memories, setMemories] = useState<MemoryPhoto[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryPhoto | null>(
    null
  );
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<string[]>([]);
  const [isMemorySelectionMode, setIsMemorySelectionMode] = useState(false);
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [isUploadingMemories, setIsUploadingMemories] = useState(false);
  const [isDeletingMemories, setIsDeletingMemories] = useState(false);
  const [isDownloadingMemories, setIsDownloadingMemories] = useState(false);
  const [showMemoryPreviewMenu, setShowMemoryPreviewMenu] = useState(false);
  const [showMemoryFeedbackModal, setShowMemoryFeedbackModal] = useState(false);
  const [memoryFeedbackTitle, setMemoryFeedbackTitle] = useState("");
  const [memoryFeedbackMessage, setMemoryFeedbackMessage] = useState("");
  const memoryPreviewListRef = useRef<FlatList<MemoryPhoto>>(null);
  const skipPreviewScrollRef = useRef(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const memoryPreviewWidth = Math.min(windowWidth * 0.82, 420);
  const [memoryAspectRatios, setMemoryAspectRatios] = useState<
    Record<string, number>
  >({});
  const getMemoryPreviewHeight = useCallback(
    (aspectRatio?: number) => {
      const maxHeight = Math.min(windowHeight * 0.62, memoryPreviewWidth * 1.45);
      const minHeight = memoryPreviewWidth * 0.45;

      if (!aspectRatio) {
        return maxHeight;
      }

      const naturalHeight = memoryPreviewWidth / aspectRatio;
      return Math.min(maxHeight, Math.max(minHeight, naturalHeight));
    },
    [memoryPreviewWidth, windowHeight]
  );
  const memoryPreviewImageHeight = useMemo(
    () =>
      getMemoryPreviewHeight(
        selectedMemory
          ? memoryAspectRatios[selectedMemory.memory_id]
          : undefined
      ),
    [getMemoryPreviewHeight, memoryAspectRatios, selectedMemory]
  );
  const selectedMemoryIndex = useMemo(() => {
    if (!selectedMemory) return 0;

    const index = memories.findIndex(
      (memory) => memory.memory_id === selectedMemory.memory_id
    );

    return index >= 0 ? index : 0;
  }, [memories, selectedMemory]);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [isLoadingActivities, setIsLoadingActivities] = useState(() => {
    const keys = [...activitiesCache.keys()];
    return !keys.some((k) => k.startsWith(`${tripId}_`));
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [showPlanningInfoPopup, setShowPlanningInfoPopup] = useState(false);
  const [showPlanningConfirmModal, setShowPlanningConfirmModal] =
    useState(false);
  const [showVotingInfoPopup, setShowVotingInfoPopup] = useState(false);
  const [showVotingConfirmModal, setShowVotingConfirmModal] = useState(false);
  const [isSubmittingPlanning, setIsSubmittingPlanning] = useState(false);
  const [isSubmittingVoting, setIsSubmittingVoting] = useState(false);

  const isAdmin = role === "admin";

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [selectedActivitySlotLabel, setSelectedActivitySlotLabel] =
    useState("");
  const [, setSelectedAlternativeActivities] = useState<Activity[]>([]);
  const [
    selectedDisplayedAlternativeActivities,
    setSelectedDisplayedAlternativeActivities,
  ] = useState<Activity[]>([]);
  const [
    selectedAddedAlternativeActivityIds,
    setSelectedAddedAlternativeActivityIds,
  ] = useState<string[]>([]);
  const [showActivityDetailModal, setShowActivityDetailModal] = useState(false);

  // Suggestions modal state
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestionsSlotId, setSuggestionsSlotId] = useState("");
  const [suggestionsSlotLabel, setSuggestionsSlotLabel] = useState("");
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [isSuggestionsLoadingMore, setIsSuggestionsLoadingMore] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const suggestionsSlotActivityIdRef = useRef<string | null>(null);
  const [memberPreferences, setMemberPreferences] = useState<string[]>([]);

  const hasMemberPreferences = memberPreferences.length > 0;

  useFocusEffect(
    useCallback(() => {
      if (!authToken || !tripId) {
        setMemberPreferences([]);
        return;
      }

      let cancelled = false;

      getMemberPreferences(tripId, authToken)
        .then((preferences) => {
          if (!cancelled) {
            setMemberPreferences(preferences);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMemberPreferences([]);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [authToken, tripId])
  );

  const finalizingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const votingTransitionTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const initialTripRefreshKeyRef = useRef<string | null>(null);
  const lastFinalUpdateRef = useRef<string | null | undefined>(undefined);

  const [isPreparingFinalItinerary, setIsPreparingFinalItinerary] =
    useState(false);
  const [isPreparingVoting, setIsPreparingVoting] = useState(false);

  const slots = useMemo(() => generateTimeSlots(), []);

  const activeState: ItineraryState =
    DEV_FORCE_STATE ?? routeState ?? itinerary.state;
  const activeStateRef = useRef<ItineraryState>(activeState);
  const transitionTargetStateRef = useRef<ItineraryState | null>(null);

  const [timerDeadlines, setTimerDeadlines] = useState(() => ({
    planningEndAt,
    votingEndAt,
  }));

  const [timerText, setTimerText] = useState(() =>
    getActiveTripTimerText(activeState, planningEndAt, votingEndAt)
  );

  const tripDays = useMemo(
    () => generateTripDays(itinerary.startDate, itinerary.endDate),
    [itinerary.startDate, itinerary.endDate]
  );

  const [selectedDayId, setSelectedDayId] = useState<string>("");
  const requestedSelectedDayId = newActivityDayId ?? selectedDay;

  useEffect(() => {
    if (
      requestedSelectedDayId &&
      tripDays.some((day) => day.id === requestedSelectedDayId)
    ) {
      setSelectedDayId(requestedSelectedDayId);
      return;
    }

    if (tripDays.length > 0) {
      setSelectedDayId(tripDays[0].id);
    } else {
      setSelectedDayId(itinerary.startDate);
    }
  }, [tripDays, itinerary.startDate, requestedSelectedDayId]);

  useEffect(() => {
    setItinerary((current) => ({
      ...buildItineraryFromParams({
        tripId,
        title,
        destination,
        startDate,
        endDate,
        state: routeState,
        planningStatus: routePlanningStatus,
      }),
      activities:
        parseActivitiesJson(activitiesJson).length > 0
          ? parseActivitiesJson(activitiesJson)
          : current.activities,
    }));
  }, [
    tripId,
    title,
    destination,
    startDate,
    endDate,
    routeState,
    routePlanningStatus,
    activitiesJson,
  ]);

  useEffect(() => {
    setTimerDeadlines({
      planningEndAt,
      votingEndAt,
    });
  }, [planningEndAt, votingEndAt]);

  useEffect(() => {
    if (transitionTargetStateRef.current) {
      activeStateRef.current = transitionTargetStateRef.current;
      return;
    }

    activeStateRef.current = activeState;
  }, [activeState]);

  useEffect(() => {
    if (
      transitionTargetStateRef.current &&
      routeState === transitionTargetStateRef.current
    ) {
      transitionTargetStateRef.current = null;
    }
  }, [routeState]);

  useEffect(() => {
    if (activeState === "planning") return;

    setShowPlanningInfoPopup(false);
  }, [activeState]);

  const refreshTripTimerFields = useCallback(
    async (options: { forceRefresh?: boolean } = {}) => {
      if (!currentUserId || !tripId) return;

      try {
        const currentTrip = await fetchTripForUser(currentUserId, tripId, {
          forceRefresh: options.forceRefresh,
          allowStaleOnError: true,
        });
        if (!currentTrip) return;

        const refreshedPlanningStatus = mapTripMembersToPlanningStatus(
          currentTrip.members
        );
        const nextState = toUiState(currentTrip.state);
        const nextPlanningEndAt = currentTrip.planning_end_at ?? planningEndAt;
        const nextVotingEndAt = currentTrip.voting_end_at ?? votingEndAt;
        const currentState = activeStateRef.current;

        setTimerDeadlines({
          planningEndAt: nextPlanningEndAt,
          votingEndAt: nextVotingEndAt,
        });

        const applyRefreshedTrip = (stateToApply: ItineraryState) => {
          setItinerary((current) => ({
            ...current,
            title: currentTrip.title ?? current.title,
            destination: currentTrip.destination ?? current.destination,
            startDate: currentTrip.start_date ?? current.startDate,
            endDate: currentTrip.end_date ?? current.endDate,
            state: stateToApply,
            planningStatus:
              refreshedPlanningStatus ??
              (stateToApply === "planning" &&
              nextPlanningEndAt &&
              nextPlanningEndAt !== timerDeadlines.planningEndAt
                ? resetPlanningStatus(current.planningStatus)
                : current.planningStatus),
          }));

          router.setParams({
            state: stateToApply,
            title: currentTrip.title,
            destination: currentTrip.destination,
            startDate: currentTrip.start_date,
            endDate: currentTrip.end_date,
            planningEndAt: nextPlanningEndAt ?? "",
            votingEndAt: nextVotingEndAt ?? "",
            members: refreshedPlanningStatus
              ? JSON.stringify(refreshedPlanningStatus)
              : members,
            role: currentTrip.role ?? role ?? "member",
          });
        };

        const shouldShowTransitionOverlay =
          currentState !== nextState &&
          ((currentState === "planning" &&
            (nextState === "voting" || nextState === "final")) ||
            (currentState === "voting" && nextState === "final"));

        if (shouldShowTransitionOverlay) {
          if (transitionTargetStateRef.current === nextState) return;

          transitionTargetStateRef.current = nextState;
          activeStateRef.current = nextState;

          const finishTransition = () => {
            applyRefreshedTrip(nextState);
            setActivityRefreshKey((value) => value + 1);
          };

          if (nextState === "voting") {
            setIsPreparingVoting(true);
            if (votingTransitionTimeoutRef.current) {
              clearTimeout(votingTransitionTimeoutRef.current);
            }
            votingTransitionTimeoutRef.current = setTimeout(() => {
              finishTransition();
              setIsPreparingVoting(false);
            }, TRANSITION_OVERLAY_MS);
            return;
          }

          setIsPreparingFinalItinerary(true);
          if (finalizingTimeoutRef.current) {
            clearTimeout(finalizingTimeoutRef.current);
          }
          finalizingTimeoutRef.current = setTimeout(() => {
            finishTransition();
            setIsPreparingFinalItinerary(false);
          }, TRANSITION_OVERLAY_MS);
          return;
        }

        // Keep explicit route state (e.g. final from checklist) when backend is Memories.
        applyRefreshedTrip(routeState ?? nextState);
      } catch (error) {
        if (isTripNotFoundError(error)) {
          invalidateTripsCache();
          router.replace("/home");
          return;
        }

        console.log("Could not refresh trip timer:", error);
      }
    },
    [
      currentUserId,
      members,
      planningEndAt,
      routeState,
      timerDeadlines.planningEndAt,
      tripId,
      votingEndAt,
      role,
    ]
  );

  useEffect(() => {
    if (!currentUserId || !tripId) return;

    let deadlineTimeout: ReturnType<typeof setTimeout> | null = null;
    const refreshKey = `${currentUserId}:${tripId}`;

    if (initialTripRefreshKeyRef.current !== refreshKey) {
      initialTripRefreshKeyRef.current = refreshKey;
      void refreshTripTimerFields();
    }

    const activeDeadline =
      activeState === "planning"
        ? timerDeadlines.planningEndAt
        : activeState === "voting"
          ? timerDeadlines.votingEndAt
          : undefined;

    if (
      (activeState === "planning" || activeState === "voting") &&
      activeDeadline
    ) {
      if (isDeadlinePast(activeDeadline)) {
        void refreshTripTimerFields({ forceRefresh: true });
      } else {
        const delay = Math.max(
          0,
          new Date(activeDeadline).getTime() - Date.now() + 1000
        );
        deadlineTimeout = setTimeout(() => {
          void refreshTripTimerFields({ forceRefresh: true });
        }, delay);
      }
    }

    return () => {
      if (deadlineTimeout) {
        clearTimeout(deadlineTimeout);
      }
    };
  }, [
    activeState,
    currentUserId,
    tripId,
    planningEndAt,
    votingEndAt,
    members,
    refreshTripTimerFields,
    timerDeadlines.planningEndAt,
    timerDeadlines.votingEndAt,
  ]);

  useEffect(() => {
    const updateTimer = () => {
      setTimerText(
        getActiveTripTimerText(
          activeState,
          timerDeadlines.planningEndAt,
          timerDeadlines.votingEndAt
        )
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60 * 1000);
    return () => clearInterval(interval);
  }, [activeState, timerDeadlines]);

  useEffect(() => {
    return () => {
      if (finalizingTimeoutRef.current) {
        clearTimeout(finalizingTimeoutRef.current);
      }
      if (votingTransitionTimeoutRef.current) {
        clearTimeout(votingTransitionTimeoutRef.current);
      }
    };
  }, []);

  const refreshFinalItinerary = useCallback(async () => {
    if (!tripId) return;

    try {
      const refreshed = await getFinalItineraryActivities(
        tripId,
        currentUserId ?? undefined
      );

      const mappedSlots = (refreshed.slots ?? []).map(mapBackendFinalSlot);
      setFinalSlots(mappedSlots);

      const flatMappedActivities = mappedSlots.flatMap((slot) => [
        slot.selectedActivity,
        ...slot.alternativeActivities,
        ...slot.addedAlternativeActivities,
      ]);

      activitiesCache.set(`${tripId}_final`, flatMappedActivities);
      setApiActivities(flatMappedActivities);
    } catch (error) {
      console.log("Could not refresh final itinerary:", error);
    }
  }, [tripId, currentUserId]);

  useEffect(() => {
    if (!tripId) {
      return;
    }

    let isInitialSnapshot = true;
    const unsubscribe = onSnapshot(
      doc(db, "trips", tripId),
      async (snapshot) => {
        if (!snapshot.exists()) {
          invalidateTripsCache();
          router.replace("/home");
          return;
        }

        const data = snapshot.data();

        if (activeState === "final") {
          const nextValue =
            data?.final_itinerary_updated_at?.toMillis?.()?.toString?.() ??
            null;

          if (lastFinalUpdateRef.current === undefined) {
            lastFinalUpdateRef.current = nextValue;
          } else if (nextValue !== lastFinalUpdateRef.current) {
            lastFinalUpdateRef.current = nextValue;
            await refreshFinalItinerary();
          }
        }

        if (isInitialSnapshot) {
          isInitialSnapshot = false;
          return;
        }

        if (activeState === "planning" || activeState === "voting") {
          void refreshTripTimerFields({ forceRefresh: true });
        }
      },
      (error) => {
        console.log("Trip listener error:", error);
      }
    );

    return unsubscribe;
  }, [activeState, refreshFinalItinerary, refreshTripTimerFields, tripId]);

  const loadActivities = useCallback(
    async (options: { showLoading?: boolean } = {}) => {
      const { showLoading = true } = options;

      if (!tripId || tripDays.length === 0) return;

      if (activeState === "memories") {
        setIsLoadingActivities(false);
        return;
      }

      if (activeState !== "final" && !selectedDayId) {
        return;
      }

      if (activeState === "planning" && !currentUserId) {
        return;
      }

      const resolvedDayId =
        selectedDayId || tripDays[0]?.id || itinerary.startDate;

      const cacheKey =
        activeState === "final"
          ? `${tripId}_${activeState}`
          : activeState === "voting"
            ? `${tripId}_${activeState}`
            : `${tripId}_${activeState}_${resolvedDayId}`;

      const cached = activitiesCache.get(cacheKey);

      if (cached) {
        setApiActivities(cached);
        if (showLoading) {
          setIsLoadingActivities(false);
        }
      } else if (showLoading) {
        setIsLoadingActivities(true);
      }

      try {
        if (activeState === "final") {
          const finalResponse: FinalItineraryResponseDto =
            await getFinalItineraryActivities(
              tripId,
              currentUserId ?? undefined
            );

          const mappedSlots = (finalResponse.slots ?? []).map(
            mapBackendFinalSlot
          );

          const flatMappedActivities = mappedSlots.flatMap((slot) => [
            slot.selectedActivity,
            ...slot.alternativeActivities,
            ...slot.addedAlternativeActivities,
          ]);

          const hasChanged =
            JSON.stringify(cached) !== JSON.stringify(flatMappedActivities);

          setFinalSlots(mappedSlots);

          if (hasChanged) {
            activitiesCache.set(cacheKey, flatMappedActivities);
            setApiActivities(flatMappedActivities);
          } else if (!cached) {
            setApiActivities(flatMappedActivities);
          }

          setIsLoadingActivities(false);
          return;
        }

        if (activeState === "voting") {
          const allActivities = (
            await Promise.all(
              tripDays.flatMap((day) =>
                slots.map(async (slot) => {
                  const slotIdWithDate = `${day.id}_${slot.id}`;
                  const slotActivities = await getActivitiesBySlot(
                    tripId,
                    slotIdWithDate,
                    currentUserId ?? undefined
                  );

                  return slotActivities.map((activity: any) =>
                    mapBackendActivity(activity, {
                      dayId: day.id,
                      slotId: slot.id,
                    })
                  );
                })
              )
            )
          ).flat();

          const nextActivities = incomingRouteActivity
            ? upsertActivity(allActivities, incomingRouteActivity)
            : allActivities;

          const hasChanged =
            JSON.stringify(cached) !== JSON.stringify(nextActivities);

          if (hasChanged) {
            activitiesCache.set(cacheKey, nextActivities);
            setApiActivities(nextActivities);
          } else if (!cached) {
            setApiActivities(nextActivities);
          }

          setIsLoadingActivities(false);
          return;
        }

        const allActivities = (
          await Promise.all(
            slots.map(async (slot) => {
              const slotIdWithDate = `${resolvedDayId}_${slot.id}`;
              const slotActivities = await getActivitiesBySlot(
                tripId,
                slotIdWithDate,
                currentUserId ?? undefined
              );

              return slotActivities.map((activity: any) =>
                mapBackendActivity(activity, {
                  dayId: resolvedDayId,
                  slotId: slot.id,
                })
              );
            })
          )
        ).flat();

        const nextActivities = incomingRouteActivity
          ? upsertActivity(allActivities, incomingRouteActivity)
          : allActivities;

        const hasChanged =
          JSON.stringify(cached) !== JSON.stringify(nextActivities);

        if (hasChanged) {
          activitiesCache.set(cacheKey, nextActivities);
          setApiActivities(nextActivities);
        } else if (!cached) {
          setApiActivities(nextActivities);
        }

        setIsLoadingActivities(false);
      } catch (error) {
        console.log("Could not load activities:", error);
        setIsLoadingActivities(false);
      }
    },
    [
      activeState,
      currentUserId,
      itinerary.startDate,
      selectedDayId,
      slots,
      tripDays,
      tripId,
    ]
  );

  useEffect(() => {
    void loadActivities();
  }, [activityRefreshKey, loadActivities, newActivityId]);

  const loadMemories = useCallback(
    async (options: { showLoading?: boolean } = {}) => {
      if (!tripId || !authToken || activeState !== "memories") return;

      if (options.showLoading !== false) {
        setIsLoadingMemories(true);
      }

      try {
        const nextMemories = await fetchMemories({
          tripId,
          idToken: authToken,
        });
        setMemories(nextMemories);
        setSelectedMemoryIds((current) =>
          current.filter((memoryId) =>
            nextMemories.some((memory) => memory.memory_id === memoryId)
          )
        );
        if (nextMemories.length === 0) {
          setIsMemorySelectionMode(false);
        }
      } catch (error) {
        Alert.alert(
          "Could not load memories",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setIsLoadingMemories(false);
      }
    },
    [activeState, authToken, tripId]
  );

  useEffect(() => {
    if (activeState === "memories") {
      void loadMemories();
    } else {
      setMemories([]);
      setSelectedMemoryIds([]);
      setIsMemorySelectionMode(false);
      setSelectedMemory(null);
    }
  }, [activeState, loadMemories]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isLoadingActivities || isLoadingMemories) return;

    setIsRefreshing(true);
    try {
      await refreshTripTimerFields({ forceRefresh: true });
      if (activeState === "memories") {
        await loadMemories({ showLoading: false });
      } else {
        await loadActivities({ showLoading: false });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [
    isLoadingActivities,
    isLoadingMemories,
    isRefreshing,
    loadActivities,
    loadMemories,
    refreshTripTimerFields,
    tripId,
    newActivityId,
    activeState,
    currentUserId,
    selectedDayId,
    tripDays,
    slots,
    itinerary.startDate,
    activityRefreshKey,
    incomingRouteActivity,
  ]);

  const handleUploadMemories = useCallback(async () => {
    if (!tripId || !authToken || isUploadingMemories) {
      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 1,
    };

    let result: ImagePicker.ImagePickerResult;

    if (Platform.OS === "web") {
      // Web browsers only allow the file picker during the original click gesture.
      result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo access needed",
          "Please allow photo library access to upload trip memories."
        );
        return;
      }

      result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    }

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    setIsUploadingMemories(true);
    try {
      for (let index = 0; index < result.assets.length; index += 1) {
        const asset = result.assets[index];
        const manipulated = await prepareMemoryPhotoForUpload(asset.uri);

        await uploadMemoryPhoto({
          tripId,
          idToken: authToken,
          uri: manipulated.uri,
          name: `memory-${Date.now()}-${index}.jpg`,
          type: "image/jpeg",
        });
      }

      await loadMemories({ showLoading: false });
    } catch (error) {
      Alert.alert(
        "Could not upload memories",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsUploadingMemories(false);
    }
  }, [authToken, isUploadingMemories, loadMemories, tripId]);

  const handleDownloadAllMemories = useCallback(() => {
    Alert.alert(
      "Download all",
      "Download all will be added after the backend zip endpoint is ready."
    );
  }, []);

  const removeMemories = useCallback(
    async (memoryIds: string[]) => {
      if (
        !tripId ||
        !authToken ||
        isDeletingMemories ||
        memoryIds.length === 0
      ) {
        return;
      }

      setIsDeletingMemories(true);
      try {
        for (const memoryId of memoryIds) {
          await deleteMemoryPhoto({ tripId, memoryId, idToken: authToken });
        }

        setMemories((current) =>
          current.filter((memory) => !memoryIds.includes(memory.memory_id))
        );
        setSelectedMemoryIds((current) =>
          current.filter((memoryId) => !memoryIds.includes(memoryId))
        );
        setSelectedMemory((current) =>
          current && memoryIds.includes(current.memory_id) ? null : current
        );
        setIsMemorySelectionMode(false);
        await loadMemories({ showLoading: false });
      } catch (error) {
        Alert.alert(
          "Could not delete memories",
          error instanceof Error ? error.message : "Please try again."
        );
      } finally {
        setIsDeletingMemories(false);
      }
    },
    [authToken, isDeletingMemories, loadMemories, tripId]
  );

  const handleSelectAllMemories = useCallback(() => {
    if (memories.length === 0) return;

    const memoryIds = memories.map((memory) => memory.memory_id);
    const allSelected = memoryIds.every((id) => selectedMemoryIds.includes(id));

    if (allSelected) {
      setSelectedMemoryIds([]);
      setIsMemorySelectionMode(false);
      return;
    }

    setSelectedMemoryIds(memoryIds);
    setIsMemorySelectionMode(true);
  }, [memories, selectedMemoryIds]);

  const openMemoryFeedbackModal = useCallback(
    (
      title: string,
      message: string,
      options: { closePreview?: boolean } = {}
    ) => {
      const shouldClosePreview = options.closePreview ?? true;

      setMemoryFeedbackTitle(title);
      setMemoryFeedbackMessage(message);

      if (shouldClosePreview) {
        setShowMemoryPreviewMenu(false);
        setSelectedMemory(null);
      }

      InteractionManager.runAfterInteractions(() => {
        setShowMemoryFeedbackModal(true);
      });
    },
    []
  );

  const downloadMemoriesByIds = useCallback(
    async (memoryIds: string[]) => {
      if (!authToken || isDownloadingMemories || memoryIds.length === 0) {
        return;
      }

      const memoriesToDownload = memories.filter((memory) =>
        memoryIds.includes(memory.memory_id)
      );

      if (memoriesToDownload.length === 0) {
        return;
      }

      setIsDownloadingMemories(true);
      try {
        await downloadMemoryPhotos({
          memories: memoriesToDownload,
          idToken: authToken,
        });

        if (Platform.OS !== "web") {
          openMemoryFeedbackModal(
            memoriesToDownload.length === 1 ? "Image saved" : "Images saved",
            memoriesToDownload.length === 1
              ? "The image was saved to your photo library."
              : `${memoriesToDownload.length} images were saved to your photo library.`
          );
        } else if (memoriesToDownload.length > 1) {
          openMemoryFeedbackModal(
            "Downloads started",
            "If your browser asks, allow multiple downloads."
          );
        }
      } catch (error) {
        openMemoryFeedbackModal(
          "Could not download images",
          error instanceof Error ? error.message : "Please try again.",
          { closePreview: false }
        );
      } finally {
        setIsDownloadingMemories(false);
        setShowMemoryPreviewMenu(false);
      }
    },
    [authToken, isDownloadingMemories, memories, openMemoryFeedbackModal]
  );

  const handleDownloadSelectedMemories = useCallback(() => {
    void downloadMemoriesByIds(selectedMemoryIds);
  }, [downloadMemoriesByIds, selectedMemoryIds]);

  const handleDownloadPreviewMemory = useCallback(() => {
    if (!selectedMemory) return;
    void downloadMemoriesByIds([selectedMemory.memory_id]);
  }, [downloadMemoriesByIds, selectedMemory]);

  const toggleMemorySelection = useCallback((memoryId: string) => {
    setSelectedMemoryIds((current) => {
      const next = current.includes(memoryId)
        ? current.filter((id) => id !== memoryId)
        : [...current, memoryId];

      if (next.length === 0) {
        setIsMemorySelectionMode(false);
      }

      return next;
    });
  }, []);

  const handleMemoryPress = useCallback(
    (memory: MemoryPhoto) => {
      if (isMemorySelectionMode) {
        toggleMemorySelection(memory.memory_id);
        return;
      }

      setShowMemoryPreviewMenu(false);
      setSelectedMemory(memory);
    },
    [isMemorySelectionMode, toggleMemorySelection]
  );

  const handleMemoryLongPress = useCallback((memory: MemoryPhoto) => {
    setIsMemorySelectionMode(true);
    setSelectedMemoryIds((current) =>
      current.includes(memory.memory_id)
        ? current
        : [...current, memory.memory_id]
    );
  }, []);

  const handleDeletePreviewMemory = useCallback(() => {
    if (!selectedMemory) return;
    setShowMemoryPreviewMenu(false);
    void removeMemories([selectedMemory.memory_id]);
  }, [removeMemories, selectedMemory]);

  const handleDeleteSelectedMemories = useCallback(() => {
    void removeMemories(selectedMemoryIds);
  }, [removeMemories, selectedMemoryIds]);

  const handleCloseMemoryPreview = useCallback(() => {
    setSelectedMemory(null);
    setShowMemoryPreviewMenu(false);
  }, []);

  const handleMemoryImageLoad = useCallback(
    (memoryId: string, width: number, height: number) => {
      if (width <= 0 || height <= 0) return;

      setMemoryAspectRatios((current) => {
        const nextRatio = width / height;
        if (current[memoryId] === nextRatio) {
          return current;
        }

        return {
          ...current,
          [memoryId]: nextRatio,
        };
      });
    },
    []
  );

  const handleToggleMemoryPreviewMenu = useCallback(() => {
    setShowMemoryPreviewMenu((current) => !current);
  }, []);

  const handlePreviewMomentumScrollEnd = useCallback(
    (offsetX: number) => {
      if (memories.length === 0 || memoryPreviewWidth <= 0) return;

      const nextIndex = Math.round(offsetX / memoryPreviewWidth);
      const boundedIndex = Math.min(
        Math.max(nextIndex, 0),
        memories.length - 1
      );
      const nextMemory = memories[boundedIndex];

      if (!nextMemory) return;

      skipPreviewScrollRef.current = true;
      setSelectedMemory(nextMemory);
      setShowMemoryPreviewMenu(false);
    },
    [memories, memoryPreviewWidth]
  );

  useEffect(() => {
    if (!selectedMemory || memories.length === 0) return;

    if (skipPreviewScrollRef.current) {
      skipPreviewScrollRef.current = false;
      return;
    }

    const index = memories.findIndex(
      (memory) => memory.memory_id === selectedMemory.memory_id
    );

    if (index < 0) return;

    requestAnimationFrame(() => {
      memoryPreviewListRef.current?.scrollToIndex({
        index,
        animated: false,
      });
    });
  }, [memories, selectedMemory]);

  useEffect(() => {
    if (activeState !== "final") {
      setFinalSlots([]);
      lastFinalUpdateRef.current = undefined;
    }
  }, [activeState]);

  function handlePlanningInfoPress() {
    setShowPlanningInfoPopup(true);
  }

  function handlePlanningDonePress() {
    if (hasCurrentUserFinished) {
      void handleFinishPlanning();
      return;
    }

    setShowPlanningConfirmModal(true);
  }

  function handleConfirmSubmitPlanning() {
    setShowPlanningConfirmModal(false);
    void handleFinishPlanning();
  }

  const lastAppliedActivitySignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!incomingRouteActivity) return;

    const incomingSignature = [
      incomingRouteActivity.id,
      incomingRouteActivity.dayId,
      incomingRouteActivity.slotId,
      incomingRouteActivity.name,
      incomingRouteActivity.description ?? "",
      incomingRouteActivity.address ?? "",
      incomingRouteActivity.googleMapsUrl ?? "",
      incomingRouteActivity.startTime ?? "",
      incomingRouteActivity.endTime ?? "",
    ].join("|");

    if (lastAppliedActivitySignatureRef.current === incomingSignature) {
      return;
    }

    lastAppliedActivitySignatureRef.current = incomingSignature;

    const applyIncomingActivity = (activities: Activity[]) =>
      upsertActivity(activities, incomingRouteActivity);

    setItinerary((current) => ({
      ...current,
      activities: applyIncomingActivity(current.activities),
    }));
    setApiActivities((current) => applyIncomingActivity(current));
    setIsLoadingActivities(false);

    if (tripId) {
      updateCachedActivities(tripId, applyIncomingActivity);
    }
  }, [incomingRouteActivity, tripId]);

  const slotItems = useMemo(() => {
    return mapActivitiesToSlots(slots, apiActivities, selectedDayId);
  }, [slots, apiActivities, selectedDayId]);

  const planningActivities = useMemo(
    () => (apiActivities.length > 0 ? apiActivities : itinerary.activities),
    [apiActivities, itinerary.activities]
  );

  const suggestionsAddedElsewherePlaceIds = useMemo(
    () =>
      Array.from(
        getAddedElsewherePlaceIds(
          planningActivities,
          suggestions,
          selectedDayId,
          suggestionsSlotId
        )
      ),
    [
      planningActivities,
      suggestions,
      selectedDayId,
      suggestionsSlotId,
    ]
  );

  const planningStatusParam = useMemo(
    () =>
      JSON.stringify(
        itinerary.planningStatus.map((member) => ({
          userId: member.userId,
          hasFinishedPlanning: member.hasFinishedPlanning,
        }))
      ),
    [itinerary.planningStatus]
  );

  const currentUserStatus = itinerary.planningStatus.find(
    (m) => m.userId === currentUserId
  );
  const hasCurrentUserFinished =
    currentUserStatus?.hasFinishedPlanning ?? false;
  const tripMemberCount = itinerary.planningStatus.length;

  function handleAddActivity(slotId: string) {
    if (hasCurrentUserFinished) {
      handlePlanningInfoPress();
      return;
    }

    router.push({
      pathname: "/add-activity",
      params: {
        tripId: itinerary.tripId,
        title: itinerary.title,
        destination: itinerary.destination,
        startDate: itinerary.startDate,
        endDate: itinerary.endDate,
        state: activeState,
        members: planningStatusParam,
        dayId: selectedDayId,
        slotId: `${selectedDayId}_${slotId}`,
        selectedDay: selectedDayId,
        activitiesJson: JSON.stringify(itinerary.activities),
        planningEndAt: timerDeadlines.planningEndAt ?? "",
        votingEndAt: timerDeadlines.votingEndAt ?? "",
      },
    });
  }

  function handleEditActivity(activity: Activity) {
    if (hasCurrentUserFinished) {
      handlePlanningInfoPress();
      return;
    }

    router.push({
      pathname: "/add-activity",
      params: {
        tripId: itinerary.tripId,
        title: itinerary.title,
        destination: itinerary.destination,
        startDate: itinerary.startDate,
        endDate: itinerary.endDate,
        state: activeState,
        members: planningStatusParam,
        dayId: activity.dayId,
        slotId: activity.slotId,
        selectedDay: activity.dayId,
        activityId: activity.id,
        initialName: activity.name,
        initialDescription: activity.description ?? "",
        initialAddress: activity.address ?? "",
        initialGoogleMapsUrl: activity.googleMapsUrl ?? "",
        initialStartTime: activity.startTime ?? "",
        initialEndTime: activity.endTime ?? "",
        activitiesJson: JSON.stringify(itinerary.activities),
        planningEndAt: timerDeadlines.planningEndAt ?? "",
        votingEndAt: timerDeadlines.votingEndAt ?? "",
      },
    });
  }

  async function handleSuggest(slotId: string, slotLabel: string) {
    if (!authToken || !tripId) return;

    const existingForSlot = apiActivities.find(
      (activity) =>
        activity.dayId === selectedDayId && activity.slotId === slotId
    );
    suggestionsSlotActivityIdRef.current = existingForSlot?.id ?? null;

    setSuggestionsSlotId(slotId);
    setSuggestionsSlotLabel(slotLabel);
    setSuggestions([]);
    setSuggestionsError(null);
    setIsSuggestionsLoading(true);
    setShowSuggestionsModal(true);

    try {
      const results = await fetchActivitySuggestions(tripId, slotId, authToken);
      setSuggestions(results);
    } catch (err) {
      setSuggestionsError("Could not load suggestions. Please try again.");
    } finally {
      setIsSuggestionsLoading(false);
    }
  }

  async function handleLoadMoreSuggestions() {
    if (!authToken || !tripId || !suggestionsSlotId) return;
    setIsSuggestionsLoadingMore(true);
    try {
      const results = await fetchActivitySuggestions(tripId, suggestionsSlotId, authToken, suggestions.length);
      // Merge, deduplicating by sourcePlaceId
      setSuggestions((prev) => {
        const existingIds = new Set(prev.map((s) => s.sourcePlaceId));
        const fresh = results.filter((s) => !existingIds.has(s.sourcePlaceId));
        return [...prev, ...fresh];
      });
    } catch {
      // silently fail — existing suggestions stay
    } finally {
      setIsSuggestionsLoadingMore(false);
    }
  }

  async function handleAddSuggestion(suggestion: ActivitySuggestion) {
    if (!authToken || !tripId || !selectedDayId || !suggestionsSlotId) {
      throw new Error("Missing trip context");
    }

    const existingActivityId =
      suggestionsSlotActivityIdRef.current ??
      apiActivities.find(
        (activity) =>
          activity.dayId === selectedDayId &&
          activity.slotId === suggestionsSlotId
      )?.id;

    const googleMapsUrl =
      suggestion.googleMapsUrl ??
      buildGoogleMapsUrl(suggestion.name, suggestion.address);

    try {
      if (existingActivityId) {
        const result = await updateActivity(existingActivityId, {
          idToken: authToken,
          name: suggestion.name,
          address: suggestion.address,
          googleMapsUrl,
        });

        suggestionsSlotActivityIdRef.current = existingActivityId;

        const updatedActivity = mapBackendActivity(result, {
          dayId: selectedDayId,
          slotId: suggestionsSlotId,
        });

        const applyUpdate = (activities: Activity[]) =>
          upsertActivity(activities, updatedActivity);

        setApiActivities((current) => applyUpdate(current));
        if (tripId) updateCachedActivities(tripId, applyUpdate);
        return;
      }

      const fullSlotId = `${selectedDayId}_${suggestionsSlotId}`;
      const result = await createActivity({
        idToken: authToken,
        tripId,
        dayId: selectedDayId,
        slotId: fullSlotId,
        name: suggestion.name,
        address: suggestion.address,
        googleMapsUrl,
      });

      const newActivity: Activity = mapBackendActivity(result, {
        dayId: selectedDayId,
        slotId: suggestionsSlotId,
      });

      suggestionsSlotActivityIdRef.current = newActivity.id;

      const applyNew = (activities: Activity[]) =>
        upsertActivity(activities, newActivity);

      setApiActivities((current) => applyNew(current));
      if (tripId) updateCachedActivities(tripId, applyNew);
    } catch (err) {
      Alert.alert(
        "Could not add activity",
        err instanceof Error ? err.message : "Please try again."
      );
      throw err;
    }
  }

  async function handleFinishPlanning() {
    if (isSubmittingPlanning) return;
    if (!currentUserId) return;

    const nextPlanningDone = !hasCurrentUserFinished;

    // Local-only fallback trip
    if (itinerary.tripId === "trip-fallback") {
      const nextState =
        nextPlanningDone && shouldSkipVoting(tripMemberCount)
          ? "final"
          : "planning";

      setItinerary((current) => ({
        ...current,
        state: nextState === "final" ? current.state : nextState,
        planningStatus: setPlanningDoneForUser(
          current.planningStatus,
          currentUserId,
          nextPlanningDone
        ),
      }));

      if (nextState === "final") {
        setIsPreparingFinalItinerary(true);
        if (finalizingTimeoutRef.current) {
          clearTimeout(finalizingTimeoutRef.current);
        }
        finalizingTimeoutRef.current = setTimeout(() => {
          setItinerary((current) => ({ ...current, state: "final" }));
          setIsPreparingFinalItinerary(false);
          setActivityRefreshKey((value) => value + 1);
          router.setParams({ state: "final" });
        }, 1800);
      }
      return;
    }

    // Always try to refresh the ID token before calling the API
    let token = authToken;

    try {
      const user = auth.currentUser;
      if (user) {
        token = await user.getIdToken(true);
      }
    } catch {
      // ignore, will fall back to authToken if present
    }

    if (!token) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }

    setIsSubmittingPlanning(true);

    try {
      const result = await finishPlanning({
        idToken: token,
        tripId: itinerary.tripId,
        planningDone: nextPlanningDone,
      });

      setItinerary((current) => ({
        ...current,
        planningStatus: setPlanningDoneForUser(
          current.planningStatus,
          currentUserId,
          result.planningDone
        ),
      }));

      await refreshTripTimerFields({ forceRefresh: true });

      if (!result.allDone || result.tripState === "Planning") {
        return;
      }

      const maxAttempts = 5;
      const delayMs = 1000;
      for (let i = 0; i < maxAttempts; i++) {
        if (activeStateRef.current !== "planning") break;

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        await refreshTripTimerFields({ forceRefresh: true });
      }
    } catch (error) {
      Alert.alert(
        "One moment...",
        error instanceof Error
          ? error.message
          : "Your group is all set! We're preparing the next step, hang tight. 🎉"
      );
    } finally {
      setIsSubmittingPlanning(false);
    }
  }

  function showVotingFinalTransition() {
    setIsPreparingFinalItinerary(true);
    if (finalizingTimeoutRef.current) {
      clearTimeout(finalizingTimeoutRef.current);
    }
    finalizingTimeoutRef.current = setTimeout(() => {
      setItinerary((current) => ({ ...current, state: "final" }));
      setIsPreparingFinalItinerary(false);
      setActivityRefreshKey((value) => value + 1);
      router.setParams({ state: "final" });
    }, TRANSITION_OVERLAY_MS);
  }

  function handleVotingInfoPress() {
    setShowVotingInfoPopup(true);
  }

  async function submitFinishVoting() {
    if (isSubmittingVoting) return;

    if (itinerary.tripId === "trip-fallback") {
      showVotingFinalTransition();
      return;
    }

    if (!authToken) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }

    setIsSubmittingVoting(true);
    try {
      const result = await finishVoting({
        idToken: authToken,
        tripId: itinerary.tripId,
      });

      if (result.tripState === "Final") {
        showVotingFinalTransition();
      } else {
        void refreshTripTimerFields({ forceRefresh: true });
      }
    } catch (error) {
      Alert.alert(
        "Could not finish voting",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsSubmittingVoting(false);
    }
  }

  function handleFinishVoting() {
    if (isSubmittingVoting || isPreparingFinalItinerary) return;
    setShowVotingConfirmModal(true);
  }

  function handleConfirmFinishVoting() {
    setShowVotingConfirmModal(false);
    void submitFinishVoting();
  }

  const votingActivities = useMemo(() => {
    const all = apiActivities.length > 0 ? apiActivities : itinerary.activities;
    const groups = new Map<string, Activity[]>();

    all.forEach((a) => {
      const key = `${a.dayId}_${a.slotId}`;
      groups.set(key, [...(groups.get(key) ?? []), a]);
    });

    return Array.from(groups.values())
      .filter((group) => group.length > 1)
      .flat();
  }, [apiActivities, itinerary.activities]);

  const daysWithVotingActivities = useMemo(() => {
    const set = new Set<string>();
    votingActivities.forEach((a) => set.add(a.dayId));
    return set;
  }, [votingActivities]);

  const votingTimeChips = useMemo(() => {
    const seen = new Map<string, string>();
    votingActivities
      .filter((a) => a.dayId === selectedDayId)
      .forEach((a) => {
        if (!seen.has(a.slotId)) {
          seen.set(a.slotId, formatSlotLabel(a.slotId));
        }
      });

    return Array.from(seen.entries()).map(([slotId, label]) => ({
      slotId,
      label,
    }));
  }, [votingActivities, selectedDayId]);

  const [selectedVotingSlotId, setSelectedVotingSlotId] = useState<string>("");

  useEffect(() => {
    if (votingTimeChips.length === 0) {
      setSelectedVotingSlotId("");
      return;
    }

    const selectedSlotStillExists = votingTimeChips.some(
      (chip) => chip.slotId === selectedVotingSlotId
    );

    if (!selectedSlotStillExists) {
      setSelectedVotingSlotId(votingTimeChips[0].slotId);
    }
  }, [selectedVotingSlotId, votingTimeChips]);

  const votingSlotActivities = useMemo(() => {
    return votingActivities.filter(
      (a) => a.dayId === selectedDayId && a.slotId === selectedVotingSlotId
    );
  }, [votingActivities, selectedDayId, selectedVotingSlotId]);

  const handleOpenVotingActivityDetails = useCallback(
    (activity: Activity) => {
      const slotChip = votingTimeChips.find(
        (chip) => chip.slotId === activity.slotId
      );

      setSelectedActivity(activity);
      setSelectedActivitySlotLabel(
        slotChip?.label ?? formatSlotLabel(activity.slotId)
      );
      setSelectedAlternativeActivities([]);
      setSelectedDisplayedAlternativeActivities([]);
      setSelectedAddedAlternativeActivityIds([]);
      setShowActivityDetailModal(true);
    },
    [votingTimeChips]
  );

  const handleOpenFinalActivityDetails = useCallback(
    (activity: Activity, slotLabel: string) => {
      setSelectedActivity(activity);
      setSelectedActivitySlotLabel(slotLabel);

      const matchingFinalSlot = finalSlots.find((slot) => {
        if (slot.selectedActivity.id === activity.id) return true;

        if (
          slot.alternativeActivities.some((item) => item.id === activity.id)
        ) {
          return true;
        }

        if (
          slot.addedAlternativeActivities.some(
            (item) => item.id === activity.id
          )
        ) {
          return true;
        }

        return false;
      });

      const alternativeActivities =
        matchingFinalSlot?.alternativeActivities ?? [];
      const addedAlternativeActivities =
        matchingFinalSlot?.addedAlternativeActivities ?? [];

      setSelectedAlternativeActivities(alternativeActivities);
      setSelectedDisplayedAlternativeActivities(
        mergeAlternativeLists(alternativeActivities, addedAlternativeActivities)
      );
      setSelectedAddedAlternativeActivityIds(
        addedAlternativeActivities.map((item) => item.id)
      );
      setShowActivityDetailModal(true);
    },
    [finalSlots]
  );

  const handleCloseActivityDetails = useCallback(() => {
    setShowActivityDetailModal(false);
    setSelectedActivity(null);
    setSelectedActivitySlotLabel("");
    setSelectedAlternativeActivities([]);
    setSelectedDisplayedAlternativeActivities([]);
    setSelectedAddedAlternativeActivityIds([]);
  }, []);

  const handleAddAlternativeToItinerary = useCallback(
    async (activityToToggle: Activity) => {
      if (!authToken || !tripId) {
        Alert.alert("Could not update itinerary", "Please log in again.");
        return;
      }

      const fullSlotId = `${activityToToggle.dayId}_${activityToToggle.slotId}`;
      let previousAddedIds: string[] = [];

      setSelectedAddedAlternativeActivityIds((current) => {
        previousAddedIds = current;
        const wasAdded = current.includes(activityToToggle.id);
        return wasAdded
          ? current.filter((id) => id !== activityToToggle.id)
          : [...current, activityToToggle.id];
      });

      try {
        const result = await toggleAddedAlternativeToItinerary({
          idToken: authToken,
          tripId,
          slotId: fullSlotId,
          activityId: activityToToggle.id,
        });

        setSelectedAddedAlternativeActivityIds(
          result.addedAlternativeActivityIds
        );

        setFinalSlots((current) =>
          current.map((slot) => {
            if (
              slot.dayId !== activityToToggle.dayId ||
              slot.slotId !== activityToToggle.slotId
            ) {
              return slot;
            }

            const alreadyInAdded = slot.addedAlternativeActivities.some(
              (item) => item.id === activityToToggle.id
            );
            const alreadyInAlternatives = slot.alternativeActivities.some(
              (item) => item.id === activityToToggle.id
            );

            if (result.added && alreadyInAlternatives) {
              return {
                ...slot,
                alternativeActivities: slot.alternativeActivities.filter(
                  (item) => item.id !== activityToToggle.id
                ),
                addedAlternativeActivities: [
                  ...slot.addedAlternativeActivities,
                  activityToToggle,
                ],
                alternativeCount: Math.max(0, slot.alternativeCount - 1),
              };
            }

            if (!result.added && alreadyInAdded) {
              return {
                ...slot,
                alternativeActivities: [
                  ...slot.alternativeActivities,
                  activityToToggle,
                ],
                addedAlternativeActivities:
                  slot.addedAlternativeActivities.filter(
                    (item) => item.id !== activityToToggle.id
                  ),
                alternativeCount: slot.alternativeCount + 1,
              };
            }

            return slot;
          })
        );

        const isAddedToItinerary =
          result.addedAlternativeActivityIds.includes(activityToToggle.id);

        setApiActivities((current) =>
          current.map((item) =>
            item.id === activityToToggle.id
              ? {
                  ...item,
                  isAddedToFinalItinerary: isAddedToItinerary,
                }
              : item
          )
        );

        const cachedActivities = activitiesCache.get(`${tripId}_final`);
        if (cachedActivities) {
          activitiesCache.set(
            `${tripId}_final`,
            cachedActivities.map((item) =>
              item.id === activityToToggle.id
                ? {
                    ...item,
                    isAddedToFinalItinerary: isAddedToItinerary,
                  }
                : item
            )
          );
        }

        setSelectedActivity((current) =>
          current?.id === activityToToggle.id
            ? {
                ...current,
                isAddedToFinalItinerary: isAddedToItinerary,
              }
            : current
        );
      } catch (error) {
        setSelectedAddedAlternativeActivityIds(previousAddedIds);
        Alert.alert(
          "Could not update itinerary",
          error instanceof Error ? error.message : "Please try again."
        );
      }
    },
    [authToken, tripId]
  );

  async function handleAddVote(activityId: string) {
    if (!authToken || !tripId || !selectedVotingSlotId) {
      Alert.alert("Could not vote", "Please log in again.");
      return;
    }

    try {
      const fullSlotId = `${selectedDayId}_${selectedVotingSlotId}`;
      const result = await voteForActivity({
        idToken: authToken,
        tripId,
        slotId: fullSlotId,
        activityId,
      });

      const applyVote = (activities: Activity[]) =>
        selectVoteForActivity(
          activities,
          selectedDayId,
          selectedVotingSlotId,
          activityId
        );

      if (result.voteAccepted !== false) {
        updateCachedActivities(tripId, applyVote);
        setApiActivities((current) => applyVote(current));
      }

      if (result.tripState === "Final") {
        setIsPreparingFinalItinerary(true);
        if (finalizingTimeoutRef.current) {
          clearTimeout(finalizingTimeoutRef.current);
        }
        finalizingTimeoutRef.current = setTimeout(() => {
          setItinerary((current) => ({ ...current, state: "final" }));
          setIsPreparingFinalItinerary(false);
          setActivityRefreshKey((value) => value + 1);
          router.setParams({ state: "final" });
        }, 1800);
      }
    } catch (error) {
      Alert.alert(
        "Could not add vote",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  }

  useEffect(() => {
    if (activeState === "voting" && tripDays.length > 0) {
      const firstVotingDay = tripDays.find((d) =>
        daysWithVotingActivities.has(d.id)
      );
      const selectedDayStillHasVotingActivities =
        daysWithVotingActivities.has(selectedDayId);

      if (firstVotingDay && !selectedDayStillHasVotingActivities) {
        setSelectedDayId(firstVotingDay.id);
      }
    }
  }, [activeState, tripDays, daysWithVotingActivities, selectedDayId]);

  const finalActivities = useMemo(
    () => (apiActivities.length > 0 ? apiActivities : itinerary.activities),
    [apiActivities, itinerary.activities]
  );

  const finalSlotsForSelectedDay = useMemo(
    () => finalSlots.filter((slot) => slot.dayId === selectedDayId),
    [finalSlots, selectedDayId]
  );

  const finalSlotMap = useMemo(() => {
    const map = new Map<string, FinalSlotUi>();
    finalSlotsForSelectedDay.forEach((slot) => map.set(slot.slotId, slot));
    return map;
  }, [finalSlotsForSelectedDay]);

  async function handleJoinGroup(activityId: string) {
    const activity = finalActivities.find((item) => item.id === activityId);

    if (!authToken || !tripId || !activity) {
      Alert.alert("Could not update group", "Please log in again.");
      return;
    }

    try {
      const fullSlotId = `${activity.dayId}_${activity.slotId}`;
      const result = await toggleActivityAttendance({
        idToken: authToken,
        tripId,
        slotId: fullSlotId,
        activityId,
      });

      const applyAttendanceUpdate = (activities: Activity[]) =>
        activities.map((item) => {
          const sameSlot =
            item.dayId === activity.dayId && item.slotId === activity.slotId;

          if (!sameSlot) return item;

          if (item.id === activityId) {
            return {
              ...item,
              hasCurrentUserJoined: result.joined,
              joinedCount: result.joinedCount,
              joinedMembers: result.joinedMembers ?? item.joinedMembers,
            };
          }

          if (result.joined) {
            return {
              ...item,
              hasCurrentUserJoined: false,
            };
          }

          return item;
        });

      updateCachedActivities(tripId, applyAttendanceUpdate);
      setApiActivities((current) => applyAttendanceUpdate(current));

      setFinalSlots((current) =>
        current.map((slot) => {
          if (
            slot.dayId !== activity.dayId ||
            slot.slotId !== activity.slotId
          ) {
            return slot;
          }

          const updateItem = (item: Activity): Activity => {
            if (item.id === activityId) {
              return {
                ...item,
                hasCurrentUserJoined: result.joined,
                joinedCount: result.joinedCount,
                joinedMembers: result.joinedMembers ?? item.joinedMembers,
              };
            }

            if (result.joined) {
              return {
                ...item,
                hasCurrentUserJoined: false,
              };
            }

            return item;
          };

          return {
            ...slot,
            selectedActivity: updateItem(slot.selectedActivity),
            alternativeActivities: slot.alternativeActivities.map(updateItem),
            addedAlternativeActivities:
              slot.addedAlternativeActivities.map(updateItem),
          };
        })
      );

      setSelectedActivity((current) =>
        current &&
        current.id === activityId &&
        current.dayId === activity.dayId &&
        current.slotId === activity.slotId
          ? {
              ...current,
              hasCurrentUserJoined: result.joined,
              joinedCount: result.joinedCount,
              joinedMembers: result.joinedMembers ?? current.joinedMembers,
            }
          : current
      );

      setSelectedAlternativeActivities((current) =>
        current.map((item) => {
          if (
            item.dayId !== activity.dayId ||
            item.slotId !== activity.slotId
          ) {
            return item;
          }

          if (item.id === activityId) {
            return {
              ...item,
              hasCurrentUserJoined: result.joined,
              joinedCount: result.joinedCount,
              joinedMembers: result.joinedMembers ?? item.joinedMembers,
            };
          }

          if (result.joined) {
            return {
              ...item,
              hasCurrentUserJoined: false,
            };
          }

          return item;
        })
      );

      setSelectedDisplayedAlternativeActivities((current) =>
        current.map((item) => {
          if (
            item.dayId !== activity.dayId ||
            item.slotId !== activity.slotId
          ) {
            return item;
          }

          if (item.id === activityId) {
            return {
              ...item,
              hasCurrentUserJoined: result.joined,
              joinedCount: result.joinedCount,
              joinedMembers: result.joinedMembers ?? item.joinedMembers,
            };
          }

          if (result.joined) {
            return {
              ...item,
              hasCurrentUserJoined: false,
            };
          }

          return item;
        })
      );
    } catch (error) {
      Alert.alert(
        "Could not update group",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  }

  const stateAccentColor =
    activeState === "voting"
      ? colors.sunsetPink
      : activeState === "memories"
        ? colors.seaBlue
        : activeState === "final"
          ? colors.neonGreen
          : colors.beachYellow;

  const safeAreaBg =
    activeState === "voting"
      ? colors.sunsetPink
      : activeState === "memories"
        ? colors.seaBlue
        : activeState === "final"
          ? colors.neonGreen
          : colors.beachYellow;

  const shouldShowPlanningLockOverlay =
    activeState === "planning" && hasCurrentUserFinished;

  function handleBackPress() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home");
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: safeAreaBg }]}>
      <StatusBar style="dark" />

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.screen}>
          <View style={styles.mainContent}>
            <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.nightBlack}
                colors={[colors.nightBlack]}
              />
            }
          >
          <ItineraryHeader
            title={activeState === "memories" ? "Memories" : "Itinerary"}
            tripName={itinerary.title}
            startDate={itinerary.startDate}
            endDate={itinerary.endDate}
            introText={getIntroText(activeState)}
            daysLeftText={timerText}
            onBackPress={handleBackPress}
            state={activeState}
          />

          <View style={styles.contentPanel}>
            {activeState !== "memories" && (
              <ItineraryDaySelector
                days={tripDays}
                selectedDayId={selectedDayId}
                onSelectDay={setSelectedDayId}
                enabledDayIds={
                  activeState === "voting"
                    ? daysWithVotingActivities
                    : undefined
                }
                accentColor={stateAccentColor}
              />
            )}

            {activeState === "memories" && (
              <View style={styles.memoriesSection}>
                <View style={styles.memoriesActions}>
                  <Pressable
                    style={[
                      styles.memoryActionButton,
                      styles.uploadMemoryButton,
                      isUploadingMemories && styles.memoryActionDisabled,
                    ]}
                    onPress={handleUploadMemories}
                    disabled={isUploadingMemories}
                    accessibilityRole="button"
                    accessibilityLabel="Upload images"
                    accessibilityState={{ busy: isUploadingMemories }}
                  >
                    {isUploadingMemories ? (
                      <ActivityIndicator color={colors.nightBlack} />
                    ) : (
                      <Ionicons
                        name="cloud-upload-outline"
                        size={22}
                        color={colors.nightBlack}
                      />
                    )}
                    <AppText variant="body" style={styles.memoryActionText}>
                      Upload images
                    </AppText>
                  </Pressable>
                </View>

                {isLoadingMemories ? (
                  <View style={styles.memoryGrid}>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <View
                        key={`memory-loading-${index}`}
                        style={styles.memoryPlaceholder}
                      />
                    ))}
                  </View>
                ) : memories.length === 0 ? (
                  <View style={styles.emptyMemoriesPanel}>
                    <View style={styles.emptyMemoriesCenter}>
                      <ImageIcon width={34} height={34} />
                      <AppText variant="body" style={styles.emptyMemoriesText}>
                        No images here yet
                      </AppText>
                    </View>
                  </View>
                ) : (
                  <View style={styles.memoryGrid}>
                    {memories.map((memory) => {
                      const isSelected = selectedMemoryIds.includes(
                        memory.memory_id
                      );

                      return (
                        <Pressable
                          key={memory.memory_id}
                          style={styles.memoryTile}
                          onPress={() => handleMemoryPress(memory)}
                          onLongPress={() => handleMemoryLongPress(memory)}
                          accessibilityRole="imagebutton"
                          accessibilityLabel={`Memory photo uploaded by ${
                            memory.uploaded_by_name ?? "a trip member"
                          }`}
                          accessibilityHint={
                            isMemorySelectionMode
                              ? "Selects or unselects this photo"
                              : "Opens a larger preview"
                          }
                          accessibilityState={{ selected: isSelected }}
                        >
                          <ExpoImage
                            source={{
                              uri: authToken
                                ? getMemoryPhotoUrl(memory, authToken)
                                : "",
                            }}
                            style={styles.memoryImage}
                            contentFit="cover"
                          />
                          {isMemorySelectionMode && (
                            <Pressable
                              style={styles.memorySelectIcon}
                              onPress={() =>
                                toggleMemorySelection(memory.memory_id)
                              }
                              hitSlop={10}
                              accessibilityRole="button"
                              accessibilityLabel={
                                isSelected ? "Unselect image" : "Select image"
                              }
                            >
                              {isSelected ? (
                                <ImageSelectedIcon width={24} height={24} />
                              ) : (
                                <UnselectImageIcon width={24} height={24} />
                              )}
                            </Pressable>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {activeState === "planning" && (
              <View style={styles.slotList}>
                {isLoadingActivities
                  ? slots.map((slot) => <SkeletonSlotCard key={slot.id} />)
                  : slotItems.map(({ slot, activity }) => (
                      <PlanningSlotCard
                        key={slot.id}
                        slot={slot}
                        activity={activity}
                        onAddActivity={handleAddActivity}
                        onEditActivity={handleEditActivity}
                        onSuggest={
                          hasMemberPreferences ? handleSuggest : undefined
                        }
                        disabled={hasCurrentUserFinished}
                      />
                    ))}
              </View>
            )}

            {activeState === "voting" && (
              <View style={styles.votingSection}>
                {isLoadingActivities ? (
                  <View style={styles.slotList}>
                    {slots.slice(0, 3).map((slot) => (
                      <SkeletonSlotCard key={slot.id} />
                    ))}
                  </View>
                ) : votingTimeChips.length > 0 ? (
                  <>
                    <VotingTimeFilter
                      chips={votingTimeChips}
                      selectedSlotId={selectedVotingSlotId}
                      onSelectSlot={setSelectedVotingSlotId}
                    />

                    <View style={styles.slotList}>
                      {votingSlotActivities.map((activity) => (
                        <VotingSlotCard
                          key={activity.id}
                          activity={activity}
                          onAddVote={handleAddVote}
                          onPressDetails={handleOpenVotingActivityDetails}
                          selected={activity.hasCurrentUserVote === true}
                        />
                      ))}
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyVoting} />
                )}
              </View>
            )}

            {activeState === "final" && (
              <View style={styles.slotList}>
                {isLoadingActivities
                  ? slots.map((slot) => <SkeletonSlotCard key={slot.id} />)
                  : slots.map((slot) => {
                      const finalSlot = finalSlotMap.get(slot.id);

                      if (!finalSlot) {
                        return (
                          <FinalSlotCard
                            key={slot.id}
                            slot={slot}
                            activity={undefined}
                            onJoinGroup={handleJoinGroup}
                            onPressDetails={handleOpenFinalActivityDetails}
                          />
                        );
                      }

                      const addedAlternatives =
                        finalSlot.addedAlternativeActivities;
                      const remainingAlternativeCount =
                        finalSlot.alternativeActivities.length;

                      return (
                        <View key={slot.id} style={styles.finalSlotSection}>
                          <FinalSlotCard
                            slot={slot}
                            activity={finalSlot.selectedActivity}
                            onJoinGroup={handleJoinGroup}
                            onPressDetails={handleOpenFinalActivityDetails}
                            otherSuggestedCount={remainingAlternativeCount}
                          />

                          <FinalSuggestedActivitiesSection
                            slotLabel={slot.label}
                            activities={addedAlternatives}
                            onJoinGroup={handleJoinGroup}
                            onPressDetails={handleOpenFinalActivityDetails}
                            accentColor={stateAccentColor}
                          />
                        </View>
                      );
                    })}
              </View>
            )}
          </View>
        </ScrollView>
        </View>

        {activeState === "voting" && isAdmin && (
          <VotingDoneBar
            checked={isSubmittingVoting || isPreparingFinalItinerary}
            disabled={isSubmittingVoting || isPreparingFinalItinerary}
            onPress={handleFinishVoting}
            onInfoPress={handleVotingInfoPress}
          />
        )}

        <SuggestionsModal
          visible={showSuggestionsModal}
          slotLabel={suggestionsSlotLabel}
          destination={itinerary.destination}
          suggestions={suggestions}
          loading={isSuggestionsLoading}
          loadingMore={isSuggestionsLoadingMore}
          error={suggestionsError}
          onClose={() => setShowSuggestionsModal(false)}
          onAdd={handleAddSuggestion}
          onLoadMore={handleLoadMoreSuggestions}
          addedElsewherePlaceIds={suggestionsAddedElsewherePlaceIds}
          selectedPreferences={memberPreferences}
        />

        <ActivityDetailModal
          visible={showActivityDetailModal}
          activity={selectedActivity}
          slotLabel={selectedActivitySlotLabel}
          state={activeState}
          alternativeActivities={selectedDisplayedAlternativeActivities}
          addedAlternativeActivityIds={selectedAddedAlternativeActivityIds}
          onAddAlternativeToItinerary={handleAddAlternativeToItinerary}
          onClose={handleCloseActivityDetails}
        />

        <Modal
          visible={selectedMemory !== null}
          transparent
          animationType="fade"
          onRequestClose={handleCloseMemoryPreview}
        >
          <View style={styles.memoryPreviewOverlay}>
            <Pressable
              style={styles.memoryPreviewBackdrop}
              onPress={handleCloseMemoryPreview}
              accessibilityRole="button"
              accessibilityLabel="Close memory preview"
            />

            <View
              style={[
                styles.memoryPreviewContent,
                { width: memoryPreviewWidth },
              ]}
            >
              <View style={styles.memoryPreviewHeader}>
                <View style={styles.memoryPreviewHeaderRow}>
                  <View style={styles.memoryPreviewHeaderSpacer} />
                  <View style={styles.memoryPreviewMenuAnchor}>
                    <Pressable
                      style={styles.memoryPreviewMenuButton}
                      onPress={handleToggleMemoryPreviewMenu}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Open memory actions menu"
                      accessibilityState={{ expanded: showMemoryPreviewMenu }}
                    >
                      <ImageMenuIcon width={24} height={24} />
                    </Pressable>

                    {showMemoryPreviewMenu ? (
                      <View style={styles.memoryPreviewMenu}>
                        <Pressable
                          style={[
                            styles.memoryPreviewMenuItem,
                            isDeletingMemories && styles.memoryActionDisabled,
                          ]}
                          onPress={handleDeletePreviewMemory}
                          disabled={isDeletingMemories}
                          accessibilityRole="button"
                          accessibilityLabel="Delete this memory"
                        >
                          {isDeletingMemories ? (
                            <ActivityIndicator color={colors.nightBlack} />
                          ) : (
                            <ImageDeleteIcon width={24} height={24} />
                          )}
                          <AppText
                            variant="body"
                            style={styles.memoryPreviewMenuItemText}
                          >
                            Delete
                          </AppText>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.memoryPreviewMenuItem,
                            isDownloadingMemories &&
                              styles.memoryActionDisabled,
                          ]}
                          onPress={handleDownloadPreviewMemory}
                          disabled={isDownloadingMemories}
                          accessibilityRole="button"
                          accessibilityLabel="Download this memory"
                        >
                          {isDownloadingMemories ? (
                            <ActivityIndicator color={colors.nightBlack} />
                          ) : (
                            <ImageDownloadIcon width={24} height={24} />
                          )}
                          <AppText
                            variant="body"
                            style={styles.memoryPreviewMenuItemText}
                          >
                            Download
                          </AppText>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.memoryPreviewImageWrapper,
                  {
                    width: memoryPreviewWidth,
                    height: memoryPreviewImageHeight,
                  },
                ]}
              >
                {authToken && memories.length > 0 ? (
                  <FlatList
                    ref={memoryPreviewListRef}
                    data={memories}
                    horizontal
                    pagingEnabled
                    bounces={memories.length > 1}
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={
                      memories.length > 0 ? selectedMemoryIndex : undefined
                    }
                    keyExtractor={(memory) => memory.memory_id}
                    getItemLayout={(_, index) => ({
                      length: memoryPreviewWidth,
                      offset: memoryPreviewWidth * index,
                      index,
                    })}
                    onScrollToIndexFailed={(info) => {
                      requestAnimationFrame(() => {
                        memoryPreviewListRef.current?.scrollToIndex({
                          index: info.index,
                          animated: false,
                        });
                      });
                    }}
                    onScrollBeginDrag={() => setShowMemoryPreviewMenu(false)}
                    onMomentumScrollEnd={(event) =>
                      handlePreviewMomentumScrollEnd(
                        event.nativeEvent.contentOffset.x
                      )
                    }
                    renderItem={({ item: memory }) => (
                      <View
                        style={[
                          styles.memoryPreviewSlide,
                          {
                            width: memoryPreviewWidth,
                            height: memoryPreviewImageHeight,
                          },
                        ]}
                      >
                        <ExpoImage
                          source={{
                            uri: getMemoryPhotoUrl(memory, authToken),
                          }}
                          style={styles.memoryPreviewImage}
                          contentFit="contain"
                          onLoad={(event) =>
                            handleMemoryImageLoad(
                              memory.memory_id,
                              event.source.width,
                              event.source.height
                            )
                          }
                        />
                      </View>
                    )}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </Modal>

        <ItineraryInfoModal
          visible={activeState === "planning" && showPlanningInfoPopup}
          title="Planning done"
          text="You can uncheck Planning done to edit your activities again until every member has submitted."
          primaryButtonColor={colors.beachYellow}
          accessibilityLabel="Planning done information"
          closeAccessibilityLabel="Close planning information"
          onClose={() => setShowPlanningInfoPopup(false)}
        />

        <ConfirmModal
          visible={activeState === "planning" && showPlanningConfirmModal}
          title="Submit your activities?"
          message="You can still edit your activities until every member has finished planning. Once everyone submits, planning closes and your group moves on to voting."
          confirmLabel="Submit"
          confirmButtonColor={colors.beachYellow}
          accessibilityLabel="Submit planning confirmation"
          confirmAccessibilityLabel="Submit your activities"
          cancelAccessibilityLabel="Cancel submitting activities"
          onConfirm={handleConfirmSubmitPlanning}
          onCancel={() => setShowPlanningConfirmModal(false)}
        />

        {activeState === "memories" &&
        isMemorySelectionMode &&
        memories.length > 0 ? (
          <SafeAreaView
            edges={["bottom"]}
            style={styles.memorySelectionSafeArea}
          >
            <View style={styles.memorySelectionWrapper}>
              <View style={styles.memorySelectionTray}>
                <Pressable
                  style={[
                    styles.memorySelectionAction,
                    (selectedMemoryIds.length === 0 || isDeletingMemories) &&
                      styles.memoryActionDisabled,
                  ]}
                  onPress={handleDeleteSelectedMemories}
                  disabled={
                    selectedMemoryIds.length === 0 || isDeletingMemories
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Delete selected images"
                >
                  {isDeletingMemories ? (
                    <ActivityIndicator color={colors.nightBlack} />
                  ) : (
                    <ImageDeleteIcon width={24} height={24} />
                  )}
                  <AppText
                    variant="body"
                    style={styles.memorySelectionActionText}
                  >
                    Delete
                  </AppText>
                </Pressable>

                <Pressable
                  style={styles.memorySelectionAction}
                  onPress={handleSelectAllMemories}
                  accessibilityRole="button"
                  accessibilityLabel={
                    selectedMemoryIds.length === memories.length
                      ? "Deselect all images"
                      : "Select all images"
                  }
                >
                  <SelectAllIcon width={24} height={24} />
                  <AppText
                    variant="body"
                    style={styles.memorySelectionActionText}
                  >
                    {selectedMemoryIds.length === memories.length
                      ? "Deselect all"
                      : "Select all"}
                  </AppText>
                </Pressable>

                <Pressable
                  style={[
                    styles.memorySelectionAction,
                    (selectedMemoryIds.length === 0 || isDownloadingMemories) &&
                      styles.memoryActionDisabled,
                  ]}
                  onPress={handleDownloadSelectedMemories}
                  disabled={
                    selectedMemoryIds.length === 0 || isDownloadingMemories
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Download selected images"
                >
                  {isDownloadingMemories ? (
                    <ActivityIndicator color={colors.nightBlack} />
                  ) : (
                    <ImageDownloadIcon width={24} height={24} />
                  )}
                  <AppText
                    variant="body"
                    style={styles.memorySelectionActionText}
                  >
                    Download
                  </AppText>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        ) : null}

        <ItineraryInfoModal
          visible={showVotingInfoPopup}
          title="Submit voting"
          text="Only admins can end voting manually. This closes voting for all members and creates the final itinerary."
          primaryButtonColor={colors.sunsetPink}
          accessibilityLabel="Submit voting information"
          closeAccessibilityLabel="Close voting information"
          onClose={() => setShowVotingInfoPopup(false)}
        />

        <ConfirmModal
          visible={showVotingConfirmModal}
          title="Submit voting?"
          message="This ends voting for everyone immediately. No one can add or change votes after that, and your group moves on to the final itinerary."
          confirmLabel="Submit"
          confirmButtonColor={colors.sunsetPink}
          accessibilityLabel="Submit voting confirmation"
          confirmAccessibilityLabel="Submit voting for everyone"
          cancelAccessibilityLabel="Cancel submitting voting"
          onConfirm={handleConfirmFinishVoting}
          onCancel={() => setShowVotingConfirmModal(false)}
        />

        <TransitionOverlay
          visible={isPreparingFinalItinerary}
          title="Making your itinerary ready"
          text="We are choosing the group favorites for each time slot."
        />

        <TransitionOverlay
          visible={isPreparingVoting}
          title="Getting voting ready"
          text="We are preparing the activities your group can vote on."
        />

        <FeedbackModal
          visible={showMemoryFeedbackModal}
          title={memoryFeedbackTitle}
          message={memoryFeedbackMessage}
          onClose={() => setShowMemoryFeedbackModal(false)}
          buttonColor={colors.seaBlue}
        />
        </View>
      </SafeAreaView>

      {shouldShowPlanningLockOverlay ? (
        <View
          pointerEvents="none"
          style={styles.screenLockOverlayFullScreen}
          testID="planning-screen-lock-overlay"
        />
      ) : null}

      {activeState === "planning" ? (
        <PlanningDoneBar
          checked={hasCurrentUserFinished}
          dimSurroundings={shouldShowPlanningLockOverlay}
          disabled={
            isSubmittingPlanning ||
            isPreparingFinalItinerary ||
            isPreparingVoting
          }
          onPress={handlePlanningDonePress}
          onInfoPress={handlePlanningInfoPress}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  screen: {
    flex: 1,
    backgroundColor: colors.lightWhite,
  },
  mainContent: {
    flex: 1,
    position: "relative",
    backgroundColor: colors.lightWhite,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.lightWhite,
  },
  content: {
    paddingTop: 0,
    paddingBottom: spacing.xl,
  },
  contentPanel: {
    marginHorizontal: 0,
    backgroundColor: colors.lightWhite,
    paddingBottom: spacing.xl,
  },
  slotList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  finalSlotSection: {
    gap: spacing.sm,
  },
  screenLockOverlayFullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 9,
  },
  votingSection: {
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  emptyVoting: {
    paddingVertical: spacing.xxl,
  },
  memoriesSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  memoriesActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  memoryActionButton: {
    alignSelf: "flex-start",
    minHeight: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  uploadMemoryButton: {
    backgroundColor: colors.seaBlue,
  },
  downloadMemoryButton: {
    backgroundColor: colors.sunsetOrange,
  },
  memoryActionText: {
    color: colors.nightBlack,
    textAlign: "center",
    fontFamily: typography.fontFamily.bodyBold,
  },
  emptyMemoriesPanel: {
    minHeight: 640,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },

  emptyMemoriesCenter: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },

  emptyMemoriesText: {
    color: colors.border,
    fontFamily: typography.fontFamily.bodyBold,
    textAlign: "center",
  },
  memoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  memoryTile: {
    width: "48.5%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.border,
  },
  memoryPlaceholder: {
    width: "48.5%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  memoryImage: {
    width: "100%",
    height: "100%",
  },
  memorySelectIcon: {
    position: "absolute",
    left: spacing.md,
    top: spacing.md,
    zIndex: 3,
  },
  memorySelectionSafeArea: {
    backgroundColor: colors.lightWhite,
  },
  memorySelectionWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  memorySelectionTray: {
    backgroundColor: colors.lightWhite,
    borderRadius: radius.lg,
    minHeight: ACTION_CARD_HEIGHT,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: `0px 8px ${radius.xl}px rgba(113, 111, 231, 0.25)`,
    elevation: 6,
  },

  memoryActionDisabled: {
    opacity: 0.5,
  },

  memorySelectionAction: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  memorySelectionActionText: {
    color: colors.textPrimary,
    textAlign: "center",
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.xs,
  },

  memoryPreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  memoryPreviewBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  memoryPreviewContent: {
    maxWidth: 420,
    borderRadius: radius.md,
    backgroundColor: colors.lightWhite,
    zIndex: 1,
    elevation: 4,
    overflow: "visible",
  },
  memoryPreviewHeader: {
    backgroundColor: colors.lightWhite,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    zIndex: 10,
    overflow: "visible",
  },
  memoryPreviewHeaderRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  memoryPreviewHeaderSpacer: {
    flex: 1,
  },
  memoryPreviewMenuAnchor: {
    position: "relative",
    zIndex: 20,
  },
  memoryPreviewMenuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryPreviewMenu: {
    position: "absolute",
    top: 40,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    minWidth: 182,
    boxShadow: "0px 6px 20px rgba(20, 13, 10, 0.14)",
    elevation: 10,
    zIndex: 30,
  },
  memoryPreviewMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  memoryPreviewMenuItemText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  memoryPreviewImageWrapper: {
    backgroundColor: colors.border,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    overflow: "hidden",
  },
  memoryPreviewSlide: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
  },
  memoryPreviewImage: {
    width: "100%",
    height: "100%",
  },
  transitionOverlaySafeArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  transitionOverlayContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  finalizingCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 18,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  finalizingTitle: {
    color: colors.nightBlack,
    textAlign: "center",
  },
  finalizingText: {
    color: colors.textMuted,
    textAlign: "center",
  },
});
