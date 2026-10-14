"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { UlohyLink as Link } from "@/components/ulohy-link";

import { ChessboardPlayer } from "@/components/chessboard-player";
import { PuzzleDetailsCard } from "@/components/puzzle-details-card";
import { PuzzleSidebar } from "@/components/puzzle-sidebar";
import { SquaresBoard, type SquaresBoardHandle } from "@/components/squares-board";
import {
  TrainerControlsProvider,
  useTrainerControls,
} from "@/components/trainer-controls-provider";
import { useAuth } from "@/components/auth-provider";
import { useReviewPrefs } from "@/components/review-prefs-provider";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { buildLine, startFenForLine } from "@/lib/chess";
import {
  DEMO_CURRICULUM,
  bindPuzzlesToCurriculum,
  chapterHref,
  chapterKindOf,
  chapterParam,
  chapterScopeIds,
  findCourse,
  puzzlesInChapter,
  resolveChapterPath,
  sortPuzzles,
  withMateSubchapters,
  type Curriculum,
} from "@/lib/curriculum";
import { isEmptyBoardMarkup, recolorGreenDefense, visibleMarkup } from "@/lib/markup";
import {
  clearChapterWip,
  finishChapterRun,
  formatPracticeDuration,
  getPracticeSnapshot,
  noteWrongTrainResult,
  recordChapterFail,
  startChapterWip,
  updateChapterWip,
  wrongPoolIds,
  type ChapterAnswer,
} from "@/lib/practice-store";
import { puzzleKind } from "@/lib/puzzles";
import {
  filterLessonPuzzles,
  isFirstPass,
  orderSessionPuzzles,
  sessionShouldShuffle,
} from "@/lib/queue-order";
import {
  buildTrainQueue,
  formatSrsCard,
  getSrsSnapshot,
  gradePuzzle,
} from "@/lib/srs";
import type { Puzzle, PuzzleKind, WrongReply } from "@/lib/types";
import { resolveWrongReplyText } from "@/lib/wrong-reply-codes";
import { matchWrongReply } from "@/lib/wrong-replies";

function kindFromWindow(): PuzzleKind | "all" {
  if (typeof window === "undefined") return "all";
  const kind = new URLSearchParams(window.location.search).get("kind");
  return kind === "squares" || kind === "move" ? kind : "all";
}

export type PracticeMode = "chapter" | "wrong";

type PuzzleTrainerProps = {
  initialCurriculum?: Curriculum;
  initialPuzzles?: Puzzle[];
  title?: string;
  backHref?: string;
  backLabel?: string;
  reviewOnly?: boolean;
  courseSlug?: string;
  chapterSlug?: string[];
  practiceMode?: PracticeMode | null;
  practiceChapterId?: string;
  resumeWip?: boolean;
};

export function PuzzleTrainer({
  initialCurriculum,
  initialPuzzles,
  title,
  backHref,
  backLabel,
  reviewOnly = false,
  courseSlug,
  chapterSlug,
  practiceMode = null,
  practiceChapterId,
  resumeWip = false,
}: PuzzleTrainerProps) {
  const { user, ready: authReady } = useAuth();
  const { prefs, hydrated: prefsReady } = useReviewPrefs();
  const lessonMode = prefs.lessonMode;
  const slugs = chapterParam(chapterSlug);
  const startKind = kindFromWindow();
  const isPractice = practiceMode === "chapter" || practiceMode === "wrong";

  const [puzzles, setPuzzles] = useState<Puzzle[]>(initialPuzzles ?? []);
  const [curriculum, setCurriculum] = useState<Curriculum>(
    initialCurriculum ?? DEMO_CURRICULUM,
  );
  const [filter, setFilter] = useState<PuzzleKind | "all">(startKind);
  const [index, setIndex] = useState(0);
  const [ply, setPly] = useState(0);
  const [loading, setLoading] = useState(!initialPuzzles);
  const [wrongHit, setWrongHit] = useState<WrongReply | null>(null);
  const wrongNote = resolveWrongReplyText(wrongHit?.text) || null;
  const [queue, setQueue] = useState<Puzzle[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [srsNote, setSrsNote] = useState<string | null>(null);
  const [srsReady, setSrsReady] = useState(false);
  const [lockedOrder, setLockedOrder] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [penaltyMs, setPenaltyMs] = useState(0);
  const [answers, setAnswers] = useState<ChapterAnswer[]>([]);
  const [chapterDone, setChapterDone] = useState(false);
  const squaresRef = useRef<SquaresBoardHandle>(null);
  const failedRef = useRef(false);
  const recordedRef = useRef<string | null>(null);
  const puzzleTickRef = useRef(Date.now());
  const answersRef = useRef<ChapterAnswer[]>([]);
  answersRef.current = answers;

  useEffect(() => {
    if (!wrongNote) return;
    if (wrongHit?.markup && !isEmptyBoardMarkup(wrongHit.markup)) return;
    const timer = window.setTimeout(() => setWrongHit(null), 3000);
    return () => window.clearTimeout(timer);
  }, [wrongHit, wrongNote]);

  useEffect(() => {
    if (initialPuzzles) return;
    let cancelled = false;

    async function load() {
      try {
        const [puzzleRes, curRes] = await Promise.all([
          fetchWithAuth("/api/puzzles"),
          fetchWithAuth("/api/curriculum"),
        ]);
        let nextCurriculum = DEMO_CURRICULUM;
        let nextPuzzles: Puzzle[] = [];
        if (curRes.ok) {
          const data = (await curRes.json()) as { curriculum?: Curriculum };
          if (data.curriculum?.courses?.length) {
            nextCurriculum = withMateSubchapters(data.curriculum);
          }
        }
        if (puzzleRes.ok) {
          const data = (await puzzleRes.json()) as { puzzles?: Puzzle[] };
          nextPuzzles = data.puzzles ?? [];
        }
        if (!cancelled) {
          setCurriculum(nextCurriculum);
          setPuzzles(
            bindPuzzlesToCurriculum(nextPuzzles, nextCurriculum.chapters),
          );
        }
      } catch {
        /* demo puzzles stay */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const course = findCourse(curriculum, courseSlug);
  const chapter = course
    ? resolveChapterPath(curriculum, course.id, slugs)
    : undefined;
  const parent = chapter?.parentId
    ? curriculum.chapters.find((item) => item.id === chapter.parentId)
    : undefined;
  const lastSlug = slugs[slugs.length - 1];
  const scopeIds = chapterScopeIds(curriculum, courseSlug, lastSlug);

  const scoped = useMemo(() => {
    const inScope =
      slugs.length === 0 || !scopeIds
        ? puzzles
        : puzzles.filter(
            (puzzle) => puzzle.chapterId && scopeIds.has(puzzle.chapterId),
          );
    return sortPuzzles(
      reviewOnly
        ? inScope
        : filterLessonPuzzles(inScope, curriculum.chapters, lessonMode),
    );
  }, [curriculum.chapters, lessonMode, puzzles, reviewOnly, scopeIds, slugs.length]);

  const visible = useMemo(
    () =>
      filter === "all"
        ? scoped
        : scoped.filter((puzzle) => puzzleKind(puzzle) === filter),
    [filter, scoped],
  );
  const source = visible.length > 0 ? visible : scoped;
  const sourceKey = source.map((puzzle) => puzzle.id).join("\n");
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    if (!authReady || !prefsReady) return;
    const items = sourceRef.current;
    const practice = getPracticeSnapshot();

    if (practiceMode === "chapter" && practiceChapterId) {
      const chapterItems =
        items.length > 0
          ? items
          : puzzlesInChapter(
              puzzles,
              practiceChapterId,
              false,
              curriculum.chapters,
            );
      const wip =
        resumeWip && practice.wip?.chapterId === practiceChapterId
          ? practice.wip
          : null;
      const ordered = wip
        ? wip.puzzleIds
            .map((id) => chapterItems.find((item) => item.id === id))
            .filter((item): item is Puzzle => Boolean(item))
        : sortPuzzles(chapterItems);
      if (!wip) startChapterWip(
        practiceChapterId,
        ordered.map((item) => item.id),
      );
      setLockedOrder(true);
      setQueue(ordered);
      setSessionTotal(ordered.length);
      setIndex(wip?.index ?? 0);
      setElapsedMs(wip?.elapsedMs ?? 0);
      setPenaltyMs(wip?.penaltyMs ?? 0);
      setAnswers(wip?.answers ?? []);
      setChapterDone(false);
      setPaused(false);
      setPly(0);
      failedRef.current = false;
      recordedRef.current = null;
      setSrsNote(null);
      setSrsReady(true);
      puzzleTickRef.current = Date.now();
      return;
    }

    if (practiceMode === "wrong") {
      const ids = new Set(wrongPoolIds(practice));
      const ordered = sortPuzzles(items.filter((item) => ids.has(item.id)));
      setLockedOrder(false);
      setQueue(ordered);
      setSessionTotal(ordered.length);
      setIndex(0);
      setPly(0);
      setChapterDone(false);
      setPaused(false);
      failedRef.current = false;
      recordedRef.current = null;
      setSrsNote(null);
      setSrsReady(true);
      return;
    }

    const map = getSrsSnapshot();
    const queued = user
      ? buildTrainQueue(items, map, Date.now(), reviewOnly)
      : items;
    const firstPass = !user || isFirstPass(
      items.map((item) => item.id),
      map,
    );
    const kind = chapterKindOf(chapter);
    const shuffle = sessionShouldShuffle({
      kind,
      reviewOnly,
      firstPass,
      lessonMode,
    });
    const next = orderSessionPuzzles(
      queued,
      shuffle,
      curriculum.chapters,
      lessonMode,
    );
    setLockedOrder(!shuffle);
    setQueue(next);
    setSessionTotal(next.length);
    setIndex(0);
    setPly(0);
    failedRef.current = false;
    recordedRef.current = null;
    setSrsNote(null);
    setSrsReady(true);
  }, [
    authReady,
    chapter?.id,
    chapter?.kind,
    curriculum.chapters,
    lessonMode,
    practiceChapterId,
    practiceMode,
    prefsReady,
    puzzles,
    resumeWip,
    reviewOnly,
    sourceKey,
    user,
  ]);

  useEffect(() => {
    if (practiceMode !== "chapter" || paused || chapterDone) return;
    const timer = window.setInterval(() => {
      setElapsedMs((current) => current + 250);
    }, 250);
    return () => window.clearInterval(timer);
  }, [chapterDone, paused, practiceMode]);

  useEffect(() => {
    if (practiceMode !== "chapter" || !practiceChapterId || chapterDone) return;
    updateChapterWip({
      index,
      elapsedMs,
      penaltyMs,
      answers,
    });
  }, [
    answers,
    chapterDone,
    elapsedMs,
    index,
    penaltyMs,
    practiceChapterId,
    practiceMode,
  ]);

  useEffect(() => {
    if (queue.length === 0) return;
    if (index >= queue.length) setIndex(0);
  }, [index, queue.length]);

  const list = queue;
  const puzzle = list[index];
  const kind = puzzle ? puzzleKind(puzzle) : "move";
  const isSquares = kind === "squares";

  const startFen = useMemo(() => {
    if (!puzzle) return "";
    return isSquares ? puzzle.fen : startFenForLine(puzzle.fen, puzzle.moves);
  }, [isSquares, puzzle]);
  const line = useMemo(
    () =>
      !puzzle
        ? { fens: [""], plies: [], lastMoves: [null] }
        : isSquares
          ? { fens: [puzzle.fen], plies: [], lastMoves: [null] }
          : buildLine(startFen, puzzle.moves),
    [isSquares, puzzle, startFen],
  );
  const maxPly = isSquares ? 1 : line.plies.length;
  const atEnd = maxPly > 0 && ply >= maxPly;

  const puzzleRef = useRef(puzzle);
  puzzleRef.current = puzzle;
  const plyRef = useRef(ply);
  plyRef.current = ply;
  const lineRef = useRef(line);
  lineRef.current = line;
  const maxPlyRef = useRef(maxPly);
  maxPlyRef.current = maxPly;

  const boardMarkup = useMemo(() => {
    if (wrongHit?.markup && !isEmptyBoardMarkup(wrongHit.markup)) {
      return recolorGreenDefense(wrongHit.markup);
    }
    return prefs.showMarkup ? visibleMarkup(puzzle?.markup, atEnd, ply) : undefined;
  }, [atEnd, ply, prefs.showMarkup, puzzle, wrongHit]);

  const goToPuzzle = useCallback((nextIndex: number) => {
    setWrongHit(null);
    setSrsNote(null);
    setPly(0);
    setIndex(nextIndex);
    failedRef.current = false;
    recordedRef.current = null;
  }, []);

  const onPly = useCallback((next: number) => {
    setPly((current) => Math.max(0, Math.min(next, maxPlyRef.current)));
  }, []);

  const onCorrect = useCallback(() => {
    setWrongHit(null);
    setPly((current) => Math.min(current + 1, maxPlyRef.current));
  }, []);

  const markFail = useCallback(() => {
    if (failedRef.current) return;
    failedRef.current = true;
    if (practiceMode === "chapter") {
      recordChapterFail(prefs.penaltySeconds);
      setPenaltyMs((current) => current + prefs.penaltySeconds * 1000);
    }
  }, [practiceMode, prefs.penaltySeconds]);

  const onWrongMove = useCallback(
    (uci: string) => {
      const current = puzzleRef.current;
      if (!current || paused) return;
      markFail();
      setWrongHit(
        matchWrongReply(current.wrongReplies, {
          uci,
          fen: lineRef.current.fens[plyRef.current] ?? current.fen,
        }) ?? null,
      );
    },
    [markFail, paused],
  );

  const onWrongSquares = useCallback(
    (squares: string[]) => {
      const current = puzzleRef.current;
      if (!current || paused) return;
      markFail();
      setWrongHit(matchWrongReply(current.wrongReplies, { squares }) ?? null);
    },
    [markFail, paused],
  );

  const finishChapterIfDone = useCallback(
    (nextAnswers: ChapterAnswer[]) => {
      if (!practiceChapterId) return;
      const best = finishChapterRun({
        chapterId: practiceChapterId,
        answers: nextAnswers,
        elapsedMs,
        penaltyMs,
      });
      setChapterDone(true);
      setSrsNote(
        best.perfect
          ? `Kapitola 100 % · ${formatPracticeDuration(best.elapsedMs)}`
          : `Hotovo · ${Math.round((best.correct / Math.max(1, best.correct + best.wrong)) * 100)} %`,
      );
    },
    [elapsedMs, penaltyMs, practiceChapterId],
  );

  const onNext = useCallback(() => {
    if (paused) return;
    if (!atEnd && isSquares) {
      squaresRef.current?.check();
      return;
    }
    if (!atEnd) {
      if (list.length === 0) return;
      goToPuzzle((index + 1) % list.length);
      return;
    }

    const current = list[index];
    const failed = failedRef.current;
    const puzzleElapsed = Math.max(0, Date.now() - puzzleTickRef.current);

    if (practiceMode === "chapter" && current) {
      const answer: ChapterAnswer = {
        puzzleId: current.id,
        failed,
        elapsedMs: puzzleElapsed,
      };
      const nextAnswers = [...answersRef.current, answer];
      setAnswers(nextAnswers);
      const nextQueue = list.filter((_, itemIndex) => itemIndex !== index);
      setQueue(nextQueue);
      failedRef.current = false;
      recordedRef.current = null;
      setWrongHit(null);
      setPly(0);
      puzzleTickRef.current = Date.now();
      if (nextQueue.length === 0) {
        finishChapterIfDone(nextAnswers);
        return;
      }
      setIndex(0);
      return;
    }

    if (practiceMode === "wrong" && current) {
      noteWrongTrainResult(current.id, failed);
      setQueue((currentQueue) =>
        currentQueue.filter((_, itemIndex) => itemIndex !== index),
      );
      failedRef.current = false;
      recordedRef.current = null;
      setSrsNote(null);
      setWrongHit(null);
      setPly(0);
      return;
    }

    if (!user) {
      if (list.length === 0) return;
      goToPuzzle((index + 1) % list.length);
      return;
    }
    setQueue((currentQueue) => {
      const next = currentQueue.filter((_, itemIndex) => itemIndex !== index);
      if (failed && current) {
        next.splice(Math.min(index + 2, next.length), 0, current);
      }
      return next;
    });
    failedRef.current = false;
    recordedRef.current = null;
    setSrsNote(null);
    setWrongHit(null);
    setPly(0);
  }, [
    atEnd,
    finishChapterIfDone,
    goToPuzzle,
    index,
    isSquares,
    list,
    paused,
    practiceMode,
    user,
  ]);

  const onCram = useCallback(() => {
    const items = sourceRef.current;
    setQueue(orderSessionPuzzles(items, true));
    setLockedOrder(false);
    setSessionTotal(items.length);
    setIndex(0);
    setPly(0);
    failedRef.current = false;
    recordedRef.current = null;
    setSrsNote(null);
  }, []);

  const onShuffle = useCallback(() => {
    setQueue((current) => {
      if (current.length < 2) return current;
      const copy = [...current];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
    setIndex(0);
    setPly(0);
    failedRef.current = false;
    recordedRef.current = null;
    setSrsNote(null);
    setWrongHit(null);
  }, []);

  useEffect(() => {
    if (isPractice) return;
    if (!user || !puzzle || !atEnd) return;
    if (recordedRef.current === puzzle.id) return;
    recordedRef.current = puzzle.id;
    void gradePuzzle(puzzle.id, failedRef.current ? "again" : "good").then(
      (card) => {
        if (card) setSrsNote(formatSrsCard(card));
      },
    );
  }, [atEnd, isPractice, puzzle, user]);

  useEffect(() => {
    setPly(0);
    setWrongHit(null);
    if (!isPractice) setSrsNote(null);
    puzzleTickRef.current = Date.now();
  }, [isPractice, puzzle?.id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code !== "Space" && event.key !== " ") return;
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (typing) return;
      if (paused || chapterDone) return;
      if (!atEnd) return;
      event.preventDefault();
      onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [atEnd, chapterDone, onNext, paused]);

  const doneToday =
    !isPractice &&
    Boolean(user) &&
    srsReady &&
    source.length > 0 &&
    list.length === 0;
  const practiceEmpty =
    isPractice && srsReady && list.length === 0 && !chapterDone;
  const reviewEmpty = Boolean(user) && reviewOnly && doneToday;
  const footerCopy = paused
    ? "Pauza. Deska je rozmazaná."
    : chapterDone
      ? srsNote ?? "Kapitola hotová."
      : practiceEmpty
        ? practiceMode === "wrong"
          ? "Žádné špatné úlohy."
          : "V kapitole nejsou úlohy."
        : reviewEmpty
          ? "Nic k opakování. Nejdřív studuj kapitolu."
          : doneToday
            ? "Hotovo na dnes."
            : atEnd
              ? "Hotovo. Mezerník nebo Další."
              : isSquares
                ? "Označ pole. Pak Zkontrolovat."
                : wrongHit && prefs.wrongSnap === "click"
                  ? "Klikni na šachovnici a pokračuj"
                  : "Zahraj tah.";

  return (
    <TrainerControlsProvider>
    <div className="grid h-full min-h-0 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
      <div className="hidden min-h-0 lg:block">
        <PuzzleSidebar
          puzzles={list}
          index={index}
          filter={filter}
          onFilter={setFilter}
          onSelect={goToPuzzle}
          onShuffle={onShuffle}
          shuffleLocked={lockedOrder || practiceMode === "chapter"}
          lockHint={
            practiceMode === "chapter"
              ? "Pořadí kapitoly."
              : lessonMode === "colors"
                ? "Nejdřív bílé, pak černé."
                : "Po kapitolách. Naše pořadí."
          }
          title={title ?? chapter?.title ?? "Úlohy"}
          backHref={
            backHref ??
            (course && parent
              ? chapterHref(course.slug, curriculum.chapters, parent)
              : course
                ? `/ulohy/${course.slug}`
                : "/ulohy")
          }
          backLabel={backLabel ?? parent?.title ?? course?.title ?? "Kapitoly"}
          doneCount={Math.max(0, sessionTotal - list.length)}
          sessionTotal={sessionTotal}
        />
      </div>

      <section className="flex min-h-0 flex-col bg-background">
        {practiceMode === "chapter" ? (
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2 text-sm">
            <span className="tabular-nums text-muted-foreground">
              {formatPracticeDuration(elapsedMs)}
              {penaltyMs > 0
                ? ` · s penalizací ${formatPracticeDuration(elapsedMs + penaltyMs)}`
                : ""}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPaused((value) => !value)}
                disabled={chapterDone}
              >
                {paused ? "Pokračovat" : "Pauza"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!practiceChapterId) return;
                  clearChapterWip(practiceChapterId);
                  startChapterWip(
                    practiceChapterId,
                    sortPuzzles(sourceRef.current).map((item) => item.id),
                  );
                  setAnswers([]);
                  setElapsedMs(0);
                  setPenaltyMs(0);
                  setChapterDone(false);
                  setPaused(false);
                  setQueue(sortPuzzles(sourceRef.current));
                  setSessionTotal(sourceRef.current.length);
                  setIndex(0);
                  setPly(0);
                }}
              >
                Znovu
              </Button>
            </div>
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-[min(100%,calc(100dvh-11rem))]">
            {!srsReady || (loading && !puzzle && !doneToday && !chapterDone && !practiceEmpty) ? (
              <div className="aspect-square w-full rounded-xl bg-muted/50" />
            ) : chapterDone ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                <p className="text-base font-semibold text-foreground">
                  {srsNote ?? "Kapitola hotová"}
                </p>
                <p className="mt-2">
                  Průměr{" "}
                  {formatPracticeDuration(
                    answers.length ? elapsedMs / answers.length : 0,
                  )}{" "}
                  na úlohu
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button asChild variant="outline">
                    <Link href="/ulohy/motivace">Motivace</Link>
                  </Button>
                </div>
              </div>
            ) : doneToday ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                {reviewOnly
                  ? "Nic k opakování. Opakovat jde jen úlohy, které už jsi studoval."
                  : "Hotovo na dnes. Další karta až bude splatná."}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {reviewOnly ? (
                    <Button asChild variant="outline">
                      <Link href="/ulohy">Ke kapitolám</Link>
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={onCram}>
                      Cvičit znovu
                    </Button>
                  )}
                </div>
              </div>
            ) : !puzzle || practiceEmpty || scoped.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                {practiceMode === "wrong"
                  ? "Žádné špatné úlohy k tréninku."
                  : "V kapitole nejsou úlohy."}
                <div className="mt-4">
                  <Button asChild variant="outline">
                    <Link
                      href={
                        backHref ??
                        (course && parent
                          ? chapterHref(course.slug, curriculum.chapters, parent)
                          : course
                            ? `/ulohy/${course.slug}`
                            : "/ulohy")
                      }
                    >
                      Zpět
                    </Link>
                  </Button>
                </div>
              </div>
            ) : puzzle && isSquares ? (
              <div className={paused ? "pointer-events-none blur-md" : undefined}>
                <SquaresBoard
                  key={puzzle.id}
                  ref={squaresRef}
                  fen={puzzle.fen}
                  expectedSquares={puzzle.squares}
                  interactive={!atEnd && !paused}
                  onCorrect={onCorrect}
                  onWrong={onWrongSquares}
                  markup={boardMarkup}
                />
              </div>
            ) : puzzle ? (
              <div className={paused ? "pointer-events-none blur-md" : undefined}>
                <ChessboardPlayer
                  key={puzzle.id}
                  positionFen={line.fens[ply] ?? startFen}
                  orientationFen={startFen}
                  lastMove={line.lastMoves[ply] ?? null}
                  interactive={!atEnd && !paused}
                  expectedUci={line.plies[ply]?.uci ?? puzzle.moves[0] ?? ""}
                  onCorrect={onCorrect}
                  onWrong={onWrongMove}
                  onRetry={() => setWrongHit(null)}
                  snapMode={prefs.wrongSnap}
                  markup={boardMarkup}
                />
              </div>
            ) : null}
            {paused ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/40">
                <Button type="button" onClick={() => setPaused(false)}>
                  Pokračovat
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-[4.25rem] items-center justify-between gap-3 border-t border-border bg-panel px-4 py-3">
          <div className="min-w-0">
            <p
              className={
                wrongHit && prefs.wrongSnap === "click"
                  ? "text-sm font-medium text-foreground"
                  : "text-sm text-muted-foreground"
              }
            >
              {footerCopy}
            </p>
            <select
              className="mt-2 w-full max-w-xs rounded-md border border-border bg-background px-2 py-1 text-xs lg:hidden"
              value={index}
              onChange={(event) => goToPuzzle(Number(event.target.value))}
            >
              {list.map((item, puzzleIndex) => (
                <option key={item.id} value={puzzleIndex}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          {chapterDone || (isPractice && practiceEmpty) ? (
            <Button asChild variant="outline" className="shrink-0">
              <Link href={backHref ?? "/ulohy/motivace"}>
                {practiceMode ? "Motivace" : "Zpět"}
              </Link>
            </Button>
          ) : reviewOnly && doneToday ? (
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/ulohy">Kapitoly</Link>
            </Button>
          ) : (
            <Button
              type="button"
              className="h-9 w-[9.75rem] shrink-0"
              onClick={doneToday ? onCram : onNext}
              disabled={paused || (!doneToday && !puzzle)}
            >
              {doneToday
                ? "Cvičit znovu"
                : atEnd
                  ? "Další úloha"
                  : isSquares
                    ? "Zkontrolovat"
                    : "Přeskočit"}
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </section>

      <div className="hidden min-h-0 lg:block">
        {puzzle ? (
          <PuzzleDetailsCard
            puzzle={puzzle}
            plies={line.plies}
            ply={ply}
            onPly={onPly}
            wrongNote={wrongNote}
            srsNote={atEnd ? srsNote : null}
          />
        ) : null}
      </div>

      <div className="border-t border-border/60 bg-panel p-3 lg:hidden">
        {puzzle ? (
          <PuzzleDetailsCard
            puzzle={puzzle}
            plies={line.plies}
            ply={ply}
            onPly={onPly}
            wrongNote={wrongNote}
            srsNote={atEnd ? srsNote : null}
          />
        ) : null}
        {loading ? (
          <p className="mt-2 text-xs text-muted-foreground">Načítám úlohy…</p>
        ) : null}
      </div>
      <AutoNextOnSolve
        atEnd={atEnd && !paused && !chapterDone}
        puzzleId={puzzle?.id}
        onNext={onNext}
      />
    </div>
    </TrainerControlsProvider>
  );
}

function AutoNextOnSolve({
  atEnd,
  puzzleId,
  onNext,
}: {
  atEnd: boolean;
  puzzleId?: string;
  onNext: () => void;
}) {
  const { autoNext } = useTrainerControls();
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!autoNext || !atEnd || !puzzleId) return;
    if (firedFor.current === puzzleId) return;
    firedFor.current = puzzleId;
    const timer = window.setTimeout(() => onNextRef.current(), 1200);
    return () => window.clearTimeout(timer);
  }, [atEnd, autoNext, puzzleId]);

  return null;
}
