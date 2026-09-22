"use client";

import { useEffect, useRef } from "react";

import { useAuth } from "@/components/auth-provider";
import { useBoardAppearance } from "@/components/board-appearance-provider";
import { useReviewPrefs } from "@/components/review-prefs-provider";
import { useTheme } from "@/components/theme-provider";
import { prefsFromMetadata, serializePrefs, type Prefs } from "@/lib/prefs";
import { createBrowserSupabase } from "@/lib/supabase";

export function PrefsCloudSync() {
  const { user, ready } = useAuth();
  const { mode, setMode, hydrated: themeReady } = useTheme();
  const {
    boardId,
    pieceId,
    setBoardId,
    setPieceId,
    hydrated: boardReady,
  } = useBoardAppearance();
  const {
    prefs: review,
    setPrefs: setReview,
    hydrated: reviewReady,
  } = useReviewPrefs();
  const appliedFor = useRef<string | null>(null);
  const lastSaved = useRef("");

  useEffect(() => {
    if (!ready || !themeReady || !boardReady || !reviewReady) return;
    if (!user) {
      appliedFor.current = null;
      return;
    }
    if (appliedFor.current === user.id) return;
    appliedFor.current = user.id;
    const remote = prefsFromMetadata(user.user_metadata);
    if (remote.theme) setMode(remote.theme);
    if (remote.boardId) setBoardId(remote.boardId);
    if (remote.pieceId) setPieceId(remote.pieceId);
    if (
      remote.goodIntervals !== undefined ||
      remote.againIntervals !== undefined ||
      remote.againTimes !== undefined
    ) {
      setReview({
        goodIntervals: remote.goodIntervals ?? review.goodIntervals,
        againIntervals: remote.againIntervals ?? review.againIntervals,
        againTimes: remote.againTimes ?? review.againTimes,
        intervalUnit: "min",
      });
    }
    const merged: Prefs = {
      theme: remote.theme ?? mode,
      boardId: remote.boardId ?? boardId,
      pieceId: remote.pieceId ?? pieceId,
      goodIntervals: remote.goodIntervals ?? review.goodIntervals,
      againIntervals: remote.againIntervals ?? review.againIntervals,
      againTimes: remote.againTimes ?? review.againTimes,
      intervalUnit: "min",
    };
    const hasRemote = Object.keys(remote).length > 0;
    lastSaved.current = hasRemote ? serializePrefs(merged) : "";
  }, [
    ready,
    user,
    themeReady,
    boardReady,
    reviewReady,
    mode,
    boardId,
    pieceId,
    review,
    setMode,
    setBoardId,
    setPieceId,
    setReview,
  ]);

  useEffect(() => {
    if (!ready || !user || !themeReady || !boardReady || !reviewReady) return;
    if (appliedFor.current !== user.id) return;
    const prefs: Prefs = {
      theme: mode,
      boardId,
      pieceId,
      goodIntervals: review.goodIntervals,
      againIntervals: review.againIntervals,
      againTimes: review.againTimes,
      intervalUnit: "min",
    };
    const packed = serializePrefs(prefs);
    if (packed === lastSaved.current) return;
    const timer = window.setTimeout(() => {
      lastSaved.current = packed;
      const supabase = createBrowserSupabase();
      void supabase?.auth.updateUser({ data: prefs });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    ready,
    user,
    themeReady,
    boardReady,
    reviewReady,
    mode,
    boardId,
    pieceId,
    review,
  ]);

  return null;
}
