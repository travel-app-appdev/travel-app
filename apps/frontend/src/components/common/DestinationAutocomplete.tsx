import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
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
  const requestIdRef = useRef(0);
  const skipFetchRef = useRef(false);

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const query = value.trim();

    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await fetchDestinationSuggestions(query);

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (query !== value.trim()) {
          return;
        }

        if (results.length === 0) {
          setSuggestions([]);
          return;
        }

        setSuggestions(results);
      } catch (error) {
        console.warn("[autocomplete] failed to load suggestions:", error);

        if (requestId === requestIdRef.current) {
          setSuggestions([]);
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleSelect = useCallback(
    (suggestion: string) => {
      skipFetchRef.current = true;
      requestIdRef.current += 1;
      setSuggestions([]);
      onChange(suggestion);
      Keyboard.dismiss();
    },
    [onChange]
  );

  return (
    <View style={styles.container}>
      <AppInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        accessibilityLabel={accessibilityLabel}
        style={inputStyle}
        autoCorrect={false}
        autoCapitalize="words"
      />

      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.itemPressed,
              ]}
              onPress={() => handleSelect(suggestion)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${suggestion}`}
            >
              <AppText variant="body" style={styles.itemText}>
                {suggestion}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
  },
  dropdown: {
    marginTop: 2,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: colors.nightBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  item: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
