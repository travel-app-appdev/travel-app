// app/create-trip.tsx
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { AppText } from '@/src/components/common/AppText';
import { colors, spacing, radius, typography } from '@/src/theme';
import Back from '@/assets/icons/back.svg';
import Plane from '@/assets/icons/plane.svg';
import CityScape from '@/assets/icons/city_scape.svg';
import CurlyYellow from '@/assets/visuals/curly-yellow.svg';
import Location from '@/assets/icons/location.svg';
import Copy from '@/assets/icons/copy.svg';
import ShareLink from '@/assets/icons/share_link.svg';
import Calendar from '@/assets/icons/calendar.svg';
import TripTitle from '@/assets/icons/trip_title.svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function generateTripCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CreateTripScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const [destination, setDestination] = useState('');
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tripCode] = useState(generateTripCode());
  const [copied, setCopied] = useState(false);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-GB').replace(/\//g, '.');

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(tripCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.fullScreen, step === 1 ? styles.bgStep1 : styles.bgStep2]}>
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'left', 'right']}
      >
        <View style={[styles.root, step === 1 ? styles.bgStep1 : styles.bgStep2]}>
          {step === 1 ? (
            <>
              <KeyboardAvoidingView
                style={styles.scroll}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                      <AppText variant="body" style={styles.headerLabel}>Create trip</AppText>
                    </View>
                  </View>

                  <AppText variant="title" style={styles.titleStep1}>
                    Where is your trip taking place?
                  </AppText>

                  <View style={[styles.fieldGroup, { marginTop: 20 }]}>
                    <View style={styles.fieldLabelRow}>
                      <Location width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>Destination</AppText>
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

              {/* Continue button pinned above cityscape */}
              <View style={styles.continueWrapper} pointerEvents="box-none">
                <Pressable
                  style={styles.continueButton}
                  onPress={() => setStep(2)}
                >
                  <AppText variant="body" style={styles.continueButtonText}>Continue</AppText>
                </Pressable>
              </View>

              {/* CityScape pinned to bottom */}
              <View style={styles.cityScapeWrapper} pointerEvents="none">
                <CityScape
                  width={SCREEN_WIDTH}
                  height={SCREEN_WIDTH * (221 / 393)}
                />
              </View>
            </>
          ) : (
            <>
              {/* CurlyYellow behind everything */}
              <View style={styles.curlyWrapper} pointerEvents="none">
                <CurlyYellow width={448} height={442} />
              </View>

              <KeyboardAvoidingView
                style={styles.scroll}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <ScrollView
                  contentContainerStyle={styles.containerStep2}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Header */}
                  <View style={styles.header}>
                    <Pressable onPress={() => setStep(1)} style={styles.backLink}>
                      <Back width={20} height={20} />
                    </Pressable>
                    <View style={styles.headerTitle}>
                      <Plane width={25} height={25} />
                      <AppText variant="body" style={styles.headerLabel}>Create trip</AppText>
                    </View>
                  </View>

                  <AppText variant="title" style={styles.titleStep2}>
                    Give your trip a name and choose a date
                  </AppText>

                  {/* Trip Name */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <TripTitle width={20} height={20} />
                      <AppText variant="body" style={styles.fieldLabel}>Trip name</AppText>
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
                      <AppText variant="body" style={styles.fieldLabel}>Trip date</AppText>
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
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_: DateTimePickerEvent, date?: Date) => {
                          setShowStartPicker(false);
                          if (date) {
                            setStartDate(date);
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
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
                        <AppText variant="body" style={styles.fieldLabel}>Add members to trip</AppText>
                      </View>
                    </View>
                    <AppText variant="caption" style={styles.codeCaption}>
                      Copy this code to share the trip.
                    </AppText>
                    <Pressable style={styles.codeRow} onPress={handleCopyCode}>
                      <AppText variant="body" style={styles.codeText}>{tripCode}</AppText>
                      <View style={styles.copyActionArea}>
                        <AppText variant="caption" style={styles.copiedText}>
                          {copied ? '✓ Copied!' : 'Tap to copy'}
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
                  style={styles.createButton}
                  onPress={() => {
                    // TODO: submit trip to backend
                  }}
                >
                  <AppText variant="body" style={styles.createButtonText}>Create trip</AppText>
                </Pressable>
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
    overflow: 'hidden',
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

  // Titles
  titleStep1: {
    fontSize: 36,
    lineHeight: 52,
    color: colors.textPrimary,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  titleStep2: {
    fontSize: 36,
    lineHeight: 52,
    color: colors.textPrimary,
    textAlign: 'left',
    alignSelf: 'stretch',
  },

  // Fields
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.nightBlack,
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
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

  // Date
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

  // Members
  membersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeCaption: {
    color: colors.nightBlack,
    fontSize: 13,
  },
  codeRow: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeText: {
    color: colors.nightBlack,
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    letterSpacing: 3,
  },
  copyActionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  copiedText: {
    color: colors.nightBlack,
    fontSize: 13,
  },

  // Continue button
  continueWrapper: {
    position: 'absolute',
    bottom: SCREEN_WIDTH * (221 / 393) + 47,
    left: spacing.xl,
    right: spacing.xl,
    height: 56,
    zIndex: 10,
  },
  continueButton: {
    flex: 1,
    backgroundColor: colors.sunsetOrange,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: colors.nightBlack,
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
  },

  // CityScape
  cityScapeWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (221 / 393),
    zIndex: 5,
  },

  // CurlyYellow
  curlyWrapper: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.73,
    left: -100,
    width: 448,
    height: 442,
    zIndex: 0,
    transform: [{ rotate: '10.84deg' }],
  },

  // Create trip button
  createWrapper: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.08,
    left: spacing.xl,
    right: spacing.xl,
    height: 56,
    zIndex: 10,
  },
  createButton: {
    flex: 1,
    backgroundColor: colors.seaBlue,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: colors.nightBlack,
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
  },
});