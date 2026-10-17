"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { CurriculumTree } from "@/components/curriculum-tree";
import { MarkupEditor } from "@/components/markup-editor";
import { MarkupPalette, type SetupTool } from "@/components/markup-palette";
import { PlayMoveDialog } from "@/components/play-move-dialog";
import { PgnImportCard } from "@/components/pgn-import-card";
import { PositionSetupBoard } from "@/components/position-setup-board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ADMIN_HISTORY_MAX,
  puzzlesToDrop,
  puzzlesToRestore,
  takeSnapshot,
  type AdminSnapshot,
} from "@/lib/admin-history";
import {
  readAdminStepReset,
  readAdminWrongMode,
  writeAdminStepReset,
  writeAdminWrongMode,
  type AdminStepReset,
  type AdminWrongMode,
} from "@/lib/admin-prefs";
import {
  buildLine,
  fenAfterUci,
  isValidFen,
  normalizeUci,
  startFenForLine,
  uciToCzechSan,
} from "@/lib/chess";
import { EMPTY_SETUP_FEN } from "@/lib/fen-setup";
import {
  normalizeReplyCode,
  replyCodeForInput,
  resolveWrongReplyText,
} from "@/lib/wrong-reply-codes";
import {
  DEMO_CURRICULUM,
  bindPuzzlesToCurriculum,
  childChapters,
  chapterChain,
  chapterKindLabel,
  chapterKindOf,
  chapterSideOf,
  childCopyTitle,
  canDuplicateVykladGroup,
  isDrillChapter,
  isParamsChapter,
  isSquaresChapter,
  isVykladEditorChapter,
  isVykladGroupMemberTitle,
  newId,
  nextSort,
  nextVykladGroupTitle,
  puzzleKindForChapter,
  puzzlesInChapter,
  siblingCopyTitle,
  sortChapters,
  stripVykladGroupSuffix,
  uniqueSlug,
  vykladGroupChapters,
  vykladGroupParentId,
  withMateSubchapters,
  VYKLAD_MAX_MOVES,
  type Chapter,
  type Curriculum,
} from "@/lib/curriculum";
import {
  cloneBoardMarkup,
  clonePuzzleMarkup,
  emptyBoardMarkup,
  emptyPuzzleMarkup,
  isEmptyBoardMarkup,
  recolorGreenDefense,
  type BoardMarkup,
  type Brush,
  type MarkupPhase,
} from "@/lib/markup";
import { isUuid, puzzleKind, puzzleToSaveBody } from "@/lib/puzzles";
import { parseSquares } from "@/lib/squares";
import { AuthorQaStrip } from "@/components/author-qa-strip";
import { PuzzleParamsEditor } from "@/components/puzzle-params-editor";
import {
  parsePracticeTags,
  tagsFromParams,
  type PracticeTag,
} from "@/lib/practice-tags";
import {
  isEmptyParams,
  mergeParams,
  parsePuzzleParams,
  patchAuthorQa,
  sortPuzzlesByKey,
  withInferredDistance,
  type AuthorQaTrack,
  type PuzzleParams,
} from "@/lib/puzzle-params";
import { suggestWrongReplies } from "@/lib/wrong-suggest";
import type { Puzzle, PuzzleKind, WrongReply } from "@/lib/types";

function emptyForm() {
  return {
    id: "",
    title: "",
    fen: "",
    kind: "move" as PuzzleKind,
    move: "",
    moves: [] as string[],
    squares: "",
    theme: "",
    level: "",
    hint: "",
    source: "",
    explanation: "",
    videoUrl: "",
    wrongReplies: [] as WrongReply[],
    markup: emptyPuzzleMarkup(),
    chapterId: null as string | null,
    sort: 0,
    tags: [] as PracticeTag[],
    params: {} as PuzzleParams,
  };
}

type PuzzleForm = ReturnType<typeof emptyForm>;

function formFromPuzzle(puzzle: Puzzle): PuzzleForm {
  return {
    id: puzzle.id,
    title: puzzle.title,
    fen: puzzle.fen,
    kind: puzzleKind(puzzle),
    move: puzzle.moves[0] ?? "",
    moves: puzzle.moves.map(normalizeUci).filter(Boolean),
    squares: puzzle.squares.join(" "),
    theme: puzzle.theme ?? "",
    level: puzzle.level ?? "",
    hint: puzzle.hint ?? "",
    source: puzzle.source ?? "",
    explanation: puzzle.explanation ?? "",
    videoUrl: puzzle.videoUrl ?? "",
    wrongReplies: puzzle.wrongReplies?.length
      ? puzzle.wrongReplies.map((reply) => ({
          ...reply,
          markup: reply.markup ? cloneBoardMarkup(reply.markup) : undefined,
        }))
      : [],
    markup: clonePuzzleMarkup(puzzle.markup),
    chapterId: puzzle.chapterId ?? null,
    sort: puzzle.sort ?? 0,
    tags: parsePracticeTags(puzzle.tags),
    params: parsePuzzleParams(
      puzzle.params && !isEmptyParams(puzzle.params)
        ? puzzle.params
        : puzzle.tags,
    ),
  };
}

function formFingerprint(form: PuzzleForm): string {
  return JSON.stringify({
    id: form.id,
    title: form.title,
    fen: form.fen,
    kind: form.kind,
    move: form.move,
    moves: form.moves,
    squares: form.squares,
    theme: form.theme,
    level: form.level,
    hint: form.hint,
    source: form.source,
    explanation: form.explanation,
    videoUrl: form.videoUrl,
    wrongReplies: form.wrongReplies,
    tags: form.tags,
    params: form.params,
    markup: {
      before: normalizeMarkupFp(form.markup.before),
      after: normalizeMarkupFp(form.markup.after),
      ...(form.markup.steps?.some((step) => !isEmptyBoardMarkup(step))
        ? { steps: form.markup.steps.map(normalizeMarkupFp) }
        : {}),
    },
  });
}

function normalizeMarkupFp(markup: BoardMarkup) {
  if (isEmptyBoardMarkup(markup)) {
    return { colors: {}, circles: {}, arrows: [] };
  }
  return {
    colors: markup.colors,
    circles: markup.circles,
    arrows: markup.arrows,
  };
}

export function AdminPuzzleForm() {
  const [form, setForm] = useState(emptyForm);
  const [savedPrint, setSavedPrint] = useState(() =>
    formFingerprint(emptyForm()),
  );
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [curriculum, setCurriculum] = useState<Curriculum>(DEMO_CURRICULUM);
  const [courseId, setCourseId] = useState(DEMO_CURRICULUM.courses[0]?.id ?? "");
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [expandChapterId, setExpandChapterId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [playTarget, setPlayTarget] = useState<"solution" | null>(null);
  const [wrongEdit, setWrongEdit] = useState<number | null>(null);
  const [wrongOpen, setWrongOpen] = useState(false);
  const [wrongHover, setWrongHover] = useState<number | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const [markupTool, setMarkupTool] = useState<SetupTool>("arrow");
  const [markupBrush, setMarkupBrush] = useState<Brush>("green");
  const [markupPhase, setMarkupPhase] = useState<MarkupPhase>("before");
  const [stepReset, setStepReset] = useState<AdminStepReset>("keep");
  const [wrongMode, setWrongMode] = useState<AdminWrongMode>("first");
  const [setupOpen, setSetupOpen] = useState(false);
  const [marksOpen, setMarksOpen] = useState(false);
  const [linePly, setLinePly] = useState(0);
  const [historySize, setHistorySize] = useState(0);
  const [undoLabel, setUndoLabel] = useState<string | null>(null);
  const [boardEpoch, setBoardEpoch] = useState(0);
  const [puzzleSortKey, setPuzzleSortKey] = useState("sort");
  const [chapterDraftParams, setChapterDraftParams] = useState<PuzzleParams>(
    {},
  );
  const [chapterParamsOpen, setChapterParamsOpen] = useState(false);
  /** Až po mountu — SSR jinak mismatch u disabled (null vs true). */
  const [hydrated, setHydrated] = useState(false);
  const historyRef = useRef<AdminSnapshot<ReturnType<typeof emptyForm>>[]>([]);
  const puzzlesRef = useRef(puzzles);
  const undoBusy = useRef(false);
  puzzlesRef.current = puzzles;

  async function refresh(): Promise<Puzzle[]> {
    const [puzzleRes, curRes] = await Promise.all([
      fetch("/api/puzzles"),
      fetch("/api/curriculum"),
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
      const data = (await puzzleRes.json()) as { puzzles: Puzzle[] };
      nextPuzzles = data.puzzles;
    }
    const bound = bindPuzzlesToCurriculum(
      nextPuzzles,
      nextCurriculum.chapters,
    );
    setCurriculum(nextCurriculum);
    setPuzzles(bound);
    puzzlesRef.current = bound;
    setCourseId((current) =>
      nextCurriculum.courses.some((course) => course.id === current)
        ? current
        : nextCurriculum.courses[0]?.id ?? "",
    );
    return bound;
  }

  function commitHistory(label: string) {
    const next = [
      ...historyRef.current,
      takeSnapshot({
        label,
        curriculum,
        puzzles,
        courseId,
        selectedChapterId,
        form,
      }),
    ].slice(-ADMIN_HISTORY_MAX);
    historyRef.current = next;
    setHistorySize(next.length);
    setUndoLabel(label);
  }

  function dropLastHistory(label: string) {
    const last = historyRef.current.at(-1);
    if (last?.label !== label) return;
    historyRef.current = historyRef.current.slice(0, -1);
    setHistorySize(historyRef.current.length);
    setUndoLabel(historyRef.current.at(-1)?.label ?? null);
  }

  async function persistPuzzleDiffs(prev: Puzzle[], next: Puzzle[]) {
    const changed = puzzlesToRestore(prev, next).filter((item) => isUuid(item.id));
    await Promise.all(
      changed.map((item) => persistPuzzle(item, item.chapterId ?? null, item.sort ?? 0)),
    );
  }

  async function persistCurriculum(next: Curriculum, history?: string) {
    if (history) commitHistory(history);
    setCurriculum(next);
    const res = await fetch("/api/curriculum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      if (history) dropLastHistory(history);
      const data = (await res.json()) as { error?: string };
      setStatus(data.error ?? "Osnovu nešlo uložit.");
      return false;
    }
    setStatus(null);
    return true;
  }

  async function restoreSnapshot(snap: AdminSnapshot<ReturnType<typeof emptyForm>>) {
    const currentPuzzles = puzzlesRef.current;
    // Nejdřív UI — ať Zpět hned vidíš, než doběhne síť.
    setCurriculum(snap.curriculum);
    setPuzzles(snap.puzzles);
    puzzlesRef.current = snap.puzzles;
    setCourseId(snap.courseId);
    setSelectedChapterId(snap.selectedChapterId);
    setForm(snap.form);
    setSavedPrint(formFingerprint(snap.form));
    setWrongEdit(null);
    setWrongHover(null);
    setLinePly(0);
    setSetupOpen(false);
    setPlayTarget(null);
    setMarkupPhase("before");
    setBoardEpoch((n) => n + 1);
    setStatus(`Zpět: ${snap.label}`);

    const res = await fetch("/api/curriculum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snap.curriculum),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setStatus(data.error ?? "Zpět: osnovu nešlo uložit.");
      return;
    }

    const drop = puzzlesToDrop(currentPuzzles, snap.puzzles).filter(isUuid);
    if (drop.length) {
      await fetch("/api/puzzles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: drop }),
      });
    }

    await persistPuzzleDiffs(currentPuzzles, snap.puzzles);
  }

  async function undoLast() {
    if (undoBusy.current) return;
    const snap = historyRef.current.at(-1);
    if (!snap) return;
    undoBusy.current = true;
    historyRef.current = historyRef.current.slice(0, -1);
    setHistorySize(historyRef.current.length);
    setUndoLabel(historyRef.current.at(-1)?.label ?? null);
    try {
      await restoreSnapshot(snap);
    } finally {
      undoBusy.current = false;
    }
  }

  async function onDeletePuzzles(ids: string[]) {
    const unique = Array.from(new Set(ids.filter(isUuid)));
    if (!unique.length) return;
    const label =
      unique.length === 1 ? "Smazat úlohu" : `Smazat ${unique.length} úloh`;
    commitHistory(label);
    setStatus(`Mažu ${unique.length}…`);
    const res = await fetch("/api/puzzles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unique }),
    });
    let data: { error?: string; message?: string; deleted?: number } = {};
    try {
      data = (await res.json()) as typeof data;
    } catch {
      data = {};
    }
    if (!res.ok) {
      dropLastHistory(label);
      // Částečné smazání — obnov seznam.
      if (data.deleted) await refresh();
      setStatus(
        data.error ??
          data.message ??
          (res.status === 400
            ? "Smazání selhalo (Bad Request) — zkus menší výběr."
            : `Smazání selhalo (${res.status}).`),
      );
      return;
    }
    const drop = new Set(unique);
    setPuzzles((current) => {
      const next = current.filter((item) => !drop.has(item.id));
      puzzlesRef.current = next;
      return next;
    });
    if (form.id && drop.has(form.id)) {
      const blank = emptyForm();
      setForm(blank);
      setSavedPrint(formFingerprint(blank));
      setLinePly(0);
      setSetupOpen(false);
    }
    setStatus(`Smazáno ${data.deleted ?? unique.length}. Ctrl+Z vrátí.`);
  }

  async function onDeleteSubtree(chapterIds: string[], label: string) {
    const drop = new Set(chapterIds);
    commitHistory(label);
    const prev = puzzles;
    const nextPuzzles = puzzles.map((item) =>
      item.chapterId && drop.has(item.chapterId)
        ? { ...item, chapterId: null }
        : item,
    );
    const next = {
      ...curriculum,
      chapters: curriculum.chapters.filter((item) => !drop.has(item.id)),
    };
    setPuzzles(nextPuzzles);
    puzzlesRef.current = nextPuzzles;
    if (selectedChapterId && drop.has(selectedChapterId)) {
      setSelectedChapterId(null);
    }
    const prevCurriculum = curriculum;
    const prevChapter = selectedChapterId;
    const ok = await persistCurriculum(next);
    if (!ok) {
      dropLastHistory(label);
      setPuzzles(prev);
      puzzlesRef.current = prev;
      setCurriculum(prevCurriculum);
      setSelectedChapterId(prevChapter);
      return;
    }
    await persistPuzzleDiffs(prev, nextPuzzles);
    setStatus(`${label}. Ctrl+Z vrátí.`);
  }

  async function onDeleteCourse(id: string) {
    if (curriculum.courses.length <= 1) return;
    const course = curriculum.courses.find((item) => item.id === id);
    const label = `Smazat kurz „${course?.title ?? ""}“`;
    const drop = new Set(
      curriculum.chapters
        .filter((item) => item.courseId === id)
        .map((item) => item.id),
    );
    commitHistory(label);
    const prev = puzzles;
    const nextPuzzles = puzzles.map((item) =>
      item.chapterId && drop.has(item.chapterId)
        ? { ...item, chapterId: null }
        : item,
    );
    const nextCourses = curriculum.courses.filter((item) => item.id !== id);
    const next = {
      ...curriculum,
      courses: nextCourses,
      chapters: curriculum.chapters.filter((item) => item.courseId !== id),
    };
    setPuzzles(nextPuzzles);
    puzzlesRef.current = nextPuzzles;
    if (courseId === id) setCourseId(nextCourses[0]?.id ?? "");
    if (selectedChapterId && drop.has(selectedChapterId)) {
      setSelectedChapterId(null);
    }
    const prevCurriculum = curriculum;
    const prevCourse = courseId;
    const prevChapter = selectedChapterId;
    const ok = await persistCurriculum(next);
    if (!ok) {
      dropLastHistory(label);
      setPuzzles(prev);
      puzzlesRef.current = prev;
      setCurriculum(prevCurriculum);
      setCourseId(prevCourse);
      setSelectedChapterId(prevChapter);
      return;
    }
    await persistPuzzleDiffs(prev, nextPuzzles);
    setStatus(`${label}. Ctrl+Z vrátí.`);
  }

  async function renamePuzzleTitle(puzzle: Puzzle, title: string) {
    commitHistory(`Přejmenovat „${puzzle.title}“`);
    const next = { ...puzzle, title };
    setPuzzles((current) =>
      current.map((item) => (item.id === puzzle.id ? next : item)),
    );
    if (form.id === puzzle.id) {
      setForm((current) => ({ ...current, title }));
    }
    await persistPuzzle(next, next.chapterId ?? null, next.sort ?? 0);
  }

  function puzzleWithLiveForm(puzzle: Puzzle): Puzzle {
    if (form.id !== puzzle.id) return puzzle;
    return {
      ...puzzle,
      title: form.title.trim() || puzzle.title,
      fen: form.fen.trim() || puzzle.fen,
      kind: form.kind,
      moves: form.moves.length
        ? form.moves.map(normalizeUci).filter(Boolean)
        : puzzle.moves,
      squares:
        form.kind === "squares"
          ? parseSquares(form.squares)
          : puzzle.squares,
      theme: form.theme.trim() || puzzle.theme,
      level: form.level.trim() || puzzle.level,
      hint: form.hint.trim() || puzzle.hint,
      source: form.source.trim() || puzzle.source,
      explanation: form.explanation.trim() || puzzle.explanation,
      videoUrl: form.videoUrl.trim() || puzzle.videoUrl,
      wrongReplies: form.wrongReplies,
      markup: form.markup,
      tags: form.tags,
    };
  }

  async function duplicatePuzzle(puzzle: Puzzle) {
    const live = puzzleWithLiveForm(puzzle);
    const leafId = live.chapterId ?? selectedChapterId;
    const gate = canDuplicateVykladGroup(
      curriculum.chapters,
      puzzlesRef.current,
      leafId,
      live,
    );
    if (!gate.ok) {
      setStatus(gate.reason);
      return;
    }
    const source = gate.source;
    const memberLeaf = gate.member;

    if (!source.fen.trim() || !isValidFen(source.fen)) {
      setStatus("Nejdřív ulož platnou pozici (FEN), pak Stejná úloha.");
      return;
    }

    // Group = sourozenci Pn pod nadkapitolou (ne S# pod P#).
    const groupParentId = vykladGroupParentId(curriculum.chapters, memberLeaf.id);
    if (!groupParentId) {
      setStatus("Stejná úloha potřebuje nadkapitolu (group).");
      return;
    }
    const groupParent = curriculum.chapters.find(
      (item) => item.id === groupParentId,
    );
    if (!groupParent) {
      setStatus("Stejná úloha potřebuje nadkapitolu (group).");
      return;
    }

    const siblings = vykladGroupChapters(curriculum.chapters, memberLeaf.id);
    const inGroup = siblings.length >= 2;
    const usedTitles = siblings.map((item) => item.title);
    const baseTitle =
      stripVykladGroupSuffix(groupParent.title) || groupParent.title.trim();

    let chaptersNext = curriculum.chapters;
    // Flatten: všichni Pn (i vnoření pod „P1 2“ / S#) → přímo pod nadkapitolu.
    const memberIds = new Set(siblings.map((item) => item.id));
    if (isVykladGroupMemberTitle(memberLeaf.title)) {
      memberIds.add(memberLeaf.id);
    }
    chaptersNext = chaptersNext.map((item) =>
      memberIds.has(item.id) && item.parentId !== groupParent.id
        ? { ...item, parentId: groupParent.id }
        : item,
    );

    // První klik: přejmenuj aktuální list na „… P1“ (stejná úroveň).
    if (!inGroup && !isVykladGroupMemberTitle(memberLeaf.title)) {
      const p1 = nextVykladGroupTitle(baseTitle, usedTitles);
      chaptersNext = chaptersNext.map((item) =>
        item.id === memberLeaf.id
          ? {
              ...item,
              parentId: groupParent.id,
              title: p1,
              slug: uniqueSlug(
                p1,
                chaptersNext
                  .filter((c) => c.id !== memberLeaf.id)
                  .map((c) => c.slug),
              ),
            }
          : item,
      );
      usedTitles.push(p1);
    }

    const nextTitle = nextVykladGroupTitle(baseTitle, usedTitles);
    const memberSiblings = childChapters(
      chaptersNext,
      groupParent.id,
      groupParent.courseId,
    ).filter((item) => isVykladGroupMemberTitle(item.title));
    const lastSort = memberSiblings.reduce(
      (max, item) => Math.max(max, item.sort),
      memberLeaf.sort,
    );
    const extra: Chapter = {
      id: newId(),
      courseId: groupParent.courseId,
      parentId: groupParent.id,
      slug: uniqueSlug(
        nextTitle,
        chaptersNext
          .filter((item) => item.courseId === groupParent.courseId)
          .map((item) => item.slug),
      ),
      title: nextTitle,
      sort: lastSort + 1,
      kind: chapterKindOf(memberLeaf),
      side: memberLeaf.side ?? chapterSideOf(curriculum.chapters, memberLeaf.id),
    };
    const label = `Stejná úloha „${nextTitle}“`;
    commitHistory(label);
    const nextCurriculum = {
      ...curriculum,
      chapters: [...chaptersNext, extra],
    };
    const ok = await persistCurriculum(nextCurriculum);
    if (!ok) {
      dropLastHistory(label);
      return;
    }
    const res = await fetch("/api/puzzles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...puzzleToSaveBody(source),
        id: undefined,
        title: nextTitle,
        fen: source.fen.trim(),
        chapterId: extra.id,
        sort: 0,
        allowEmptyMoves: true,
      }),
    });
    const data = (await res.json()) as { error?: string; puzzle?: Puzzle };
    if (!res.ok || !data.puzzle) {
      dropLastHistory(label);
      await persistCurriculum(curriculum);
      setStatus(data.error ?? "Kopii nešlo uložit.");
      return;
    }
    const created = {
      ...data.puzzle,
      fen: data.puzzle.fen?.trim() || source.fen.trim(),
      moves: data.puzzle.moves?.length ? data.puzzle.moves : source.moves,
      markup: data.puzzle.markup ?? source.markup,
      wrongReplies: data.puzzle.wrongReplies ?? source.wrongReplies,
      explanation: data.puzzle.explanation ?? source.explanation,
      chapterId: extra.id,
    };
    setPuzzles((current) => {
      const next = [...current, created];
      puzzlesRef.current = next;
      return next;
    });
    setSelectedChapterId(extra.id);
    loadPuzzle(created);
    setLinePly(0);
    setStatus(`${label}. Ctrl+Z vrátí.`);
  }

  async function persistPuzzle(puzzle: Puzzle, chapterId: string | null, sort: number) {
    await fetch("/api/puzzles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...puzzleToSaveBody(puzzle),
        id: isUuid(puzzle.id) ? puzzle.id : undefined,
        chapterId,
        sort,
      }),
    });
  }

  async function onMovePuzzle(
    puzzleId: string,
    chapterId: string | null,
    beforeId?: string,
  ) {
    const puzzle = puzzles.find((item) => item.id === puzzleId);
    if (!puzzle) return;
    commitHistory("Přesun úlohy");
    const siblings = puzzles
      .filter((item) => (item.chapterId ?? null) === chapterId && item.id !== puzzleId)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const insertAt = beforeId
      ? Math.max(0, siblings.findIndex((item) => item.id === beforeId))
      : siblings.length;
    const ordered = [
      ...siblings.slice(0, insertAt),
      puzzle,
      ...siblings.slice(insertAt),
    ];
    const updates = ordered.map((item, index) => ({
      ...item,
      chapterId,
      sort: index,
    }));
    setPuzzles((current) => {
      const map = new Map(updates.map((item) => [item.id, item]));
      return current.map((item) => map.get(item.id) ?? item);
    });
    setForm((current) =>
      current.id === puzzleId ? { ...current, chapterId, sort: insertAt } : current,
    );
    for (const item of updates) {
      await persistPuzzle(item, chapterId, item.sort ?? 0);
    }
  }

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void refresh();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    setStepReset(readAdminStepReset());
    setWrongMode(readAdminWrongMode());
  }, [hydrated]);

  function applyWrongMode(id: AdminWrongMode) {
    setWrongMode(id);
    writeAdminWrongMode(id);
    if (id === "click") {
      setWrongEdit(null);
      setWrongHover(null);
      return;
    }
    if (id === "all") {
      setWrongOpen(true);
      setWrongEdit(null);
      setWrongHover(null);
      return;
    }
    if (id === "first" && form.wrongReplies.length > 0) {
      setWrongOpen(true);
      setWrongEdit((current) => (current === null ? 0 : current));
    }
  }

  const activeChapter = curriculum.chapters.find(
    (item) => item.id === (selectedChapterId ?? form.chapterId),
  );
  const isVyklad = isVykladEditorChapter(activeChapter, curriculum.chapters);
  const showWrongPanel = isDrillChapter(activeChapter);
  const squaresMode =
    isSquaresChapter(activeChapter) ||
    (!isVyklad && form.kind === "squares");

  useEffect(() => {
    setChapterDraftParams(parsePuzzleParams(activeChapter?.params ?? {}));
  }, [activeChapter?.id, activeChapter?.params]);

  useEffect(() => {
    if (!activeChapter) return;
    const nextKind = puzzleKindForChapter(activeChapter);
    setForm((current) =>
      current.kind === nextKind ? current : { ...current, kind: nextKind },
    );
  }, [activeChapter?.id, activeChapter?.kind]);

  async function renumberChapter(chapterId: string) {
    const list = puzzlesInChapter(
      puzzlesRef.current,
      chapterId,
      false,
      curriculum.chapters,
    );
    const sorted = sortPuzzlesByKey(list, puzzleSortKey);
    commitHistory("Přečíslovat kapitolu");
    const next = puzzlesRef.current.map((item) => {
      const index = sorted.findIndex((row) => row.id === item.id);
      if (index < 0) return item;
      return { ...item, sort: index };
    });
    setPuzzles(next);
    puzzlesRef.current = next;
    await Promise.all(
      sorted.map((item, index) =>
        persistPuzzle({ ...item, sort: index }, chapterId, index),
      ),
    );
    setStatus(`Přečíslováno: ${sorted.length} úloh.`);
  }

  /** mode: defaults | merge (přidat) | replace (nahradit). Aplikuje i na podkapitoly. */
  async function saveChapterParams(mode: "defaults" | "merge" | "replace") {
    if (!activeChapter) return;
    const params = parsePuzzleParams(chapterDraftParams);
    const label =
      mode === "merge"
        ? "Parametry → přidat všem"
        : mode === "replace"
          ? "Parametry → nahradit všem"
          : "Parametry kapitoly";
    commitHistory(label);
    const chapters = curriculum.chapters.map((item) =>
      item.id === activeChapter.id
        ? {
            ...item,
            ...(isEmptyParams(params) ? { params: undefined } : { params }),
          }
        : item,
    );
    await persistCurriculum({ ...curriculum, chapters }, "Parametry kapitoly");
    if (mode === "defaults") {
      setStatus("Default parametry kapitoly uloženy (nové úlohy).");
      return;
    }
    const list = puzzlesInChapter(
      puzzlesRef.current,
      activeChapter.id,
      true,
      chapters,
    );
    if (list.length === 0) {
      setStatus("V kapitole (ani podkapitolách) nejsou úlohy.");
      return;
    }
    const updated = list.map((item) => {
      const nextParams =
        mode === "replace" ? params : mergeParams(item.params, params);
      return {
        ...item,
        params: isEmptyParams(nextParams) ? undefined : nextParams,
        tags: tagsFromParams(nextParams),
      };
    });
    const byId = new Map(updated.map((item) => [item.id, item]));
    const next = puzzlesRef.current.map((item) => byId.get(item.id) ?? item);
    setPuzzles(next);
    puzzlesRef.current = next;
    await Promise.all(
      updated.map((item) =>
        persistPuzzle(item, item.chapterId ?? null, item.sort ?? 0),
      ),
    );
    if (form.id && byId.has(form.id)) {
      const row = byId.get(form.id)!;
      setForm((current) => ({
        ...current,
        params: row.params ?? {},
        tags: row.tags ?? [],
      }));
    }
    setStatus(
      mode === "replace"
        ? `Parametry nahrazeny u ${updated.length} úloh (včetně podkapitol).`
        : `Parametry přidány u ${updated.length} úloh (včetně podkapitol).`,
    );
  }

  useEffect(() => {
    if (!isVyklad) return;
    setWrongOpen(false);
    setWrongEdit(null);
    setWrongHover(null);
  }, [isVyklad]);

  useEffect(() => {
    setLinePly((current) => Math.min(current, form.moves.length));
  }, [form.moves.length]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        void undoLast();
        return;
      }
      if (playTarget !== null) return;
      if (isVyklad) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          setLinePly((current) => Math.max(0, current - 1));
          return;
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          setLinePly((current) => Math.min(form.moves.length, current + 1));
          return;
        }
        return;
      }
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        const mode: AdminWrongMode | null =
          event.key === "1" || event.code === "Digit1" || event.code === "Numpad1"
            ? "click"
            : event.key === "2" || event.code === "Digit2" || event.code === "Numpad2"
              ? "first"
              : event.key === "3" || event.code === "Digit3" || event.code === "Numpad3"
                ? "all"
                : null;
        if (mode) {
          event.preventDefault();
          event.stopImmediatePropagation();
          applyWrongMode(mode);
          return;
        }
      }
      const count = form.wrongReplies.length;
      const up = event.code === "KeyD" || event.key === "d" || event.key === "D";
      const down = event.code === "KeyF" || event.key === "f" || event.key === "F";
      const inWrongList = wrongOpen || wrongEdit !== null;
      if (
        wrongMode === "click" &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setWrongEdit(null);
        setWrongHover(null);
        setMarkupPhase(event.key === "ArrowLeft" ? "before" : "after");
        if (event.key === "ArrowRight") {
          setMarkupTool((tool) => (tool === "piece" ? "arrow" : tool));
        }
        return;
      }
      if (count > 0 && (up || down)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const dir: -1 | 1 = up ? -1 : 1;
        setWrongOpen(true);
        setWrongHover(null);
        setWrongEdit((current) => {
          if (current === null) return dir < 0 ? count - 1 : 0;
          return (current + dir + count) % count;
        });
        setMarkupTool((tool) => (tool === "piece" ? "arrow" : tool));
        return;
      }
      if (
        (wrongMode === "first" || wrongMode === "all") &&
        inWrongList &&
        count > 0 &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const dir = event.key === "ArrowLeft" ? -1 : 1;
        setWrongOpen(true);
        setWrongHover(null);
        setWrongEdit((current) => {
          if (current === null) return dir < 0 ? count - 1 : 0;
          return (current + dir + count) % count;
        });
        setMarkupTool((tool) => (tool === "piece" ? "arrow" : tool));
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setMarkupPhase("before");
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setMarkupPhase("after");
        setMarkupTool((tool) => (tool === "piece" ? "arrow" : tool));
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [
    form.moves.length,
    form.wrongReplies.length,
    isVyklad,
    playTarget,
    wrongEdit,
    wrongMode,
    wrongOpen,
  ]);

  useEffect(() => {
    if (wrongEdit === null) return;
    const active = document.activeElement as HTMLElement | null;
    if (active?.closest("input, textarea, select")) return;
    document
      .querySelector<HTMLElement>(`[data-wrong-tah="${wrongEdit}"]`)
      ?.focus();
  }, [wrongEdit]);

  useEffect(() => {
    if (wrongMode !== "all") return;
    function onClick(event: MouseEvent) {
      if (wrongEdit === null) return;
      const el = event.target as HTMLElement | null;
      if (el?.closest?.("button, input, textarea, select, label, summary")) {
        return;
      }
      const reply = form.wrongReplies[wrongEdit];
      if (
        !reply?.answer &&
        el?.closest?.(".board-frame, .cg-board-host, cg-board")
      ) {
        return;
      }
      setWrongEdit(null);
      setWrongHover(null);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [form.wrongReplies, wrongEdit, wrongMode]);

  useEffect(() => {
    if (wrongEdit === null) return;
    // ŠT vysvětlivky = vždy červená (ne Montessori barva figury).
    setMarkupBrush("red");
  }, [wrongEdit]);

  const dirty = formFingerprint(form) !== savedPrint;
  useEffect(() => {
    if (!dirty) return;
    setStatus((current) =>
      current === "Úloha uložená." || current === "Úloha vytvořená."
        ? null
        : current,
    );
  }, [dirty]);

  function loadPuzzle(puzzle: Puzzle) {
    const next = formFromPuzzle(puzzle);
    setForm(next);
    setSavedPrint(formFingerprint(next));
    setSelectedChapterId(puzzle.chapterId ?? null);
    const hasWrong = Boolean(puzzle.wrongReplies?.length);
    setWrongEdit(wrongOpen && wrongMode === "first" && hasWrong ? 0 : null);
    setWrongHover(null);
    setLinePly(0);
    setSetupOpen(false);
    setStatus(null);
    if (stepReset === "before") setMarkupPhase("before");
  }

  /** Cvičení: draft do DB. Výklad + source: hned uložit kopii do (pod)kapitoly. */
  async function createNewPuzzle(
    chapterId: string,
    titleHint?: string,
    sourcePuzzle?: Puzzle,
  ) {
    setSelectedChapterId(chapterId);
    const chapter = curriculum.chapters.find((item) => item.id === chapterId);
    const vyklad = !!chapter && chapterKindOf(chapter) === "vyklad";

    if (vyklad || sourcePuzzle) {
      const live =
        sourcePuzzle && form.id === sourcePuzzle.id
          ? puzzleWithLiveForm(sourcePuzzle)
          : sourcePuzzle;
      let seed = emptyForm();
      if (live) {
        seed = formFromPuzzle(live);
      } else if (vyklad) {
        const fromForm =
          form.fen.trim() &&
          isValidFen(form.fen) &&
          (form.chapterId === chapterId ||
            curriculum.chapters.some(
              (item) =>
                item.id === chapterId && item.parentId === form.chapterId,
            ))
            ? form
            : null;
        if (fromForm) {
          seed = {
            ...emptyForm(),
            fen: form.fen,
            moves: form.moves,
            move: form.move,
            kind: form.kind,
            squares: form.squares,
            markup: clonePuzzleMarkup(form.markup),
            wrongReplies: form.wrongReplies.map((reply) => ({
              ...reply,
              markup: reply.markup
                ? cloneBoardMarkup(reply.markup)
                : undefined,
            })),
            explanation: form.explanation,
            theme: form.theme,
            level: form.level,
            hint: form.hint,
            source: form.source,
          };
        }
      }
      const title = titleHint?.trim() || autoPuzzleTitle(chapterId);
      const fen = (seed.fen || live?.fen || "").trim();

      // Kopie pozice do nové (pod)kapitoly — hned do DB, ne jen form.
      if (live && fen && isValidFen(fen)) {
        const label = `Kopie pozice „${title}“`;
        commitHistory(label);
        const res = await fetch("/api/puzzles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...puzzleToSaveBody({
              ...live,
              id: "",
              title,
              fen,
              chapterId,
              sort: 0,
            }),
            id: undefined,
            title,
            fen,
            chapterId,
            sort: 0,
            allowEmptyMoves: true,
          }),
        });
        const data = (await res.json()) as { error?: string; puzzle?: Puzzle };
        if (!res.ok || !data.puzzle) {
          dropLastHistory(label);
          setStatus(data.error ?? "Kopii nešlo uložit.");
          return;
        }
        const created: Puzzle = {
          ...data.puzzle,
          title: data.puzzle.title?.trim() || title,
          fen: data.puzzle.fen?.trim() || fen,
          chapterId,
          sort: 0,
          markup: data.puzzle.markup ?? live.markup,
          moves: data.puzzle.moves?.length ? data.puzzle.moves : live.moves,
          explanation: data.puzzle.explanation ?? live.explanation,
          wrongReplies: data.puzzle.wrongReplies ?? live.wrongReplies,
        };
        setPuzzles((current) => {
          const next = [...current, created];
          puzzlesRef.current = next;
          return next;
        });
        loadPuzzle(created);
        setBoardEpoch((n) => n + 1);
        setLinePly(0);
        setStatus(`${label}. Ctrl+Z vrátí.`);
        return;
      }

      const next = {
        ...seed,
        id: "",
        chapterId,
        title,
        sort: 0,
      };
      setForm(next);
      setSavedPrint(formFingerprint(next));
      setBoardEpoch((n) => n + 1);
      setWrongEdit(null);
      setWrongHover(null);
      setLinePly(0);
      setSetupOpen(true);
      setStatus(null);
      if (stepReset === "before") setMarkupPhase("before");
      return;
    }

    const title = titleHint?.trim() || autoPuzzleTitle(chapterId);
    const sort = nextSort(
      puzzlesRef.current.filter(
        (item) => (item.chapterId ?? null) === chapterId,
      ),
    );
    const defaults = parsePuzzleParams(chapter?.params ?? {});
    const kind = puzzleKindForChapter(chapter);
    // Draft: prázdný FEN (ne EMPTY_SETUP — chess.js / stará validace to brala jako chybu).
    const label = "Nová úloha";
    commitHistory(label);
    const res = await fetch("/api/puzzles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        fen: "",
        kind,
        moves: [],
        allowEmptyMoves: true,
        chapterId,
        sort,
        params: defaults,
        tags: tagsFromParams(defaults),
      }),
    });
    const data = (await res.json()) as { error?: string; puzzle?: Puzzle };
    if (!res.ok || !data.puzzle) {
      dropLastHistory(label);
      setStatus(data.error ?? "Úlohu nešlo vytvořit.");
      return;
    }
    const created: Puzzle = {
      ...data.puzzle,
      title: data.puzzle.title?.trim() || title,
      fen: data.puzzle.fen?.trim() || "",
      chapterId,
      sort,
      params: data.puzzle.params ?? defaults,
      tags: data.puzzle.tags ?? tagsFromParams(defaults),
    };
    setPuzzles((current) => {
      const next = [...current, created];
      puzzlesRef.current = next;
      return next;
    });
    loadPuzzle(created);
    setBoardEpoch((n) => n + 1);
    setSetupOpen(true);
  }

  function toggleSquare(square: string) {
    const next = parseSquares(form.squares);
    const set = new Set(next);
    if (set.has(square)) set.delete(square);
    else set.add(square);
    setForm({ ...form, squares: [...set].join(" ") });
  }

  function setWrongQa(track: AuthorQaTrack) {
    setForm((current) => {
      const qa = patchAuthorQa(current.params.qa, "wrong", track);
      const params: PuzzleParams = { ...current.params };
      if (qa) params.qa = qa;
      else delete params.qa;
      return {
        ...current,
        params,
        wrongReplies: track.none ? [] : current.wrongReplies,
      };
    });
  }

  function autoSuggestWrong() {
    const solution = form.moves[0] || form.move;
    if (!isValidFen(form.fen) || !solution) {
      setStatus("Nejdřív FEN a řešení, pak Auto ŠT.");
      return;
    }
    if (
      form.wrongReplies.length > 0 &&
      !window.confirm("Nahradit ŠT návrhem programu (passes = 0)?")
    ) {
      return;
    }
    const next = suggestWrongReplies(form.fen, solution, form.wrongReplies);
    setForm((current) => {
      const qa = patchAuthorQa(current.params.qa, "wrong", { passes: 0 });
      const params: PuzzleParams = { ...current.params };
      if (qa) params.qa = qa;
      else delete params.qa;
      return { ...current, params, wrongReplies: next };
    });
    setWrongOpen(true);
    setWrongEdit(next.length ? 0 : null);
    setStatus(
      next.length
        ? `Auto ŠT: ${next.length} tahů (program · 0). Doplň kódy.`
        : "Auto ŠT: žádný jiný legální tah.",
    );
  }

  function addWrongReply() {
    const index = form.wrongReplies.length;
    setForm((current) => {
      const params: PuzzleParams = { ...current.params };
      if (params.qa?.wrong?.none) {
        const qa = patchAuthorQa(params.qa, "wrong", {
          passes: params.qa.wrong.passes,
          done: params.qa.wrong.done,
        });
        if (qa) params.qa = qa;
        else delete params.qa;
      }
      return {
        ...current,
        params,
        wrongReplies: [...current.wrongReplies, { answer: "", text: "" }],
      };
    });
    setWrongOpen(true);
    setWrongEdit(index);
    setSetupOpen(false);
    if (markupTool === "piece") setMarkupTool("arrow");
  }

  function wipeBoardExtras() {
    setForm((current) => ({
      ...current,
      fen: EMPTY_SETUP_FEN,
      move: "",
      moves: [],
      squares: "",
      explanation: "",
      wrongReplies: [],
      markup: emptyPuzzleMarkup(),
    }));
    setWrongEdit(null);
    setWrongHover(null);
    setLinePly(0);
  }

  /** Prázdný název → už přidělený název kapitoly (… P1), další → S# / Pn. */
  function autoPuzzleTitle(chapterId: string | null, excludeId?: string): string {
    const chapter = curriculum.chapters.find((item) => item.id === chapterId);
    if (!chapter?.title.trim()) return "Úloha";
    const usedInChapter = puzzles
      .filter((item) => item.chapterId === chapter.id && item.id !== excludeId)
      .map((item) => item.title);
    if (usedInChapter.length === 0) return chapter.title.trim();
    return childCopyTitle(chapter.title, [...usedInChapter, chapter.title]);
  }

  function writeVykladLayer(layer: BoardMarkup) {
    setForm((current) => {
      const steps = [...(current.markup.steps ?? [])];
      while (steps.length <= linePly) steps.push(emptyBoardMarkup());
      steps[linePly] = cloneBoardMarkup(layer);
      return {
        ...current,
        markup: { ...current.markup, steps },
      };
    });
  }

  function toggleWrongPanel() {
    if (wrongOpen) {
      setWrongOpen(false);
      setWrongEdit(null);
      setWrongHover(null);
      return;
    }
    setWrongOpen(true);
    setSetupOpen(false);
    if (wrongMode !== "first" || form.wrongReplies.length === 0) {
      return;
    }
    setWrongEdit((current) => (current === null ? 0 : current));
    setMarkupTool((tool) => (tool === "piece" ? "arrow" : tool));
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    const title =
      form.title.trim() ||
      autoPuzzleTitle(form.chapterId, isUuid(form.id) ? form.id : undefined);
    const saveLabel = isUuid(form.id) ? `Uložit „${title}“` : "Nová úloha";
    // Snapshot = stav PŘED uložením (poslední serverová verze), ne aktuální dirty form.
    const prior = isUuid(form.id)
      ? puzzles.find((item) => item.id === form.id)
      : undefined;
    const priorForm = prior ? formFromPuzzle(prior) : emptyForm();
    const nextHistory = [
      ...historyRef.current,
      takeSnapshot({
        label: saveLabel,
        curriculum,
        puzzles,
        courseId,
        selectedChapterId,
        form: priorForm,
      }),
    ].slice(-ADMIN_HISTORY_MAX);
    historyRef.current = nextHistory;
    setHistorySize(nextHistory.length);
    setUndoLabel(saveLabel);

    const payload = {
      id: isUuid(form.id) ? form.id : undefined,
      title,
      fen: form.fen.trim(),
      kind: isVyklad
        ? "move"
        : puzzleKindForChapter(activeChapter) ?? form.kind,
      moves:
        isVyklad || !squaresMode
          ? isVyklad
            ? form.moves
                .map(normalizeUci)
                .filter(Boolean)
                .slice(0, VYKLAD_MAX_MOVES)
            : [normalizeUci(form.move)].filter(Boolean)
          : [],
      squares: squaresMode && !isVyklad ? parseSquares(form.squares) : [],
      theme: form.theme.trim() || undefined,
      level: form.level.trim() || undefined,
      hint: form.hint.trim() || undefined,
      source: form.source.trim() || undefined,
      explanation: form.explanation.trim() || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      wrongReplies: form.wrongReplies.map((reply) =>
        reply.markup
          ? {
              ...reply,
              markup: recolorGreenDefense(
                stripMoveArrow(reply.markup, reply.answer),
              ),
            }
          : reply,
      ),
      markup: form.markup,
      tags: tagsFromParams(form.params),
      params: withInferredDistance(
        form.params,
        form.fen.trim(),
        isVyklad ? form.moves[0] : form.move,
      ),
      allowEmptyMoves: true,
      chapterId: form.chapterId,
      sort:
        form.id && form.chapterId === puzzles.find((item) => item.id === form.id)?.chapterId
          ? form.sort
          : nextSort(
              puzzles.filter(
                (item) =>
                  (item.chapterId ?? null) === form.chapterId && item.id !== form.id,
              ),
            ),
    };

    const res = await fetch("/api/puzzles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data: { error?: string; message?: string; puzzle?: Puzzle } = {};
    try {
      data = (await res.json()) as typeof data;
    } catch {
      data = {};
    }
    setSaving(false);

    if (!res.ok) {
      dropLastHistory(saveLabel);
      setStatus(
        data.error ??
          data.message ??
          (res.status === 400
            ? "Uložení: Bad Request (neplatný FEN / tělo)."
            : `Uložení selhalo (${res.status}).`),
      );
      return;
    }

    setStatus(isUuid(form.id) ? "Úloha uložená." : "Úloha vytvořená.");
    const savedId = data.puzzle?.id ?? form.id;
    const saved = { ...form, id: savedId, title };
    setForm(saved);
    setSavedPrint(formFingerprint(saved));
    if (wrongMode === "all") {
      setWrongEdit(null);
      setWrongHover(null);
    }
    await refresh();
  }

  const solutionUci = form.kind === "move" ? normalizeUci(form.move) : "";
  const solutionSan =
    solutionUci && isValidFen(form.fen)
      ? uciToCzechSan(form.fen, solutionUci)
      : "";
  const afterFen =
    solutionUci && isValidFen(form.fen)
      ? fenAfterUci(form.fen, solutionUci)
      : null;
  const startFen = startFenForLine(
    form.fen,
    isVyklad ? form.moves : form.move ? [form.move] : [],
  );
  const vykladLine = buildLine(
    form.fen.trim() || EMPTY_SETUP_FEN,
    form.moves,
  );
  const vykladFen =
    setupOpen || linePly <= 0
      ? form.fen.trim() || EMPTY_SETUP_FEN
      : (vykladLine.fens[linePly] ?? form.fen);
  const vykladLayer =
    form.markup.steps?.[linePly] ?? emptyBoardMarkup();
  const vykladLast = vykladLine.lastMoves[linePly];
  const inWrong = wrongEdit !== null;
  const inWrongPanel = wrongOpen || inWrong;
  const selectedReply = inWrong ? form.wrongReplies[wrongEdit] : undefined;
  const boardIndex =
    wrongMode === "click"
      ? wrongEdit
      : typeof wrongHover === "number"
        ? wrongHover
        : wrongEdit;
  const boardReply =
    boardIndex !== null ? form.wrongReplies[boardIndex] : undefined;
  const previewingWrong = Boolean(boardReply?.answer);
  const hoverOther = wrongHover !== null && wrongHover !== wrongEdit;
  const clickClean = wrongMode === "click" && !boardReply;
  const showingMate = Boolean(
    clickClean && markupPhase === "after" && afterFen && solutionUci,
  );
  const wrongUcis = form.wrongReplies
    .map((reply) => reply.answer)
    .filter(Boolean);
  const boardFen = showingMate
    ? afterFen!
    : clickClean || boardReply || inWrongPanel
      ? startFen
      : markupPhase === "after" && afterFen
        ? afterFen
        : form.fen;
  const markupLayer = (() => {
    if (showingMate) {
      // Čisté „Po“ — šipku řešení jen přes topArrowUci, ať se neuloží do form.
      return form.markup.after;
    }
    if (inWrongPanel && wrongMode === "all" && !previewingWrong) {
      const base =
        markupPhase === "after" ? form.markup.after : form.markup.before;
      return withWrongMoveArrows(base, wrongUcis);
    }
    if (boardReply && previewingWrong) {
      return withWrongMoveArrow(
        recolorGreenDefense(boardReply.markup ?? emptyBoardMarkup()),
        boardReply.answer,
      );
    }
    return markupPhase === "after" ? form.markup.after : form.markup.before;
  })();
  useEffect(() => {
    if (!marksOpen || setupOpen) return;
    setMarkupTool((tool) => (tool === "piece" ? "arrow" : tool));
  }, [marksOpen, setupOpen]);

  const editingMarks = marksOpen || setupOpen;
  const marksLayer =
    setupOpen || markupPhase === "before" || isVyklad
      ? isVyklad
        ? vykladLayer
        : form.markup.before
      : form.markup.after;

  const vykladGroup = isVyklad
    ? vykladGroupChapters(curriculum.chapters, form.chapterId)
    : [];
  const vykladGroupMembers = vykladGroup
    .map((chapter) => ({
      chapter,
      puzzle: puzzlesInChapter(
        puzzles,
        chapter.id,
        false,
        curriculum.chapters,
      )[0],
    }))
    .filter(
      (
        item,
      ): item is { chapter: Chapter; puzzle: Puzzle } => Boolean(item.puzzle),
    );
  const vykladGroupIndex = Math.max(
    0,
    vykladGroupMembers.findIndex((item) => item.puzzle.id === form.id),
  );

  const toolsBar = (
                  <div className="flex flex-wrap items-center gap-2">
                    {isVyklad ? (
                      <>
                        {(vykladGroupMembers.length > 0
                          ? vykladGroupMembers
                          : [null]
                        ).map((member, index) => (
                          <button
                            key={member?.chapter.id ?? `solo-${index}`}
                            type="button"
                            className={`h-8 min-w-8 rounded-md border border-border px-2 font-mono ${
                              (vykladGroupMembers.length > 0
                                ? vykladGroupIndex
                                : 0) === index
                                ? "ring-1 ring-foreground/25"
                                : ""
                            }`}
                            title={member?.chapter.title ?? "Pozice"}
                            onClick={() => {
                              if (member?.puzzle) {
                                loadPuzzle(member.puzzle);
                                setLinePly(0);
                              }
                            }}
                          >
                            {index}
                          </button>
                        ))}
                        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
                        {Array.from({
                          length: Math.min(
                            form.moves.length,
                            VYKLAD_MAX_MOVES,
                          ) + 1,
                        }).map((_, ply) => (
                          <button
                            key={`ply-${ply}`}
                            type="button"
                            className={`h-8 min-w-8 rounded-full px-2 font-mono text-sm ${
                              linePly === ply
                                ? "ring-1 ring-foreground/25 text-foreground"
                                : "text-muted-foreground hover:bg-foreground/5"
                            }`}
                            title={
                              ply === 0
                                ? "Start"
                                : `Po tahu ${ply}/${VYKLAD_MAX_MOVES}`
                            }
                            onClick={() => setLinePly(ply)}
                          >
                            {ply === 0 ? "·" : ply}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="h-8 rounded-full px-2 text-sm text-muted-foreground hover:bg-foreground/5"
                          title="Smazat poslední tah"
                          disabled={form.moves.length === 0}
                          onClick={() => {
                            setForm((current) => {
                              const moves = current.moves.slice(0, -1);
                              return {
                                ...current,
                                moves,
                                move: moves[0] ?? "",
                              };
                            });
                            setLinePly((current) => Math.max(0, current - 1));
                          }}
                        >
                          −
                        </button>
                        <span className="text-[11px] text-muted-foreground">
                          {form.moves.length}/{VYKLAD_MAX_MOVES}
                        </span>
                      </>
                    ) : (
                    <button
                      type="button"
                      className="h-8 min-w-[4.5rem] rounded-md border border-border px-2 font-mono"
                      disabled={isValidFen(form.fen) ? undefined : true}
                      title={
                        form.kind === "squares"
                          ? "Upravit pole"
                          : "Upravit tah"
                      }
                      onClick={() => {
                        if (form.kind === "squares") {
                          setBoardOpen(true);
                          return;
                        }
                        setPlayTarget("solution");
                      }}
                    >
                      {form.kind === "squares"
                        ? form.squares || "…"
                        : solutionSan || "…"}
                    </button>
                    )}
                    <RingLetter
                      active={setupOpen}
                      title="Upravit pozici"
                      onClick={() => {
                        if (setupOpen) {
                          setSetupOpen(false);
                          setMarkupTool("arrow");
                          return;
                        }
                        setSetupOpen(true);
                        setMarkupTool("piece");
                        setMarkupPhase("before");
                        setWrongOpen(false);
                        setWrongEdit(null);
                        setWrongHover(null);
                        setPlayTarget(null);
                        setLinePly(0);
                      }}
                    >
                      UP
                    </RingLetter>
                    {activeChapter ? (
                      <span
                        className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-foreground/15"
                        title={chapterKindLabel(activeChapter.kind)}
                      >
                        {chapterKindLabel(activeChapter.kind)}
                      </span>
                    ) : null}
                    {isVyklad ? null : (
                    <span className="inline-flex">
                      <RingLetter
                        active={stepReset === "keep"}
                        title="Nemění se před/po"
                        onClick={() => {
                          setStepReset("keep");
                          writeAdminStepReset("keep");
                        }}
                      >
                        N
                      </RingLetter>
                      <RingLetter
                        active={stepReset === "before"}
                        title="Mění se — vždy před tahem"
                        onClick={() => {
                          setStepReset("before");
                          writeAdminStepReset("before");
                          setMarkupPhase("before");
                        }}
                      >
                        M
                      </RingLetter>
                    </span>
                    )}
                  </div>
  );

  const wrongModeButtons = (
                    <>
                    {(
                      [
                        [
                          "click",
                          "1",
                          "Výchozí pozice. Špatný tah až po kliknutí. ← → před matem / mat.",
                        ],
                        [
                          "first",
                          "2",
                          "První špatný tah hned na šachovnici.",
                        ],
                        [
                          "all",
                          "3",
                          "Všechny špatné tahy zelenými šipkami. ← → po jednom se všemi šipkami.",
                        ],
                      ] as const
                    ).map(([id, label, title]) => (
                      <button
                        key={id}
                        type="button"
                        title={title}
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm text-muted-foreground ${
                          wrongMode === id
                            ? "ring-1 ring-foreground/25"
                            : "hover:bg-foreground/5"
                        }`}
                        onClick={() => applyWrongMode(id)}
                      >
                        {label}
                      </button>
                    ))}
                    </>
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-0 w-full flex-1 items-center justify-center text-sm text-muted-foreground">
        Načítám…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <details className="shrink-0 text-[14px] leading-none">
        <summary className="cursor-pointer select-none px-1 py-0.5 text-muted-foreground hover:text-foreground">
          Import
        </summary>
      <div className="max-h-[40vh] overflow-y-auto px-1 pb-1">
      <PgnImportCard
        onBeforeImport={() => commitHistory("Import PGN/FEN")}
        onImported={refresh}
        onExpandChapter={(id) => {
          setSelectedChapterId(id);
          setExpandChapterId(id);
        }}
        curriculum={curriculum}
        puzzles={puzzles}
        courseId={courseId}
        chapterId={selectedChapterId}
        onSelectCourse={setCourseId}
        onSelectChapter={(id) => {
          setSelectedChapterId(id);
          setForm((current) =>
            current.id ? current : { ...current, chapterId: id },
          );
        }}
      />
      </div>
      </details>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 w-[min(38%,28rem)] shrink-0 flex-col overflow-hidden border-r border-border px-1">
            {activeChapter && isParamsChapter(activeChapter) ? (
              <details
                className="shrink-0 border-b border-border px-1 py-1 text-[12px]"
                open={chapterParamsOpen}
                onToggle={(event) =>
                  setChapterParamsOpen(
                    (event.target as HTMLDetailsElement).open,
                  )
                }
              >
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Parametry · {activeChapter.title}
                  {(() => {
                    const n = puzzlesInChapter(
                      puzzles,
                      activeChapter.id,
                      true,
                      curriculum.chapters,
                    ).length;
                    return n ? ` · ${n} úloh` : "";
                  })()}
                </summary>
                <div className="mt-2 max-h-[40vh] space-y-2 overflow-y-auto pb-2">
                  <PuzzleParamsEditor
                    value={chapterDraftParams}
                    showComputed={false}
                    showQa={false}
                    onChange={setChapterDraftParams}
                  />
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => void saveChapterParams("defaults")}
                    >
                      Default nových
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => void saveChapterParams("merge")}
                    >
                      Přidat všem
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Nahradit parametry u všech úloh v kapitole (i podkapitolách)?",
                          )
                        ) {
                          return;
                        }
                        void saveChapterParams("replace");
                      }}
                    >
                      Nahradit všem
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => void renumberChapter(activeChapter.id)}
                    >
                      Přečíslovat
                    </Button>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    Řadit
                    <select
                      className="h-7 rounded border border-border bg-background px-1 text-foreground"
                      value={puzzleSortKey}
                      onChange={(e) => setPuzzleSortKey(e.target.value)}
                    >
                      {[
                        ["sort", "číslo"],
                        ["qa", "kontrola"],
                        ["qaFlags", "flagy QA"],
                        ["qaWrong", "ŠT QA"],
                        ["title", "motiv"],
                        ["piece", "figura"],
                        ["color", "barva"],
                        ["king", "král"],
                        ["role", "role"],
                        ["mode", "typ"],
                        ["distance", "vzdál."],
                        ["U", "U"],
                        ["B", "B"],
                        ["P", "P"],
                        ["Z", "Z"],
                        ["V", "V"],
                        ["O", "O"],
                        ["L", "L"],
                        ["CH", "CH"],
                        ["q", "figur"],
                        ["r", "ze šipek"],
                        ["s", "špatných"],
                        ["t", "obtížnost"],
                      ].map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </details>
            ) : null}
            <CurriculumTree
              curriculum={curriculum}
              puzzles={puzzles}
              puzzleSortKey={puzzleSortKey}
              courseId={courseId}
              selectedPuzzleId={form.id || undefined}
              selectedChapterId={selectedChapterId}
              expandChapterId={expandChapterId}
              onChapterParams={(chapter) => {
                setSelectedChapterId(chapter.id);
                setChapterDraftParams(parsePuzzleParams(chapter.params ?? {}));
                setChapterParamsOpen(true);
              }}
              onSelectCourse={setCourseId}
              onSelectChapter={(id) => {
                setSelectedChapterId(id);
                if (!id) return;
                const chapter = curriculum.chapters.find((item) => item.id === id);
                const direct = puzzlesInChapter(
                  puzzlesRef.current,
                  id,
                  false,
                  curriculum.chapters,
                );
                if (chapter && chapterKindOf(chapter) === "vyklad") {
                  if (direct[0]) {
                    loadPuzzle(direct[0]);
                    return;
                  }
                }
                // Prázdná kapitola (nová cvičení) → čistý form, ne kopie poslední úlohy.
                if (direct.length === 0) {
                  const blank = { ...emptyForm(), chapterId: id };
                  setForm(blank);
                  setSavedPrint(formFingerprint(blank));
                  setBoardEpoch((n) => n + 1);
                  setLinePly(0);
                  setWrongEdit(null);
                  setWrongHover(null);
                  setStatus(null);
                  return;
                }
                setForm((current) =>
                  current.chapterId === id && current.id
                    ? current
                    : current.id
                      ? current
                      : { ...current, chapterId: id },
                );
              }}
              onSelectPuzzle={loadPuzzle}
              onCurriculum={(next, label) => void persistCurriculum(next, label)}
              onMovePuzzle={(puzzleId, chapterId, beforeId) =>
                void onMovePuzzle(puzzleId, chapterId, beforeId)
              }
              onNewPuzzle={(chapterId, titleHint, sourcePuzzle) => {
                void createNewPuzzle(chapterId, titleHint, sourcePuzzle);
              }}
              onDeletePuzzles={(ids) => void onDeletePuzzles(ids)}
              onDeleteSubtree={(ids, label) => void onDeleteSubtree(ids, label)}
              onDeleteCourse={(id) => void onDeleteCourse(id)}
              onRenamePuzzle={(puzzle, title) => void renamePuzzleTitle(puzzle, title)}
              onDuplicatePuzzle={(puzzle) => void duplicatePuzzle(puzzle)}
              onUndo={() => void undoLast()}
              canUndo={historySize > 0}
              undoLabel={undoLabel}
              livePuzzle={
                form.id
                  ? puzzleWithLiveForm({
                      id: form.id,
                      title: form.title,
                      fen: form.fen,
                      moves: form.moves,
                      kind: form.kind,
                      squares: parseSquares(form.squares),
                      chapterId: form.chapterId,
                      sort: form.sort,
                      theme: form.theme,
                      level: form.level,
                      hint: form.hint,
                      source: form.source,
                      explanation: form.explanation,
                      videoUrl: form.videoUrl,
                      wrongReplies: form.wrongReplies,
                      markup: form.markup,
                      tags: form.tags,
                    })
                  : null
              }
            />
        </div>
        <form
              id="puzzle-form"
              className="flex min-h-0 min-w-0 flex-1 overflow-hidden"
              onSubmit={onSave}
            >
              <div className="flex h-full min-h-0 w-[min(calc(100vh-8rem),calc(100vw-36rem))] shrink-0 flex-col px-1">
                  <PositionSetupBoard
                    key={`admin-board-${boardEpoch}`}
                    boardId="admin-preview-setup"
                    className="min-h-0 flex-1"
                    fen={isVyklad ? vykladFen : boardFen}
                    positionEdit={
                      setupOpen || (isVyklad && markupTool === "piece")
                    }
                    onWipe={wipeBoardExtras}
                    playMode={
                      isVyklad
                        ? // Šipka: levý = tah, pravý = šipka. Barva/kroužek: kreslení.
                          !setupOpen && markupTool === "arrow"
                        : inWrong && !selectedReply?.answer && !hoverOther
                    }
                    moveLocked={false}
                    onPlayMove={(uci) => {
                      if (isVyklad) {
                        setForm((current) => {
                          const keep = current.moves.slice(0, linePly);
                          if (keep.length >= VYKLAD_MAX_MOVES) return current;
                          const moves = [...keep, normalizeUci(uci)].slice(
                            0,
                            VYKLAD_MAX_MOVES,
                          );
                          return { ...current, moves, move: moves[0] ?? "" };
                        });
                        setLinePly((current) =>
                          Math.min(current + 1, VYKLAD_MAX_MOVES),
                        );
                        return;
                      }
                      if (wrongEdit === null) return;
                      const index = wrongEdit;
                      setForm((current) => {
                        const next = [...current.wrongReplies];
                        const row = next[index];
                        if (!row) return current;
                        next[index] = { ...row, answer: uci };
                        return { ...current, wrongReplies: next };
                      });
                    }}
                    onChange={(fen) => {
                      if (wrongEdit !== null) return;
                      if (
                        isVyklad &&
                        !setupOpen &&
                        markupTool !== "piece"
                      ) {
                        return;
                      }
                      if (isVyklad && markupTool === "piece" && linePly > 0) {
                        setLinePly(0);
                      }
                      if (!isVyklad && markupPhase === "after") return;
                      setForm((current) => ({ ...current, fen }));
                    }}
                    selectedSquares={
                      squaresMode && !isVyklad
                        ? parseSquares(form.squares)
                        : []
                    }
                    onToggleSquare={
                      squaresMode && !isVyklad && wrongEdit === null
                        ? toggleSquare
                        : undefined
                    }
                    markup={
                      isVyklad
                        ? vykladLayer
                        : inWrong && selectedReply?.answer && !hoverOther
                          ? markupLayer
                          : editingMarks
                            ? marksLayer
                            : markupLayer
                    }
                    topArrowUci={
                      editingMarks
                        ? ""
                        : showingMate
                          ? solutionUci
                          : clickClean
                            ? ""
                            : isVyklad
                              ? (vykladLine.plies[linePly - 1]?.uci ?? "")
                              : previewingWrong && boardReply?.answer
                                ? boardReply.answer
                                : inWrongPanel
                                  ? ""
                                  : solutionUci
                    }
                    lastMoveSquares={
                      isVyklad
                        ? vykladLast
                          ? [vykladLast.from, vykladLast.to]
                          : []
                        : showingMate && solutionUci.length >= 4
                          ? [
                              solutionUci.slice(0, 2),
                              solutionUci.slice(2, 4),
                            ].filter((square) => square.length === 2)
                          : []
                    }
                    onMarkupChange={
                      editingMarks || isVyklad || !(
                        (inWrong && !selectedReply?.answer) ||
                        hoverOther ||
                        (inWrongPanel &&
                          wrongMode === "all" &&
                          wrongEdit === null)
                      )
                        ? (layer) => {
                            if (isVyklad) {
                              writeVykladLayer(layer);
                              return;
                            }
                            // ŠT edit: vždy do reply.markup — ne do before/after.
                            if (
                              wrongEdit !== null &&
                              selectedReply?.answer &&
                              !hoverOther
                            ) {
                              setForm((current) => {
                                const next = [...current.wrongReplies];
                                const row = next[wrongEdit];
                                if (!row) return current;
                                next[wrongEdit] = {
                                  ...row,
                                  markup: recolorGreenDefense(
                                    stripMoveArrow(layer, row.answer),
                                  ),
                                };
                                return { ...current, wrongReplies: next };
                              });
                              return;
                            }
                            const cleanAfter =
                              markupPhase === "after" && solutionUci
                                ? stripMoveArrow(layer, solutionUci)
                                : layer;
                            if (setupOpen || markupPhase === "before") {
                              setForm((current) => ({
                                ...current,
                                markup: {
                                  ...current.markup,
                                  before: layer,
                                },
                              }));
                              return;
                            }
                            setForm((current) => ({
                              ...current,
                              markup: {
                                ...current.markup,
                                [markupPhase]:
                                  markupPhase === "after" ? cleanAfter : layer,
                              },
                            }));
                          }
                        : undefined
                    }
                    tool={markupTool}
                    brush={inWrong ? "red" : markupBrush}
                    orientation={
                      form.chapterId
                        ? chapterSideOf(curriculum.chapters, form.chapterId)
                        : "white"
                    }
                  />
              </div>
                <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-2 py-1">
                  <div className="flex shrink-0 flex-col gap-1.5">
                  {toolsBar}
                <Input
                  id="title"
                  className="h-8 px-2"
                  placeholder={
                    form.chapterId
                      ? autoPuzzleTitle(
                          form.chapterId,
                          isUuid(form.id) ? form.id : undefined,
                        )
                      : "Název (auto)"
                  }
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                  </div>
                  <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      type="submit"
                      variant={dirty ? "destructive" : "default"}
                      className="h-10 px-5 text-sm"
                      disabled={saving}
                    >
                      {saving ? "Ukládám…" : "Uložit"}
                    </Button>
                    {status ? (
                      <span className="text-xs text-amber-600 dark:text-amber-300">
                        {status}
                      </span>
                    ) : null}
                  </div>
                  {wrongOpen && showWrongPanel ? (
                  <div className="mt-2 flex min-h-0 flex-1 flex-col">
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <button
                      type="button"
                      className="cursor-pointer select-none px-1 py-1 text-left text-muted-foreground hover:text-foreground"
                      onClick={toggleWrongPanel}
                    >
                      <span className="list-item list-inside [list-style-type:disclosure-open]">
                      ŠT
                      {form.wrongReplies.length
                        ? ` (${form.wrongReplies.length})`
                        : ""}
                      </span>
                    </button>
                    <Button
                      type="button"
                      className="h-9 px-3"
                      disabled={!isValidFen(form.fen)}
                      onClick={addWrongReply}
                    >
                      +ŠT
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 px-3"
                      title="Předpřipravit legální tahy kromě řešení (program · 0)"
                      disabled={
                        !isValidFen(form.fen) ||
                        !(form.moves[0] || form.move)
                      }
                      onClick={autoSuggestWrong}
                    >
                      Auto
                    </Button>
                    <AuthorQaStrip
                      track={form.params.qa?.wrong}
                      hasContent={form.wrongReplies.length > 0}
                      onChange={setWrongQa}
                    />
                    <span className="ml-auto inline-flex">{wrongModeButtons}</span>
                    </div>
                    <div
                      className="mt-2.5 flex min-h-0 flex-1 flex-col overflow-y-auto px-0.5 pb-2"
                      onMouseLeave={() => setWrongHover(null)}
                    >
                    {form.wrongReplies.map((reply, index) => (
                      <div
                        key={index}
                        tabIndex={-1}
                        data-wrong-tah={index}
                        onClick={() => {
                          setWrongEdit(index);
                          if (markupTool === "piece") setMarkupTool("arrow");
                        }}
                        onMouseEnter={() => setWrongHover(index)}
                        className={`flex cursor-pointer items-center gap-2 py-0.5 outline-none ${wrongEdit === index ? "rounded bg-foreground/5 ring-1 ring-foreground/20" : wrongHover === index ? "rounded bg-foreground/5" : ""}`}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          className={`h-11 min-w-[6rem] shrink-0 border-yellow-300 bg-yellow-200 px-2 font-mono text-zinc-900 hover:bg-yellow-300 dark:border-yellow-400 dark:bg-yellow-300/80 ${reply.answer ? "" : "text-muted-foreground"}`}
                          title={
                            wrongEdit === index && reply.answer
                              ? "Znovu zahrát"
                              : reply.answer
                                ? reply.answer
                                : "Zahrát špatný tah"
                          }
                          disabled={!isValidFen(form.fen)}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (wrongEdit === index) {
                              setForm((current) => {
                                const next = [...current.wrongReplies];
                                const row = next[index];
                                if (!row) return current;
                                next[index] = { ...row, answer: "" };
                                return { ...current, wrongReplies: next };
                              });
                              return;
                            }
                            setWrongEdit(index);
                            if (markupTool === "piece") setMarkupTool("arrow");
                          }}
                        >
                          {reply.answer && isValidFen(startFen)
                            ? uciToCzechSan(startFen, reply.answer)
                            : ""}
                        </Button>
                        <Input
                          className={`h-11 w-16 shrink-0 px-1 text-center uppercase ${
                            replyCodeForInput(reply.text)
                              ? ""
                              : "border-red-600 bg-red-500 text-white placeholder:text-white/70"
                          }`}
                          maxLength={3}
                          placeholder=""
                          autoComplete="off"
                          spellCheck={false}
                          title={
                            resolveWrongReplyText(reply.text) ||
                            (reply.text ? "není v tabulce" : "kód, max 3 písmena")
                          }
                          value={replyCodeForInput(reply.text)}
                          onChange={(event) => {
                            const text = normalizeReplyCode(event.target.value);
                            setForm({
                              ...form,
                              wrongReplies: form.wrongReplies.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, text } : item,
                              ),
                            });
                          }}
                        />
                        <button
                          type="button"
                          className="shrink-0 px-2 text-lg leading-none text-muted-foreground hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            setForm({
                              ...form,
                              wrongReplies: form.wrongReplies.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            });
                            setWrongHover((current) => {
                              if (current === null) return current;
                              if (current === index) return null;
                              return current > index ? current - 1 : current;
                            });
                            setWrongEdit((current) => {
                              if (current === null) return null;
                              if (current === index) return null;
                              return current > index ? current - 1 : current;
                            });
                          }}
                        >
                          ×
                        </button>
                        {!replyCodeForInput(reply.text) ? (
                          <>
                            {(
                              [
                                ["u", "U", "Král uteče"],
                                ["z", "Z", "Zabrání šachu"],
                              ] as const
                            ).map(([code, label, title]) => (
                              <button
                                key={code}
                                type="button"
                                title={title}
                                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border text-base hover:bg-foreground/5"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setForm({
                                    ...form,
                                    wrongReplies: form.wrongReplies.map(
                                      (item, itemIndex) =>
                                        itemIndex === index
                                          ? { ...item, text: code }
                                          : item,
                                    ),
                                  });
                                }}
                              >
                                {label}
                              </button>
                            ))}
                          </>
                        ) : null}
                      </div>
                    ))}
                    </div>
                  </div>
                  ) : null}
                  <div className={wrongOpen && showWrongPanel ? "max-h-[42%] shrink-0 overflow-y-auto border-t border-border pt-1 text-base" : "mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto text-base"}>
                  <details
                    key={isVyklad ? "v-marks" : setupOpen ? "up-marks" : "c-marks"}
                    className="shrink-0 border-t border-border pt-1"
                    open={isVyklad || setupOpen || marksOpen ? true : undefined}
                    onToggle={(event) => {
                      setMarksOpen(
                        (event.currentTarget as HTMLDetailsElement).open,
                      );
                    }}
                  >
                    <summary className="cursor-pointer select-none px-1 py-1 text-muted-foreground hover:text-foreground">
                      Značky
                    </summary>
                    <div className="px-0.5 pb-2">
                <MarkupPalette
                  markup={
                    isVyklad
                      ? { ...form.markup, before: vykladLayer }
                      : inWrong && selectedReply?.answer
                        ? {
                            ...form.markup,
                            before: selectedReply.markup ?? emptyBoardMarkup(),
                          }
                        : form.markup
                  }
                  layer={
                    inWrong && selectedReply?.answer
                      ? (selectedReply.markup ?? emptyBoardMarkup())
                      : marksLayer
                  }
                  phase={
                    isVyklad || setupOpen || inWrong ? "before" : markupPhase
                  }
                  tool={markupTool}
                    brush={inWrong ? "red" : markupBrush}
                  kind={form.kind}
                  canAfter={Boolean(afterFen)}
                  hidePhase={isVyklad || setupOpen || wrongEdit !== null}
                  showPieceTool={isVyklad || setupOpen}
                  onPhase={(phase) => {
                    setMarkupPhase(phase);
                    if (phase === "after") {
                      setMarkupTool((tool) =>
                        tool === "piece" ? "arrow" : tool,
                      );
                    }
                  }}
                  onTool={(tool) => {
                    setMarkupTool(tool);
                    if (isVyklad && tool === "piece") {
                      setLinePly(0);
                      setSetupOpen(false);
                    }
                  }}
                  onBrush={(brush) =>
                    setMarkupBrush(wrongEdit !== null ? "red" : brush)
                  }
                  onChange={(markup) => {
                    if (isVyklad) {
                      writeVykladLayer(markup.before);
                      return;
                    }
                    if (
                      wrongEdit !== null &&
                      selectedReply?.answer &&
                      !hoverOther
                    ) {
                      const layer = cloneBoardMarkup(markup.before);
                      setForm((current) => {
                        const next = [...current.wrongReplies];
                        const row = next[wrongEdit];
                        if (!row) return current;
                        next[wrongEdit] = {
                          ...row,
                          markup: recolorGreenDefense(
                            stripMoveArrow(layer, row.answer),
                          ),
                        };
                        return { ...current, wrongReplies: next };
                      });
                      return;
                    }
                    if (setupOpen) {
                      setForm((current) => ({
                        ...current,
                        markup: {
                          ...current.markup,
                          before: cloneBoardMarkup(markup.before),
                        },
                      }));
                      return;
                    }
                    setForm((current) => ({ ...current, markup }));
                  
                  }}
                />
                    </div>
                  </details>
                  {!wrongOpen && showWrongPanel ? (
                  <div className="shrink-0 border-t border-border pt-1">
                    <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="min-w-0 flex-1 cursor-pointer select-none px-1 py-1 text-left text-muted-foreground hover:text-foreground"
                      onClick={toggleWrongPanel}
                    >
                      <span className="list-item list-inside [list-style-type:disclosure-closed]">
                      Špatné tahy
                      {form.wrongReplies.length
                        ? ` (${form.wrongReplies.length})`
                        : ""}
                      </span>
                    </button>
                    {wrongModeButtons}
                    </div>
                  </div>
                  ) : null}
                  <details
                    className="shrink-0 border-t border-border pt-1"
                    open={isVyklad ? true : undefined}
                  >
                    <summary
                      className={`cursor-pointer select-none px-1 py-1 hover:text-foreground ${
                        isVyklad && !form.explanation.trim()
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      Údaje
                      {isVyklad && !form.explanation.trim()
                        ? " · chybí vysvětlení"
                        : ""}
                    </summary>
                    <div className="grid grid-cols-2 gap-2 px-0.5 pb-2">
                  {isVyklad ? (
                    <div className="col-span-2 space-y-1">
                      <label
                        htmlFor="explanation"
                        className={`text-xs font-medium ${
                          form.explanation.trim()
                            ? "text-muted-foreground"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        Vysvětlení
                      </label>
                      <Textarea
                        id="explanation"
                        rows={5}
                        className={`min-h-[6rem] resize-y px-2 py-1.5 ${
                          form.explanation.trim()
                            ? ""
                            : "border-red-600 bg-red-500 text-white placeholder:text-white/70"
                        }`}
                        placeholder="K tomuto tahu…"
                        value={form.explanation}
                        onChange={(e) =>
                          setForm({ ...form, explanation: e.target.value })
                        }
                      />
                    </div>
                  ) : null}
                  <select
                    id="chapter"
                    className="col-span-2 h-9 w-full rounded-md border border-border bg-background px-2"
                    value={form.chapterId ?? ""}
                    onChange={(event) => {
                      const chapterId = event.target.value || null;
                      setForm({ ...form, chapterId });
                      setSelectedChapterId(chapterId);
                      if (form.id) {
                        void onMovePuzzle(form.id, chapterId);
                      }
                    }}
                  >
                    <option value="">Nezařazené</option>
                    {chapterOptions(curriculum, courseId).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    id="theme"
                    className="h-9 px-2"
                    placeholder="Téma"
                    value={form.theme}
                    onChange={(e) => setForm({ ...form, theme: e.target.value })}
                  />
                  <Input
                    id="level"
                    className="h-9 px-2"
                    placeholder="Úroveň"
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                  />
                  <Input
                    id="source"
                    className="h-9 px-2"
                    placeholder="Partie"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                  />
                <Input
                  id="hint"
                  className="col-span-2 h-9 px-2"
                  placeholder="Zadání"
                  value={form.hint}
                  onChange={(e) => setForm({ ...form, hint: e.target.value })}
                />
                  {isParamsChapter(activeChapter) ? (
                    <div className="col-span-2">
                      <PuzzleParamsEditor
                        value={form.params}
                        fen={form.fen}
                        solutionUci={
                          isVyklad ? form.moves[0] ?? "" : form.move
                        }
                        wrongCount={form.wrongReplies.length}
                        markup={form.markup}
                        editFormula
                        onChange={(params) => {
                          setForm({
                            ...form,
                            params,
                            kind: puzzleKindForChapter(activeChapter),
                            tags: tagsFromParams(params),
                          });
                        }}
                      />
                    </div>
                  ) : null}
                    </div>
                  </details>
                  </div>
              </div>
            </form>
      </div>
      <MarkupEditor
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
        fen={form.fen}
        move={form.move}
        kind={form.kind}
        selectedSquares={
          form.kind === "squares" ? parseSquares(form.squares) : []
        }
        onToggleSquare={form.kind === "squares" ? toggleSquare : undefined}
        markup={form.markup}
        onChange={(markup) => setForm((current) => ({ ...current, markup }))}
      />
      <PlayMoveDialog
        fen={startFen}
        open={playTarget === "solution"}
        title="Zahrát řešení"
        instanceKey="solution"
        onClose={() => setPlayTarget(null)}
        onPick={(uci) => {
          setForm((current) => ({
            ...current,
            move: uci,
            moves: [uci],
          }));
        }}
      />
    </div>
  );
}

function RingLetter({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm text-muted-foreground ${
        active ? "ring-1 ring-foreground/25" : "hover:bg-foreground/5"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function uciMoveArrow(uci: string) {
  const move = normalizeUci(uci);
  if (move.length < 4) return null;
  return { from: move.slice(0, 2), to: move.slice(2, 4), color: "green" as const };
}

function withWrongMoveArrow(layer: BoardMarkup, uci: string): BoardMarkup {
  const move = uciMoveArrow(uci);
  const next = cloneBoardMarkup(layer);
  if (!move) return next;
  const exists = next.arrows.some(
    (arrow) =>
      arrow.from === move.from &&
      arrow.to === move.to &&
      arrow.color === "green",
  );
  if (!exists) next.arrows = [...next.arrows, move];
  return next;
}

function withWrongMoveArrows(layer: BoardMarkup, ucis: string[]): BoardMarkup {
  return ucis.reduce(
    (next, uci) => withWrongMoveArrow(next, uci),
    cloneBoardMarkup(layer),
  );
}

function stripMoveArrow(layer: BoardMarkup, uci: string): BoardMarkup {
  const move = uciMoveArrow(uci);
  const next = cloneBoardMarkup(layer);
  if (!move) return next;
  next.arrows = next.arrows.filter(
    (arrow) =>
      arrow.from !== move.from ||
      arrow.to !== move.to ||
      arrow.color !== "green",
  );
  return next;
}

function placementOf(
  curriculum: Curriculum,
  chapterId: string | null,
): { chapter: string; sub: string } {
  if (!chapterId) return { chapter: "Nezařazené", sub: "—" };
  const chain = chapterChain(curriculum.chapters, chapterId);
  if (chain.length === 0) return { chapter: "Nezařazené", sub: "—" };
  return {
    chapter: chain[0]?.title ?? "—",
    sub: chain.slice(1).map((item) => item.title).join(" / ") || "—",
  };
}

function chapterOptions(curriculum: Curriculum, courseId: string) {
  const courseChapters = sortChapters(
    curriculum.chapters.filter((chapter) => chapter.courseId === courseId),
  );
  const options: { id: string; label: string }[] = [];
  const walk = (parentId: string | null, prefix: string) => {
    for (const chapter of childChapters(courseChapters, parentId, courseId)) {
      options.push({
        id: chapter.id,
        label: prefix ? `${prefix} / ${chapter.title}` : chapter.title,
      });
      walk(chapter.id, prefix ? `${prefix} / ${chapter.title}` : chapter.title);
    }
  };
  walk(null, "");
  return options;
}

