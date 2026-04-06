// app/home.tsx
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppText } from '@/src/components/common/AppText';
import { colors, spacing, radius } from '@/src/theme';
import Settings from '@/assets/icons/settings.svg';
import ButtonCreate from '@/assets/icons/Button_Create.svg';
import ButtonJoin from '@/assets/icons/Button_Join.svg';

type Tab = 'your' | 'past';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('your');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <Pressable style={styles.settingsButton}>
            <Settings width={24} height={24} />
            <AppText variant="caption" style={styles.settingsLabel}>Settings</AppText>
          </Pressable>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <AppText variant="title" style={styles.helloText}>Helloooo</AppText>
          <View style={styles.subtitleRow}>
            <AppText variant="body" style={styles.subtitle}>where is the </AppText>
            <View>
              <AppText variant="body" style={styles.subtitleBold}>squad going?</AppText>
              <View style={styles.squadUnderline} />
            </View>
          </View>
        </View>

        {/* Action Cards */}
        <View style={styles.actionRow}>
          <Link href="/create-trip" asChild>
            <Pressable style={styles.actionCard}>
              <ButtonCreate width={140} height={140} />
              <View>
                <AppText variant="body" style={styles.actionLabel}>Create trip</AppText>
              </View>
            </Pressable>
          </Link>

          <Link href="/join-trip" asChild>
            <Pressable style={styles.actionCard}>
              <ButtonJoin width={140} height={140} />
              <View>
                <AppText variant="body" style={styles.actionLabel}>Join trip</AppText>
              </View>
            </Pressable>
          </Link>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable onPress={() => setActiveTab('your')} style={styles.tabItem}>
            <View>
              <AppText
                variant="body"
                style={[styles.tabText, activeTab === 'your' && styles.tabTextActive]}
              >
                Your Trips
              </AppText>
              {activeTab === 'your' && <View style={styles.tabUnderline} />}
            </View>
          </Pressable>

          <Pressable onPress={() => setActiveTab('past')} style={styles.tabItem}>
            <View>
              <AppText
                variant="body"
                style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}
              >
                Past Trips
              </AppText>
              {activeTab === 'past' && <View style={styles.tabUnderline} />}
            </View>
          </Pressable>
        </View>

        {/* Empty State */}
        <View style={styles.emptyState}>
          <AppText variant="caption" style={styles.emptyText}>
            {activeTab === 'your'
              ? 'No upcoming trips yet. Create or join one!'
              : 'No past trips yet. Your memories will live here.'}
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.lightWhite,
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

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  settingsButton: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingsLabel: {
    color: colors.textPrimary,
    fontSize: 12,
  },

  // Title
  titleBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  helloText: {
    fontSize: 40,
    color: colors.sunsetOrange,
    textAlign: 'center',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 18.24,
    color: colors.textPrimary,
    fontFamily: 'Nunito_400Regular',
  },
  subtitleBold: {
    fontSize: 18.24,
    fontFamily: 'Nunito_700Bold',
    color: colors.textPrimary,
  },
  squadUnderline: {
    height: 4,
    backgroundColor: colors.plantGreen,
    borderRadius: radius.pill,
    marginTop: 0,
  },

  // Action Cards
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  actionCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  tabItem: {
    alignItems: 'center',
  },
  tabText: {
    fontSize: 20,
    color: colors.textMuted,
    fontFamily: 'Nunito_700Bold',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  tabUnderline: {
    height: 5,
    backgroundColor: colors.beachYellow,
    borderRadius: radius.pill,
    marginTop: 0,
  },

  // Empty State
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 22,
  },
});