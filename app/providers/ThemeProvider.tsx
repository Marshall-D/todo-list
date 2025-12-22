// app/providers/ThemeProvider.tsx

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { View, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import colors from "../utils/themes/colors";

/**
 * ThemeProvider
 *
 * Responsibilities:
 * - Provide an app-wide theme context (mode: 'light' | 'dark' | 'system').
 * - Resolve the effective theme ('light' | 'dark') when 'system' is chosen.
 * - Persist user preference in AsyncStorage so the choice survives restarts.
 *
 * Notes:
 * - The provider renders a View that applies the resolved background color
 *   so the whole app appears immediately themed while navigation loads.
 * - The STORAGE_KEY value is used to persist user preference.
 */

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
  // detect system preference using react-native hook
  const system = useColorScheme();

  // internal mode stored as 'light' | 'dark' | 'system'
  const [mode, setModeInternal] = useState<ThemeMode>("system");

  // resolved theme applied across the app (either 'light' or 'dark')
  const resolved: "light" | "dark" =
    mode === "system" ? (system === "dark" ? "dark" : "light") : mode;

  // Load persisted preference on mount.
  // We wrap in an IIFE since useEffect cannot be async directly.
  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        if (v === "light" || v === "dark" || v === "system") {
          setModeInternal(v);
        }
      } catch (e) {
        // Non-fatal — fall back to default 'system'
        console.warn("Failed to read theme preference", e);
      }
    })();
  }, []);

  /**
   * setMode - persist user preference and update internal state.
   * We swallow storage errors but still update the UI to reflect the user's intent.
   */
  const setMode = async (m: ThemeMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, m);
      setModeInternal(m);
    } catch (e) {
      console.warn("Failed to save theme preference", e);
      // still update UI even if persistence failed
      setModeInternal(m);
    }
  };

  /**
   * toggle - convenience helper that flips between light/dark (ignores 'system').
   */
  const toggle = async () => {
    const next = mode === "dark" ? "light" : "dark";
    await setMode(next);
  };

  // Memoize context value to prevent unnecessary rerenders
  const value = useMemo(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved]
  );

  // Render provider. Wrap children in a View that applies the background color immediately,
  // ensuring there is no flash between themes on startup or when toggling.
  return (
    <ThemeContext.Provider value={value}>
      <View
        className={resolved === "dark" ? "dark flex-1" : "flex-1"}
        style={{
          flex: 1,
          backgroundColor:
            resolved === "dark" ? colors.brand.black : colors.brand.white,
        }}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

/**
 * useTheme - convenient hook for consuming theme context.
 * Throws if used outside a ThemeProvider to make bugs obvious.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
