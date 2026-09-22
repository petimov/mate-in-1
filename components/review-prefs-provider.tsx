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

import {
  DEFAULT_REVIEW_PREFS,
  getReviewPrefs,
  loadReviewPrefsFromStorage,
  setReviewPrefs as writeReviewPrefs,
  type ReviewPrefs,
} from "@/lib/review-prefs";

type ReviewPrefsContextValue = {
  prefs: ReviewPrefs;
  setPrefs: (next: ReviewPrefs) => void;
  hydrated: boolean;
};

const ReviewPrefsContext = createContext<ReviewPrefsContextValue | null>(null);

export function ReviewPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<ReviewPrefs>(DEFAULT_REVIEW_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefsState(loadReviewPrefsFromStorage());
    setHydrated(true);
  }, []);

  const setPrefs = useCallback((next: ReviewPrefs) => {
    writeReviewPrefs(next);
    setPrefsState({ ...getReviewPrefs() });
  }, []);

  const value = useMemo(
    () => ({ prefs, setPrefs, hydrated }),
    [prefs, setPrefs, hydrated],
  );

  return (
    <ReviewPrefsContext.Provider value={value}>
      {children}
    </ReviewPrefsContext.Provider>
  );
}

export function useReviewPrefs() {
  const value = useContext(ReviewPrefsContext);
  if (!value) throw new Error("useReviewPrefs needs ReviewPrefsProvider");
  return value;
}
