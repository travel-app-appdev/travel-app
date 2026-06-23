import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppText } from "@/src/components/common/AppText";
import { AppButton } from "@/src/components/common/AppButton";
import { FeedbackModal } from "@/src/components/common/FeedbackModal";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useSinglePress } from "@/src/hooks/useSinglePress";

import LocationHeartIcon from "@/assets/icons/location-heart.svg";
import EditIcon from "@/assets/icons/edit.svg";
import LocationIcon from "@/assets/icons/location.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import TextStyle from "@/assets/icons/text-style.svg";
import Back from "@/assets/icons/back.svg";
import Timer from "@/assets/icons/timer.svg";

import {
  fetchActivitySuggestions,
  getMemberPreferences,
  type ActivitySuggestion,
} from "@/src/api/trips";
import {
  getAddedElsewherePlaceIds,
  getAddedInCurrentSlotPlaceIds,
  SuggestionsModal,
} from "@/src/components/itinerary/SuggestionsModal";
import type { Activity } from "@/src/types/itinerary";

import { createActivity, updateActivity } from "@/src/services/activityService";
import {
  loadPlanningActivitiesForTrip,
  mergeActivitiesById,
} from "@/src/utils/itinerary/loadPlanningActivities";
import { useAuth } from "@/src/context/AuthContext";
import { getUserFacingApiError } from "@/src/lib/apiErrors";
import { redirectToLogin } from "@/src/lib/sessionExpired";
import { auth } from "@/src/lib/firebase";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";

// ---- NEW: length limits ----
const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_ADDRESS_LENGTH = 300;
const MAX_GOOGLE_LINK_LENGTH = 2048;
const FALLBACK_TIME_PLACEHOLDER = "HH:MM";
const SAVE_BUTTON_MIN_HEIGHT = 52;
const SAVE_BAR_RESERVED_HEIGHT =
  SAVE_BUTTON_MIN_HEIGHT + spacing.lg + spacing.xxxl;

const SLOT_TIME_PLACEHOLDERS: Record<
  string,
  { startTime: string; endTime: string }
> = {
  Breakfast: { startTime: "06:00", endTime: "09:00" },
  "Morning Activity": { startTime: "09:00", endTime: "12:00" },
  Lunch: { startTime: "12:00", endTime: "14:00" },
  "Midday Activity": { startTime: "14:00", endTime: "18:00" },
  Dinner: { startTime: "18:00", endTime: "21:00" },
  "Evening Activity": { startTime: "21:00", endTime: "00:00" },
};

function splitSlotId(value?: string) {
  if (!value) return { dayId: undefined, slotId: undefined };

  const [maybeDayId, ...slotParts] = value.split("_");

  if (slotParts.length === 0) {
    return { dayId: undefined, slotId: value };
  }

  return {
    dayId: maybeDayId,
    slotId: slotParts.join("_"),
  };
}

function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function normalizeTimeInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function getSlotTimePlaceholders(slotId?: string): {
  startTime: string;
  endTime: string;
} {
  const normalizedSlotId = splitSlotId(slotId).slotId;

  if (!normalizedSlotId) {
    return {
      startTime: FALLBACK_TIME_PLACEHOLDER,
      endTime: FALLBACK_TIME_PLACEHOLDER,
    };
  }

  return (
    SLOT_TIME_PLACEHOLDERS[normalizedSlotId] ?? {
      startTime: FALLBACK_TIME_PLACEHOLDER,
      endTime: FALLBACK_TIME_PLACEHOLDER,
    }
  );
}

function getUnsetTimeAccessibilityText(placeholder: string) {
  return placeholder === FALLBACK_TIME_PLACEHOLDER
    ? "not set"
    : `not set, suggested ${placeholder}`;
}

function buildGoogleMapsUrl(name: string, address?: string): string {
  const query = encodeURIComponent(name + (address ? `, ${address}` : ""));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function parseActivitiesJson(value?: string): Activity[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseMemberPreferencesJson(value?: string): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

type ActivityTimeField = "start" | "end";

const CalendarModalWrapper = ({
  children,
  isLandscape,
}: {
  children: ReactNode;
  isLandscape: boolean;
}) => (
  <SafeAreaView
    style={styles.modalSafeArea}
    edges={["top", "right", "bottom", "left"]}
  >
    <View style={styles.calendarOverlay}>
      <ScrollView
        contentContainerStyle={[
          { flexGrow: 1 },
          isLandscape
            ? { justifyContent: "flex-start" }
            : { justifyContent: "center" },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.calendarModal}>{children}</View>
      </ScrollView>
    </View>
  </SafeAreaView>
);

function StickyHeader({
  isEditMode,
  onBack,
}: {
  isEditMode: boolean;
  onBack: () => void;
}) {
  return (
    <View style={styles.stickyHeaderBlock}>
      <View style={styles.header}>
        <View style={styles.backButtonSlot}>
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Back width={20} height={20} />
          </Pressable>
        </View>

        <View style={styles.headerTitleRow} {...hiddenFromAccessibility}>
          <LocationHeartIcon width={24} height={24} />
          <AppText variant="body" style={styles.headerTitle}>
            {isEditMode ? "Edit activity" : "Add activity"}
          </AppText>
        </View>
      </View>
    </View>
  );
}

export default function AddActivityScreen() {
  const { idToken, setUser, setIdToken } = useAuth();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const {
    tripId,
    title,
    destination,
    startDate,
    endDate,
    state,
    members,
    dayId,
    slotId,
    activitiesJson,
    memberPreferencesJson,
    activityId,
    initialName,
    initialDescription,
    initialAddress,
    initialGoogleMapsUrl,
    initialStartTime,
    initialEndTime,
    planningEndAt,
    votingEndAt,
    selectedDay,
  } = useLocalSearchParams<{
    tripId?: string;
    title?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    state?: "planning" | "voting" | "final";
    members?: string;
    dayId?: string;
    slotId?: string;
    activitiesJson?: string;
    memberPreferencesJson?: string;
    activityId?: string;
    initialName?: string;
    initialDescription?: string;
    initialAddress?: string;
    initialGoogleMapsUrl?: string;
    initialStartTime?: string;
    initialEndTime?: string;
    planningEndAt?: string;
    votingEndAt?: string;
    selectedDay?: string;
  }>();

  const isEditMode = useMemo(() => Boolean(activityId), [activityId]);

  const [activityName, setActivityName] = useState(initialName ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [address, setAddress] = useState(initialAddress ?? "");
  const [googleLink, setGoogleLink] = useState(initialGoogleMapsUrl ?? "");
  const [startTime, setStartTime] = useState(initialStartTime ?? "");
  const [endTime, setEndTime] = useState(initialEndTime ?? "");
  const [showActivityTimePicker, setShowActivityTimePicker] =
    useState<ActivityTimeField | null>(null);
  const [tempActivityTime, setTempActivityTime] = useState("");

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackButtonLabel, setFeedbackButtonLabel] = useState("Okay");
  const feedbackOnCloseRef = useRef<(() => void) | null>(null);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestions, setSuggestions] = useState<ActivitySuggestion[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [isSuggestionsLoadingMore, setIsSuggestionsLoadingMore] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [memberPreferences, setMemberPreferences] = useState<string[]>(() =>
    parseMemberPreferencesJson(memberPreferencesJson)
  );
  const [isPreferencesLoading, setIsPreferencesLoading] = useState(
    () =>
      !parseMemberPreferencesJson(memberPreferencesJson).length && Boolean(tripId)
  );
  const [appliedSuggestionPlaceId, setAppliedSuggestionPlaceId] = useState<
    string | null
  >(null);
  const [tripActivities, setTripActivities] = useState<Activity[]>(() =>
    parseActivitiesJson(activitiesJson)
  );

  const normalizedSlot = useMemo(() => splitSlotId(slotId), [slotId]);
  const resolvedDayId = dayId ?? normalizedSlot.dayId ?? "";
  const resolvedSlotType = normalizedSlot.slotId ?? slotId ?? "";
  const slotLabel = resolvedSlotType || "this time slot";
  const hasMemberPreferences = memberPreferences.length > 0;
  const showSuggestSection = Boolean(
    state === "planning" &&
      tripId &&
      resolvedSlotType &&
      (hasMemberPreferences || isPreferencesLoading)
  );
  const canSuggestActivity = showSuggestSection && hasMemberPreferences;
  const { startTime: startTimePlaceholder, endTime: endTimePlaceholder } =
    useMemo(() => getSlotTimePlaceholders(slotId), [slotId]);
  const activityTimePickerPlaceholder =
    showActivityTimePicker === "start"
      ? startTimePlaceholder
      : showActivityTimePicker === "end"
        ? endTimePlaceholder
        : FALLBACK_TIME_PLACEHOLDER;

  function openFeedbackModal(
    title: string,
    message: string,
    options?: { buttonLabel?: string; onClose?: () => void }
  ) {
    setFeedbackTitle(title);
    setFeedbackMessage(message);
    setFeedbackButtonLabel(options?.buttonLabel ?? "Okay");
    feedbackOnCloseRef.current = options?.onClose ?? null;
    setShowFeedbackModal(true);
  }

  function closeFeedbackModal() {
    setShowFeedbackModal(false);
    const onClose = feedbackOnCloseRef.current;
    feedbackOnCloseRef.current = null;
    onClose?.();
  }

  function openApiErrorModal(
    error: unknown,
    contextTitle: string,
    fallbackMessage: string
  ) {
    const resolved = getUserFacingApiError(error, contextTitle, fallbackMessage);
    openFeedbackModal(resolved.title, resolved.message, {
      buttonLabel: resolved.buttonLabel,
      onClose: resolved.isSessionExpired
        ? () => {
            void redirectToLogin(setUser, setIdToken);
          }
        : undefined,
    });
  }

  function openActivityTimePicker(field: ActivityTimeField) {
    setTempActivityTime(field === "start" ? startTime : endTime);
    setShowActivityTimePicker(field);
  }

  function handleApplyActivityTime() {
    if (!showActivityTimePicker) return;

    const normalizedTime = tempActivityTime.trim();

    if (normalizedTime && !isValidTimeString(normalizedTime)) {
      openFeedbackModal("Invalid time", "Please enter a valid time as HH:MM.");
      return;
    }

    if (showActivityTimePicker === "start") {
      setStartTime(normalizedTime);
    } else {
      setEndTime(normalizedTime);
    }

    setShowActivityTimePicker(null);
  }

  function parseExistingActivities() {
    return parseActivitiesJson(activitiesJson);
  }

  const planningActivities = useMemo(
    () => mergeActivitiesById(parseActivitiesJson(activitiesJson), tripActivities),
    [activitiesJson, tripActivities]
  );

  const refreshTripActivities = useCallback(async () => {
    if (!tripId || !startDate || !endDate) {
      return parseActivitiesJson(activitiesJson);
    }

    const userId = auth.currentUser?.uid;
    const fetched = await loadPlanningActivitiesForTrip(
      tripId,
      startDate,
      endDate,
      userId
    );

    return mergeActivitiesById(parseActivitiesJson(activitiesJson), fetched);
  }, [activitiesJson, endDate, startDate, tripId]);

  const suggestionsAddedElsewherePlaceIds = useMemo(() => {
    if (!resolvedDayId || !resolvedSlotType) return [];

    return [
      ...getAddedElsewherePlaceIds(
        planningActivities,
        suggestions,
        resolvedDayId,
        resolvedSlotType
      ),
    ];
  }, [planningActivities, resolvedDayId, resolvedSlotType, suggestions]);

  const suggestionsAddedInSlotPlaceIds = useMemo(() => {
    if (!resolvedDayId || !resolvedSlotType) return [];

    return [
      ...getAddedInCurrentSlotPlaceIds(
        planningActivities,
        suggestions,
        resolvedDayId,
        resolvedSlotType
      ),
    ];
  }, [planningActivities, resolvedDayId, resolvedSlotType, suggestions]);

  useFocusEffect(
    useCallback(() => {
      if (!tripId || !idToken) {
        setMemberPreferences(parseMemberPreferencesJson(memberPreferencesJson));
        setIsPreferencesLoading(false);
        return;
      }

      let cancelled = false;
      const initialPreferences = parseMemberPreferencesJson(memberPreferencesJson);

      if (initialPreferences.length > 0) {
        setMemberPreferences(initialPreferences);
        setIsPreferencesLoading(false);
      } else {
        setIsPreferencesLoading(true);
      }

      getMemberPreferences(tripId, idToken)
        .then((preferences) => {
          if (!cancelled) {
            setMemberPreferences(preferences);
            setIsPreferencesLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMemberPreferences(initialPreferences);
            setIsPreferencesLoading(false);
          }
        });

      refreshTripActivities()
        .then((activities) => {
          if (!cancelled) {
            setTripActivities(activities);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setTripActivities(parseActivitiesJson(activitiesJson));
          }
        });

      return () => {
        cancelled = true;
      };
    }, [
      activitiesJson,
      idToken,
      memberPreferencesJson,
      refreshTripActivities,
      tripId,
    ])
  );

  const getAuthToken = useCallback(async () => {
    let token = idToken;
    const currentUser = auth.currentUser;

    if (currentUser) {
      try {
        token = await currentUser.getIdToken(true);
      } catch {
        // Fall back to the cached token if refresh fails.
      }
    }

    return token;
  }, [idToken]);

  const handleSuggestActivity = useCallback(async () => {
    if (!tripId || !resolvedSlotType) {
      openFeedbackModal("Missing data", "Trip or time slot is missing.");
      return;
    }

    setSuggestions([]);
    setSuggestionsError(null);
    setIsSuggestionsLoading(true);
    setShowSuggestionsModal(true);

    try {
      let token = idToken;
      if (!token && auth.currentUser) {
        token = await auth.currentUser.getIdToken(false);
      }
      if (!token) {
        setSuggestionsError("Please log in again.");
        return;
      }

      void refreshTripActivities()
        .then((activities) => {
          setTripActivities(activities);
        })
        .catch(() => {
          // Keep existing activities if the refresh fails.
        });

      const results = await fetchActivitySuggestions(
        tripId,
        resolvedSlotType,
        token
      );
      setSuggestions(results);
    } catch {
      setSuggestionsError("Could not load suggestions. Please try again.");
    } finally {
      setIsSuggestionsLoading(false);
    }
  }, [idToken, refreshTripActivities, resolvedSlotType, tripId]);

  const handleLoadMoreSuggestions = useCallback(async () => {
    if (!tripId || !resolvedSlotType) return;

    const token = await getAuthToken();
    if (!token) return;

    setIsSuggestionsLoadingMore(true);

    try {
      const results = await fetchActivitySuggestions(
        tripId,
        resolvedSlotType,
        token,
        suggestions.length
      );

      setSuggestions((current) => {
        const existingIds = new Set(current.map((item) => item.sourcePlaceId));
        const fresh = results.filter(
          (item) => !existingIds.has(item.sourcePlaceId)
        );
        return [...current, ...fresh];
      });
    } catch {
      // Keep existing suggestions visible if loading more fails.
    } finally {
      setIsSuggestionsLoadingMore(false);
    }
  }, [getAuthToken, resolvedSlotType, suggestions.length, tripId]);

  const handleApplySuggestion = useCallback(
    async (suggestion: ActivitySuggestion) => {
      const googleMapsUrl =
        suggestion.googleMapsUrl ??
        buildGoogleMapsUrl(suggestion.name, suggestion.address);

      setActivityName(suggestion.name);
      setAddress(suggestion.address ?? "");
      setGoogleLink(googleMapsUrl);
      setAppliedSuggestionPlaceId(suggestion.sourcePlaceId);
    },
    []
  );

  const handleDeselectSuggestion = useCallback(async () => {
    setAppliedSuggestionPlaceId(null);
    setActivityName("");
    setAddress("");
    setGoogleLink("");
  }, []);

  const handleSuggestPress = useSinglePress(handleSuggestActivity);

  function navigateBackWithActivity(savedActivityId: string) {
    const normalizedSlot = splitSlotId(slotId);
    const nextActivity = {
      id: savedActivityId,
      dayId: dayId ?? normalizedSlot.dayId,
      slotId: normalizedSlot.slotId ?? slotId,
      name: activityName.trim(),
      description: description.trim(),
      address: address.trim(),
      googleMapsUrl: googleLink.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
    };
    const existingActivities = parseExistingActivities();
    const existingIndex = existingActivities.findIndex(
      (activity) => activity.id === savedActivityId
    );
    const nextActivities =
      existingIndex === -1
        ? [...existingActivities, nextActivity]
        : existingActivities.map((activity, index) =>
            index === existingIndex ? nextActivity : activity
          );

    router.dismissTo({
      pathname: "/itinerary",
      params: {
        tripId,
        title,
        destination,
        startDate,
        endDate,
        state,
        members,
        activitiesJson: JSON.stringify(nextActivities),
        newActivityId: nextActivity.id,
        newActivityDayId: nextActivity.dayId,
        newActivitySlotId: nextActivity.slotId,
        newActivityName: nextActivity.name,
        newActivityDescription: nextActivity.description,
        newActivityAddress: nextActivity.address,
        newActivityGoogleMapsUrl: nextActivity.googleMapsUrl,
        newActivityStartTime: nextActivity.startTime,
        newActivityEndTime: nextActivity.endTime,
        planningEndAt,
        votingEndAt,
        selectedDay: nextActivity.dayId ?? selectedDay,
      },
    });
  }

  async function handleSaveActivity() {
    const trimmedName = activityName.trim();
    const trimmedDescription = description.trim();
    const trimmedAddress = address.trim();
    const trimmedGoogleLink = googleLink.trim();
    const trimmedStartTime = startTime.trim();
    const trimmedEndTime = endTime.trim();

    if (!trimmedName) {
      openFeedbackModal(
        "Missing activity name",
        "Please enter an activity name."
      );
      return;
    }

    // NEW: length validations
    if (trimmedName.length > MAX_NAME_LENGTH) {
      openFeedbackModal(
        "Name too long",
        `Activity name must be shorter than ${MAX_NAME_LENGTH} characters.`
      );
      return;
    }

    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      openFeedbackModal(
        "Description too long",
        `Description must be shorter than ${MAX_DESCRIPTION_LENGTH} characters.`
      );
      return;
    }

    if (trimmedAddress.length > MAX_ADDRESS_LENGTH) {
      openFeedbackModal(
        "Address too long",
        `Address must be shorter than ${MAX_ADDRESS_LENGTH} characters.`
      );
      return;
    }

    if (trimmedGoogleLink.length > MAX_GOOGLE_LINK_LENGTH) {
      openFeedbackModal(
        "Link too long",
        `Google link is unusually long. Please shorten it or use a normal Maps URL.`
      );
      return;
    }

    if (trimmedStartTime && !isValidTimeString(trimmedStartTime)) {
      openFeedbackModal(
        "Invalid start time",
        "Please enter start time as HH:MM."
      );
      return;
    }

    if (trimmedEndTime && !isValidTimeString(trimmedEndTime)) {
      openFeedbackModal("Invalid end time", "Please enter end time as HH:MM.");
      return;
    }

    if (!tripId || !dayId || !slotId) {
      openFeedbackModal("Missing data", "Trip, day, or time slot is missing.");
      return;
    }

    let token = idToken;

    try {
      const user = auth.currentUser;
      if (user) {
        // Force-refresh the ID token so it's never expired
        token = await user.getIdToken(true);
      }
    } catch {
      // ignore, will fall back to existing idToken if present
    }

    if (!token) {
      openFeedbackModal("Not logged in", "Please log in again.");
      return;
    }

    try {
      if (isEditMode && activityId) {
        await updateActivity(activityId, {
          idToken: token,
          name: trimmedName,
          description: trimmedDescription,
          address: trimmedAddress,
          googleMapsUrl: trimmedGoogleLink,
          startTime: trimmedStartTime || undefined,
          endTime: trimmedEndTime || undefined,
        });
        navigateBackWithActivity(activityId);
      } else {
        const createdActivity = await createActivity({
          idToken: token,
          tripId,
          dayId,
          slotId,
          name: trimmedName,
          description: trimmedDescription,
          address: trimmedAddress,
          googleMapsUrl: trimmedGoogleLink,
          startTime: trimmedStartTime || undefined,
          endTime: trimmedEndTime || undefined,
        });

        navigateBackWithActivity(createdActivity.activity_id);
      }
    } catch (error) {
      console.log("createActivity error:", error);
      openApiErrorModal(error, "Could not save activity", "Please try again.");
    }
  }

  const handleBack = useSinglePress(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/itinerary",
      params: {
        tripId,
        title,
        destination,
        startDate,
        endDate,
        state,
        members,
        activitiesJson,
        planningEndAt,
        votingEndAt,
        selectedDay,
      },
    });
  });

  const handleSave = useSinglePress(handleSaveActivity);

  return (
    <View style={styles.fullScreen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.flex}
            stickyHeaderIndices={[0]}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: SAVE_BAR_RESERVED_HEIGHT },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.stickyTopBlock}>
              <StickyHeader isEditMode={isEditMode} onBack={handleBack} />

              {showSuggestSection ? (
                <View style={styles.suggestSection}>
                  <AppText variant="body" style={styles.suggestTitle}>
                    Not sure what to add?
                  </AppText>

                  <Pressable
                    onPress={handleSuggestPress}
                    disabled={!canSuggestActivity}
                    style={({ pressed }) => [
                      styles.suggestPill,
                      !canSuggestActivity && styles.suggestPillDisabled,
                      pressed && canSuggestActivity && styles.suggestPillPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Suggest activity for ${slotLabel}`}
                    accessibilityHint="Shows real place suggestions based on your chosen travel preferences"
                    accessibilityState={{ disabled: !canSuggestActivity }}
                  >
                    <AppText
                      variant="body"
                      style={styles.suggestPillText}
                      accessible={false}
                    >
                      ✦ Suggest activity
                    </AppText>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.form}>
              <View style={styles.fields}>
                <View style={styles.fieldGroup}>
                  <View
                    style={styles.labelRow}
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                  >
                    <TextStyle width={24} height={24} />
                    <AppText variant="body" style={styles.label}>
                      Activity Name
                    </AppText>
                  </View>

                  <TextInput
                    value={activityName}
                    onChangeText={setActivityName}
                    placeholder="Name"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    maxLength={MAX_NAME_LENGTH}
                    accessibilityLabel="Activity name"
                    accessibilityHint="Enter the name of the activity"
                  />
                </View>

            <View style={styles.fieldGroup}>
              <View
                style={styles.labelRow}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                <EditIcon width={24} height={24} />
                <AppText variant="body" style={styles.label}>
                  Description
                </AppText>
              </View>

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What will you do there? Any details or tips for your travel mates?"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.multilineInput]}
                multiline
                textAlignVertical="top"
                maxLength={MAX_DESCRIPTION_LENGTH}
                accessibilityLabel="Description"
                accessibilityHint="Enter the description of the activity"
              />
            </View>

            <View style={styles.fieldGroup}>
              <View
                style={styles.labelRow}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                <Timer width={24} height={24} />
                <AppText variant="body" style={styles.label}>
                  Time
                </AppText>
              </View>

              <View style={styles.timeFieldsRow}>
                <View style={styles.timeField}>
                  <AppText variant="body" style={styles.timeFieldLabel}>
                    Start time
                  </AppText>
                  <Pressable
                    style={({ pressed }) => [
                      styles.timeInputBox,
                      pressed && styles.timeInputBoxPressed,
                    ]}
                    onPress={() => openActivityTimePicker("start")}
                    accessibilityRole="button"
                    accessibilityLabel={`Activity start time, currently ${
                      startTime ||
                      getUnsetTimeAccessibilityText(startTimePlaceholder)
                    }. Tap to change`}
                    accessibilityHint="Opens the time picker"
                  >
                    <AppText
                      variant="body"
                      style={[
                        styles.timeDisplayText,
                        !startTime && styles.timePlaceholderText,
                      ]}
                    >
                      {startTime || startTimePlaceholder}
                    </AppText>
                    <View {...hiddenFromAccessibility}>
                      <Timer width={20} height={20} />
                    </View>
                  </Pressable>
                </View>

                <View style={styles.timeField}>
                  <AppText variant="body" style={styles.timeFieldLabel}>
                    End time
                  </AppText>
                  <Pressable
                    style={({ pressed }) => [
                      styles.timeInputBox,
                      pressed && styles.timeInputBoxPressed,
                    ]}
                    onPress={() => openActivityTimePicker("end")}
                    accessibilityRole="button"
                    accessibilityLabel={`Activity end time, currently ${
                      endTime ||
                      getUnsetTimeAccessibilityText(endTimePlaceholder)
                    }. Tap to change`}
                    accessibilityHint="Opens the time picker"
                  >
                    <AppText
                      variant="body"
                      style={[
                        styles.timeDisplayText,
                        !endTime && styles.timePlaceholderText,
                      ]}
                    >
                      {endTime || endTimePlaceholder}
                    </AppText>
                    <View {...hiddenFromAccessibility}>
                      <Timer width={20} height={20} />
                    </View>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View
                style={styles.labelRow}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                <LocationIcon width={24} height={24} />
                <AppText variant="body" style={styles.label}>
                  Location
                </AppText>
              </View>

              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Address"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                maxLength={MAX_ADDRESS_LENGTH}
                accessibilityLabel="Location"
                accessibilityHint="Enter the location of the activity"
              />
            </View>

            <View style={styles.fieldGroup}>
              <View
                style={styles.labelRow}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                <GoogleIcon width={24} height={24} />
                <AppText variant="body" style={styles.label}>
                  Google-Link
                </AppText>
              </View>

              <TextInput
                value={googleLink}
                onChangeText={setGoogleLink}
                placeholder="Paste Google-Link here"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="url"
                maxLength={MAX_GOOGLE_LINK_LENGTH}
                accessibilityLabel="Google Maps link"
                accessibilityHint="Paste a Google Maps URL for this activity"
              />
            </View>
              </View>
            </View>
          </ScrollView>

          <SafeAreaView edges={["bottom"]} style={styles.saveSafeArea}>
            <View style={styles.saveWrapper}>
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.saveButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  isEditMode ? "Save activity changes" : "Save activity"
                }
              >
                <AppText variant="body" style={styles.saveButtonText}>
                  {isEditMode ? "Save changes" : "Add activity"}
                </AppText>
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={showActivityTimePicker !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowActivityTimePicker(null)}
      >
        <CalendarModalWrapper isLandscape={isLandscape}>
          <AppText variant="body" style={styles.calendarTitle}>
            {showActivityTimePicker === "start"
              ? "Select activity start time"
              : "Select activity end time"}
          </AppText>

          <View style={styles.timeModalContent}>
            <AppText variant="caption" style={styles.timeModalHint}>
              Enter the exact time in 24-hour format
            </AppText>
            <View style={styles.timeInputModalBox}>
              <TextInput
                value={tempActivityTime}
                onChangeText={(value) =>
                  setTempActivityTime(normalizeTimeInput(value))
                }
                placeholder={activityTimePickerPlaceholder}
                placeholderTextColor={colors.textMuted}
                keyboardType={
                  Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"
                }
                maxLength={5}
                style={styles.timeInputModal}
                textAlign="center"
                accessibilityLabel="Enter time in HH colon MM format"
              />
              <Timer width={20} height={20} />
            </View>
          </View>

          <View style={styles.calendarActions}>
            <AppButton
              title="Cancel"
              onPress={() => setShowActivityTimePicker(null)}
              style={styles.calendarCancelButton}
              textStyle={styles.calendarCancelButtonText}
              accessibilityLabel="Cancel time selection"
            />
            <AppButton
              title="Apply time"
              onPress={handleApplyActivityTime}
              style={styles.calendarApplyButton}
              textStyle={styles.calendarApplyButtonText}
              accessibilityLabel="Apply selected time"
            />
          </View>
        </CalendarModalWrapper>
      </Modal>

      <FeedbackModal
        visible={showFeedbackModal}
        title={feedbackTitle}
        message={feedbackMessage}
        buttonLabel={feedbackButtonLabel}
        onClose={closeFeedbackModal}
      />

      <SuggestionsModal
        visible={showSuggestionsModal}
        slotLabel={slotLabel}
        destination={destination}
        suggestions={suggestions}
        loading={isSuggestionsLoading}
        loadingMore={isSuggestionsLoadingMore}
        error={suggestionsError}
        onClose={() => setShowSuggestionsModal(false)}
        onAdd={handleApplySuggestion}
        onLoadMore={handleLoadMoreSuggestions}
        addedElsewherePlaceIds={suggestionsAddedElsewherePlaceIds}
        addedInSlotPlaceIds={suggestionsAddedInSlotPlaceIds}
        selectedPlaceId={appliedSuggestionPlaceId}
        selectedPreferences={memberPreferences}
        onDeselect={handleDeselectSuggestion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.beachYellow,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.beachYellow,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    backgroundColor: colors.beachYellow,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  stickyTopBlock: {
    backgroundColor: colors.beachYellow,
    zIndex: 20,
    elevation: 0,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  stickyHeaderBlock: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    backgroundColor: colors.beachYellow,
  },
  suggestSection: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.beachYellow,
  },
  suggestTitle: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.md,
    textAlign: "center",
  },
  suggestPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.nightBlack,
    borderRadius: radius.pill,
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  suggestPillPressed: {
    opacity: 0.85,
  },
  suggestPillDisabled: {
    opacity: 0.55,
  },
  suggestPillText: {
    color: colors.lightWhite,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
  },
  header: {
    width: "100%",
    minHeight: 44,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.beachYellow,
  },
  backButtonSlot: {
    position: "absolute",
    left: spacing.lg,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "flex-start",
    zIndex: 2,
  },
  backButton: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
    minHeight: 44,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "center",
  },
  headerTitle: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
  },
  form: {
    width: "100%",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  fields: {
    gap: spacing.xl,
  },
  fieldGroup: {
    gap: spacing.md,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  label: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
  },
  input: {
    minHeight: 54,
    borderWidth: 2,
    borderColor: colors.nightBlack,
    borderRadius: radius.md,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.nightBlack,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontFamily: typography.fontFamily.body,
  },
  multilineInput: {
    minHeight: 104,
  },
  timeFieldsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  timeField: {
    flex: 1,
    gap: spacing.sm,
  },
  timeFieldLabel: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    paddingLeft: spacing.xs,
  },
  timeInputBox: {
    minHeight: 54,
    borderWidth: 2,
    borderColor: colors.nightBlack,
    borderRadius: radius.md,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  timeInputBoxPressed: {
    opacity: 0.85,
  },
  timeDisplayText: {
    flex: 1,
    color: colors.nightBlack,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontFamily: typography.fontFamily.body,
    textAlign: "left",
  },
  timePlaceholderText: {
    color: colors.textMuted,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  calendarOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  calendarModal: {
    backgroundColor: colors.lightWhite,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.nightBlack,
  },
  calendarTitle: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  calendarActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  calendarCancelButton: {
    flex: 1,
    backgroundColor: colors.beachYellow,
  },
  calendarCancelButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  calendarApplyButton: {
    flex: 1,
    backgroundColor: colors.sunsetOrange,
  },
  calendarApplyButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  timeModalContent: {
    gap: spacing.md,
  },
  timeModalHint: {
    color: colors.nightBlack,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.body,
  },
  timeInputModalBox: {
    backgroundColor: colors.lightWhite,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.nightBlack,
    minHeight: 64,
  },
  timeInputModal: {
    flex: 1,
    minHeight: 44,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  saveSafeArea: {
    backgroundColor: colors.beachYellow,
  },
  saveWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  saveButton: {
    width: "100%",
    minHeight: SAVE_BUTTON_MIN_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.sunsetOrange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
  },
});
