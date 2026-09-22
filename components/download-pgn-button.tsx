"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/auth-fetch";
import { DEMO_PUZZLES } from "@/lib/puzzles";
import { puzzlesToPgn } from "@/lib/puzzle-pgn";
import type { Puzzle } from "@/lib/types";

export function DownloadPgnButton() {
  async function onDownload() {
    let puzzles = DEMO_PUZZLES;
    try {
      const res = await fetchWithAuth("/api/puzzles");
      if (res.ok) {
        const data = (await res.json()) as { puzzles?: Puzzle[] };
        if (data.puzzles?.length) puzzles = data.puzzles;
      }
    } catch {
      /* demo PGN */
    }
    const pgn = puzzlesToPgn(puzzles);
    const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sachova-skola-ulohy.pgn";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" onClick={() => void onDownload()}>
      <Download className="size-4" />
      Stáhnout PGN
    </Button>
  );
}
