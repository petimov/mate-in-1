"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { THEME_STORAGE_KEY } from "@/lib/theme";

export type ColorMode = "light" | "dark";

type ThemeContextValue = {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  toggle: () => void;
  hydrated: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyMode(mode: ColorMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    const next: ColorMode = stored === "light" ? "light" : "dark";
    setModeState(next);
    applyMode(next);
    setHydrated(true);
  }, []);

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
    applyMode(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({ mode, setMode, toggle, hydrated }),
    [mode, setMode, toggle, hydrated],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme needs ThemeProvider");
  return value;
}