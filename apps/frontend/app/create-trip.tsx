// app/create-trip.tsx
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { createTrip } from "@/src/api/trips";
import { auth } from "@/src/lib/firebase";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { AppText } from "@/src/components/common/AppText";
import { AppInput } from "@/src/components/common/AppInput";
import { AppButton } from "@/src/components/common/AppButton";
import { colors, spacing, radius, typography } from "@/src/theme";
import Back from "@/assets/icons/back.svg";
import Plane from "@/assets/icons/plane.svg";
import CityScape from "@/assets/icons/city_scape.svg";
import CurlyYellow from "@/assets/visuals/curly-yellow.svg";
import Location from "@/assets/icons/location.svg";
import Copy from "@/assets/icons/copy.svg";
import ShareLink from "@/assets/icons/share_link.svg";
import Calendar from "@/assets/icons/calendar.svg";
import TripTitle from "@/assets/icons/trip_title.svg";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function generateTripCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function toDateOnlyString(date: Date) {
  // "2026-04-13TXX:XX:XXXX" → "2026-04-13"
  return date.toISOString().split("T")[0];
}

export default function CreateTripScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const [destination, setDestination] = useState("");
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tripCode] = useState(generateTripCode());
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  const formatDate = (date: Date) =>
      date.toLocaleDateString("en-GB").replace(/\//g, ".");

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(tripCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    if (!destination.trim()) {
      Alert.alert("Missing destination", "Please enter a destination first.");
      return;
    }

    setStep(2);
  };

  const handleCreateTrip = async () => {
    if (isSubmitting) return;

    if (!user) {
      Alert.alert("Not logged in", "Please log in again and try creating a trip.");
      return;
    }

    if (!destination.trim()) {
      Alert.alert("Missing destination", "Please enter a destination.");
      return;
    }

    if (!tripName.trim()) {
      Alert.alert("Missing trip name", "Please enter a trip name.");
      return;
    }

    if (endDate < startDate) {
      Alert.alert("Invalid dates", "End date cannot be before start date.");
      return;
    }

    try {
      setIsSubmitting(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        Alert.alert("Authentication error", "No Firebase user found. Please log in again.");
        return;
      }

      const idToken = await currentUser.getIdToken();

      await createTrip({
        idToken,
        title: tripName.trim(),
        destination: destination.trim(),
        start_date: toDateOnlyString(startDate),
        end_date: toDateOnlyString(endDate),
      });

      router.replace("/home");
    } catch (error) {
      console.error("Error creating trip:", error);

      const message =
          error instanceof Error ? error.message : "Failed to create trip";

      Alert.alert("Create trip failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <View
          style={[styles.fullScreen, step === 1 ? styles.bgStep1 : styles.bgStep2]}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <View
              style={[styles.root, step === 1 ? styles.bgStep1 : styles.bgStep2]}
          >
            {step === 1 ? (
                <>
                  <KeyboardAvoidingView
                      style={styles.scroll}
                      behavior={Platform.OS === "ios" ? "padding" : undefined}
                  >
                    <ScrollView
                        contentContainerStyle={styles.containerStep1}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                      {/* Header */}
                      <View style={styles.header}>
                        <Link href="/home" style={styles.backLink}>
                          <Back width={20} height={20} />
                        </Link>
                        <View style={styles.headerTitle}>
                          <Plane width={25} height={25} />
                          <AppText variant="body" style={styles.headerLabel}>
                            Create trip
                          </AppText>
                        </View>
                      </View>

                      <AppText variant="title" style={styles.titleStep1}>
                        Where is your trip taking place?
                      </AppText>

                      <View style={[styles.fieldGroup, { marginTop: 20 }]}>
                        <View style={styles.fieldLabelRow}>
                          <Location width={20} height={20} />
                          <AppText variant="body" style={styles.fieldLabel}>
                            Destination
                          </AppText>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter city or country"
                            placeholderTextColor={colors.textMuted}
                            value={destination}
                            onChangeText={setDestination}
                        />
                      </View>
                    </ScrollView>
                  </KeyboardAvoidingView>

                  <View style={[styles.fieldGroup, { marginTop: 20 }]}>
                    <View style={styles.fieldLabelRow}>
                      <Location width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>
                        Destination
                      </AppText>
                    </View>

                    <AppInput
                      placeholder="Enter city or country"
                      value={destination}
                      onChangeText={setDestination}
                      accessibilityLabel="Destination"
                      accessibilityHint="Enter the city or country for the trip"
                    />
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>

              <View style={styles.continueWrapper} pointerEvents="box-none">
                <AppButton
                  title="Continue"
                  onPress={() => setStep(2)}
                  disabled={!destination.trim()}
                  style={styles.continueButton}
                  textStyle={styles.continueButtonText}
                  accessibilityLabel="Continue to next step"
                  accessibilityHint="Moves to trip name and date step"
                />
              </View>

              <View
                style={styles.cityScapeWrapper}
                pointerEvents="none"
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                <CityScape
                  width={SCREEN_WIDTH}
                  height={SCREEN_WIDTH * (221 / 393)}
                />
              </View>
            </>
          ) : (
            <>
              <View
                style={styles.curlyWrapper}
                pointerEvents="none"
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                <CurlyYellow width={448} height={442} />
              </View>

              <KeyboardAvoidingView
                style={styles.scroll}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
              >
                <ScrollView
                  contentContainerStyle={styles.containerStep2}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.header}>
                    <Pressable
                      onPress={() => setStep(1)}
                      style={styles.backLink}
                      accessibilityRole="button"
                      accessibilityLabel="Go back to previous step"
                    >
                      <Back width={20} height={20} />
                    </Pressable>

                    <View style={styles.headerTitle}>
                      <Plane width={25} height={25} />
                      <AppText variant="body" style={styles.headerLabel}>
                        Create trip
                      </AppText>
                    </Pressable>
                  </View>

                  <AppText variant="title" style={styles.titleStep2}>
                    Give your trip a name and choose a date
                  </AppText>

                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <TripTitle width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>
                        Trip name
                      </AppText>
                    </View>

                    <AppInput
                      placeholder="Enter trip name"
                      value={tripName}
                      onChangeText={setTripName}
                      accessibilityLabel="Trip name"
                      accessibilityHint="Enter a name for the trip"
                    />
                  </View>
                </>
            ) : (
                <>
                  {/* CurlyYellow behind everything */}
                  <View style={styles.curlyWrapper} pointerEvents="none">
                    <CurlyYellow width={448} height={442} />
                  </View>

                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <Calendar width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>
                        Trip date
                      </AppText>
                    </View>

                    <Pressable
                      style={styles.dateInput}
                      onPress={() => {
                        setShowStartPicker(true);
                        setShowEndPicker(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Select trip dates"
                      accessibilityHint="Opens the date picker"
                    >
                      {/* Header */}
                      <View style={styles.header}>
                        <Pressable
                            onPress={() => setStep(1)}
                            style={styles.backLink}
                        >
                          <Back width={20} height={20} />
                        </Pressable>
                        <View style={styles.headerTitle}>
                          <Plane width={25} height={25} />
                          <AppText variant="body" style={styles.headerLabel}>
                            Create trip
                          </AppText>
                        </View>
                      </View>

                      <AppText variant="title" style={styles.titleStep2}>
                        Give your trip a name and choose a date
                      </AppText>

                      {/* Trip Name */}
                      <View style={styles.fieldGroup}>
                        <View style={styles.fieldLabelRow}>
                          <TripTitle width={20} height={20} />
                          <AppText variant="body" style={styles.fieldLabel}>
                            Trip name
                          </AppText>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter trip name"
                            placeholderTextColor={colors.textMuted}
                            value={tripName}
                            onChangeText={setTripName}
                        />
                      </View>

                      {/* Trip Date */}
                      <View style={styles.fieldGroup}>
                        <View style={styles.fieldLabelRow}>
                          <Calendar width={20} height={20} />
                          <AppText variant="body" style={styles.fieldLabel}>
                            Trip date
                          </AppText>
                        </View>
                        <Pressable
                            style={styles.dateInput}
                            onPress={() => {
                              setShowStartPicker(true);
                              setShowEndPicker(false);
                            }}
                        >
                          <AppText variant="body" style={styles.dateText}>
                            {formatDate(startDate)} – {formatDate(endDate)}
                          </AppText>
                          <Calendar width={20} height={20} />
                        </Pressable>

                        {showStartPicker && (
                            <DateTimePicker
                                value={startDate}
                                mode="date"
                                display={Platform.OS === "ios" ? "spinner" : "default"}
                                onChange={(_: DateTimePickerEvent, date?: Date) => {
                                  setShowStartPicker(false);
                                  if (date) {
                                    setStartDate(date);
                                    if (endDate < date) {
                                      setEndDate(date);
                                    }
                                    setShowEndPicker(true);
                                  }
                                }}
                            />
                        )}

                        {showEndPicker && (
                            <DateTimePicker
                                value={endDate}
                                mode="date"
                                minimumDate={startDate}
                                display={Platform.OS === "ios" ? "spinner" : "default"}
                                onChange={(_: DateTimePickerEvent, date?: Date) => {
                                  setShowEndPicker(false);
                                  if (date) setEndDate(date);
                                }}
                            />
                        )}
                      </View>

                      {/* Add Members */}
                      <View style={styles.fieldGroup}>
                        <View style={styles.membersRow}>
                          <View style={styles.fieldLabelRow}>
                            <ShareLink width={20} height={20} />
                            <AppText variant="body" style={styles.fieldLabel}>
                              Add members to trip
                            </AppText>
                          </View>
                        </View>
                        <AppText variant="caption" style={styles.codeCaption}>
                          Copy this code to share the trip.
                        </AppText>
                        <Pressable style={styles.codeRow} onPress={handleCopyCode}>
                          <AppText variant="body" style={styles.codeText}>
                            {tripCode}
                          </AppText>
                          <View style={styles.copyActionArea}>
                            <AppText variant="caption" style={styles.copiedText}>
                              {copied ? "✓ Copied!" : "Tap to copy"}
                            </AppText>
                            <Copy width={20} height={20} />
                          </View>
                        </Pressable>
                      </View>
                    </ScrollView>
                  </KeyboardAvoidingView>

                  {/* Create trip button */}
                  <View style={styles.createWrapper}>
                    <Pressable
                        style={[
                          styles.createButton,
                          isSubmitting && styles.createButtonDisabled,
                        ]}
                        onPress={handleCreateTrip}
                        disabled={isSubmitting}
                    >
                      <AppText variant="body" style={styles.createButtonText}>
                        {isSubmitting ? "Creating..." : "Create trip"}
                      </AppText>
                    </Pressable>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>

              <View style={styles.createWrapper}>
                <AppButton
                  title="Create trip"
                  onPress={() => {
                    // TODO: submit trip to backend
                  }}
                  disabled={!tripName.trim() || !destination.trim()}
                  style={styles.createButton}
                  textStyle={styles.createButtonText}
                  accessibilityLabel="Create trip"
                  accessibilityHint="Creates the trip with the selected details"
                />
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
    overflow: "hidden",
  },
  bgStep1: {
    backgroundColor: colors.beachYellow,
  },
  bgStep2: {
    backgroundColor: colors.sunsetOrange,
  },
  scroll: {
    flex: 1,
  },
  containerStep1: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: SCREEN_HEIGHT * 0.28,
    gap: spacing.xl,
  },
  containerStep2: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: SCREEN_HEIGHT * 0.18,
    gap: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backLink: {
    position: "absolute",
    left: 0,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    padding: spacing.xs,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerLabel: {
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.textPrimary,
  },
  titleStep1: {
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displayLg,
    color: colors.textPrimary,
    textAlign: "left",
    alignSelf: "stretch",
  },
  titleStep2: {
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displayLg,
    color: colors.textPrimary,
    textAlign: "left",
    alignSelf: "stretch",
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
  },
  dateInput: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.nightBlack,
    minHeight: 48,
  },
  dateText: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textPrimary,
  },
  membersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  codeCaption: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.body,
  },
  codeRow: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
  },
  codeText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    letterSpacing: 3,
  },
  copyActionArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  copiedText: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  continueWrapper: {
    position: "absolute",
    bottom: SCREEN_WIDTH * (221 / 393) + 47,
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
  },
  continueButton: {
    backgroundColor: colors.sunsetOrange,
  },
  continueButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  cityScapeWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (221 / 393),
    zIndex: 5,
  },
  curlyWrapper: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.73,
    left: -100,
    width: 448,
    height: 442,
    zIndex: 0,
    transform: [{ rotate: "10.84deg" }],
  },
  createWrapper: {
    position: "absolute",
    bottom: SCREEN_HEIGHT * 0.08,
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
  },
  createButton: {
    backgroundColor: colors.seaBlue,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
});