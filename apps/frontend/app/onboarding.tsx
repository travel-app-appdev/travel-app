import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  Alert,
  Animated,
  Text
} from "react-native";
import { colors, spacing, radius, typography } from "@/src/theme";


export default function Onboarding() {


    return (
        <View style={Styles.fullScreen}>
            <View style={Styles.safeArea}>
                <View style={Styles.root}>
                    <Text style={Styles.title}>Onboarding Screen</Text>
                </View>
            </View>
        </View>
    );
}


const Styles = StyleSheet.create({
    fullScreen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
    overflow: "hidden",
  },
  title: {
      fontSize: typography.size.displaySm,
      lineHeight: typography.lineHeight.displayLg,
      color: colors.textPrimary,
      textAlign: "left",
      alignSelf: "stretch",
    },
});