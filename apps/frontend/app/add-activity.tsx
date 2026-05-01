import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";

import LocationHeartIcon from "@/assets/icons/location-heart.svg";
import EditIcon from "@/assets/icons/edit.svg";
import LocationIcon from "@/assets/icons/location.svg";
import GoogleIcon from "@/assets/icons/google.svg";
import TextStyle from "@/assets/icons/text-style.svg";
import Back from "@/assets/icons/back.svg";

import { createActivity, updateActivity } from "@/src/services/activityService";
import { useAuth } from "@/src/context/AuthContext";
import { auth } from "@/src/lib/firebase";

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

export default function AddActivityScreen() {
  const { idToken } = useAuth();

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
  }>();

  const isEditMode = useMemo(() => Boolean(activityId), [activityId]);

  const [activityName, setActivityName] = useState(initialName ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [address, setAddress] = useState(initialAddress ?? "");
  const [googleLink, setGoogleLink] = useState(initialGoogleMapsUrl ?? "");

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
      },
    });
  }

  async function handleSaveActivity() {
    if (!activityName.trim()) {
      Alert.alert("Missing activity name", "Please enter an activity name.");
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
      let savedActivityId = activityId;

      if (isEditMode && activityId) {
        await updateActivity(activityId, {
          idToken: token,
          name: activityName.trim(),
          description: description.trim(),
          address: address.trim(),
          googleMapsUrl: googleLink.trim(),
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
            onPress={() =>
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
            }
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
              <View style={styles.labelRow}>
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
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <EditIcon width={24} height={24} />
                <AppText variant="body" style={styles.label}>
                  Description
                </AppText>
              </View>

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.multilineInput]}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
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
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
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
              />
            </View>
          </View>

          <Pressable
            onPress={handleSaveActivity}
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
  saveButton: {
    alignSelf: "center",
    width: "85%",
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.sunsetOrange,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
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
