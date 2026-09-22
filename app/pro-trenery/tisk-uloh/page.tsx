import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { PrintBoard } from "@/components/print-board";
import { PrintButton } from "@/components/print-button";
import { DEMO_PUZZLES, puzzleKind } from "@/lib/puzzles";
import { SCHOOL } from "@/lib/school";

export default function TiskUlohPage() {
  const squares = DEMO_PUZZLES.filter(
    (puzzle) => puzzleKind(puzzle) === "squares",
  );
  const moves = DEMO_PUZZLES.filter((puzzle) => puzzleKind(puzzle) === "move");

  return (
    <PageShell className="print-sheet print:max-w-none print:px-0 print:py-0">
      <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/pro-trenery"
          className="text-sm text-zinc-400 hover:text-zinc-100"
        >
          ← Materiály
        </Link>
        <PrintButton label="Tisk / PDF celého balíčku" />
      </div>

      <p className="text-xs uppercase tracking-wide text-amber-500/80 print:text-zinc-600">
        {SCHOOL.name} · pracovní listy
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight print:text-black">
        Balíček úloh A4
      </h1>
      <p className="mt-3 max-w-2xl text-zinc-400 print:text-zinc-700">
        Označ pole tužkou. Mat v 1 zapiš tahem. Řešení na poslední straně.
      </p>

      <h2 className="mt-10 text-xl font-semibold print:text-black">
        Označ pole
      </h2>
      <div className="mt-6 grid gap-10 md:grid-cols-2 print:grid-cols-2">
        {squares.map((puzzle) => (
          <div key={puzzle.id} className="break-inside-avoid">
            <p className="mb-3 text-sm font-medium print:text-black">
              {puzzle.title}. {puzzle.hint}
            </p>
            <PrintBoard fen={puzzle.fen} />
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-xl font-semibold print:text-black">Mat v 1</h2>
      <div className="mt-6 grid gap-10 md:grid-cols-2 print:grid-cols-2">
        {moves.map((puzzle) => (
          <div key={puzzle.id} className="break-inside-avoid">
            <p className="mb-3 text-sm font-medium print:text-black">
              {puzzle.title}. Zapiš tah: __________
            </p>
            <PrintBoard fen={puzzle.fen} />
          </div>
        ))}
      </div>

      <section className="mt-16 break-before-page">
        <h2 className="text-xl font-semibold print:text-black">
          Řešení — jen pro trenéra
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-300 print:text-zinc-800">
          {DEMO_PUZZLES.map((puzzle) => (
            <li key={puzzle.id}>
              <span className="font-medium">{puzzle.title}:</span>{" "}
              {puzzleKind(puzzle) === "squares"
                ? puzzle.squares.join(", ")
                : puzzle.moves.join(", ")}
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
