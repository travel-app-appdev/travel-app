import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppInput } from "./AppInput";
import { AppText } from "./AppText";
import { fetchDestinationSuggestions } from "@/src/api/trips";
import { colors, radius, spacing, typography } from "@/src/theme";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputStyle?: object;
  accessibilityLabel?: string;
};

export function DestinationAutocomplete({
  value,
  onChange,
  placeholder = "Enter city or country",
  inputStyle,
  accessibilityLabel = "Destination",
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFetchRef = useRef(false);

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await fetchDestinationSuggestions(value);
      setSuggestions(results);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handleSelect = useCallback(
    (suggestion: string) => {
      skipFetchRef.current = true;
      setSuggestions([]);
      onChange(suggestion);
    },
    [onChange]
  );

  return (
    <View>
      <AppInput
        placeholder={placeholder}
        value={value}
        onChangeText={(t) => {
          onChange(t);
        }}
        accessibilityLabel={accessibilityLabel}
        style={inputStyle}
        autoCorrect={false}
        autoCapitalize="words"
      />
      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((s, i) => (
            <Pressable
              key={s}
              style={({ pressed }) => [
                styles.item,
                i === suggestions.length - 1 && styles.itemLast,
                pressed && styles.itemPressed,
              ]}
              onPress={() => handleSelect(s)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${s}`}
            >
              <AppText variant="body" style={styles.itemText}>
                {s}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    marginTop: 4,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.nightBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  item: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemPressed: {
    backgroundColor: "#FFF4C2",
  },
  itemText: {
    fontSize: typography.size.md,
    color: colors.nightBlack,
    fontFamily: typography.fontFamily.body,
  },
});
