import { useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppText } from "@/src/components/common/AppText";
import { AppButton } from "@/src/components/common/AppButton";
import { colors, radius, spacing, typography } from "@/src/theme";
import { useSinglePress } from "@/src/hooks/useSinglePress";

import LocationHeartIcon from "@/assets/icons/location-heart.svg";
import EditIcon from "@/assets/icons/edit.svg";
import LocationIcon from "@/assets/icons/location.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import TextStyle from "@/assets/icons/text-style.svg";
import Back from "@/assets/icons/back.svg";
import Timer from "@/assets/icons/timer.svg";

import { createActivity, updateActivity } from "@/src/services/activityService";
import { useAuth } from "@/src/context/AuthContext";
import { auth } from "@/src/lib/firebase";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";

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

type ActivityTimeField = "start" | "end";

const CalendarModalWrapper = ({
  children,
  isLandscape,
}: {
  children: ReactNode;
  isLandscape: boolean;
}) => (
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
);

export default function AddActivityScreen() {
  const { idToken } = useAuth();
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

  function openActivityTimePicker(field: ActivityTimeField) {
    setTempActivityTime(field === "start" ? startTime : endTime);
    setShowActivityTimePicker(field);
  }

  function handleApplyActivityTime() {
    if (!showActivityTimePicker) return;

    const normalizedTime = tempActivityTime.trim();

    if (normalizedTime && !isValidTimeString(normalizedTime)) {
      Alert.alert("Invalid time", "Please enter a valid time as HH:MM.");
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
    if (!activitiesJson) return [];

    try {
      const parsed = JSON.parse(activitiesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

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
    if (!activityName.trim()) {
      Alert.alert("Missing activity name", "Please enter an activity name.");
      return;
    }

    const trimmedStartTime = startTime.trim();
    const trimmedEndTime = endTime.trim();

    if (trimmedStartTime && !isValidTimeString(trimmedStartTime)) {
      Alert.alert("Invalid start time", "Please enter start time as HH:MM.");
      return;
    }

    if (trimmedEndTime && !isValidTimeString(trimmedEndTime)) {
      Alert.alert("Invalid end time", "Please enter end time as HH:MM.");
      return;
    }

    if (
      trimmedStartTime &&
      trimmedEndTime &&
      trimmedEndTime < trimmedStartTime
    ) {
      Alert.alert("Invalid time range", "End time cannot be before start time.");
      return;
    }

    if (!tripId || !dayId || !slotId) {
      Alert.alert("Missing data", "Trip, day, or time slot is missing.");
      return;
    }

    const token = idToken ?? (await auth.currentUser?.getIdToken());

    if (!token) {
      Alert.alert("Not logged in", "Please log in again.");
      return;
    }

    try {
      if (isEditMode && activityId) {
        await updateActivity(activityId, {
          idToken: token,
          name: activityName.trim(),
          description: description.trim(),
          address: address.trim(),
          googleMapsUrl: googleLink.trim(),
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
          name: activityName.trim(),
          description: description.trim(),
          address: address.trim(),
          googleMapsUrl: googleLink.trim(),
          startTime: trimmedStartTime || undefined,
          endTime: trimmedEndTime || undefined,
        });

        navigateBackWithActivity(createdActivity.activity_id);
      }
    } catch (error) {
      Alert.alert(
        "Could not save activity",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  }

  const handleBack = useSinglePress(() =>
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
      },
    })
  );

  const handleSave = useSinglePress(handleSaveActivity);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Back width={20} height={20} />
          </Pressable>

          <View style={styles.headerTitleRow}>
            <LocationHeartIcon width={24} height={24} />
            <AppText variant="body" style={styles.headerTitle}>
              {isEditMode ? "Edit activity" : "Add activity"}
            </AppText>
          </View>

          <View style={styles.headerSpacer} />
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
                placeholder="Roman Agora"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
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
                      startTime || "not set"
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
                      {startTime || "HH:MM"}
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
                      endTime || "not set"
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
                      {endTime || "HH:MM"}
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
                accessibilityLabel="Google Maps link"
                accessibilityHint="Paste a Google Maps URL for this activity"
              />
            </View>
          </View>

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
      </ScrollView>

      <Modal
        visible={showActivityTimePicker !== null}
        transparent
        animationType="fade"
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
                placeholder="HH:MM"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.beachYellow,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.beachYellow,
  },
  content: {
    flexGrow: 1,
    backgroundColor: colors.beachYellow,
    paddingHorizontal: 0,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  backButton: {
    justifyContent: "center",
    paddingLeft: spacing.md,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
  },
  headerSpacer: {
    width: 44,
  },
  form: {
    flex: 1,
    width: "100%",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    justifyContent: "space-between",
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
  calendarOverlay: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
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
    color: colors.textMuted,
    fontSize: typography.size.sm,
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
  saveButton: {
    alignSelf: "center",
    width: "85%",
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.sunsetOrange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
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
