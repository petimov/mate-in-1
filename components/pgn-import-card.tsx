"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  childChapters,
  sortChapters,
  sortCourses,
  type Curriculum,
} from "@/lib/curriculum";
import { decodePgnBytes, parsePgnText, type PgnParseResult } from "@/lib/pgn-import";
import type { Puzzle } from "@/lib/types";
import { cn } from "@/lib/utils";

type PgnImportCardProps = {
  onImported: () => Promise<void> | void;
  curriculum: Curriculum;
  puzzles: Puzzle[];
  courseId: string;
  chapterId?: string | null;
  onSelectCourse: (id: string) => void;
  onSelectChapter: (id: string | null) => void;
};

export function PgnImportCard({
  onImported,
  curriculum,
  puzzles,
  courseId,
  chapterId,
  onSelectCourse,
  onSelectChapter,
}: PgnImportCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [paste, setPaste] = useState("");
  const [parsed, setParsed] = useState<PgnParseResult | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [titleBase, setTitleBase] = useState("");
  const [numberTitles, setNumberTitles] = useState(true);

  const applyText = useCallback((text: string, names: string[]) => {
    const result = parsePgnText(text);
    setParsed(result);
    setFiles(names);
    setStatus(
      result.total === 0
        ? "No games in that PGN."
        : `Found ${result.puzzles.length} puzzle${result.puzzles.length === 1 ? "" : "s"}${
            result.skipped.length ? `, skipped ${result.skipped.length}` : ""
          }.`,
    );
  }, []);

  const readFiles = useCallback(
    async (list: FileList | File[]) => {
      const files = Array.from(list);
      if (files.some((file) => /\.(cbv|cbh|cbf|cbj)$/i.test(file.name))) {
        setStatus("ChessBase databáze ne. V ChessBase: Soubor → Exportovat → PGN.");
        return;
      }
      const pgnFiles = files.filter(
        (file) =>
          /\.(pgn|txt)$/i.test(file.name) ||
          !file.type ||
          file.type === "application/octet-stream" ||
          file.type.includes("pgn") ||
          file.type.includes("chess") ||
          file.type.startsWith("text/"),
      );
      if (pgnFiles.length === 0) {
        setStatus("Dej sem .pgn z ChessBase exportu.");
        return;
      }
      const chunks = await Promise.all(
        pgnFiles.map(async (file) =>
          decodePgnBytes(new Uint8Array(await file.arrayBuffer())),
        ),
      );
      applyText(chunks.join("\n\n"), pgnFiles.map((file) => file.name));
    },
    [applyText],
  );

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length) {
      void readFiles(event.dataTransfer.files);
      return;
    }
    const text = event.dataTransfer.getData("text/plain");
    if (text.trim()) {
      applyText(text, ["chessbase.pgn"]);
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) {
      void readFiles(event.target.files);
      event.target.value = "";
    }
  }

  async function onImport() {
    if (!parsed?.puzzles.length) return;
    setImporting(true);
    setStatus(null);

    const res = await fetch("/api/puzzles/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puzzles: parsed.puzzles.map((puzzle, index) => ({
          ...puzzle,
          title: importTitle(puzzle.title, titleBase, numberTitles, index),
          chapterId: chapterId || undefined,
          sort: nextSortInChapter(puzzles, chapterId) + index,
        })),
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      imported?: number;
      moved?: number;
      duplicates?: number;
      invalid?: { title: string; error: string }[];
    };
    setImporting(false);

    if (!res.ok) {
      setStatus(data.error ?? "Import failed.");
      return;
    }

    const bits = [`Importováno ${data.imported ?? 0}`];
    if (data.moved) bits.push(`${data.moved} přesunuto do kapitoly`);
    if (data.duplicates) bits.push(`${data.duplicates} už tam bylo`);
    if (data.invalid?.length) bits.push(`${data.invalid.length} neplatných`);
    setStatus(`${bits.join(". ")}.`);
    setParsed(null);
    setFiles([]);
    setPaste("");
    await onImported();
  }

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4 p-4">
        <div>
          <CardTitle>Mass import</CardTitle>
          <CardDescription>
            Drop ChessBase / Chessable PGN files. Each game becomes one mate-in-1.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPasteMode((open) => !open)}
        >
          {pasteMode ? "Switch to files" : "Switch to copy & paste"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <ImportTarget
          curriculum={curriculum}
          courseId={courseId}
          chapterId={chapterId ?? null}
          onSelectCourse={onSelectCourse}
          onSelectChapter={onSelectChapter}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Název úloh" htmlFor="import-title">
            <Input
              id="import-title"
              value={titleBase}
              onChange={(event) => setTitleBase(event.target.value)}
              placeholder="např. Mat věží"
            />
          </Field>
          <label className="flex h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={numberTitles}
              onChange={(event) => setNumberTitles(event.target.checked)}
            />
            Číslovat od 1
          </label>
        </div>
        {titleBase.trim() ? (
          <p className="text-xs text-muted-foreground">
            {numberTitles
              ? `Bude: ${titleBase.trim()} 1, ${titleBase.trim()} 2, …`
              : `Všechny jako „${titleBase.trim()}“`}
          </p>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept=".pgn,.txt,application/x-chess-pgn"
          multiple
          className="hidden"
          onChange={onFileChange}
        />

        {pasteMode ? (
          <div className="grid gap-3">
            <Textarea
              value={paste}
              onChange={(event) => setPaste(event.target.value)}
              placeholder="Paste one or more PGN games…"
              className="min-h-40 font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => applyText(paste, ["pasted.pgn"])}
            >
              Parse PGN
            </Button>
          </div>
        ) : (
          <div
            className={cn(
              "flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/10"
                : "border-border bg-muted/40 hover:border-primary/60",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mb-2 size-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">
              Drop .pgn files here, or click to browse.
            </p>
          </div>
        )}

        {files.length > 0 ? (
          <p className="text-xs text-muted-foreground">{files.join(", ")}</p>
        ) : null}

        {parsed ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={importing || parsed.puzzles.length === 0}
              onClick={() => void onImport()}
            >
              {importing ? "Importing…" : `Import ${parsed.puzzles.length}`}
            </Button>
            <p className="text-sm text-muted-foreground">
              {parsed.puzzles.length} ready
              {parsed.skipped.length ? ` · ${parsed.skipped.length} skipped` : ""}
            </p>
          </div>
        ) : null}

        {parsed?.skipped.length ? (
          <ul className="text-xs text-amber-300/80">
            {parsed.skipped.slice(0, 8).map((skip) => (
              <li key={`${skip.index}-${skip.reason}`}>
                Game {skip.index + 1}
                {skip.event ? ` (${skip.event})` : ""}: {skip.reason}
              </li>
            ))}
          </ul>
        ) : null}

        {status ? <p className="text-sm text-amber-300">{status}</p> : null}
      </CardContent>
    </Card>
  );
}

function importTitle(
  original: string,
  base: string,
  numbered: boolean,
  index: number,
) {
  const name = base.trim();
  if (!name) return original;
  return numbered ? `${name} ${index + 1}` : name;
}

function nextSortInChapter(puzzles: Puzzle[], chapterId?: string | null) {
  const sorts = puzzles
    .filter((puzzle) => (puzzle.chapterId ?? null) === (chapterId ?? null))
    .map((puzzle) => puzzle.sort ?? 0);
  return sorts.length ? Math.max(...sorts) + 1 : 0;
}

function ImportTarget({
  curriculum,
  courseId,
  chapterId,
  onSelectCourse,
  onSelectChapter,
}: {
  curriculum: Curriculum;
  courseId: string;
  chapterId: string | null;
  onSelectCourse: (id: string) => void;
  onSelectChapter: (id: string | null) => void;
}) {
  const courses = sortCourses(curriculum.courses);
  const course = courses.find((item) => item.id === courseId) ?? courses[0];
  const roots = course
    ? childChapters(curriculum.chapters, null, course.id)
    : [];
  const selected = curriculum.chapters.find((item) => item.id === chapterId);
  const rootId = selected
    ? rootChapterId(curriculum, selected.id, course?.id ?? "")
    : "";
  const subs = rootId
    ? descendantOptions(curriculum, rootId, course?.id ?? "")
    : [];
  const subId = chapterId && chapterId !== rootId ? chapterId : "";

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Kurz" htmlFor="import-course">
        <select
          id="import-course"
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={course?.id ?? ""}
          onChange={(event) => {
            onSelectCourse(event.target.value);
            onSelectChapter(null);
          }}
        >
          {courses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Kapitola" htmlFor="import-chapter">
        <select
          id="import-chapter"
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={rootId}
          onChange={(event) => onSelectChapter(event.target.value || null)}
        >
          <option value="">Nezařazené</option>
          {roots.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Podkapitola" htmlFor="import-sub">
        <select
          id="import-sub"
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
          value={subId}
          disabled={!rootId || subs.length === 0}
          onChange={(event) =>
            onSelectChapter(event.target.value || rootId || null)
          }
        >
          <option value="">{rootId ? "Celá kapitola" : "—"}</option>
          {subs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
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
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function rootChapterId(
  curriculum: Curriculum,
  chapterId: string,
  courseId: string,
): string {
  let current = curriculum.chapters.find((item) => item.id === chapterId);
  while (current?.parentId) {
    const parent = curriculum.chapters.find((item) => item.id === current?.parentId);
    if (!parent || parent.courseId !== courseId) break;
    current = parent;
  }
  return current?.courseId === courseId ? current.id : "";
}

function descendantOptions(
  curriculum: Curriculum,
  parentId: string,
  courseId: string,
) {
  const chapters = sortChapters(
    curriculum.chapters.filter((chapter) => chapter.courseId === courseId),
  );
  const options: { id: string; label: string }[] = [];
  const walk = (id: string, prefix: string) => {
    for (const chapter of childChapters(chapters, id, courseId)) {
      const label = prefix ? `${prefix} / ${chapter.title}` : chapter.title;
      options.push({ id: chapter.id, label });
      walk(chapter.id, label);
    }
  };
  walk(parentId, "");
  return options;
}
