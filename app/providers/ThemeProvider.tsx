// app/providers/ThemeProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { View, useColorScheme, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import colors from "../utils/themes/colors";

type ThemeMode = "light" | "dark" | "system";
const STORAGE_KEY = "themePreference";

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: "light" | "dark"; // actual applied theme
  setMode: (m: ThemeMode) => Promise<void>;
  toggle: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeInternal] = useState<ThemeMode>("system");

  const resolved: "light" | "dark" =
    mode === "system" ? (system === "dark" ? "dark" : "light") : mode;

  useEffect(() => {
    // load stored preference on mount
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        if (v === "light" || v === "dark" || v === "system") {
          setModeInternal(v);
        }
      } catch (e) {
        console.warn("Failed to read theme preference", e);
      }
    })();
  }, []);

  const setMode = async (m: ThemeMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, m);
      setModeInternal(m);
    } catch (e) {
      console.warn("Failed to save theme preference", e);
      setModeInternal(m);
    }
  };

  const toggle = async () => {
    const next = mode === "dark" ? "light" : "dark";
    await setMode(next);
  };

  const value = useMemo(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved]
  );

  // Root view: apply explicit backgroundColor for reliability AND apply `dark` class
  // so nativewind `dark:` variants still work for children.
  // NOTE: we intentionally use both a style backgroundColor (guaranteed) and className (nativewind)
  return (
    <ThemeContext.Provider value={value}>
      <View
        // nativewind class for `dark:` variants; keep flex-1 for layout
        className={resolved === "dark" ? "dark flex-1" : "flex-1"}
        // explicit background ensures whole app is black in dark mode immediately
        style={{
          flex: 1,
          backgroundColor:
            resolved === "dark" ? colors.brand.black : colors.brand.white,
        }}
      >
        {/* small dev badge — remove later */}
        <View style={styles.badgeContainer} pointerEvents="none">
          <Text
            style={[
              styles.badge,
              { color: resolved === "dark" ? "#fff" : "#000" },
            ]}
          >
            theme: {resolved}
          </Text>
        </View>

        {children}
      </View>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 1000,
  },
  badge: {
    backgroundColor: "transparent",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontFamily: "Jakarta",
    // slight text shadow for readability
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowRadius: 1,
  },
});

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
