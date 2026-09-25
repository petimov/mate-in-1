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
import { fenAfterUci, isValidFen, normalizeUci, startFenForLine } from "@/lib/chess";
import {
  DEMO_CURRICULUM,
  bindPuzzlesToCurriculum,
  childChapters,
  nextSort,
  sortChapters,
  withMateSubchapters,
  type Curriculum,
} from "@/lib/curriculum";
import {
  clonePuzzleMarkup,
  emptyPuzzleMarkup,
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
  const [playTarget, setPlayTarget] = useState<"solution" | number | null>(
    null,
  );
  const reopenPlayRef = useRef<number | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const [markupTool, setMarkupTool] = useState<SetupTool>("arrow");
  const [markupBrush, setMarkupBrush] = useState<Brush>("green");
  const [markupPhase, setMarkupPhase] = useState<MarkupPhase>("before");

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

  async function persistCurriculum(next: Curriculum) {
    setCurriculum(next);
    const res = await fetch("/api/curriculum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setStatus(data.error ?? "Osnovu nešlo uložit.");
      return;
    }
    setStatus(null);
  }

  async function onDeletePuzzles(ids: string[]) {
    const unique = Array.from(new Set(ids.filter(isUuid)));
    if (!unique.length) return;
    const res = await fetch("/api/puzzles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unique }),
    });
    const data = (await res.json()) as { error?: string; deleted?: number };
    if (!res.ok) {
      setStatus(data.error ?? "Smazání selhalo.");
      return;
    }
    const drop = new Set(unique);
    setPuzzles((current) => current.filter((item) => !drop.has(item.id)));
    if (form.id && drop.has(form.id)) {
      setForm(emptyForm());
    }
    setStatus(`Smazáno ${data.deleted ?? unique.length}.`);
  }

  async function renamePuzzleTitle(puzzle: Puzzle, title: string) {
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
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (playTarget !== null) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setMarkupPhase("before");
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setMarkupPhase("after");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playTarget]);

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
        ? puzzle.wrongReplies.map((reply) => ({ ...reply }))
        : [],
      markup: clonePuzzleMarkup(puzzle.markup),
      chapterId: puzzle.chapterId ?? null,
      sort: puzzle.sort ?? 0,
    });
    setSelectedChapterId(puzzle.chapterId ?? null);
    setStatus(null);
  }

  function toggleSquare(square: string) {
    const next = parseSquares(form.squares);
    const set = new Set(next);
    if (set.has(square)) set.delete(square);
    else set.add(square);
    setForm({ ...form, squares: [...set].join(" ") });
  }

  function addWrongGroup() {
    const index = form.wrongReplies.length;
    setForm({
      ...form,
      wrongReplies: [...form.wrongReplies, { answer: "", text: "" }],
    });
    if (form.kind === "move" && isValidFen(form.fen)) setPlayTarget(index);
  }

  function addWrongMove(sourceIndex: number) {
    const text = form.wrongReplies[sourceIndex]?.text ?? "";
    const index = form.wrongReplies.length;
    setForm({
      ...form,
      wrongReplies: [...form.wrongReplies, { answer: "", text }],
    });
    if (form.kind === "move" && isValidFen(form.fen)) setPlayTarget(index);
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

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
      wrongReplies: form.wrongReplies,
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
  const afterFen =
    solutionUci && isValidFen(form.fen)
      ? fenAfterUci(form.fen, solutionUci)
      : null;
  const boardFen =
    markupPhase === "after" && afterFen ? afterFen : form.fen;
  const markupLayer =
    markupPhase === "after" ? form.markup.after : form.markup.before;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <details className="shrink-0 text-[11px] leading-none">
        <summary className="cursor-pointer select-none px-1 py-0.5 text-muted-foreground hover:text-foreground">
          Import PGN
        </summary>
      <div className="max-h-[40vh] overflow-y-auto px-1 pb-1">
      <PgnImportCard
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
              onCurriculum={(next) => void persistCurriculum(next)}
              onMovePuzzle={(puzzleId, chapterId, beforeId) =>
                void onMovePuzzle(puzzleId, chapterId, beforeId)
              }
              onNewPuzzle={(chapterId) => {
                setSelectedChapterId(chapterId);
                setForm({ ...emptyForm(), chapterId });
                setStatus(null);
              }}
              onDeletePuzzles={(ids) => void onDeletePuzzles(ids)}
              onRenamePuzzle={(puzzle, title) => void renamePuzzleTitle(puzzle, title)}
            />
        </div>
        <form
              id="puzzle-form"
              className="flex min-h-0 min-w-0 flex-1 overflow-hidden"
              onSubmit={onSave}
            >
              <div className="flex h-full min-h-0 w-[min(calc(100vh-13rem),calc(100vw-42rem))] shrink-0 flex-col px-1">
                  <PositionSetupBoard
                    boardId="admin-preview-setup"
                    className="min-h-0 flex-1"
                    fen={boardFen}
                    onChange={(fen) => {
                      if (markupPhase === "after") return;
                      setForm((current) => ({ ...current, fen }));
                    }}
                    selectedSquares={
                      form.kind === "squares" ? parseSquares(form.squares) : []
                    }
                    onToggleSquare={
                      form.kind === "squares" ? toggleSquare : undefined
                    }
                    markup={markupLayer}
                    onMarkupChange={(layer) =>
                      setForm((current) => ({
                        ...current,
                        markup: {
                          ...current.markup,
                          [markupPhase]: layer,
                        },
                      }))
                    }
                    tool={markupTool}
                    brush={markupBrush}
                  />
                  <Textarea
                    id="explanation"
                    rows={2}
                    className="mt-0.5 min-h-0 shrink-0 resize-none px-1.5 py-0.5 text-xs"
                    placeholder="Po správném tahu…"
                    value={form.explanation}
                    onChange={(e) =>
                      setForm({ ...form, explanation: e.target.value })
                    }
                  />
                  {groupWrongReplies(form.wrongReplies).map((group) => (
                    <div key={group.indices.join("-")} className="grid shrink-0 gap-0.5">
                      <div className="flex flex-wrap items-center gap-0.5">
                        {group.indices.map((replyIndex) => {
                          const reply = form.wrongReplies[replyIndex];
                          if (!reply) return null;
                          return (
                            <span
                              key={replyIndex}
                              className="inline-flex items-center gap-0.5 rounded bg-muted px-1 py-0 text-[10px]"
                            >
                              {reply.answer || "…"}
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  setForm({
                                    ...form,
                                    wrongReplies: form.wrongReplies.filter(
                                      (_, index) => index !== replyIndex,
                                    ),
                                  })
                                }
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-5 px-1.5 text-[10px]"
                          disabled={!isValidFen(form.fen)}
                          onClick={() => addWrongMove(group.indices[0] ?? 0)}
                        >
                          + tah
                        </Button>
                      </div>
                      <Input
                        className="h-6 px-1.5 text-xs"
                        placeholder="Proč špatně (pro všechny tahy)"
                        value={group.text}
                        onChange={(event) => {
                          const text = event.target.value;
                          setForm({
                            ...form,
                            wrongReplies: form.wrongReplies.map((reply, index) =>
                              group.indices.includes(index)
                                ? { ...reply, text }
                                : reply,
                            ),
                          });
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-0.5 h-6 shrink-0 px-2 text-[11px]"
                    onClick={addWrongGroup}
                  >
                    + špatná
                  </Button>
              </div>
                <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden px-2 py-1">
                  <div className="flex shrink-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={saving}>
                      {saving ? "Ukládám…" : "Uložit"}
                    </Button>
                    {status ? (
                      <span className="text-[11px] text-amber-600 dark:text-amber-300">
                        {status}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    <button
                      type="button"
                      className={`rounded px-1.5 py-0.5 text-[11px] ${markupTool === "piece" ? "bg-[#81b64c] text-zinc-950" : "bg-muted"}`}
                      onClick={() => setMarkupTool("piece")}
                    >
                      Upravit pozici
                    </button>
                    <button
                      type="button"
                      className={`rounded px-1.5 py-0.5 text-[11px] ${form.kind === "move" ? "bg-[#81b64c] text-zinc-950" : "bg-muted"}`}
                      onClick={() => setForm({ ...form, kind: "move" })}
                    >
                      Zahraj tah
                    </button>
                    <button
                      type="button"
                      className={`rounded px-1.5 py-0.5 text-[11px] ${form.kind === "squares" ? "bg-[#81b64c] text-zinc-950" : "bg-muted"}`}
                      onClick={() => setForm({ ...form, kind: "squares" })}
                    >
                      Označ pole
                    </button>
                  </div>
                <MarkupPalette
                  markup={form.markup}
                  layer={markupLayer}
                  phase={markupPhase}
                  tool={markupTool}
                  brush={markupBrush}
                  kind={form.kind}
                  canAfter={Boolean(afterFen)}
                  onPhase={setMarkupPhase}
                  onTool={setMarkupTool}
                  onBrush={setMarkupBrush}
                  onChange={(markup) =>
                    setForm((current) => ({ ...current, markup }))
                  }
                />
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-2">
                <select
                  id="chapter"
                  className="h-8 w-full shrink-0 rounded-md border border-border bg-background px-2 text-sm"
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
                  id="title"
                  required
                  className="h-8 shrink-0 px-2"
                  placeholder="Název"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              {form.kind === "move" ? (
                  <div className="flex shrink-0 gap-1">
                    <Input
                      id="move"
                      required
                      className="h-8 px-2"
                      placeholder="Řešení UCI"
                      value={form.move}
                      onChange={(e) => setForm({ ...form, move: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 px-2"
                      disabled={!isValidFen(form.fen)}
                      onClick={() => setPlayTarget("solution")}
                    >
                      Tah
                    </Button>
                  </div>
              ) : (
                  <div className="flex shrink-0 gap-1">
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
                <div className="grid shrink-0 grid-cols-2 gap-2">
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
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2">
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
                </div>
                <Textarea
                  id="hint"
                  rows={4}
                  className="min-h-[4rem] flex-1 resize-none px-2 py-1.5 text-sm"
                  placeholder="Zadání"
                  value={form.hint}
                  onChange={(e) => setForm({ ...form, hint: e.target.value })}
                />
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
        fen={startFenForLine(form.fen, form.move ? [form.move] : [])}
        open={playTarget !== null}
        title={
          playTarget === "solution" ? "Zahrát řešení" : "Zahrát špatný tah"
        }
        onClose={() => {
          const next = reopenPlayRef.current;
          reopenPlayRef.current = null;
          setPlayTarget(next);
        }}
        onPick={(uci) => {
          if (playTarget === "solution") {
            setForm((current) => ({ ...current, move: uci }));
            return;
          }
          if (typeof playTarget === "number") {
            const index = playTarget;
            setForm((current) => {
              const next = [...current.wrongReplies];
              const row = next[index];
              if (!row) return current;
              next[index] = { ...row, answer: uci };
              next.push({ answer: "", text: row.text });
              reopenPlayRef.current = next.length - 1;
              return { ...current, wrongReplies: next };
            });
          }
        }}
      />
    </div>
  );
}

function groupWrongReplies(replies: { answer: string; text: string }[]) {
  const groups: { text: string; indices: number[] }[] = [];
  const byText = new Map<string, number>();
  replies.forEach((reply, index) => {
    const key = reply.text.trim();
    if (key) {
      const existing = byText.get(key);
      if (existing !== undefined) {
        groups[existing].indices.push(index);
        return;
      }
      byText.set(key, groups.length);
    }
    groups.push({ text: reply.text, indices: [index] });
  });
  return groups;
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

