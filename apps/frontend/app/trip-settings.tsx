// app/trip-settings.tsx
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AppText } from '@/src/components/common/AppText';
import { colors, spacing, radius, typography } from '@/src/theme';
import Back from '@/assets/icons/back.svg';
import Plane from '@/assets/icons/plane.svg';
import TripTitle from '@/assets/icons/trip_title.svg';
import Calendar from '@/assets/icons/calendar.svg';
import Location from '@/assets/icons/location.svg';
import AddPeople from '@/assets/icons/add_people.svg';
import RemovePerson from '@/assets/icons/remove_person.svg';
import ArrowRight from '@/assets/icons/arrow_right.svg';
import ArrowDown from '@/assets/icons/arrow_down.svg';
import Hourglass0 from '@/assets/icons/hourglass_0.svg';
import Hourglass1 from '@/assets/icons/hourglass_1.svg';
import Timepoint from '@/assets/icons/timepoint.svg';
import CheckMark from '@/assets/icons/check_mark.svg';

// TODO: replace with real trip data from backend
const TRIP = {
  name: 'Japan Spring',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-03-15'),
  destination: 'Tokyo, Japan',
  members: ['Sophie', 'Lukas', 'Franz'],
  phases: [
    {
      id: 'planning',
      label: 'Planning',
      color: colors.beachYellow,
      textColor: colors.nightBlack,
      active: true,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-15'),
    },
    {
      id: 'voting',
      label: 'Voting',
      color: colors.sunsetPink,
      textColor: colors.white,
      active: false,
      startDate: new Date('2026-03-16'),
      endDate: new Date('2026-03-18'),
    },
    {
      id: 'final',
      label: 'Final',
      color: colors.neonGreen,
      textColor: colors.nightBlack,
      active: false,
      startDate: new Date('2026-03-20'),
      endDate: new Date('2026-03-20'),
    },
  ],
};

type FieldKey = 'name' | 'date' | 'destination' | 'members';
type PhaseKey = 'planning' | 'voting' | 'final';

function formatDateDisplay(date: Date) {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function calcDays(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

function dayLabel(days: number) {
  return days === 1 ? '1 day' : `${days} days`;
}

export default function TripSettingsScreen() {
  const [openField, setOpenField] = useState<FieldKey | null>(null);
  const [openPhase, setOpenPhase] = useState<PhaseKey | null>(null);

  // Trip name
  const [tripName, setTripName] = useState(TRIP.name);
  const [tripNameInput, setTripNameInput] = useState(TRIP.name);
  const [tripNameUpdated, setTripNameUpdated] = useState(false);

  // Trip date
  const [tripStart, setTripStart] = useState(TRIP.startDate);
  const [tripEnd, setTripEnd] = useState(TRIP.endDate);
  const [tripDateUpdated, setTripDateUpdated] = useState(false);
  const [showTripStartPicker, setShowTripStartPicker] = useState(false);
  const [showTripEndPicker, setShowTripEndPicker] = useState(false);

  // Destination
  const [destination, setDestination] = useState(TRIP.destination);
  const [destinationInput, setDestinationInput] = useState(TRIP.destination);
  const [destinationUpdated, setDestinationUpdated] = useState(false);

  // Members
  const [members, setMembers] = useState(TRIP.members);
  const [newMember, setNewMember] = useState('');
  const [membersUpdated, setMembersUpdated] = useState(false);

  // Phase dates
  const [phaseDates, setPhaseDates] = useState(
    Object.fromEntries(TRIP.phases.map((p) => [p.id, { start: p.startDate, end: p.endDate }]))
  );
  const [phaseUpdated, setPhaseUpdated] = useState<Record<string, boolean>>({});
  const [showPhaseStartPicker, setShowPhaseStartPicker] = useState<string | null>(null);
  const [showPhaseEndPicker, setShowPhaseEndPicker] = useState<string | null>(null);

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
    // TODO: call API
    setTimeout(() => {
      setTripNameUpdated(false);
      setOpenField(null);
    }, 1500);
  };

  const handleUpdateDestination = () => {
    setDestination(destinationInput);
    setDestinationUpdated(true);
    // TODO: call API
    setTimeout(() => {
      setDestinationUpdated(false);
      setOpenField(null);
    }, 1500);
  };

  const handleUpdateTripDate = () => {
    setTripDateUpdated(true);
    // TODO: call API
    setTimeout(() => {
      setTripDateUpdated(false);
      setOpenField(null);
    }, 1500);
  };

  const handleAddMember = () => {
    if (newMember.trim()) {
      setMembers((prev) => [...prev, newMember.trim()]);
      setNewMember('');
      setMembersUpdated(true);
      // TODO: call API
      setTimeout(() => setMembersUpdated(false), 1500);
    }
  };

  const handleRemoveMember = (name: string) => {
    Alert.alert(
      'Remove member',
      `Are you sure you want to remove ${name} from the trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setMembers((prev) => prev.filter((m) => m !== name));
            // TODO: call API
          },
        },
      ]
    );
  };

  const handleUpdatePhaseDate = (phaseId: string) => {
    setPhaseUpdated((prev) => ({ ...prev, [phaseId]: true }));
    // TODO: call API
    setTimeout(() => {
      setPhaseUpdated((prev) => ({ ...prev, [phaseId]: false }));
      setOpenPhase(null);
    }, 1500);
  };

  return (
    <View style={styles.fullScreen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Link href="/settings" style={styles.backLink}>
              <Back width={20} height={20} />
            </Link>
            <View style={styles.headerTitle}>
              <Plane width={22} height={22} />
              <AppText variant="body" style={styles.headerLabel}>Trip settings</AppText>
            </View>
          </View>

          {/* ── Trip name ── */}
          <View style={styles.fieldGroup}>
            <Pressable style={styles.infoRow} onPress={() => toggleField('name')}>
              <View style={styles.infoLeft}>
                <View style={styles.infoLabelRow}>
                  <TripTitle width={20} height={20} />
                  <AppText variant="body" style={styles.fieldLabel}>Trip name</AppText>
                </View>
                <AppText variant="caption" style={styles.infoValue}>{tripName}</AppText>
              </View>
              {openField === 'name'
                ? <ArrowDown width={20} height={20} />
                : <ArrowRight width={20} height={20} />}
            </Pressable>
            {openField === 'name' && (
              <View style={styles.expandedField}>
                <TextInput
                  style={styles.input}
                  value={tripNameInput}
                  onChangeText={(t) => { setTripNameInput(t); setTripNameUpdated(false); }}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <Pressable style={styles.updateButton} onPress={handleUpdateName}>
                  <AppText variant="body" style={styles.updateButtonText}>Update</AppText>
                </Pressable>
                {tripNameUpdated && (
                  <View style={styles.successRow}>
                    <CheckMark width={18} height={18} />
                    <AppText variant="caption" style={styles.successText}>Name is updated!</AppText>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Trip date ── */}
          <View style={styles.fieldGroup}>
            <Pressable style={styles.infoRow} onPress={() => toggleField('date')}>
              <View style={styles.infoLeft}>
                <View style={styles.infoLabelRow}>
                  <Calendar width={20} height={20} />
                  <AppText variant="body" style={styles.fieldLabel}>Trip date</AppText>
                </View>
                <AppText variant="caption" style={styles.infoValue}>
                  {formatDateDisplay(tripStart)} - {formatDateDisplay(tripEnd)}
                </AppText>
              </View>
              {openField === 'date'
                ? <ArrowDown width={20} height={20} />
                : <ArrowRight width={20} height={20} />}
            </Pressable>
            {openField === 'date' && (
              <View style={styles.expandedField}>
                <Pressable
                  style={styles.dateInput}
                  onPress={() => { setShowTripStartPicker(true); setShowTripEndPicker(false); }}
                >
                  <AppText variant="body" style={styles.dateText}>
                    {formatDateDisplay(tripStart)} - {formatDateDisplay(tripEnd)}
                  </AppText>
                  <Calendar width={20} height={20} />
                </Pressable>
                {showTripStartPicker && (
                  <DateTimePicker
                    value={tripStart}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_: DateTimePickerEvent, date?: Date) => {
                      setShowTripStartPicker(false);
                      if (date) { setTripStart(date); setShowTripEndPicker(true); }
                    }}
                  />
                )}
                {showTripEndPicker && (
                  <DateTimePicker
                    value={tripEnd}
                    mode="date"
                    minimumDate={tripStart}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_: DateTimePickerEvent, date?: Date) => {
                      setShowTripEndPicker(false);
                      if (date) setTripEnd(date);
                    }}
                  />
                )}
                <Pressable style={styles.updateButton} onPress={handleUpdateTripDate}>
                  <AppText variant="body" style={styles.updateButtonText}>Update</AppText>
                </Pressable>
                {tripDateUpdated && (
                  <View style={styles.successRow}>
                    <CheckMark width={18} height={18} />
                    <AppText variant="caption" style={styles.successText}>Date is updated!</AppText>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Destination ── */}
          <View style={styles.fieldGroup}>
            <Pressable style={styles.infoRow} onPress={() => toggleField('destination')}>
              <View style={styles.infoLeft}>
                <View style={styles.infoLabelRow}>
                  <Location width={20} height={20} />
                  <AppText variant="body" style={styles.fieldLabel}>Destination</AppText>
                </View>
                <AppText variant="caption" style={styles.infoValue}>{destination}</AppText>
              </View>
              {openField === 'destination'
                ? <ArrowDown width={20} height={20} />
                : <ArrowRight width={20} height={20} />}
            </Pressable>
            {openField === 'destination' && (
              <View style={styles.expandedField}>
                <TextInput
                  style={styles.input}
                  value={destinationInput}
                  onChangeText={(t) => { setDestinationInput(t); setDestinationUpdated(false); }}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <Pressable style={styles.updateButton} onPress={handleUpdateDestination}>
                  <AppText variant="body" style={styles.updateButtonText}>Update</AppText>
                </Pressable>
                {destinationUpdated && (
                  <View style={styles.successRow}>
                    <CheckMark width={18} height={18} />
                    <AppText variant="caption" style={styles.successText}>Destination is updated!</AppText>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Members ── */}
          <View style={styles.fieldGroup}>
            <Pressable style={styles.infoRow} onPress={() => toggleField('members')}>
              <View style={styles.infoLeft}>
                <View style={styles.infoLabelRow}>
                  <AddPeople width={20} height={20} />
                  <AppText variant="body" style={styles.fieldLabel}>Members</AppText>
                </View>
                <AppText variant="caption" style={styles.infoValue}>
                  {members.join(', ')}
                </AppText>
              </View>
              {openField === 'members'
                ? <ArrowDown width={20} height={20} />
                : <ArrowRight width={20} height={20} />}
            </Pressable>
            {openField === 'members' && (
              <View style={styles.expandedField}>
                {members.map((member) => (
                  <View key={member} style={styles.memberRow}>
                    <AppText variant="body" style={styles.memberName}>{member}</AppText>
                    <Pressable
                      onPress={() => handleRemoveMember(member)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <RemovePerson width={22} height={22} />
                    </Pressable>
                  </View>
                ))}
                <TextInput
                  style={styles.input}
                  value={newMember}
                  onChangeText={setNewMember}
                  placeholder="Add member name"
                  placeholderTextColor={colors.textMuted}
                />
                <Pressable style={styles.updateButton} onPress={handleAddMember}>
                  <AppText variant="body" style={styles.updateButtonText}>Add member</AppText>
                </Pressable>
                {membersUpdated && (
                  <View style={styles.successRow}>
                    <CheckMark width={18} height={18} />
                    <AppText variant="caption" style={styles.successText}>Member added!</AppText>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Phases ── */}
          {TRIP.phases.map((phase) => {
            const phaseId = phase.id as PhaseKey;
            const isOpen = openPhase === phaseId;
            const dates = phaseDates[phaseId];
            const days = calcDays(dates.start, dates.end);

            return (
              <View key={phaseId} style={styles.fieldGroup}>
                <Pressable style={styles.phaseRow} onPress={() => togglePhase(phaseId)}>
                  <View style={styles.phaseLeft}>
                    <View style={[styles.phaseBadge, { backgroundColor: phase.color }]}>
                      <AppText variant="caption" style={[styles.phaseBadgeText, { color: phase.textColor }]}>
                        {phase.label}
                      </AppText>
                    </View>
                    <View style={styles.phaseTimerRow}>
                      {phase.active
                        ? <Hourglass1 width={20} height={20} />
                        : <Hourglass0 width={20} height={20} />
                      }
                      <AppText variant="body" style={styles.phaseDays}>
                        {dayLabel(days)}
                      </AppText>
                      {phase.active && <Timepoint width={8} height={8} />}
                    </View>
                  </View>
                  {isOpen
                    ? <ArrowDown width={20} height={20} />
                    : <ArrowRight width={20} height={20} />}
                </Pressable>

                <AppText variant="caption" style={styles.phaseDateLabel}>
                  {formatDateDisplay(dates.start)}
                  {dates.start.getTime() !== dates.end.getTime()
                    ? ` - ${formatDateDisplay(dates.end)}`
                    : ''}
                </AppText>

                {isOpen && (
                  <View style={styles.expandedField}>
                    <Pressable
                      style={styles.dateInput}
                      onPress={() => {
                        setShowPhaseStartPicker(phaseId);
                        setShowPhaseEndPicker(null);
                      }}
                    >
                      <AppText variant="body" style={styles.dateText}>
                        {formatDateDisplay(dates.start)} - {formatDateDisplay(dates.end)}
                      </AppText>
                      <Calendar width={20} height={20} />
                    </Pressable>

                    {showPhaseStartPicker === phaseId && (
                      <DateTimePicker
                        value={dates.start}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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

                    <Pressable
                      style={styles.updateButton}
                      onPress={() => handleUpdatePhaseDate(phaseId)}
                    >
                      <AppText variant="body" style={styles.updateButtonText}>Update</AppText>
                    </Pressable>

                    {phaseUpdated[phaseId] && (
                      <View style={styles.successRow}>
                        <CheckMark width={18} height={18} />
                        <AppText variant="caption" style={styles.successText}>Timer is updated!</AppText>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
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
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backLink: {
    position: 'absolute',
    left: 0,
    padding: spacing.xs,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerLabel: {
    fontSize: 25,
    fontFamily: 'Nunito_700Bold',
    color: colors.textPrimary,
  },

  // Field groups
  fieldGroup: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLeft: {
    gap: spacing.xs,
    flex: 1,
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fieldLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: colors.textPrimary,
  },
  infoValue: {
    color: colors.textMuted,
    fontSize: 14,
    paddingLeft: 28,
  },

  // Expanded editor
  expandedField: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.size.md,
    fontFamily: typography.fontFamily.body,
    color: colors.textPrimary,
    borderWidth: 2,
    borderColor: colors.nightBlack,
  },
  dateInput: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.nightBlack,
  },
  dateText: {
    fontSize: typography.size.md,
    color: colors.textPrimary,
  },

  // Update button
  updateButton: {
    backgroundColor: colors.beachYellow,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  updateButtonText: {
    color: colors.nightBlack,
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
  },

  // Success
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  successText: {
    color: colors.textPrimary,
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
  },

  // Members
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.sunsetOrange,
  },
  memberName: {
    fontSize: 16,
    color: colors.textPrimary,
  },

  // Phase rows
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phaseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  phaseBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  phaseBadgeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
  },
  phaseTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  phaseDays: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  phaseDateLabel: {
    color: colors.textMuted,
    fontSize: 14,
    paddingLeft: 4,
  },
});