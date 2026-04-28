// app/create-trip.tsx
import { useRouter } from "expo-router";
import { useState, useRef } from "react";
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
import { BackLink } from "@/src/components/common/BackLink";
import { colors, spacing, radius, typography } from "@/src/theme";
import Plane from "@/assets/icons/plane.svg";
import CityScape from "@/assets/visuals/city_scape.svg";
import CurlyYellow from "@/assets/visuals/curly-yellow.svg";
import CurlyOrange from "@/assets/visuals/curly-orange.svg";
import Location from "@/assets/icons/location.svg";
import Copy from "@/assets/icons/copy.svg";
import Calendar from "@/assets/icons/calendar.svg";
import TripTitle from "@/assets/icons/trip_title.svg";
import KeyFrame from "@/assets/icons/key_frame.svg";
import ArrowUp from "@/assets/icons/arrow_up.svg";
import ArrowDown from "@/assets/icons/arrow_down.svg";
import Hourglass0 from "@/assets/icons/hourglass_0.svg";
import Hourglass1 from "@/assets/icons/hourglass_1.svg";
import Timepoint from "@/assets/icons/timepoint.svg";
import CheckMark from "@/assets/icons/check_mark.svg";

const PLACEHOLDER_PHASES = [
  {
    id: "planning",
    label: "Planning",
    color: colors.beachYellow,
    active: true,
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: "voting",
    label: "Voting",
    color: colors.sunsetPink,
    active: false,
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: "final",
    label: "Final",
    color: colors.neonGreen,
    active: false,
    startDate: new Date(),
    endDate: new Date(),
  },
];

type FieldKey = "name" | "date" | "destination" | "members";
type PhaseKey = "planning" | "voting" | "final";
type PhaseDates = Record<PhaseKey, { start: Date; end: Date }>;

const [phaseUpdated, setPhaseUpdated] = useState<Record<string, boolean>>({});
const [showPhaseStartPicker, setShowPhaseStartPicker] = useState<PhaseKey | null>(null);
const [showPhaseEndPicker, setShowPhaseEndPicker] = useState<PhaseKey | null>(null);

 const [phaseDates, setPhaseDates] = useState<PhaseDates>({
    planning: {
      start: PLACEHOLDER_PHASES[0].startDate,
      end: PLACEHOLDER_PHASES[0].endDate,
    },
    voting: {
      start: PLACEHOLDER_PHASES[1].startDate,
      end: PLACEHOLDER_PHASES[1].endDate,
    },
    final: {
      start: PLACEHOLDER_PHASES[2].startDate,
      end: PLACEHOLDER_PHASES[2].endDate,
    },
  });

const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const safeTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutRefs.current.push(id);
    return id;
  };

  const togglePhase = (key: PhaseKey) => {
    setOpenPhase((prev) => (prev === key ? null : key));
  };

const [openPhase, setOpenPhase] = useState<PhaseKey | null>(null);

const PHASE_TEXT_COLORS: Record<string, string> = {
  planning: colors.nightBlack,
  voting: colors.nightBlack,
  final: colors.nightBlack,
};

const handleUpdatePhaseDate = (phaseId: PhaseKey) => {
    setPhaseUpdated((prev) => ({ ...prev, [phaseId]: true }));
    safeTimeout(() => {
      setPhaseUpdated((prev) => ({ ...prev, [phaseId]: false }));
      setOpenPhase(null);
    }, 1500);
  };

  function calcDays(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

function dayLabel(days: number) {
  return days === 1 ? "1 day" : `${days} days`;
}

function formatDateDisplay(date: Date) {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function toDateOnlyString(date: Date) {
  return date.toISOString().split("T")[0];
}

export default function CreateTripScreen() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [destination, setDestination] = useState("");
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tripCode, setTripCode] = useState("");
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

      const result = await createTrip({
        idToken,
        title: tripName.trim(),
        destination: destination.trim(),
        start_date: toDateOnlyString(startDate),
        end_date: toDateOnlyString(endDate),
      });

      console.log("API result:", result);

      setTripCode(result.invite_code ?? "");
      setStep(3);
    } catch (error) {
      console.error("Error creating trip:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create trip";
      Alert.alert("Create trip failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Step 3 — Trip Timer Setup ───────────────────────────────────────────
  if (step === 3) {
    return (
  <View style={[styles.fullScreen, styles.bgStep3]}>
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={[styles.root, styles.bgStep3]}>

      <ScrollView
              contentContainerStyle={styles.containerStep3}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.header}>
                <View style={styles.headerTitle}>
                  <Plane width={25} height={25} />
                  <AppText variant="body" style={styles.headerLabel}>
                    Create trip
                  </AppText>
                </View>
              </View>

              <AppText variant="title" style={styles.titleStep3}>
                Setup the timers
              </AppText>
              <AppText variant="body" style={styles.setupText}>
                Set an end time for each state so the next one starts automatically.
              </AppText>


              {/* Phases — placeholder until wired up */}
            {PLACEHOLDER_PHASES.map((phase) => {
              const phaseId = phase.id as PhaseKey;
              const isOpen = openPhase === phaseId;
              const dates = phaseDates[phaseId];
              const days = calcDays(dates.start, dates.end);

              return (
                <View key={phaseId} style={styles.fieldGroup}>
                  <Pressable
                    style={styles.phaseRow}
                    onPress={() => togglePhase(phaseId)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${phase.label} phase`}
                    accessibilityState={{ expanded: isOpen }}
                  >
                    <View style={styles.phaseLeft}>
                      <View style={[styles.phaseBadge, { backgroundColor: phase.color }]}>
                        <AppText
                          variant="caption"
                          style={[styles.phaseBadgeText, { color: PHASE_TEXT_COLORS[phase.id] }]}
                        >
                          {phase.label}
                        </AppText>
                      </View>

                      <View style={styles.phaseTimerRow}>
                        {phase.active ? (
                          <Hourglass1 width={20} height={20} />
                        ) : (
                          <Hourglass0 width={20} height={20} />
                        )}
                        <AppText variant="body" style={styles.phaseDays}>
                          {dayLabel(days)}
                        </AppText>
                        {phase.active && <Timepoint width={8} height={8} />}
                      </View>
                    </View>

                    {isOpen ? (
                      <ArrowUp width={20} height={20} />
                    ) : (
                      <ArrowDown width={20} height={20} />
                    )}
                  </Pressable>

                  <AppText variant="caption" style={styles.phaseDateLabel}>
                    {formatDateDisplay(dates.start)}
                    {dates.start.getTime() !== dates.end.getTime()
                      ? ` - ${formatDateDisplay(dates.end)}`
                      : ""}
                  </AppText>

                  {isOpen && (
                    <View style={styles.expandedField}>
                      <Pressable
                        style={styles.dateInput}
                        onPress={() => {
                          setShowPhaseStartPicker(phaseId);
                          setShowPhaseEndPicker(null);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${phase.label} phase dates`}
                      >
                        <AppText variant="body" style={styles.dateText}>
                          {formatDateDisplay(dates.start)} – {formatDateDisplay(dates.end)}
                        </AppText>
                        <Calendar width={20} height={20} />
                      </Pressable>

                      {showPhaseStartPicker === phaseId && (
                        <DateTimePicker
                          value={dates.start}
                          mode="date"
                          display={Platform.OS === "ios" ? "spinner" : "default"}
                          onChange={(_: DateTimePickerEvent, date?: Date) => {
                            setShowPhaseStartPicker(null);
                            if (date) {
                              setPhaseDates((prev) => ({
                                ...prev,
                                [phaseId]: { ...prev[phaseId], start: date },
                              }));
                              setShowPhaseEndPicker(phaseId);
                            }
                          }}
                        />
                      )}

                      {showPhaseEndPicker === phaseId && (
                        <DateTimePicker
                          value={dates.end}
                          mode="date"
                          minimumDate={dates.start}
                          display={Platform.OS === "ios" ? "spinner" : "default"}
                          onChange={(_: DateTimePickerEvent, date?: Date) => {
                            setShowPhaseEndPicker(null);
                            if (date) {
                              setPhaseDates((prev) => ({
                                ...prev,
                                [phaseId]: { ...prev[phaseId], end: date },
                              }));
                            }
                          }}
                        />
                      )}

                      <AppButton
                        title="Update"
                        onPress={() => handleUpdatePhaseDate(phaseId)}
                        style={styles.updateButton}
                        textStyle={styles.updateButtonText}
                        accessibilityLabel={`Update ${phase.label} phase dates`}
                      />

                      {phaseUpdated[phaseId] && (
                        <View style={styles.successRow}>
                          <CheckMark width={18} height={18} />
                          <AppText variant="caption" style={styles.successText} accessibilityRole="alert">
                            Timer is updated!
                          </AppText>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

      </ScrollView>

      </View>
    </SafeAreaView>
  </View>
  )
}
  // ─── Step 4 — Trip code screen ───────────────────────────────────────────
  if (step === 4) {
    return (
      <View style={[styles.fullScreen, styles.bgStep1]}>
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <View style={[styles.root, styles.bgStep1]}>

            <View
              style={styles.curlyOrangeWrapper}
              pointerEvents="none"
              {...(Platform.OS !== "web" ? { accessible: false } : {})}
            >
              <CurlyOrange width={SCREEN_WIDTH * 1.1} height={SCREEN_WIDTH * 1.1} />
            </View>

            <ScrollView
              contentContainerStyle={styles.containerStep3}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.header}>
                <View style={styles.headerTitle}>
                  <Plane width={25} height={25} />
                  <AppText variant="body" style={styles.headerLabel}>
                    Create trip
                  </AppText>
                </View>
              </View>

              <AppText variant="title" style={styles.titleStep3}>
                Add members to the trip
              </AppText>

              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <KeyFrame width={20} height={20} />
                  <AppText variant="body" style={styles.fieldLabel}>
                    Code
                  </AppText>
                </View>

                <Pressable style={styles.codeInput} onPress={handleCopyCode}>
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

                <AppText variant="caption" style={styles.codeCaption}>
                  Copy this code to share the trip.
                </AppText>
              </View>
            </ScrollView>

            <View style={styles.continueWrapper} pointerEvents="box-none">
              <AppButton
                title="Back to Landing Page"
                onPress={() => router.replace("/home")}
                style={styles.backToLandingButton}
                textStyle={styles.backToLandingText}
                accessibilityLabel="Back to landing page"
                accessibilityHint="Goes back to the home screen"
              />
            </View>

          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Step 1 & 2 ──────────────────────────────────────────────────────────
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
                  <View style={styles.header}>
                    <BackLink href="/home" />
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

                    <AppInput
                      placeholder="Enter city or country"
                      value={destination}
                      onChangeText={setDestination}
                      accessibilityLabel="Destination"
                      accessibilityHint="Enter the city or country for the trip"
                      style={styles.inputBlackStroke}
                    />
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>

              <View style={styles.continueWrapper} pointerEvents="box-none">
                <AppButton
                  title="Continue"
                  onPress={handleContinue}
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
                {...(Platform.OS !== "web" ? { accessible: false } : {})}
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
                {...(Platform.OS !== "web" ? { accessible: false } : {})}
              >
                <CurlyYellow width={SCREEN_WIDTH * 1.1} height={SCREEN_WIDTH * 1.1} />
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
                    <BackLink onPress={() => setStep(1)} />

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
                      style={styles.inputBlackStroke}
                    />
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
                      <AppText variant="body" style={styles.dateText}>
                        {formatDate(startDate)} - {formatDate(endDate)}
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
                            if (endDate < date) setEndDate(date);
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
                </ScrollView>
              </KeyboardAvoidingView>

              <View style={styles.createWrapper}>
                <AppButton
                  title={isSubmitting ? "Creating..." : "Create trip"}
                  onPress={handleCreateTrip}
                  loading={isSubmitting}
                  disabled={isSubmitting || !tripName.trim()}
                  style={styles.createButton}
                  textStyle={styles.createButtonText}
                  accessibilityLabel={isSubmitting ? "Creating trip" : "Create trip"}
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
  bgStep3: {
    backgroundColor: colors.lightWhite,
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
  containerStep3: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: SCREEN_HEIGHT * 0.28,
    gap: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
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
  titleStep3: {
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
  inputBlackStroke: {
    borderWidth: 2,
    borderColor: colors.nightBlack,
  },
  dateInput: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
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
  codeInput: {
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.nightBlack,
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
  codeCaption: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.body,
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
  backToLandingButton: {
    backgroundColor: colors.sunsetOrange,
  },
  backToLandingText: {
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
    bottom: -SCREEN_WIDTH * 0.3,
    left: -SCREEN_WIDTH * 0.1,
    zIndex: 0,
  },
  createWrapper: {
    position: "absolute",
    bottom: SCREEN_WIDTH * (221 / 393) + 47,
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 10,
  },
  createButton: {
    backgroundColor: colors.seaBlue,
  },
  createButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  curlyOrangeWrapper: {
    position: "absolute",
    bottom: -SCREEN_WIDTH * 0.3,
    left: -SCREEN_WIDTH * 0.1,
    zIndex: 0,
  },
  setupText: {
    fontSize: 18,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  phaseLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  phaseBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  phaseBadgeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  phaseTimerBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  hourglassCol: {
    justifyContent: "center",
    alignItems: "center",
  },
  phaseTextCol: {
    flexDirection: "column",
    justifyContent: "center",
  },
  daysRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 3,
  },
  phaseDays: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textPrimary,
  },
  timepointWrapper: {
    marginTop: 1,
  },
  timerLabel: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
  },
  phaseDateLabel: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    paddingLeft: 4,
  },
  phaseEndLabel: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },
  phaseTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  expandedField: {
    gap: spacing.md,
  },
  updateButton: {
    backgroundColor: colors.beachYellow,
  },
  updateButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  successText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
});