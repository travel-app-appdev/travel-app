// app/join-trip.tsx
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/src/components/common/AppText';
import { colors, spacing, radius, typography } from '@/src/theme';
import Back from '@/assets/icons/back.svg';
import LinkIcon from '@/assets/icons/link.svg';
import KeyFrame from '@/assets/icons/key_frame.svg';
import LeafUp from '@/assets/visuals/leaf_up.svg';
import LeafDown from '@/assets/visuals/leaf_down.svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function JoinTripScreen() {
  const [code, setCode] = useState('');

  return (
    <View style={styles.fullScreen}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        {/* Leaf top right */}
        <View style={styles.leafTopRight} pointerEvents="none">
          <LeafUp
            width={SCREEN_WIDTH * 0.4}
            height={SCREEN_WIDTH * 0.4}
          />
        </View>

        {/* Leaf bottom left */}
        <View style={styles.leafBottomLeft} pointerEvents="none">
          <LeafDown
            width={SCREEN_WIDTH * 0.45}
            height={SCREEN_WIDTH * 0.45}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Link href="/home" style={styles.backLink}>
              <Back width={20} height={20} />
            </Link>
            <View style={styles.headerTitle}>
              <LinkIcon width={20} height={20} />
              <AppText variant="body" style={styles.headerLabel}>Join Trip</AppText>
            </View>
          </View>

          {/* Title */}
          <AppText variant="title" style={styles.title}>
            Which trip you wanna join?
          </AppText>

          {/* Code field */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <KeyFrame width={20} height={20} />
              <AppText variant="body" style={styles.fieldLabel}>Code</AppText>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter Code here"
              placeholderTextColor={colors.textMuted}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
            <AppText variant="caption" style={styles.hint}>
              Enter the code that was sent to you by the admin.
            </AppText>
          </View>

          {/* Join button */}
          <Pressable
            style={styles.joinButton}
            onPress={() => {
              // TODO: validate and join trip
            }}
          >
            <AppText variant="body" style={styles.joinButtonText}>Join</AppText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.plantGreen,
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
    gap: spacing.xxl,
  },

  // Leaf decorations
  leafTopRight: {
    position: 'absolute',
    top: SCREEN_HEIGHT * -0.001,
    right: SCREEN_WIDTH * -0.05,
    zIndex: 0,
    opacity: 0.6,
    transform: [{ rotate: '-0.01deg' }],
  },
  leafBottomLeft: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.02,
    left: SCREEN_WIDTH * -0.08,
    zIndex: 0,
    opacity: 0.6,
    transform: [{ rotate: '5deg' }],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
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

  // Title
  title: {
    fontSize: 36,
    lineHeight: 52,
    color: colors.textPrimary,
    textAlign: 'left',
    alignSelf: 'stretch',
    zIndex: 1,
  },

  // Field
  fieldGroup: {
    gap: spacing.sm,
    zIndex: 1,
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
  hint: {
    color: colors.nightBlack,
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
  },

  // Join button
  joinButton: {
    backgroundColor: colors.neonGreen,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    zIndex: 1,
    marginTop: spacing.xxxl, // Extra space to separate from field
  },
  joinButtonText: {
    color: colors.nightBlack,
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
  },
});