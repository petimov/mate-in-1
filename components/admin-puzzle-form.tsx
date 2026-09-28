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
  writeAdminStepReset,
  type AdminStepReset,
} from "@/lib/admin-prefs";
import {
  fenAfterUci,
  isValidFen,
  normalizeUci,
  startFenForLine,
  uciToSan,
} from "@/lib/chess";
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
  chapterSideOf,
  nextSort,
  sortChapters,
  withMateSubchapters,
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
import type { Puzzle, PuzzleKind, WrongReply } from "@/lib/types";

function emptyForm() {
  return {
    id: "",
    title: "",
    fen: "",
    kind: "move" as PuzzleKind,
    move: "",
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
  };
}

export function AdminPuzzleForm() {
  const [form, setForm] = useState(emptyForm);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [curriculum, setCurriculum] = useState<Curriculum>(DEMO_CURRICULUM);
  const [courseId, setCourseId] = useState(DEMO_CURRICULUM.courses[0]?.id ?? "");
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [playTarget, setPlayTarget] = useState<"solution" | null>(null);
  const [wrongEdit, setWrongEdit] = useState<number | null>(null);
  const [wrongOpen, setWrongOpen] = useState(false);
  const [wrongHover, setWrongHover] = useState<number | "sol" | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const [markupTool, setMarkupTool] = useState<SetupTool>("arrow");
  const [markupBrush, setMarkupBrush] = useState<Brush>("green");
  const [markupPhase, setMarkupPhase] = useState<MarkupPhase>("before");
  const [stepReset, setStepReset] = useState<AdminStepReset>("keep");
  const [historySize, setHistorySize] = useState(0);
  const [undoLabel, setUndoLabel] = useState<string | null>(null);
  const historyRef = useRef<AdminSnapshot<ReturnType<typeof emptyForm>>[]>([]);
  const puzzlesRef = useRef(puzzles);
  const undoBusy = useRef(false);
  puzzlesRef.current = puzzles;

  async function refresh() {
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
    setCurriculum(nextCurriculum);
    setPuzzles(bindPuzzlesToCurriculum(nextPuzzles, nextCurriculum.chapters));
    setCourseId((current) =>
      nextCurriculum.courses.some((course) => course.id === current)
        ? current
        : nextCurriculum.courses[0]?.id ?? "",
    );
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
    setCurriculum(snap.curriculum);
    setPuzzles(snap.puzzles);
    puzzlesRef.current = snap.puzzles;
    setCourseId(snap.courseId);
    setSelectedChapterId(snap.selectedChapterId);
    setForm(snap.form);

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
    setStatus(`Zpět: ${snap.label}`);
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
    commitHistory(
      unique.length === 1 ? "Smazat úlohu" : `Smazat ${unique.length} úloh`,
    );
    const res = await fetch("/api/puzzles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unique }),
    });
    const data = (await res.json()) as { error?: string; deleted?: number };
    if (!res.ok) {
      dropLastHistory(
        unique.length === 1 ? "Smazat úlohu" : `Smazat ${unique.length} úloh`,
      );
      setStatus(data.error ?? "Smazání selhalo.");
      return;
    }
    const drop = new Set(unique);
    setPuzzles((current) => {
      const next = current.filter((item) => !drop.has(item.id));
      puzzlesRef.current = next;
      return next;
    });
    if (form.id && drop.has(form.id)) {
      setForm(emptyForm());
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
    void refresh();
  }, []);

  useEffect(() => {
    setStepReset(readAdminStepReset());
  }, []);

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
      const count = form.wrongReplies.length;
      const up = event.code === "KeyD" || event.key === "d" || event.key === "D";
      const down = event.code === "KeyF" || event.key === "f" || event.key === "F";
      const inWrongList = wrongOpen || wrongEdit !== null;
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
        inWrongList &&
        count > 0 &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const dir = event.key === "ArrowLeft" ? -1 : 1;
        const total = count + 1;
        const pos = wrongEdit === null ? 0 : wrongEdit + 1;
        const next = (pos + dir + total) % total;
        setWrongOpen(true);
        if (next === 0) {
          setWrongEdit(null);
          setWrongHover("sol");
        } else {
          setWrongEdit(next - 1);
          setWrongHover(null);
        }
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
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [form.wrongReplies.length, playTarget, wrongEdit, wrongOpen]);

  useEffect(() => {
    const id =
      wrongEdit !== null
        ? String(wrongEdit)
        : wrongHover === "sol"
          ? "sol"
          : null;
    if (id === null) return;
    const active = document.activeElement as HTMLElement | null;
    if (active?.closest("input, textarea, select")) return;
    document
      .querySelector<HTMLElement>(`[data-wrong-tah="${id}"]`)
      ?.focus();
  }, [wrongEdit, wrongHover]);

  useEffect(() => {
    if (wrongEdit === null) return;
    setMarkupBrush((brush) => (brush === "green" ? "red" : brush));
  }, [wrongEdit]);

  function loadPuzzle(puzzle: Puzzle) {
    setForm({
      id: puzzle.id,
      title: puzzle.title,
      fen: puzzle.fen,
      kind: puzzleKind(puzzle),
      move: puzzle.moves[0] ?? "",
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
    });
    setSelectedChapterId(puzzle.chapterId ?? null);
    const hasWrong = Boolean(puzzle.wrongReplies?.length);
    setWrongOpen((open) => open || hasWrong);
    setWrongEdit(hasWrong ? 0 : null);
    setWrongHover(null);
    setStatus(null);
    if (stepReset === "before") setMarkupPhase("before");
  }

  function toggleSquare(square: string) {
    const next = parseSquares(form.squares);
    const set = new Set(next);
    if (set.has(square)) set.delete(square);
    else set.add(square);
    setForm({ ...form, squares: [...set].join(" ") });
  }

  function addWrongReply() {
    const index = form.wrongReplies.length;
    setForm({
      ...form,
      wrongReplies: [...form.wrongReplies, { answer: "", text: "" }],
    });
    setWrongOpen(true);
    setWrongEdit(index);
    if (markupTool === "piece") setMarkupTool("arrow");
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    const saveLabel = isUuid(form.id) ? `Uložit „${form.title}“` : "Nová úloha";
    commitHistory(saveLabel);

    const payload = {
      id: isUuid(form.id) ? form.id : undefined,
      title: form.title.trim(),
      fen: form.fen.trim(),
      kind: form.kind,
      moves: form.kind === "move" ? [normalizeUci(form.move)] : [],
      squares: form.kind === "squares" ? parseSquares(form.squares) : [],
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

    const data = (await res.json()) as { error?: string; puzzle?: Puzzle };
    setSaving(false);

    if (!res.ok) {
      dropLastHistory(saveLabel);
      setStatus(data.error ?? "Uložení selhalo.");
      return;
    }

    setStatus(isUuid(form.id) ? "Úloha uložená." : "Úloha vytvořená.");
    if (data.puzzle) {
      setForm((current) => ({ ...current, id: data.puzzle?.id ?? current.id }));
    }
    await refresh();
  }

  const solutionUci = form.kind === "move" ? normalizeUci(form.move) : "";
  const solutionSan =
    solutionUci && isValidFen(form.fen)
      ? uciToSan(form.fen, solutionUci)
      : "";
  const afterFen =
    solutionUci && isValidFen(form.fen)
      ? fenAfterUci(form.fen, solutionUci)
      : null;
  const startFen = startFenForLine(form.fen, form.move ? [form.move] : []);
  const inWrong = wrongEdit !== null;
  const selectedReply = inWrong ? form.wrongReplies[wrongEdit] : undefined;
  const boardIndex =
    wrongHover === "sol"
      ? null
      : typeof wrongHover === "number"
        ? wrongHover
        : wrongEdit;
  const boardReply =
    boardIndex !== null ? form.wrongReplies[boardIndex] : undefined;
  const previewingWrong = Boolean(boardReply?.answer);
  const viewingSolution = !boardReply && (wrongOpen || wrongHover === "sol");
  const hoverOther = wrongHover !== null && wrongHover !== wrongEdit;
  const wrongAfterFen =
    previewingWrong && boardReply?.answer
      ? fenAfterUci(startFen, boardReply.answer)
      : null;
  const boardFen = boardReply
    ? (wrongAfterFen ?? startFen)
    : viewingSolution && afterFen
      ? afterFen
      : markupPhase === "after" && afterFen
        ? afterFen
        : form.fen;
  const markupLayer = boardReply
    ? previewingWrong
      ? withWrongMoveArrow(
          recolorGreenDefense(boardReply.markup ?? emptyBoardMarkup()),
          boardReply.answer,
        )
      : emptyBoardMarkup()
    : viewingSolution && solutionUci
      ? withWrongMoveArrow(
          cloneBoardMarkup(
            markupPhase === "after" ? form.markup.after : form.markup.before,
          ),
          solutionUci,
        )
      : markupPhase === "after"
        ? form.markup.after
        : form.markup.before;
  const wrongMoveSquares =
    previewingWrong && boardReply?.answer
      ? [
          normalizeUci(boardReply.answer).slice(0, 2),
          normalizeUci(boardReply.answer).slice(2, 4),
        ].filter((square) => square.length === 2)
      : viewingSolution && solutionUci.length >= 4
        ? [solutionUci.slice(0, 2), solutionUci.slice(2, 4)].filter(
            (square) => square.length === 2,
          )
        : [];
  const chapterPlace = placementOf(
    curriculum,
    selectedChapterId ?? form.chapterId,
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <details className="shrink-0 text-[14px] leading-none">
        <summary className="cursor-pointer select-none px-1 py-0.5 text-muted-foreground hover:text-foreground">
          Import PGN
        </summary>
      <div className="max-h-[40vh] overflow-y-auto px-1 pb-1">
      <PgnImportCard
        onBeforeImport={() => commitHistory("Import PGN")}
        onImported={refresh}
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
            <CurriculumTree
              curriculum={curriculum}
              puzzles={puzzles}
              courseId={courseId}
              selectedPuzzleId={form.id || undefined}
              selectedChapterId={selectedChapterId}
              onSelectCourse={setCourseId}
              onSelectChapter={(id) => {
                setSelectedChapterId(id);
                setForm((current) =>
                  current.id ? current : { ...current, chapterId: id },
                );
              }}
              onSelectPuzzle={loadPuzzle}
              onCurriculum={(next, label) => void persistCurriculum(next, label)}
              onMovePuzzle={(puzzleId, chapterId, beforeId) =>
                void onMovePuzzle(puzzleId, chapterId, beforeId)
              }
              onNewPuzzle={(chapterId) => {
                setSelectedChapterId(chapterId);
                setForm({ ...emptyForm(), chapterId });
                setWrongEdit(null);
                setWrongHover(null);
                setStatus(null);
              }}
              onDeletePuzzles={(ids) => void onDeletePuzzles(ids)}
              onDeleteSubtree={(ids, label) => void onDeleteSubtree(ids, label)}
              onDeleteCourse={(id) => void onDeleteCourse(id)}
              onRenamePuzzle={(puzzle, title) => void renamePuzzleTitle(puzzle, title)}
              onUndo={() => void undoLast()}
              canUndo={historySize > 0}
              undoLabel={undoLabel}
            />
        </div>
        <form
              id="puzzle-form"
              className="flex min-h-0 min-w-0 flex-1 overflow-hidden"
              onSubmit={onSave}
            >
              <div className="flex h-full min-h-0 w-[min(calc(100vh-8rem),calc(100vw-36rem))] shrink-0 flex-col px-1">
                  <PositionSetupBoard
                    boardId="admin-preview-setup"
                    className="min-h-0 flex-1"
                    fen={boardFen}
                    playMode={
                      inWrong && !selectedReply?.answer && !hoverOther
                    }
                    moveLocked={false}
                    onPlayMove={(uci) => {
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
                      if (markupPhase === "after") return;
                      setForm((current) => ({ ...current, fen }));
                    }}
                    selectedSquares={
                      form.kind === "squares" ? parseSquares(form.squares) : []
                    }
                    onToggleSquare={
                      form.kind === "squares" && wrongEdit === null
                        ? toggleSquare
                        : undefined
                    }
                    markup={markupLayer}
                    topArrowUci={
                      previewingWrong && boardReply?.answer
                        ? boardReply.answer
                        : boardReply
                          ? ""
                          : solutionUci
                    }
                    lastMoveSquares={wrongMoveSquares}
                    onMarkupChange={
                      (inWrong && !selectedReply?.answer) || hoverOther
                        ? undefined
                        : (layer) =>
                            setForm((current) => {
                              if (wrongEdit !== null) {
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
                              }
                              return {
                                ...current,
                                markup: {
                                  ...current.markup,
                                  [markupPhase]: layer,
                                },
                              };
                            })
                    }
                    tool={markupTool}
                    brush={inWrong && markupBrush === "green" ? "red" : markupBrush}
                    orientation={
                      form.chapterId
                        ? chapterSideOf(curriculum.chapters, form.chapterId)
                        : "white"
                    }
                  />
              </div>
                <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-2 py-1">
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button type="submit" className="h-10 px-5 text-sm" disabled={saving}>
                      {saving ? "Ukládám…" : "Uložit"}
                    </Button>
                    {status ? (
                      <span className="text-xs text-amber-600 dark:text-amber-300">
                        {status}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex shrink-0 flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={markupTool === "piece" ? "default" : "ghost"}
                      onClick={() =>
                        setMarkupTool((current) =>
                          current === "piece" ? "arrow" : "piece",
                        )
                      }
                    >
                      Upravit pozici
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={form.kind === "move" ? "default" : "ghost"}
                      onClick={() => setForm({ ...form, kind: "move" })}
                    >
                      Zahraj tah
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={form.kind === "squares" ? "default" : "ghost"}
                      onClick={() => setForm({ ...form, kind: "squares" })}
                    >
                      Označ pole
                    </Button>
                  </div>
                  <div className="mt-2 flex shrink-0 flex-col gap-1.5">
                <Input
                  id="title"
                  required
                  className="h-8 px-2"
                  placeholder="Název"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              {form.kind === "move" ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 shrink-0 px-2"
                      disabled={!isValidFen(form.fen)}
                      onClick={() => setPlayTarget("solution")}
                    >
                      Tah
                    </Button>
                    {solutionSan ? (
                      <span className="text-sm">{solutionSan}</span>
                    ) : null}
                  </div>
              ) : (
                  <div className="flex gap-1">
                    <Input
                      id="squares"
                      required
                      className="h-8 px-2"
                      placeholder="Pole b3 b5…"
                      value={form.squares}
                      onChange={(e) =>
                        setForm({ ...form, squares: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 px-2"
                      disabled={!isValidFen(form.fen)}
                      onClick={() => setBoardOpen(true)}
                    >
                      Pole
                    </Button>
                  </div>
              )}
                  </div>
                  <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
                  <details className="shrink-0 border-t border-border pt-1">
                    <summary className="cursor-pointer select-none px-1 py-1 text-sm text-muted-foreground hover:text-foreground">
                      Značky
                    </summary>
                    <div className="px-0.5 pb-2">
                <MarkupPalette
                  markup={form.markup}
                  layer={markupLayer}
                  phase={markupPhase}
                  tool={markupTool}
                    brush={inWrong && markupBrush === "green" ? "red" : markupBrush}
                  kind={form.kind}
                  canAfter={Boolean(afterFen)}
                  hidePhase={wrongEdit !== null}
                  onPhase={setMarkupPhase}
                  onTool={setMarkupTool}
                  onBrush={(brush) =>
                    setMarkupBrush(
                      wrongEdit !== null && brush === "green" ? "red" : brush,
                    )
                  }
                  onChange={(markup) => {
                    if (wrongEdit !== null) {
                      if (!selectedReply?.answer || hoverOther) return;
                      const layer = cloneBoardMarkup(markup[markupPhase]);
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
                    setForm((current) => ({ ...current, markup }));
                  }}
                />
                    </div>
                  </details>
                  <details className="shrink-0 border-t border-border pt-1">
                    <summary className="cursor-pointer select-none px-1 py-1 text-sm text-muted-foreground hover:text-foreground">
                      Vysvětlení
                    </summary>
                    <div className="flex flex-col gap-1.5 px-0.5 pb-2">
                  <Textarea
                    id="explanation"
                    rows={5}
                    className="min-h-[6rem] resize-y px-2 py-1.5 text-sm"
                    placeholder="Po správném tahu…"
                    value={form.explanation}
                    onChange={(e) =>
                      setForm({ ...form, explanation: e.target.value })
                    }
                  />
                    </div>
                  </details>
                  <div className="shrink-0 border-t border-border pt-1">
                    <button
                      type="button"
                      className="w-full cursor-pointer select-none px-1 py-1 text-left text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        if (wrongOpen) {
                          setWrongOpen(false);
                          setWrongEdit(null);
                          setWrongHover(null);
                          return;
                        }
                        setWrongOpen(true);
                        if (form.wrongReplies.length === 0) return;
                        setWrongEdit((current) =>
                          current === null ? 0 : current,
                        );
                        setMarkupTool((tool) =>
                          tool === "piece" ? "arrow" : tool,
                        );
                      }}
                    >
                      Špatné tahy
                      {form.wrongReplies.length
                        ? ` (${form.wrongReplies.length})`
                        : ""}
                    </button>
                    {wrongOpen ? (
                    <div className="px-0.5 pb-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      className="h-10 px-5 text-sm"
                      disabled={!isValidFen(form.fen)}
                      onClick={addWrongReply}
                    >
                      + špatný tah
                    </Button>
                    {wrongEdit !== null ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 px-4 text-sm"
                        onClick={() => {
                          setWrongEdit(null);
                          setWrongHover(null);
                        }}
                      >
                        Hotovo
                      </Button>
                    ) : null}
                    </div>
                    {wrongOpen ? (
                      <p className="text-xs text-muted-foreground">
                        ← → řešení a špatné tahy. D F jen špatné. ↑ ↓ úlohy.
                      </p>
                    ) : null}
                    {form.kind === "move" && solutionUci ? (
                      <div
                        data-wrong-tah="sol"
                        tabIndex={-1}
                        onMouseEnter={() => setWrongHover("sol")}
                        onMouseLeave={() =>
                          setWrongHover((current) =>
                            current === "sol" ? null : current,
                          )
                        }
                        onClick={() => {
                          setWrongEdit(null);
                          setWrongHover("sol");
                          setMarkupTool((tool) =>
                            tool === "piece" ? "arrow" : tool,
                          );
                        }}
                        className={`flex cursor-pointer items-center gap-1 outline-none ${wrongEdit === null && (wrongHover === "sol" || wrongHover === null) ? "rounded bg-foreground/5 ring-1 ring-foreground/20" : wrongHover === "sol" ? "rounded bg-foreground/5" : ""}`}
                      >
                        <span className="h-8 w-[4.5rem] shrink-0 content-center px-1 text-center font-mono text-xs text-emerald-600">
                          {solutionUci}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Řešení{solutionSan ? ` · ${solutionSan}` : ""}
                        </span>
                      </div>
                    ) : null}
                    {form.wrongReplies.map((reply, index) => (
                      <div
                        key={index}
                        tabIndex={-1}
                        data-wrong-tah={index}
                        onMouseEnter={() => setWrongHover(index)}
                        onMouseLeave={() =>
                          setWrongHover((current) =>
                            current === index ? null : current,
                          )
                        }
                        className={`flex cursor-pointer items-center gap-1 outline-none ${wrongEdit === index ? "rounded bg-foreground/5 ring-1 ring-foreground/20" : wrongHover === index ? "rounded bg-foreground/5" : ""}`}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`h-8 w-[4.5rem] shrink-0 px-1 font-mono text-xs ${reply.answer ? "" : "text-muted-foreground"}`}
                          title={
                            wrongEdit === index && reply.answer
                              ? "Znovu zahrát"
                              : reply.answer && isValidFen(startFen)
                                ? uciToSan(startFen, reply.answer)
                                : "Zahrát špatný tah"
                          }
                          disabled={!isValidFen(form.fen)}
                          onClick={() => {
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
                            setWrongOpen(true);
                            setWrongEdit(index);
                            if (markupTool === "piece") setMarkupTool("arrow");
                          }}
                        >
                          {reply.answer}
                        </Button>
                        {reply.markup && !isEmptyBoardMarkup(reply.markup) ? (
                          <span
                            className="shrink-0 text-[10px] text-red-500"
                            title="Červené šipky"
                          >
                            →{reply.markup.arrows.length}
                          </span>
                        ) : null}
                        <Input
                          className="h-8 w-12 shrink-0 px-1 text-center text-sm uppercase"
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
                          className="shrink-0 px-1 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setForm({
                              ...form,
                              wrongReplies: form.wrongReplies.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            });
                            setWrongHover((current) => {
                              if (current === null || current === "sol") {
                                return current;
                              }
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
                      </div>
                    ))}
                  </div>
                    </div>
                    ) : null}
                  </div>
                  <details className="shrink-0 border-t border-border pt-1">
                    <summary className="cursor-pointer select-none px-1 py-1 text-sm text-muted-foreground hover:text-foreground">
                      Údaje
                    </summary>
                    <div className="grid grid-cols-2 gap-2 px-0.5 pb-2">
                  <div className="col-span-2 grid gap-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Kapitola: </span>
                      {chapterPlace.chapter}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Podkapitola: </span>
                      {chapterPlace.sub}
                    </p>
                  </div>
                  <select
                    id="chapter"
                    className="col-span-2 h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
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
                    className="h-8 px-2"
                    placeholder="Téma"
                    value={form.theme}
                    onChange={(e) => setForm({ ...form, theme: e.target.value })}
                  />
                  <Input
                    id="level"
                    className="h-8 px-2"
                    placeholder="Úroveň"
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                  />
                  <Input
                    id="source"
                    className="h-8 px-2"
                    placeholder="Partie"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                  />
                <Input
                  id="videoUrl"
                  className="h-8 px-2"
                  placeholder="Video URL"
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                />
                <Input
                  id="hint"
                  className="col-span-2 h-8 px-2"
                  placeholder="Zadání"
                  value={form.hint}
                  onChange={(e) => setForm({ ...form, hint: e.target.value })}
                />
                    </div>
                  </details>
                  <details className="shrink-0 border-t border-border pt-1">
                    <summary className="cursor-pointer select-none px-1 py-1 text-sm text-muted-foreground hover:text-foreground">
                      Z/X
                    </summary>
                    <div className="flex flex-wrap gap-1 px-0.5 pb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={stepReset === "keep" ? "default" : "ghost"}
                        onClick={() => {
                          setStepReset("keep");
                          writeAdminStepReset("keep");
                        }}
                      >
                        Nechat Před/Po
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={stepReset === "before" ? "default" : "ghost"}
                        onClick={() => {
                          setStepReset("before");
                          writeAdminStepReset("before");
                        }}
                      >
                        Vždy před tahem
                      </Button>
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
          setForm((current) => ({ ...current, move: uci }));
        }}
      />
    </div>
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

