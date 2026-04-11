import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppText } from "@/src/components/common/AppText";
import { TripCard } from "@/src/components/common/TripCard";
import { colors, spacing, radius, typography } from "@/src/theme";
import Settings from "@/assets/icons/settings.svg";
import ButtonCreate from "@/assets/icons/Button_Create.svg";
import ButtonJoin from "@/assets/icons/Button_Join.svg";

type Tab = "your" | "past";

const DUMMY_YOUR_TRIPS = [
  {
    id: "1",
    title: "Japan Spring",
    destination: "Tokyo, Japan",
    startDate: "Mar 21",
    endDate: "Mar 28",
    status: "planning" as const,
    cardColor: colors.seaBlue,
    members: [
      { id: "1", initials: "ST", color: colors.sunsetOrange },
      { id: "2", initials: "LK", color: colors.plantGreen },
      { id: "3", initials: "FR", color: colors.sunsetPink },
    ],
  },
  {
    id: "2",
    title: "Greek Islands",
    destination: "Santorini, Greece",
    startDate: "Aug 14",
    endDate: "Aug 22",
    status: "voting" as const,
    cardColor: colors.sunsetOrange,
    members: [
      { id: "1", initials: "ST", color: colors.seaBlue },
      { id: "2", initials: "LK", color: colors.plantGreen },
    ],
  },
];

const DUMMY_PAST_TRIPS: typeof DUMMY_YOUR_TRIPS = [];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("your");
  const router = useRouter();

  const trips = activeTab === "your" ? DUMMY_YOUR_TRIPS : DUMMY_PAST_TRIPS;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push("/settings")}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            accessibilityHint="Opens account and trip settings"
          >
            <Settings width={24} height={24} />
            <AppText variant="caption" style={styles.settingsLabel}>
              Settings
            </AppText>
          </Pressable>
        </View>

        <View style={styles.titleBlock}>
          <AppText variant="title" style={styles.helloText}>
            Helloooo
          </AppText>

          <View style={styles.subtitleRow}>
            <AppText variant="body" style={styles.subtitle}>
              where is the{" "}
            </AppText>
            <View>
              <AppText variant="body" style={styles.subtitleBold}>
                squad going?
              </AppText>
              <View style={styles.squadUnderline} />
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Link href="/create-trip" asChild>
            <Pressable
              style={styles.actionCard}
              accessibilityRole="button"
              accessibilityLabel="Create trip"
              accessibilityHint="Opens the create trip screen"
            >
              <ButtonCreate width={140} height={140} />
              <AppText variant="body" style={styles.actionLabel}>
                Create trip
              </AppText>
            </Pressable>
          </Link>

          <Link href="/join-trip" asChild>
            <Pressable
              style={styles.actionCard}
              accessibilityRole="button"
              accessibilityLabel="Join trip"
              accessibilityHint="Opens the join trip screen"
            >
              <ButtonJoin width={140} height={140} />
              <AppText variant="body" style={styles.actionLabel}>
                Join trip
              </AppText>
            </Pressable>
          </Link>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab("your")}
            style={styles.tabItem}
            accessibilityRole="button"
            accessibilityLabel="Show your trips"
            accessibilityState={{ selected: activeTab === "your" }}
          >
            <View>
              <AppText
                variant="body"
                style={[
                  styles.tabText,
                  activeTab === "your" && styles.tabTextActive,
                ]}
              >
                Your Trips
              </AppText>
              {activeTab === "your" && <View style={styles.tabUnderline} />}
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("past")}
            style={styles.tabItem}
            accessibilityRole="button"
            accessibilityLabel="Show past trips"
            accessibilityState={{ selected: activeTab === "past" }}
          >
            <View>
              <AppText
                variant="body"
                style={[
                  styles.tabText,
                  activeTab === "past" && styles.tabTextActive,
                ]}
              >
                Past Trips
              </AppText>
              {activeTab === "past" && <View style={styles.tabUnderline} />}
            </View>
          </Pressable>
        </View>

        {trips.length > 0 ? (
          <View style={styles.tripList}>
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                title={trip.title}
                destination={trip.destination}
                startDate={trip.startDate}
                endDate={trip.endDate}
                status={trip.status}
                cardColor={trip.cardColor}
                members={trip.members}
                onPress={() => {
                  // TODO: navigate to trip detail screen
                }}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <AppText variant="caption" style={styles.emptyText}>
              {activeTab === "your"
                ? "No upcoming trips yet. Create or join one!"
                : "No past trips yet. Your memories will live here."}
            </AppText>
          </View>
        )}
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  settingsButton: {
    alignItems: "center",
    gap: spacing.xs,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  settingsLabel: {
    color: colors.textPrimary,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
  },
  titleBlock: {
    alignItems: "center",
    gap: spacing.xs,
  },
  helloText: {
    fontSize: typography.size.displayMd,
    lineHeight: typography.lineHeight.displayMd,
    color: colors.sunsetOrange,
    textAlign: "center",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.body,
  },
  subtitleBold: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.textPrimary,
  },
  squadUnderline: {
    height: 4,
    backgroundColor: colors.neonGreen,
    borderRadius: radius.pill,
    marginTop: -1,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.xl,
  },
  actionCard: {
    alignItems: "center",
    gap: spacing.md,
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    fontFamily: typography.fontFamily.bodyBold,
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xl,
    flexWrap: "wrap",
  },
  tabItem: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  tabText: {
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    color: colors.textMuted,
    fontFamily: typography.fontFamily.bodyBold,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  tabUnderline: {
    height: 5,
    backgroundColor: colors.beachYellow,
    borderRadius: radius.pill,
    marginTop: -1,
  },
  tripList: {
    gap: spacing.md,
  },
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 260,
    lineHeight: typography.lineHeight.md,
  },
});
