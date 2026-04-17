import { StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/common/AppText";
import { colors, radius, spacing, typography } from "@/src/theme";
import { formatTripDateRange } from "@/src/utils/itinerary/formatTripToDateRange";

type Props = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
};

export function ItineraryHeader({
  title,
  destination,
  startDate,
  endDate,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.hero}>
        <AppText variant="title" style={styles.title}>
          {title}
        </AppText>

        <AppText variant="subtitle" style={styles.destination}>
          {destination}
        </AppText>

        <View style={styles.dateBadge}>
          <AppText variant="body" style={styles.dateText}>
            {formatTripDateRange(startDate, endDate)}
          </AppText>
        </View>
      </View>

      <View style={styles.contentCard}>
        <AppText variant="subtitle" style={styles.intro}>
          You can add your activities here for each day.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 0,
  },
  hero: {
    backgroundColor: colors.beachYellow,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.displayMd,
    lineHeight: typography.lineHeight.displayMd,
  },
  destination: {
    color: colors.textPrimary,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontFamily: typography.fontFamily.body,
  },
  dateBadge: {
    alignSelf: "flex-end",
    backgroundColor: colors.lightWhite,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  dateText: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily.bodyBold,
  },
  contentCard: {
    backgroundColor: colors.lightWhite,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    marginTop: -12,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  intro: {
    fontSize: typography.size.lg,
    lineHeight: typography.lineHeight.lg,
    color: colors.textPrimary,
  },
});
