// // app/trip-information.tsx
// import { Link } from "expo-router";
// import {
//   ScrollView,
//   StyleSheet,
//   View,
//   Platform,
//   KeyboardAvoidingView,
//   useWindowDimensions,
//   Alert,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { AppText } from "@/src/components/common/AppText";
// import { ActionCard, ACTION_CARD_HEIGHT } from "@/src/components/common/ActionCard";
// import { colors, spacing, radius, typography } from "@/src/theme";
// import Back from "@/assets/icons/back.svg";
// import InfoIcon from "@/assets/icons/info.svg";
// import TripTitle from "@/assets/icons/trip_title.svg";
// import Calendar from "@/assets/icons/calendar.svg";
// import Location from "@/assets/icons/location.svg";
// import AddPeople from "@/assets/icons/add_people.svg";
// import Hourglass0 from "@/assets/icons/hourglass_0.svg";
// import Hourglass1 from "@/assets/icons/hourglass_1.svg";
// import Timepoint from "@/assets/icons/timepoint.svg";
// import Exit from "@/assets/icons/exit.svg";

// // TODO: replace with real trip data passed via route params
// const TRIP = {
//   name: "Japan Spring",
//   startDate: "01.01.2026",
//   endDate: "15.03.2026",
//   destination: "Tokio, Japan",
//   members: ["Sophie", "Lukas", "Franz"],
//   phases: [
//     {
//       id: "planning",
//       label: "Planning",
//       color: colors.beachYellow,
//       active: true,
//       days: 73,
//       startDate: "01.01.2026",
//       endDate: "15.03.2026",
//     },
//     {
//       id: "voting",
//       label: "Voting",
//       color: colors.sunsetPink,
//       active: false,
//       days: 3,
//       startDate: "16.03.2026",
//       endDate: "18.03.2026",
//     },
//     {
//       id: "final",
//       label: "Final",
//       color: colors.neonGreen,
//       active: false,
//       days: 1,
//       startDate: "20.03.2026",
//       endDate: "20.03.2026",
//     },
//   ],
// };

// const PHASE_TEXT_COLORS: Record<string, string> = {
//   planning: colors.nightBlack,
//   voting: colors.nightBlack,
//   final: colors.nightBlack,
// };

// function dayLabel(days: number) {
//   return days === 1 ? "1 day" : `${days} days`;
// }

// export default function TripInformationScreen() {
//   const { height: screenHeight } = useWindowDimensions();
//   const isSmallScreen = screenHeight < 700;

//   const handleLeaveTrip = () => {
//     Alert.alert(
//       "Leave trip",
//       "Are you sure you want to leave this trip?",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Leave",
//           style: "destructive",
//           onPress: () => {
//             // TODO: call leave trip API then navigate away
//           },
//         },
//       ]
//     );
//   };

//   return (
//     <View style={styles.fullScreen}>
//       <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
//         <KeyboardAvoidingView
//           style={styles.flex}
//           behavior={Platform.OS === "ios" ? "padding" : undefined}
//         >
//           {/* Scrollable content */}
//           <ScrollView
//             style={styles.flex}
//             contentContainerStyle={[
//               styles.container,
//               {
//                 paddingBottom:
//                   ACTION_CARD_HEIGHT +
//                   (isSmallScreen ? spacing.lg : spacing.xxxl),
//               },
//             ]}
//             showsVerticalScrollIndicator={false}
//           >
//             {/* Header */}
//             <View style={styles.header}>
//               <Link
//                 href="/home"
//                 style={styles.backLink}
//                 accessibilityRole="link"
//                 accessibilityLabel="Go back to home"
//               >
//                 <Back width={20} height={20} />
//               </Link>

//               <View style={styles.headerTitle}>
//                 <InfoIcon width={20} height={20} />
//                 <AppText variant="body" style={styles.headerLabel}>
//                   Trip information
//                 </AppText>
//               </View>
//             </View>

//             {/* Trip Name */}
//             <View style={styles.fieldGroup}>
//               <View style={styles.infoLabelRow}>
//                 <TripTitle width={20} height={20} />
//                 <AppText variant="body" style={styles.fieldLabel}>
//                   Trip name
//                 </AppText>
//               </View>
//               <AppText variant="caption" style={styles.infoValue}>
//                 {TRIP.name}
//               </AppText>
//             </View>

//             {/* Trip Date */}
//             <View style={styles.fieldGroup}>
//               <View style={styles.infoLabelRow}>
//                 <Calendar width={20} height={20} />
//                 <AppText variant="body" style={styles.fieldLabel}>
//                   Trip date
//                 </AppText>
//               </View>
//               <AppText variant="caption" style={styles.infoValue}>
//                 {TRIP.startDate} – {TRIP.endDate}
//               </AppText>
//             </View>

//             {/* Destination */}
//             <View style={styles.fieldGroup}>
//               <View style={styles.infoLabelRow}>
//                 <Location width={20} height={20} />
//                 <AppText variant="body" style={styles.fieldLabel}>
//                   Destination
//                 </AppText>
//               </View>
//               <AppText variant="caption" style={styles.infoValue}>
//                 {TRIP.destination}
//               </AppText>
//             </View>

//             {/* Members */}
//             <View style={styles.fieldGroup}>
//               <View style={styles.infoLabelRow}>
//                 <AddPeople width={20} height={20} />
//                 <AppText variant="body" style={styles.fieldLabel}>
//                   Members
//                 </AppText>
//               </View>
//               <AppText variant="caption" style={styles.infoValue}>
//                 {TRIP.members.join(", ")}
//               </AppText>
//             </View>

//             {/* Phases — read only */}
//             {TRIP.phases.map((phase) => (
//               <View key={phase.id} style={styles.fieldGroup}>
//                 <View style={styles.phaseRow}>
//                   <View style={styles.phaseLeft}>
//                     <View
//                       style={[
//                         styles.phaseBadge,
//                         { backgroundColor: phase.color },
//                       ]}
//                     >
//                       <AppText
//                         variant="caption"
//                         style={[
//                           styles.phaseBadgeText,
//                           { color: PHASE_TEXT_COLORS[phase.id] },
//                         ]}
//                       >
//                         {phase.label}
//                       </AppText>
//                     </View>

//                     <View style={styles.phaseTimerRow}>
//                       {phase.active ? (
//                         <Hourglass1 width={20} height={20} />
//                       ) : (
//                         <Hourglass0 width={20} height={20} />
//                       )}
//                       <AppText variant="body" style={styles.phaseDays}>
//                         {dayLabel(phase.days)}
//                       </AppText>
//                       <AppText variant="caption" style={styles.phaseTimerLabel}>
//                         Timer
//                       </AppText>
//                       {phase.active && <Timepoint width={8} height={8} />}
//                     </View>
//                   </View>
//                 </View>

//                 <AppText variant="caption" style={styles.phaseDateLabel}>
//                   {phase.startDate}
//                   {phase.startDate !== phase.endDate
//                     ? ` - ${phase.endDate}`
//                     : ""}
//                 </AppText>
//               </View>
//             ))}
//           </ScrollView>

//           {/* Leave trip — pinned to bottom, always visible above safe area */}
//           <SafeAreaView edges={["bottom"]} style={styles.leaveSafeArea}>
//             <View style={styles.leaveWrapper}>
//               <ActionCard
//                 label="Leave trip"
//                 icon={<Exit width={20} height={20} />}
//                 onPress={handleLeaveTrip}
//                 accessibilityHint="Leaves this trip"
//               />
//             </View>
//           </SafeAreaView>
//         </KeyboardAvoidingView>
//       </SafeAreaView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   fullScreen: {
//     flex: 1,
//     backgroundColor: colors.lightWhite,
//   },
//   safeArea: {
//     flex: 1,
//   },
//   flex: {
//     flex: 1,
//   },
//   container: {
//     paddingHorizontal: spacing.xl,
//     paddingTop: spacing.lg,
//     gap: spacing.xl,
//   },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     position: "relative",
//   },
//   backLink: {
//     position: "absolute",
//     left: 0,
//     top: 0,
//     bottom: 0,
//     minWidth: 44,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: spacing.xs,
//   },
//   headerTitle: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: spacing.sm,
//   },
//   headerLabel: {
//     fontSize: typography.size.xxl,
//     lineHeight: typography.lineHeight.xxl,
//     fontFamily: typography.fontFamily.bodyBold,
//     color: colors.textPrimary,
//   },
//   fieldGroup: {
//     gap: spacing.sm,
//   },
//   infoLabelRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: spacing.xs,
//   },
//   fieldLabel: {
//     fontFamily: typography.fontFamily.bodyBold,
//     fontSize: typography.size.xl,
//     lineHeight: typography.lineHeight.xl,
//     color: colors.textPrimary,
//   },
//   infoValue: {
//     color: colors.nightBlack,
//     fontSize: typography.size.sm,
//     lineHeight: typography.lineHeight.sm,
//     paddingLeft: 28,
//   },
//   // Phases
//   phaseRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   phaseLeft: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: spacing.md,
//     flex: 1,
//   },
//   phaseBadge: {
//     paddingHorizontal: spacing.lg,
//     paddingVertical: spacing.sm,
//     borderRadius: radius.pill,
//   },
//   phaseBadgeText: {
//     fontFamily: typography.fontFamily.bodyBold,
//     fontSize: typography.size.sm,
//     lineHeight: typography.lineHeight.sm,
//   },
//   phaseTimerRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: spacing.xs,
//   },
//   phaseDays: {
//     fontFamily: typography.fontFamily.bodyBold,
//     fontSize: typography.size.sm,
//     lineHeight: typography.lineHeight.sm,
//     color: colors.textPrimary,
//   },
//   phaseTimerLabel: {
//     color: colors.nightBlack,
//     fontSize: typography.size.sm,
//     lineHeight: typography.lineHeight.sm,
//   },
//   phaseDateLabel: {
//     color: colors.nightBlack,
//     fontSize: typography.size.sm,
//     lineHeight: typography.lineHeight.sm,
//     paddingLeft: 4,
//   },
//   // Leave card pinned footer
//   leaveSafeArea: {
//     backgroundColor: colors.lightWhite,
//   },
//   leaveWrapper: {
//     paddingHorizontal: spacing.xl,
//     paddingTop: spacing.md,
//     paddingBottom: spacing.lg,
//   },
// });

// app/trip-information.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  View,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/src/components/common/AppText";
import { ActionCard, ACTION_CARD_HEIGHT } from "@/src/components/common/ActionCard";
import { BackLink } from "@/src/components/common/BackLink";
import { leaveTrip } from "@/src/api/trips";
import { auth } from "@/src/lib/firebase";
import { colors, spacing, radius, typography } from "@/src/theme";
import InfoIcon from "@/assets/icons/info.svg";
import TripTitle from "@/assets/icons/trip_title.svg";
import Calendar from "@/assets/icons/calendar.svg";
import Location from "@/assets/icons/location.svg";
import AddPeople from "@/assets/icons/add_people.svg";
import Hourglass0 from "@/assets/icons/hourglass_0.svg";
import Hourglass1 from "@/assets/icons/hourglass_1.svg";
import Timepoint from "@/assets/icons/timepoint.svg";
import Exit from "@/assets/icons/exit.svg";
import { useState } from "react";

const TRIP = {
  name: "Japan Spring",
  startDate: "01.01.2026",
  endDate: "15.03.2026",
  destination: "Tokio, Japan",
  members: ["Sophie", "Lukas", "Franz"],
  phases: [
    {
      id: "planning",
      label: "Planning",
      color: colors.beachYellow,
      active: true,
      days: 73,
      startDate: "01.01.2026",
      endDate: "15.03.2026",
    },
    {
      id: "voting",
      label: "Voting",
      color: colors.sunsetPink,
      active: false,
      days: 3,
      startDate: "16.03.2026",
      endDate: "18.03.2026",
    },
    {
      id: "final",
      label: "Final",
      color: colors.neonGreen,
      active: false,
      days: 1,
      startDate: "20.03.2026",
      endDate: "20.03.2026",
    },
  ],
};

const PHASE_TEXT_COLORS: Record<string, string> = {
  planning: colors.nightBlack,
  voting: colors.nightBlack,
  final: colors.nightBlack,
};

function dayLabel(days: number) {
  return days === 1 ? "1 day" : `${days} days`;
}

export default function TripInformationScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const isSmallScreen = screenHeight < 700;
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeaveTrip = () => {
    Alert.alert(
      "Leave trip",
      "Are you sure you want to leave this trip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLeaving(true);
              const currentUser = auth.currentUser;
              if (!currentUser) {
                Alert.alert("Not logged in", "Please log in again.");
                return;
              }
              const idToken = await currentUser.getIdToken();
              await leaveTrip({ idToken, tripId: tripId! });
              router.replace("/home");
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Failed to leave trip";
              Alert.alert("Leave failed", message);
            } finally {
              setIsLeaving(false);
            }
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
          >
            <View style={styles.header}>
              <BackLink href="/home" />
              <View style={styles.headerTitle}>
                <InfoIcon width={20} height={20} />
                <AppText variant="body" style={styles.headerLabel}>
                  Trip information
                </AppText>
              </View>
            </View>

            {/* Trip Name */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoLabelRow}>
                <TripTitle width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Trip name
                </AppText>
              </View>
              <AppText variant="caption" style={styles.infoValue}>
                {TRIP.name}
              </AppText>
            </View>

            {/* Trip Date */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoLabelRow}>
                <Calendar width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Trip date
                </AppText>
              </View>
              <AppText variant="caption" style={styles.infoValue}>
                {TRIP.startDate} – {TRIP.endDate}
              </AppText>
            </View>

            {/* Destination */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoLabelRow}>
                <Location width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Destination
                </AppText>
              </View>
              <AppText variant="caption" style={styles.infoValue}>
                {TRIP.destination}
              </AppText>
            </View>

            {/* Members */}
            <View style={styles.fieldGroup}>
              <View style={styles.infoLabelRow}>
                <AddPeople width={20} height={20} />
                <AppText variant="body" style={styles.fieldLabel}>
                  Members
                </AppText>
              </View>
              <AppText variant="caption" style={styles.infoValue}>
                {TRIP.members.join(", ")}
              </AppText>
            </View>

            {/* Phases */}
            {TRIP.phases.map((phase) => (
              <View key={phase.id} style={styles.fieldGroup}>
                <View style={styles.phaseRow}>
                  <View style={styles.phaseLeft}>
                    <View
                      style={[
                        styles.phaseBadge,
                        { backgroundColor: phase.color },
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={[
                          styles.phaseBadgeText,
                          { color: PHASE_TEXT_COLORS[phase.id] },
                        ]}
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
                        {dayLabel(phase.days)}
                      </AppText>
                      <AppText variant="caption" style={styles.phaseTimerLabel}>
                        Timer
                      </AppText>
                      {phase.active && <Timepoint width={8} height={8} />}
                    </View>
                  </View>
                </View>

                <AppText variant="caption" style={styles.phaseDateLabel}>
                  {phase.startDate}
                  {phase.startDate !== phase.endDate
                    ? ` - ${phase.endDate}`
                    : ""}
                </AppText>
              </View>
            ))}
          </ScrollView>

          <SafeAreaView edges={["bottom"]} style={styles.leaveSafeArea}>
            <View style={styles.leaveWrapper}>
              <ActionCard
                label={isLeaving ? "Leaving..." : "Leave trip"}
                icon={<Exit width={20} height={20} />}
                onPress={handleLeaveTrip}
                accessibilityHint="Leaves this trip"
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
  },
  phaseDays: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textPrimary,
  },
  phaseTimerLabel: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  phaseDateLabel: {
    color: colors.nightBlack,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    paddingLeft: 4,
  },
  leaveSafeArea: {
    backgroundColor: colors.lightWhite,
  },
  leaveWrapper: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});