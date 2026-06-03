import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppText } from "@/src/components/common/AppText";
import { AppButton } from "@/src/components/common/AppButton";
import { colors, spacing, radius, typography } from "@/src/theme";
import { fetchTripByInviteCode, joinTrip, type TripPreview } from "@/src/api/trips";
import { useAuth } from "@/src/context/AuthContext";
import { auth } from "@/src/lib/firebase";
import { invalidateTripsCache } from "./home";
import { hiddenFromAccessibility } from "@/src/utils/accessibility";

import Plane from "@/assets/icons/plane.svg";
import Location from "@/assets/icons/location.svg";
import Calendar from "@/assets/icons/calendar.svg";
import CurlyYellow from "@/assets/visuals/curly-yellow.svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatDateDisplay(dateString: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStateBadgeColor(state: TripPreview["state"]): string {
  switch (state) {
    case "Voting":
      return colors.sunsetPink;
    case "Final":
      return colors.neonGreen;
    case "Planning":
    default:
      return colors.beachYellow;
  }
}

type ScreenState = "loading" | "preview" | "joining" | "error";

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { user, idToken } = useAuth();

  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [trip, setTrip] = useState<TripPreview | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const inviteCode = (code ?? "").trim().toUpperCase();

  // ── Load trip preview ──
  useEffect(() => {
    if (!inviteCode) {
      setErrorMessage("No invite code provided.");
      setScreenState("error");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const preview = await fetchTripByInviteCode(inviteCode);
        if (!cancelled) {
          setTrip(preview);
          setScreenState("preview");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "This invite link is invalid or has expired."
          );
          setScreenState("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [inviteCode]);

  // ── Join trip ──
  async function handleJoin() {
    if (!user) {
      router.push({
        pathname: "/register",
        params: { pendingInviteCode: inviteCode },
      });
      return;
    }

    if (isJoining) return;
    setIsJoining(true);

    try {
      const token = idToken ?? (await auth.currentUser?.getIdToken());
      if (!token) {
        Alert.alert("Not logged in", "Please log in again.");
        return;
      }

      const joinedTrip = await joinTrip({ idToken: token, inviteCode });
      invalidateTripsCache();

      router.replace({
        pathname: "/trip-overview-member",
        params: {
          tripId: joinedTrip.trip_id,
          title: joinedTrip.title,
          destination: joinedTrip.destination,
          startDate: joinedTrip.start_date,
          endDate: joinedTrip.end_date,
          state: joinedTrip.state,
          members: JSON.stringify([]),
          inviteCode,
          planningStartedAt: joinedTrip.planning_started_at ?? "",
          planningEndAt: joinedTrip.planning_end_at ?? "",
          votingEndAt: joinedTrip.voting_end_at ?? "",
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to join trip";

      if (message.toLowerCase().includes("already a member")) {
        invalidateTripsCache();
        router.replace("/home");
        return;
      }

      Alert.alert("Could not join trip", message);
    } finally {
      setIsJoining(false);
    }
  }

  // ── Cancel ──
  function handleCancel() {
    if (user) {
      router.replace("/home");
    } else {
      router.replace("/");
    }
  }

  // ── Loading ──
  if (screenState === "loading") {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={colors.sunsetOrange} />
        <AppText variant="body" style={styles.loadingText}>
          Loading trip details…
        </AppText>
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (screenState === "error") {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <StatusBar style="dark" />
        <View style={styles.errorCard}>
          <AppText variant="subtitle" style={styles.errorTitle}>
            Invite not found
          </AppText>
          <AppText variant="body" style={styles.errorMessage}>
            {errorMessage}
          </AppText>
          <AppButton
            title="Go to home"
            onPress={() => router.replace(user ? "/home" : "/")}
            style={styles.errorButton}
            textStyle={styles.errorButtonText}
            accessibilityLabel="Go to home screen"
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Preview ──
  const badgeColor = getStateBadgeColor(trip!.state);
  const curlySize = SCREEN_WIDTH * 1.1;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar style="dark" />

        <View
          style={[
            styles.curlyWrapper,
            {
              width: curlySize,
              height: curlySize,
              bottom: -SCREEN_WIDTH * 0.35,
              left: -SCREEN_WIDTH * 0.1,
              pointerEvents: "none",
            },
          ]}
          {...hiddenFromAccessibility}
        >
          <CurlyYellow width={curlySize} height={curlySize} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header} {...hiddenFromAccessibility}>
            <Plane width={22} height={22} />
            <AppText variant="body" style={styles.headerLabel}>
              Trip Invite
            </AppText>
          </View>

          {/* Hero text */}
          <AppText variant="title" style={styles.heroTitle}>
            You're invited!
          </AppText>
          <AppText variant="body" style={styles.heroSubtitle}>
            Someone wants you on their trip. Here's what's planned:
          </AppText>

          {/* Trip card */}
          <View
            style={styles.tripCard}
            accessible={true}
            accessibilityLabel={`Trip: ${trip!.title}, destination ${trip!.destination}, from ${formatDateDisplay(trip!.start_date)} to ${formatDateDisplay(trip!.end_date)}`}
          >
            <View style={styles.cardTitleRow}>
              <AppText
                variant="subtitle"
                style={styles.cardTitle}
                numberOfLines={2}
              >
                {trip!.title}
              </AppText>
              <View
                style={[styles.stateBadge, { backgroundColor: badgeColor }]}
                {...hiddenFromAccessibility}
              >
                <AppText variant="caption" style={styles.stateBadgeText}>
                  {trip!.state}
                </AppText>
              </View>
            </View>

            <View style={styles.cardRow} {...hiddenFromAccessibility}>
              <Location width={18} height={18} />
              <AppText
                variant="body"
                style={styles.cardRowText}
                numberOfLines={1}
              >
                {trip!.destination}
              </AppText>
            </View>

            <View style={styles.cardRow} {...hiddenFromAccessibility}>
              <Calendar width={18} height={18} />
              <AppText variant="body" style={styles.cardRowText}>
                {formatDateDisplay(trip!.start_date)} –{" "}
                {formatDateDisplay(trip!.end_date)}
              </AppText>
            </View>

            <View style={styles.codeRow}>
              <AppText variant="caption" style={styles.codeLabel}>
                Invite code
              </AppText>
              <AppText variant="body" style={styles.codeValue}>
                {inviteCode}
              </AppText>
            </View>
          </View>

          {/* Auth notice */}
          {!user && (
            <View style={styles.authNotice}>
              <AppText variant="body" style={styles.authNoticeText}>
                You'll need to create an account or log in before joining.
              </AppText>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <AppButton
              title={
                isJoining
                  ? "Joining…"
                  : user
                  ? "Join trip"
                  : "Register to join"
              }
              onPress={handleJoin}
              loading={isJoining}
              disabled={isJoining}
              style={styles.joinButton}
              textStyle={styles.joinButtonText}
              accessibilityLabel={
                user
                  ? "Join this trip"
                  : "Register or log in to join this trip"
              }
              accessibilityHint={
                user
                  ? "Adds you as a member of this trip"
                  : "Takes you to the registration screen"
              }
            />

            <Pressable
              onPress={handleCancel}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel and go back"
              accessibilityHint="Returns to the home or landing page without joining"
            >
              <AppText variant="body" style={styles.cancelButtonText}>
                Cancel
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.beachYellow,
    overflow: "hidden",
  },
  safeArea: {
    flex: 1,
  },
  centeredScreen: {
    flex: 1,
    backgroundColor: colors.lightWhite,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  errorCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.lightWhite,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.nightBlack,
    alignItems: "center",
  },
  errorTitle: {
    color: colors.nightBlack,
    textAlign: "center",
  },
  errorMessage: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: typography.lineHeight.lg,
  },
  errorButton: {
    backgroundColor: colors.sunsetOrange,
    marginTop: spacing.sm,
  },
  errorButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  curlyWrapper: {
    position: "absolute",
    zIndex: 0,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxxl2,
    gap: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  headerLabel: {
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontFamily: typography.fontFamily.bodyBold,
    color: colors.textPrimary,
  },
  heroTitle: {
    fontFamily: typography.fontFamily.bodyBlack,
    fontSize: typography.size.displaySm,
    lineHeight: typography.lineHeight.displaySm,
    color: colors.nightBlack,
    textAlign: "left",
  },
  heroSubtitle: {
    color: colors.nightBlack,
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    fontFamily: typography.fontFamily.body,
    marginTop: -spacing.md,
  },
  tripCard: {
    backgroundColor: colors.lightWhite,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.nightBlack,
    padding: spacing.xl,
    gap: spacing.md,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
  },
  stateBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  stateBadgeText: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.nightBlack,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardRowText: {
    flex: 1,
    color: colors.nightBlack,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontFamily: typography.fontFamily.body,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  codeLabel: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
  },
  codeValue: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    letterSpacing: 3,
  },
  authNotice: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  authNoticeText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.lg,
    textAlign: "center",
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  // sunsetOrange matches the existing primary action buttons throughout the app
  joinButton: {
    backgroundColor: colors.sunsetOrange,
  },
  joinButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
  },
  cancelButton: {
    alignSelf: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonPressed: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.lg,
    textDecorationLine: "underline",
  },
});