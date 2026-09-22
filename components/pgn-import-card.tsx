"use client";

import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { parsePgnText, type PgnParseResult } from "@/lib/pgn-import";
import { cn } from "@/lib/utils";

type PgnImportCardProps = {
  onImported: () => Promise<void> | void;
  chapterId?: string | null;
};

export function PgnImportCard({ onImported, chapterId }: PgnImportCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [paste, setPaste] = useState("");
  const [parsed, setParsed] = useState<PgnParseResult | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

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
      const pgnFiles = Array.from(list).filter((file) =>
        /\.(pgn|txt)$/i.test(file.name) || file.type.startsWith("text/"),
      );
      if (pgnFiles.length === 0) {
        setStatus("Drop .pgn files.");
        return;
      }
      const chunks = await Promise.all(pgnFiles.map((file) => file.text()));
      applyText(chunks.join("\n\n"), pgnFiles.map((file) => file.name));
    },
    [applyText],
  );

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files.length) {
      void readFiles(event.dataTransfer.files);
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
          chapterId: chapterId || undefined,
          sort: index,
        })),
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      imported?: number;
      duplicates?: number;
      invalid?: { title: string; error: string }[];
    };
    setImporting(false);

    if (!res.ok) {
      setStatus(data.error ?? "Import failed.");
      return;
    }

    const bits = [`Imported ${data.imported ?? 0}`];
    if (data.duplicates) bits.push(`${data.duplicates} already existed`);
    if (data.invalid?.length) bits.push(`${data.invalid.length} invalid`);
    setStatus(`${bits.join(". ")}.`);
    setParsed(null);
    setFiles([]);
    setPaste("");
    await onImported();
  }

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
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
      <CardContent className="space-y-4">
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
              "flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-colors",
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
            <Upload className="mb-3 size-10 text-muted-foreground" strokeWidth={1.5} />
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
