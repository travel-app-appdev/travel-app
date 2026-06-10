import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Modal, Pressable, StyleSheet, View } from "react-native";
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

type Layout = { x: number; y: number; width: number; height: number };

export function DestinationAutocomplete({
  value,
  onChange,
  placeholder = "Enter city or country",
  inputStyle,
  accessibilityLabel = "Destination",
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFetchRef = useRef(false);
  const containerRef = useRef<View>(null);

  const measure = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0) setLayout({ x, y, width, height });
    });
  }, []);

  useEffect(() => {
    if (skipFetchRef.current) { skipFetchRef.current = false; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 1) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      const results = await fetchDestinationSuggestions(value);
      if (results.length === 0) { setSuggestions([]); return; }
      // measure position first, then show
      containerRef.current?.measureInWindow((x, y, width, height) => {
        setLayout({ x, y, width, height });
        setSuggestions(results);
      });
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  const handleSelect = useCallback((suggestion: string) => {
    skipFetchRef.current = true;
    setSuggestions([]);
    onChange(suggestion);
    Keyboard.dismiss();
  }, [onChange]);

  return (
    <View ref={containerRef} onLayout={measure}>
      <AppInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        onFocus={measure}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        accessibilityLabel={accessibilityLabel}
        style={inputStyle}
        autoCorrect={false}
        autoCapitalize="words"
      />

      {suggestions.length > 0 && layout && (
        <Modal transparent visible animationType="none" statusBarTranslucent>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSuggestions([])} />
          <View
            style={[
              styles.dropdown,
              {
                top: layout.y + layout.height + 4,
                left: layout.x,
                width: layout.width,
              },
            ]}
          >
            {suggestions.map((s) => (
              <Pressable
                key={s}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                onPress={() => handleSelect(s)}
                accessibilityRole="button"
              >
                <AppText variant="body" style={styles.itemText}>{s}</AppText>
              </Pressable>
            ))}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    position: "absolute",
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
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
