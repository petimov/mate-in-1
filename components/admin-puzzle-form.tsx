"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { CurriculumTree } from "@/components/curriculum-tree";
import { FenPreviewBoard } from "@/components/fen-preview-board";
import { MarkupEditor } from "@/components/markup-editor";
import { PlayMoveDialog } from "@/components/play-move-dialog";
import { PgnImportCard } from "@/components/pgn-import-card";
import { PositionEditorDialog } from "@/components/position-editor-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isValidFen, normalizeUci, startFenForLine } from "@/lib/chess";
import {
  DEMO_CURRICULUM,
  bindPuzzlesToCurriculum,
  childChapters,
  nextSort,
  sortChapters,
  withMateSubchapters,
  type Curriculum,
} from "@/lib/curriculum";
import { clonePuzzleMarkup, emptyPuzzleMarkup } from "@/lib/markup";
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
  const [boardOpen, setBoardOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);

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

  return (
    <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-3">
      <div className="shrink-0">
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
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="h-[100vh] min-h-[100vh] min-w-0 flex-1 overflow-y-scroll">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Kapitoly</CardTitle>
            <p className="text-sm text-muted-foreground">
              Kurz → kapitola → podkapitola. Přetáhni úlohu. Klik = edit. Nová
              na vybrané kapitole.
            </p>
          </CardHeader>
          <CardContent>
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
            />
          </CardContent>
        </Card>
        </div>
        <div className="h-[100vh] min-h-[100vh] min-w-0 flex-1 overflow-y-scroll">
        <Card className="bg-card">
          <CardHeader className="border-b border-border/60 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>{form.id ? "Upravit úlohu" : "Nová úloha"}</CardTitle>
                {status ? (
                  <p className="mt-1 text-sm text-amber-600 dark:text-amber-300">
                    {status}
                  </p>
                ) : null}
              </div>
              <Button type="submit" form="puzzle-form" disabled={saving}>
                {saving ? "Ukládám…" : "Uložit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form
              id="puzzle-form"
              className="grid gap-6"
              onSubmit={onSave}
            >
              <div className="max-w-[36rem]">
                <p className="mb-2 text-sm font-medium">Náhled</p>
                <FenPreviewBoard
                  fen={form.fen}
                  selectedSquares={
                    form.kind === "squares" ? parseSquares(form.squares) : []
                  }
                  onToggleSquare={
                    form.kind === "squares" ? toggleSquare : undefined
                  }
                />
              </div>
              <div className="grid gap-4">
              <Field label="Kapitola" htmlFor="chapter">
                <select
                  id="chapter"
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
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
              </Field>
              <Field label="Název" htmlFor="title">
                <Input
                  id="title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
              <div className="grid gap-2">
                <Label>Typ</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-sm ${form.kind === "move" ? "bg-[#81b64c] text-zinc-950" : "bg-muted"}`}
                    onClick={() => setForm({ ...form, kind: "move" })}
                  >
                    Zahraj tah
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-sm ${form.kind === "squares" ? "bg-[#81b64c] text-zinc-950" : "bg-muted"}`}
                    onClick={() => setForm({ ...form, kind: "squares" })}
                  >
                    Označ pole
                  </button>
                </div>
              </div>
              <Field label="FEN" htmlFor="fen">
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="fen"
                    required
                    value={form.fen}
                    onChange={(e) => setForm({ ...form, fen: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => setPositionOpen(true)}
                  >
                    Upravit pozici
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    disabled={!isValidFen(form.fen)}
                    onClick={() => setBoardOpen(true)}
                  >
                    {form.kind === "squares"
                      ? "Označit na šachovnici"
                      : "Značky na šachovnici"}
                  </Button>
                </div>
              </Field>
              {form.kind === "move" ? (
                <Field label="Řešení (UCI)" htmlFor="move">
                  <div className="flex gap-2">
                    <Input
                      id="move"
                      required
                      placeholder="e1e8"
                      value={form.move}
                      onChange={(e) => setForm({ ...form, move: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      disabled={!isValidFen(form.fen)}
                      onClick={() => setPlayTarget("solution")}
                    >
                      Zahrát na šachovnici
                    </Button>
                  </div>
                </Field>
              ) : (
                <Field label="Správná pole" htmlFor="squares">
                  <div className="flex gap-2">
                    <Input
                      id="squares"
                      required
                      placeholder="b3 b5 c2 … nebo šachovnice"
                      value={form.squares}
                      onChange={(e) =>
                        setForm({ ...form, squares: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      disabled={!isValidFen(form.fen)}
                      onClick={() => setBoardOpen(true)}
                    >
                      Na šachovnici
                    </Button>
                  </div>
                </Field>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Téma" htmlFor="theme">
                  <Input
                    id="theme"
                    placeholder="Mat v 1"
                    value={form.theme}
                    onChange={(e) => setForm({ ...form, theme: e.target.value })}
                  />
                </Field>
                <Field label="Úroveň" htmlFor="level">
                  <Input
                    id="level"
                    placeholder="Začátečník"
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Partie" htmlFor="source">
                <Input
                  id="source"
                  placeholder="Kasparov vs Karpov, 1985. Žák to může skrýt."
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                />
              </Field>
              <Field label="Zadání" htmlFor="hint">
                <Textarea
                  id="hint"
                  placeholder="Bílý na tahu dá mat. Prázdné = doplní se samo."
                  value={form.hint}
                  onChange={(e) => setForm({ ...form, hint: e.target.value })}
                />
              </Field>
              <Field label="Vysvětlení" htmlFor="explanation">
                <Textarea
                  id="explanation"
                  placeholder="Po správném tahu. Často prázdné."
                  value={form.explanation}
                  onChange={(e) =>
                    setForm({ ...form, explanation: e.target.value })
                  }
                />
              </Field>
              <div className="grid gap-2">
                <Label>Špatná odpověď → text</Label>
                <p className="text-xs text-muted-foreground">
                  Tah: UCI (e1e7). Pole: jedno i víc (e1 nebo e1 f1). Žák uvidí
                  text jen u této odpovědi.
                </p>
                {form.wrongReplies.map((reply, replyIndex) => (
                  <div
                    key={replyIndex}
                    className="grid gap-2 sm:grid-cols-[minmax(7rem,10rem)_auto_minmax(0,1fr)_auto]"
                  >
                    <Input
                      placeholder={form.kind === "squares" ? "e1" : "e1e7"}
                      value={reply.answer}
                      onChange={(event) => {
                        const next = [...form.wrongReplies];
                        next[replyIndex] = {
                          ...reply,
                          answer: event.target.value,
                        };
                        setForm({ ...form, wrongReplies: next });
                      }}
                    />
                    {form.kind === "move" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        disabled={!isValidFen(form.fen)}
                        onClick={() => setPlayTarget(replyIndex)}
                      >
                        Zahrát na šachovnici
                      </Button>
                    ) : null}
                    <Input
                      placeholder="Proč je to špatně"
                      value={reply.text}
                      onChange={(event) => {
                        const next = [...form.wrongReplies];
                        next[replyIndex] = {
                          ...reply,
                          text: event.target.value,
                        };
                        setForm({ ...form, wrongReplies: next });
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setForm({
                          ...form,
                          wrongReplies: form.wrongReplies.filter(
                            (_, index) => index !== replyIndex,
                          ),
                        })
                      }
                    >
                      Smazat
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...form,
                      wrongReplies: [
                        ...form.wrongReplies,
                        { answer: "", text: "" },
                      ],
                    })
                  }
                >
                  Přidat špatnou odpověď
                </Button>
              </div>
              <Field label="Video URL" htmlFor="videoUrl">
                <Input
                  id="videoUrl"
                  placeholder="YouTube nebo Loom"
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                />
              </Field>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
      <PositionEditorDialog
        open={positionOpen}
        fen={form.fen}
        onClose={() => setPositionOpen(false)}
        onChange={(next) => setForm((current) => ({ ...current, fen: next }))}
      />
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
        onClose={() => setPlayTarget(null)}
        onPick={(uci) => {
          if (playTarget === "solution") {
            setForm((current) => ({ ...current, move: uci }));
            return;
          }
          if (typeof playTarget === "number") {
            setForm((current) => {
              const next = [...current.wrongReplies];
              const row = next[playTarget];
              if (!row) return current;
              next[playTarget] = { ...row, answer: uci };
              return { ...current, wrongReplies: next };
            });
          }
        }}
      />
    </div>
  );
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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
