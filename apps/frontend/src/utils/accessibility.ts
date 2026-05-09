import { Platform } from "react-native";

export const hiddenFromAccessibility = Platform.select({
  web: { "aria-hidden": true },
  default: {
    accessible: false,
    importantForAccessibility: "no-hide-descendants",
  },
}) as {
  accessible?: false;
  importantForAccessibility?: "no-hide-descendants";
  "aria-hidden"?: true;
};

export const nativeImportantForAccessibility = Platform.select({
  web: {},
  default: { importantForAccessibility: "yes" },
}) as {
  importantForAccessibility?: "yes";
};
