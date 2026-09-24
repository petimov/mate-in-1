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
  resolveChapterPath,
  sortPuzzles,
  withMateSubchapters,
  type Curriculum,
} from "@/lib/curriculum";
import { visibleMarkup } from "@/lib/markup";
import { puzzleKind } from "@/lib/puzzles";
import type { Puzzle, PuzzleKind } from "@/lib/types";
import { matchWrongReply } from "@/lib/wrong-replies";
import {
  buildTrainQueue,
  formatSrsCard,
  getSrsSnapshot,
  gradePuzzle,
} from "@/lib/srs";
import {
  isFirstPass,
  orderSessionPuzzles,
  sessionShouldShuffle,
} from "@/lib/queue-order";
function kindFromWindow(): PuzzleKind | "all" {
  if (typeof window === "undefined") return "all";
  const kind = new URLSearchParams(window.location.search).get("kind");
  return kind === "squares" || kind === "move" ? kind : "all";
}

type PuzzleTrainerProps = {
  initialCurriculum?: Curriculum;
  initialPuzzles?: Puzzle[];
  title?: string;
  backHref?: string;
  backLabel?: string;
  reviewOnly?: boolean;
  courseSlug?: string;
  chapterSlug?: string[];
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
}: PuzzleTrainerProps) {
  const { user, ready: authReady } = useAuth();
  const slugs = chapterParam(chapterSlug);
  const startKind = kindFromWindow();

  const [puzzles, setPuzzles] = useState<Puzzle[]>(initialPuzzles ?? []);
  const [curriculum, setCurriculum] = useState<Curriculum>(
    initialCurriculum ?? DEMO_CURRICULUM,
  );
  const [filter, setFilter] = useState<PuzzleKind | "all">(startKind);
  const [index, setIndex] = useState(0);
  const [ply, setPly] = useState(0);
  const [loading, setLoading] = useState(!initialPuzzles);
  const [wrongNote, setWrongNote] = useState<string | null>(null);
  const [queue, setQueue] = useState<Puzzle[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [srsNote, setSrsNote] = useState<string | null>(null);
  const [srsReady, setSrsReady] = useState(false);
  const [lockedOrder, setLockedOrder] = useState(false);
  const squaresRef = useRef<SquaresBoardHandle>(null);
  const failedRef = useRef(false);
  const recordedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!wrongNote) return;
    const timer = window.setTimeout(() => setWrongNote(null), 3000);
    return () => window.clearTimeout(timer);
  }, [wrongNote]);

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
    if (slugs.length === 0) return puzzles;
    if (!scopeIds) return puzzles;
    return sortPuzzles(
      puzzles.filter(
        (puzzle) => puzzle.chapterId && scopeIds.has(puzzle.chapterId),
      ),
    );
  }, [slugs.length, puzzles, scopeIds]);

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
    if (!authReady) return;
    const items = sourceRef.current;
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
    });
    const next = orderSessionPuzzles(queued, shuffle);
    setLockedOrder(!shuffle);
    setQueue(next);
    setSessionTotal(next.length);
    setIndex(0);
    setPly(0);
    failedRef.current = false;
    recordedRef.current = null;
    setSrsNote(null);
    setSrsReady(true);
  }, [authReady, chapter?.id, chapter?.kind, reviewOnly, sourceKey, user]);

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

  const boardMarkup = useMemo(
    () => visibleMarkup(puzzle?.markup, atEnd),
    [atEnd, puzzle],
  );

  const goToPuzzle = useCallback((nextIndex: number) => {
    setWrongNote(null);
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
    setWrongNote(null);
    setPly((current) => Math.min(current + 1, maxPlyRef.current));
  }, []);

  const onWrongMove = useCallback((uci: string) => {
    const current = puzzleRef.current;
    if (!current) return;
    failedRef.current = true;
    setWrongNote(
      matchWrongReply(current.wrongReplies, {
        uci,
        fen: lineRef.current.fens[plyRef.current] ?? current.fen,
      }) ?? null,
    );
  }, []);

  const onWrongSquares = useCallback((squares: string[]) => {
    const current = puzzleRef.current;
    if (!current) return;
    failedRef.current = true;
    setWrongNote(matchWrongReply(current.wrongReplies, { squares }) ?? null);
  }, []);

  const onNext = useCallback(() => {
    if (!atEnd && isSquares) {
      squaresRef.current?.check();
      return;
    }
    if (!atEnd) {
      if (list.length === 0) return;
      goToPuzzle((index + 1) % list.length);
      return;
    }
    if (!user) {
      if (list.length === 0) return;
      goToPuzzle((index + 1) % list.length);
      return;
    }
    const current = list[index];
    const failed = failedRef.current;
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
    setWrongNote(null);
    setPly(0);
  }, [atEnd, goToPuzzle, index, isSquares, list, user]);

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
    setWrongNote(null);
  }, []);

  useEffect(() => {
    if (!user || !puzzle || !atEnd) return;
    if (recordedRef.current === puzzle.id) return;
    recordedRef.current = puzzle.id;
    void gradePuzzle(puzzle.id, failedRef.current ? "again" : "good").then(
      (card) => {
        if (card) setSrsNote(formatSrsCard(card));
      },
    );
  }, [atEnd, puzzle, user]);

  useEffect(() => {
    setPly(0);
    setWrongNote(null);
    setSrsNote(null);
  }, [puzzle?.id]);

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
      if (!atEnd) return;
      event.preventDefault();
      onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [atEnd, onNext]);

  const doneToday =
    Boolean(user) && srsReady && source.length > 0 && list.length === 0;
  const reviewEmpty = Boolean(user) && reviewOnly && doneToday;
  const footerCopy = reviewEmpty
    ? "Nic k opakování. Nejdřív studuj kapitolu."
    : doneToday
    ? "Hotovo na dnes."
    : atEnd
      ? "Hotovo. Mezerník nebo Další."
      : isSquares
        ? "Označ pole. Pak Zkontrolovat."
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
          shuffleLocked={lockedOrder}
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
        <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-[min(100%,calc(100dvh-11rem))]">
            {!srsReady || (loading && !puzzle && !doneToday) ? (
              <div className="aspect-square w-full rounded-xl bg-muted/50" />
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
            ) : !puzzle || scoped.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                V kapitole nejsou úlohy.
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
                      Zpět na kapitoly
                    </Link>
                  </Button>
                </div>
              </div>
            ) : puzzle && isSquares ? (
              <SquaresBoard
                key={puzzle.id}
                ref={squaresRef}
                fen={puzzle.fen}
                expectedSquares={puzzle.squares}
                interactive={!atEnd}
                onCorrect={onCorrect}
                onWrong={onWrongSquares}
                markup={boardMarkup}
              />
            ) : puzzle ? (
              <ChessboardPlayer
                key={puzzle.id}
                positionFen={line.fens[ply] ?? startFen}
                orientationFen={startFen}
                lastMove={line.lastMoves[ply] ?? null}
                interactive={!atEnd}
                expectedUci={line.plies[ply]?.uci ?? puzzle.moves[0] ?? ""}
                onCorrect={onCorrect}
                onWrong={onWrongMove}
                markup={boardMarkup}
              />
            ) : null}
            {wrongNote ? (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-lg border border-red-400/40 bg-card/95 px-3 py-2 text-sm text-red-700 shadow-2xl dark:text-red-50">
                {wrongNote}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-[4.25rem] items-center justify-between gap-3 border-t border-border bg-panel px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{footerCopy}</p>
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
          {reviewOnly && doneToday ? (
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/ulohy">Kapitoly</Link>
            </Button>
          ) : (
            <Button
              type="button"
              className="h-9 w-[9.75rem] shrink-0"
              onClick={doneToday ? onCram : onNext}
              disabled={!doneToday && !puzzle}
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
        atEnd={atEnd}
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
