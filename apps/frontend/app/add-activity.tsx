// apps/frontend/app/add-activity.tsx
import { useState } from "react";
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

export default function AddActivityScreen() {
  const {
    tripId,
    title,
    destination,
    startDate,
    endDate,
    state,
    dayId,
    slotId,
  } = useLocalSearchParams<{
    tripId?: string;
    title?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    state?: "planning" | "voting" | "final";
    dayId?: string;
    slotId?: string;
  }>();

  const [activityName, setActivityName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [googleLink, setGoogleLink] = useState("");

  function handleSaveActivity() {
    if (!activityName.trim()) {
      Alert.alert("Missing activity name", "Please enter an activity name.");
      return;
    }

    const newActivityId = `activity-${Date.now()}`;

    router.replace({
      pathname: "/itinerary",
      params: {
        tripId,
        title,
        destination,
        startDate,
        endDate,
        state,
        newActivityId,
        newActivityDayId: dayId,
        newActivitySlotId: slotId,
        newActivityName: activityName.trim(),
        newActivityAddress: address.trim(),
        newActivityGoogleMapsUrl: googleLink.trim(),
      },
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <AppText variant="body" style={styles.backText}>
              {"<"}
            </AppText>
          </Pressable>

          <AppText variant="title" style={styles.title}>
            Add activity
          </AppText>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <AppText variant="subtitle" style={styles.label}>
                Activity name
              </AppText>
              <TextInput
                value={activityName}
                onChangeText={setActivityName}
                placeholder="Roman Agora"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <AppText variant="subtitle" style={styles.label}>
                Description
              </AppText>
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
              <AppText variant="subtitle" style={styles.label}>
                Location
              </AppText>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Address"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <AppText variant="subtitle" style={styles.label}>
                Google-Link
              </AppText>
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

            <Pressable
              onPress={handleSaveActivity}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.saveButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save activity"
            >
              <AppText variant="body" style={styles.saveButtonText}>
                Add activity
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  hero: {
    backgroundColor: colors.beachYellow,
    minHeight: "100%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.nightBlack,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
  },
  title: {
    color: colors.nightBlack,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  input: {
    minHeight: 56,
    borderWidth: 2,
    borderColor: colors.nightBlack,
    borderRadius: radius.md,
    backgroundColor: colors.lightWhite,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.nightBlack,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontFamily: typography.fontFamily.body,
  },
  multilineInput: {
    minHeight: 120,
  },
  saveButton: {
    marginTop: spacing.xl,
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
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
