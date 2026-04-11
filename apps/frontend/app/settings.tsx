import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/src/components/common/AppText";
import { colors, spacing, radius, typography } from "@/src/theme";
import Back from "@/assets/icons/back.svg";
import Settings from "@/assets/icons/settings.svg";
import Profile from "@/assets/icons/profile.svg";
import ArrowRight from "@/assets/icons/arrow_right.svg";

type CreatedTab = "created" | "createdArchive";
type JoinedTab = "joined" | "joinedArchive";

export default function SettingsScreen() {
  const [createdTab, setCreatedTab] = useState<CreatedTab>("created");
  const [joinedTab, setJoinedTab] = useState<JoinedTab>("joined");

  return (
    <View style={styles.fullScreen}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Link
              href="/home"
              style={styles.backLink}
              accessibilityRole="link"
              accessibilityLabel="Go back to home"
            >
              <Back width={20} height={20} />
            </Link>

            <View style={styles.headerTitle}>
              <Settings width={20} height={20} />
              <AppText variant="body" style={styles.headerLabel}>
                Settings
              </AppText>
            </View>
          </View>

          <Link href="/profile" asChild>
            <Pressable
              style={styles.profileCard}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              accessibilityHint="Opens your profile settings"
            >
              <View style={styles.profileLeft}>
                <View style={styles.profileIconWrapper}>
                  <Profile width={32} height={32} />
                </View>

                <View style={styles.profileInfo}>
                  <AppText variant="body" style={styles.profileName}>
                    Sophie Trudl
                  </AppText>
                  <AppText variant="caption" style={styles.profileEdit}>
                    Edit profile
                  </AppText>
                </View>
              </View>

              <ArrowRight width={20} height={20} />
            </Pressable>
          </Link>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Pressable
                onPress={() => setCreatedTab("created")}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityLabel="Show trips you created"
                accessibilityState={{ selected: createdTab === "created" }}
              >
                <AppText
                  variant="body"
                  style={[
                    styles.sectionTitle,
                    createdTab !== "created" && styles.sectionTitleMuted,
                  ]}
                >
                  Trips you created
                </AppText>
                {createdTab === "created" && (
                  <View style={styles.tabUnderline} />
                )}
              </Pressable>

              <Pressable
                onPress={() => setCreatedTab("createdArchive")}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityLabel="Show archived created trips"
                accessibilityState={{
                  selected: createdTab === "createdArchive",
                }}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.archiveLabel,
                    createdTab === "createdArchive" &&
                      styles.archiveLabelActive,
                  ]}
                >
                  Archive
                </AppText>
                {createdTab === "createdArchive" && (
                  <View style={styles.tabUnderline} />
                )}
              </Pressable>
            </View>

            <View style={styles.emptySection}>
              <AppText variant="caption" style={styles.emptyText}>
                {createdTab === "created"
                  ? "No trips created yet."
                  : "No archived trips."}
              </AppText>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Pressable
                onPress={() => setJoinedTab("joined")}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityLabel="Show trips you joined"
                accessibilityState={{ selected: joinedTab === "joined" }}
              >
                <AppText
                  variant="body"
                  style={[
                    styles.sectionTitle,
                    joinedTab !== "joined" && styles.sectionTitleMuted,
                  ]}
                >
                  Trips you joined
                </AppText>
                {joinedTab === "joined" && <View style={styles.tabUnderline} />}
              </Pressable>

              <Pressable
                onPress={() => setJoinedTab("joinedArchive")}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityLabel="Show archived joined trips"
                accessibilityState={{
                  selected: joinedTab === "joinedArchive",
                }}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.archiveLabel,
                    joinedTab === "joinedArchive" && styles.archiveLabelActive,
                  ]}
                >
                  Archive
                </AppText>
                {joinedTab === "joinedArchive" && (
                  <View style={styles.tabUnderline} />
                )}
              </Pressable>
            </View>

            <View style={styles.emptySection}>
              <AppText variant="caption" style={styles.emptyText}>
                {joinedTab === "joined"
                  ? "No trips joined yet."
                  : "No archived trips."}
              </AppText>
            </View>
          </View>
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
    gap: spacing.xxl,
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
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.sunsetOrange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: radius.xl,
    elevation: 6,
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  profileIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightWhite,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    gap: spacing.xs,
  },
  profileName: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textPrimary,
  },
  profileEdit: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  tabItem: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textPrimary,
  },
  sectionTitleMuted: {
    color: colors.textMuted,
  },
  archiveLabel: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontFamily: typography.fontFamily.bodyBold,
  },
  archiveLabelActive: {
    color: colors.textPrimary,
  },
  tabUnderline: {
    height: 5,
    backgroundColor: colors.beachYellow,
    borderRadius: radius.pill,
    alignSelf: "stretch",
    marginTop: -1,
  },
  emptySection: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textMuted,
  },
});
