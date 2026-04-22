// app/trip-settings.tsx
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { AppText } from "@/src/components/common/AppText";
import { AppInput } from "@/src/components/common/AppInput";
import { AppButton } from "@/src/components/common/AppButton";
import { ActionCard, ACTION_CARD_HEIGHT } from "@/src/components/common/ActionCard";
import { BackLink } from "@/src/components/common/BackLink";
import { colors, spacing, radius, typography } from "@/src/theme";
import Edit from "@/assets/icons/edit.svg";
import TripTitle from "@/assets/icons/trip_title.svg";
import Calendar from "@/assets/icons/calendar.svg";
import Location from "@/assets/icons/location.svg";
import AddPeople from "@/assets/icons/add_people.svg";
import RemovePerson from "@/assets/icons/remove_person.svg";
import ArrowUp from "@/assets/icons/arrow_up.svg";
import ArrowDown from "@/assets/icons/arrow_down.svg";
import Hourglass0 from "@/assets/icons/hourglass_0.svg";
import Hourglass1 from "@/assets/icons/hourglass_1.svg";
import Timepoint from "@/assets/icons/timepoint.svg";
import CheckMark from "@/assets/icons/check_mark.svg";
import Trash from "@/assets/icons/trash.svg";

const TRIP = {
  name: "Japan Spring",
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-03-15"),
  destination: "Tokyo, Japan",
  members: ["Sophie", "Lukas", "Franz"],
  phases: [
    {
      id: "planning",
      label: "Planning",
      color: colors.beachYellow,
      active: true,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-03-15"),
    },
    {
      id: "voting",
      label: "Voting",
      color: colors.sunsetPink,
      active: false,
      startDate: new Date("2026-03-16"),
      endDate: new Date("2026-03-18"),
    },
    {
      id: "final",
      label: "Final",
      color: colors.neonGreen,
      active: false,
      startDate: new Date("2026-03-20"),
      endDate: new Date("2026-03-20"),
    },
  ],
};

const PHASE_TEXT_COLORS: Record<string, string> = {
  planning: colors.nightBlack,
  voting: colors.nightBlack,
  final: colors.nightBlack,
};

type FieldKey = "name" | "date" | "destination" | "members";
type PhaseKey = "planning" | "voting" | "final";

type PhaseDates = Record<PhaseKey, { start: Date; end: Date }>;

function formatDateDisplay(date: Date) {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function calcDays(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

function dayLabel(days: number) {
  return days === 1 ? "1 day" : `${days} days`;
}

export default function TripSettingsScreen() {
  const { height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;

  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const [openPhase, setOpenPhase] = useState<PhaseKey | null>(null);

  const [tripName, setTripName] = useState(TRIP.name);
  const [tripNameInput, setTripNameInput] = useState(TRIP.name);
  const [tripNameUpdated, setTripNameUpdated] = useState(false);

  const [tripStart, setTripStart] = useState(TRIP.startDate);
  const [tripEnd, setTripEnd] = useState(TRIP.endDate);
  const [tripDateUpdated, setTripDateUpdated] = useState(false);
  const [showTripStartPicker, setShowTripStartPicker] = useState(false);
  const [showTripEndPicker, setShowTripEndPicker] = useState(false);

  const [destination, setDestination] = useState(TRIP.destination);
  const [destinationInput, setDestinationInput] = useState(TRIP.destination);
  const [destinationUpdated, setDestinationUpdated] = useState(false);

  const [members, setMembers] = useState(TRIP.members);
  const [newMember, setNewMember] = useState("");
  const [membersUpdated, setMembersUpdated] = useState(false);

  const [phaseDates, setPhaseDates] = useState<PhaseDates>({
    planning: { start: TRIP.phases[0].startDate, end: TRIP.phases[0].endDate },
    voting: { start: TRIP.phases[1].startDate, end: TRIP.phases[1].endDate },
    final: { start: TRIP.phases[2].startDate, end: TRIP.phases[2].endDate },
  });

  const [phaseUpdated, setPhaseUpdated] = useState<Record<string, boolean>>({});
  const [showPhaseStartPicker, setShowPhaseStartPicker] = useState<PhaseKey | null>(null);
  const [showPhaseEndPicker, setShowPhaseEndPicker] = useState<PhaseKey | null>(null);

  const toggleField = (key: FieldKey) => {
    setOpenField((prev) => (prev === key ? null : key));
    setTripNameUpdated(false);
    setTripDateUpdated(false);
    setDestinationUpdated(false);
    setMembersUpdated(false);
  };

  const togglePhase = (key: PhaseKey) => {
    setOpenPhase((prev) => (prev === key ? null : key));
  };

  const handleUpdateName = () => {
    setTripName(tripNameInput);
    setTripNameUpdated(true);
    setTimeout(() => {
      setTripNameUpdated(false);
      setOpenField(null);
    }, 1500);
  };

  const handleUpdateDestination = () => {
    setDestination(destinationInput);
    setDestinationUpdated(true);
    setTimeout(() => {
      setDestinationUpdated(false);
      setOpenField(null);
    }, 1500);
  };

  const handleUpdateTripDate = () => {
    setTripDateUpdated(true);
    setTimeout(() => {
      setTripDateUpdated(false);
      setOpenField(null);
    }, 1500);
  };

  const handleAddMember = () => {
    const trimmed = newMember.trim();
    if (!trimmed) return;
    setMembers((prev) => [...prev, trimmed]);
    setNewMember("");
    setMembersUpdated(true);
    setTimeout(() => {
      setMembersUpdated(false);
    }, 1500);
  };

  const handleRemoveMember = (name: string) => {
    Alert.alert("Remove member", `Are you sure you want to remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setMembers((prev) => prev.filter((m) => m !== name));
        },
      },
    ]);
  };

  const handleUpdatePhaseDate = (phaseId: PhaseKey) => {
    setPhaseUpdated((prev) => ({ ...prev, [phaseId]: true }));
    setTimeout(() => {
      setPhaseUpdated((prev) => ({ ...prev, [phaseId]: false }));
      setOpenPhase(null);
    }, 1500);
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      "Delete trip",
      "Are you sure you want to delete this trip? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // TODO: call delete trip API then navigate away
          },
        },
      ]
    );
  };

  return (
    <View style={styles.fullScreen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.container,
              {
                paddingBottom:
                  ACTION_CARD_HEIGHT +
                  (isSmallScreen ? spacing.lg : spacing.xxxl),
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <BackLink href="/home" />

              <View style={styles.headerTitle}>
                <Edit width={22} height={22} />
                <AppText variant="body" style={styles.headerLabel}>
                  Trip settings
                </AppText>
              </View>
            </View>

            {/* Trip Name */}
            <View style={styles.fieldGroup}>
              <Pressable
                style={styles.infoRow}
                onPress={() => toggleField("name")}
                accessibilityRole="button"
                accessibilityLabel="Edit trip name"
                accessibilityState={{ expanded: openField === "name" }}
              >
                <View style={styles.infoLeft}>
                  <View style={styles.infoLabelRow}>
                    <TripTitle width={20} height={20} />
                    <AppText variant="body" style={styles.fieldLabel}>
                      Trip name
                    </AppText>
                  </View>
                  <AppText variant="caption" style={styles.infoValue}>
                    {tripName}
                  </AppText>
                </View>
                {openField === "name" ? (
                  <ArrowUp width={20} height={20} />
                ) : (
                  <ArrowDown width={20} height={20} />
                )}
              </Pressable>

              {openField === "name" && (
                <View style={styles.expandedField}>
                  <AppInput
                    value={tripNameInput}
                    onChangeText={(t) => {
                      setTripNameInput(t);
                      setTripNameUpdated(false);
                    }}
                    placeholder="Enter trip name"
                    autoFocus
                    accessibilityLabel="Trip name"
                    style={styles.inputBlackStroke}
                  />
                  <AppButton
                    title="Update"
                    onPress={handleUpdateName}
                    disabled={!tripNameInput.trim()}
                    style={styles.updateButton}
                    textStyle={styles.updateButtonText}
                    accessibilityLabel="Update trip name"
                  />
                  {tripNameUpdated && (
                    <View style={styles.successRow}>
                      <CheckMark width={18} height={18} />
                      <AppText variant="caption" style={styles.successText} accessibilityRole="alert">
                        Name is updated!
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Trip Date */}
            <View style={styles.fieldGroup}>
              <Pressable
                style={styles.infoRow}
                onPress={() => toggleField("date")}
                accessibilityRole="button"
                accessibilityLabel="Edit trip dates"
                accessibilityState={{ expanded: openField === "date" }}
              >
                <View style={styles.infoLeft}>
                  <View style={styles.infoLabelRow}>
                    <Calendar width={20} height={20} />
                    <AppText variant="body" style={styles.fieldLabel}>
                      Trip date
                    </AppText>
                  </View>
                  <AppText variant="caption" style={styles.infoValue}>
                    {formatDateDisplay(tripStart)} – {formatDateDisplay(tripEnd)}
                  </AppText>
                </View>
                {openField === "date" ? (
                  <ArrowUp width={20} height={20} />
                ) : (
                  <ArrowDown width={20} height={20} />
                )}
              </Pressable>

              {openField === "date" && (
                <View style={styles.expandedField}>
                  <Pressable
                    style={styles.dateInput}
                    onPress={() => {
                      setShowTripStartPicker(true);
                      setShowTripEndPicker(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Select trip dates"
                  >
                    <AppText variant="body" style={styles.dateText}>
                      {formatDateDisplay(tripStart)} – {formatDateDisplay(tripEnd)}
                    </AppText>
                    <Calendar width={20} height={20} />
                  </Pressable>

                  {showTripStartPicker && (
                    <DateTimePicker
                      value={tripStart}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(_: DateTimePickerEvent, date?: Date) => {
                        setShowTripStartPicker(false);
                        if (date) {
                          setTripStart(date);
                          setShowTripEndPicker(true);
                        }
                      }}
                    />
                  )}

                  {showTripEndPicker && (
                    <DateTimePicker
                      value={tripEnd}
                      mode="date"
                      minimumDate={tripStart}
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(_: DateTimePickerEvent, date?: Date) => {
                        setShowTripEndPicker(false);
                        if (date) setTripEnd(date);
                      }}
                    />
                  )}

                  <AppButton
                    title="Update"
                    onPress={handleUpdateTripDate}
                    style={styles.updateButton}
                    textStyle={styles.updateButtonText}
                    accessibilityLabel="Update trip dates"
                  />
                  {tripDateUpdated && (
                    <View style={styles.successRow}>
                      <CheckMark width={18} height={18} />
                      <AppText variant="caption" style={styles.successText} accessibilityRole="alert">
                        Date is updated!
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Destination */}
            <View style={styles.fieldGroup}>
              <Pressable
                style={styles.infoRow}
                onPress={() => toggleField("destination")}
                accessibilityRole="button"
                accessibilityLabel="Edit destination"
                accessibilityState={{ expanded: openField === "destination" }}
              >
                <View style={styles.infoLeft}>
                  <View style={styles.infoLabelRow}>
                    <Location width={20} height={20} />
                    <AppText variant="body" style={styles.fieldLabel}>
                      Destination
                    </AppText>
                  </View>
                  <AppText variant="caption" style={styles.infoValue}>
                    {destination}
                  </AppText>
                </View>
                {openField === "destination" ? (
                  <ArrowUp width={20} height={20} />
                ) : (
                  <ArrowDown width={20} height={20} />
                )}
              </Pressable>

              {openField === "destination" && (
                <View style={styles.expandedField}>
                  <AppInput
                    value={destinationInput}
                    onChangeText={(t) => {
                      setDestinationInput(t);
                      setDestinationUpdated(false);
                    }}
                    placeholder="Enter destination"
                    autoFocus
                    accessibilityLabel="Destination"
                    style={styles.inputBlackStroke}
                  />
                  <AppButton
                    title="Update"
                    onPress={handleUpdateDestination}
                    disabled={!destinationInput.trim()}
                    style={styles.updateButton}
                    textStyle={styles.updateButtonText}
                    accessibilityLabel="Update destination"
                  />
                  {destinationUpdated && (
                    <View style={styles.successRow}>
                      <CheckMark width={18} height={18} />
                      <AppText variant="caption" style={styles.successText} accessibilityRole="alert">
                        Destination is updated!
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Members */}
            <View style={styles.fieldGroup}>
              <Pressable
                style={styles.infoRow}
                onPress={() => toggleField("members")}
                accessibilityRole="button"
                accessibilityLabel="Edit members"
                accessibilityState={{ expanded: openField === "members" }}
              >
                <View style={styles.infoLeft}>
                  <View style={styles.infoLabelRow}>
                    <AddPeople width={20} height={20} />
                    <AppText variant="body" style={styles.fieldLabel}>
                      Members
                    </AppText>
                  </View>
                  <AppText variant="caption" style={styles.infoValue}>
                    {members.join(", ")}
                  </AppText>
                </View>
                {openField === "members" ? (
                  <ArrowUp width={20} height={20} />
                ) : (
                  <ArrowDown width={20} height={20} />
                )}
              </Pressable>

              {openField === "members" && (
                <View style={styles.expandedField}>
                  {members.map((member) => (
                    <View key={member} style={styles.memberRow}>
                      <AppText variant="body" style={styles.memberName}>
                        {member}
                      </AppText>
                      <Pressable
                        onPress={() => handleRemoveMember(member)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${member}`}
                      >
                        <RemovePerson width={22} height={22} />
                      </Pressable>
                    </View>
                  ))}
                  <AppInput
                    value={newMember}
                    onChangeText={setNewMember}
                    placeholder="Add member name"
                    accessibilityLabel="New member name"
                    style={styles.inputBlackStroke}
                  />
                  <AppButton
                    title="Add member"
                    onPress={handleAddMember}
                    disabled={!newMember.trim()}
                    style={styles.updateButton}
                    textStyle={styles.updateButtonText}
                    accessibilityLabel="Add member"
                  />
                  {membersUpdated && (
                    <View style={styles.successRow}>
                      <CheckMark width={18} height={18} />
                      <AppText variant="caption" style={styles.successText} accessibilityRole="alert">
                        Member added!
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Phases */}
            {TRIP.phases.map((phase) => {
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

          {/* Delete trip */}
          <SafeAreaView edges={["bottom"]} style={styles.deleteSafeArea}>
            <View style={styles.deleteWrapper}>
              <ActionCard
                label="Delete trip"
                icon={<Trash width={20} height={20} />}
                onPress={handleDeleteTrip}
                accessibilityHint="Permanently deletes this trip"
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.lightWhite,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
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
  fieldGroup: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  infoLeft: {
    gap: spacing.xs,
    flex: 1,
  },
  infoLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.textPrimary,
  },
  infoValue: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    paddingLeft: 28,
  },
  expandedField: {
    gap: spacing.md,
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
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.sunsetOrange,
  },
  memberName: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textPrimary,
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
    borderRadius: radius.pill,
  },
  phaseBadgeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  phaseTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  phaseDays: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textPrimary,
  },
  phaseDateLabel: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    paddingLeft: 4,
  },
  deleteSafeArea: {
    backgroundColor: colors.lightWhite,
  },
  deleteWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});