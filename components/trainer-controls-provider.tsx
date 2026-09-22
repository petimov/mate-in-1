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

import { setBoardSoundEnabled } from "@/lib/board-sound";

const SOUND_KEY = "school-trainer-sound";
const AUTO_KEY = "school-trainer-auto-next";

type TrainerControlsValue = {
  flipped: boolean;
  sound: boolean;
  autoNext: boolean;
  toggleFlip: () => void;
  toggleSound: () => void;
  toggleAutoNext: () => void;
};

const TrainerControlsContext = createContext<TrainerControlsValue | null>(null);

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key);
    if (value === "1") return true;
    if (value === "0") return false;
  } catch {
    /* ignore */
  }
  return fallback;
}

function writeFlag(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function TrainerControlsProvider({ children }: { children: ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  const [sound, setSound] = useState(true);
  const [autoNext, setAutoNext] = useState(false);

  useEffect(() => {
    const nextSound = readFlag(SOUND_KEY, true);
    const nextAuto = readFlag(AUTO_KEY, false);
    setSound(nextSound);
    setAutoNext(nextAuto);
    setBoardSoundEnabled(nextSound);
  }, []);

  const toggleFlip = useCallback(() => {
    setFlipped((current) => !current);
  }, []);

  const toggleSound = useCallback(() => {
    setSound((current) => {
      const next = !current;
      writeFlag(SOUND_KEY, next);
      setBoardSoundEnabled(next);
      return next;
    });
  }, []);

  const toggleAutoNext = useCallback(() => {
    setAutoNext((current) => {
      const next = !current;
      writeFlag(AUTO_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<TrainerControlsValue>(
    () => ({
      flipped,
      sound,
      autoNext,
      toggleFlip,
      toggleSound,
      toggleAutoNext,
    }),
    [autoNext, flipped, sound, toggleAutoNext, toggleFlip, toggleSound],
  );

  return (
    <TrainerControlsContext.Provider value={value}>
      {children}
    </TrainerControlsContext.Provider>
  );
}

export function useTrainerControls(): TrainerControlsValue {
  const value = useContext(TrainerControlsContext);
  if (!value) {
    throw new Error("useTrainerControls needs TrainerControlsProvider");
  }
  return value;
}

export function flipOrientation(
  orientation: "white" | "black",
  flipped: boolean,
): "white" | "black" {
  if (!flipped) return orientation;
  return orientation === "white" ? "black" : "white";
}
