"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { UlohyLink as Link } from "@/components/ulohy-link";

import { MotivaceCrown, MotivacePieceMark } from "@/components/motivace-crown";
import { UlohySkeleton } from "@/components/ulohy-skeleton";
import { Button } from "@/components/ui/button";
import { findCourse } from "@/lib/curriculum";
import {
  MOTIVACE_PIECE_LABEL,
  buildMotivaceSections,
  motivacePieceColor,
  type MotivaceColumn,
} from "@/lib/motivace";
import {
  formatPracticeDuration,
  getPracticeSnapshot,
  subscribePractice,
  summarizeChapterBests,
  wrongPoolIds,
} from "@/lib/practice-store";
import { useUlohyData } from "@/lib/use-ulohy-data";
import { cn } from "@/lib/utils";

const EMPTY = getPracticeSnapshot();

export function MotivaceDashboard() {
  const { curriculum, puzzles, error, loading } = useUlohyData();
  const practice = useSyncExternalStore(
    subscribePractice,
    getPracticeSnapshot,
    () => EMPTY,
  );

  const course = curriculum ? findCourse(curriculum) : null;
  const sections = useMemo(() => {
    if (!curriculum || !puzzles || !course) return [];
    return buildMotivaceSections(
      curriculum.chapters,
      puzzles,
      course.id,
      practice.chapterBest,
      practice.wip?.chapterId ?? null,
    );
  }, [course, curriculum, practice.chapterBest, practice.wip?.chapterId, puzzles]);

  const summary = useMemo(
    () => summarizeChapterBests(practice.chapterBest),
    [practice.chapterBest],
  );
  const wrongCount = wrongPoolIds(practice).length;

  if (loading) return <UlohySkeleton />;
  if (error || !curriculum || !puzzles) {
    return (
      <p className="p-6 text-sm text-red-500">{error || "Úlohy nejsou."}</p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Motivace
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Procvičení cvičných kapitol (Z/P). Stats jen z celé kapitoly najednou.
          </p>
        </div>
        {wrongCount > 0 ? (
          <Button asChild className="bg-red-600 text-white hover:bg-red-700">
            <Link href="/ulohy/trenink?mode=wrong">
              <RotateCcw className="size-4" />
              Trénovat špatně udělané ({wrongCount})
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            disabled
            className="bg-red-600/50 text-white"
          >
            <RotateCcw className="size-4" />
            Trénovat špatně udělané
          </Button>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card/40 p-4">
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
            Jen kapitoly celé bez chyby
          </h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <Stat
              label="Celé správně hotové kapitoly"
              value={
                <span className="inline-flex items-center gap-2">
                  {summary.perfectChapters}
                  {summary.perfectChapters > 0 ? (
                    <span className="inline-flex gap-1">
                      {Array.from({
                        length: Math.min(summary.perfectChapters, 8),
                      }).map((_, index) => (
                        <MotivaceCrown key={index} className="size-5" />
                      ))}
                    </span>
                  ) : null}
                </span>
              }
            />
            <Stat
              label="Správně udělané úlohy"
              value={String(summary.perfectPuzzles)}
            />
            <Stat
              label="Průměrný čas na správnou úlohu"
              value={formatPracticeDuration(summary.avgPerfectMs)}
            />
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card/40 p-4">
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
            Ze všeho udělaného
          </h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <Stat label="Hotových úloh" value={String(summary.finished)} />
            <Stat label="Správně" value={String(summary.correct)} />
            <Stat label="Špatně" value={String(summary.wrong)} />
            <Stat label="Procento správně" value={`${summary.pct} %`} />
            <Stat
              label="Průměr na správnou"
              value={formatPracticeDuration(summary.avgCorrectMs)}
            />
            <Stat
              label="Průměr s penalizací"
              value={formatPracticeDuration(summary.avgPenaltyMs)}
            />
          </dl>
        </section>
      </div>

      <div className="mt-8 grid gap-8">
        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Zatím žádné cvičné kapitoly s úlohami. Přidej kapitolu typu C a úlohy
            (volitelně tagy Z/P v adminu).
          </p>
        ) : (
          sections.map((section) => (
            <section key={`${section.parent.id}-${section.side}`}>
              <h2 className="text-lg font-semibold">
                {section.parent.title}{" "}
                <span className="font-normal text-muted-foreground">
                  {section.sideLabel}
                </span>
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {section.columns.map((column) => (
                  <ChapterColumnCard key={column.chapter.id} column={column} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function ChapterColumnCard({ column }: { column: MotivaceColumn }) {
  const color = motivacePieceColor(column.piece);
  const total = column.puzzles.length;
  const best = column.best;
  const done = best ? best.correct + best.wrong : 0;
  const pct = best && done ? Math.round((best.correct / done) * 100) : 0;
  const perfect = Boolean(best?.perfect);
  const barPct = perfect ? 100 : Math.min(100, pct);

  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border border-border bg-background p-3",
        column.wip && "ring-2 ring-amber-400/60",
      )}
    >
      <div
        className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-muted"
        title={`${MOTIVACE_PIECE_LABEL[column.piece]} · ${barPct} %`}
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${barPct}%`, backgroundColor: color }}
        />
      </div>

      <div className="mb-2 flex items-center gap-2">
        {perfect ? (
          <MotivaceCrown className="size-8" />
        ) : (
          <MotivacePieceMark
            label={MOTIVACE_PIECE_LABEL[column.piece]}
            color={color}
          />
        )}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            {column.chapter.title}
          </h3>
          {column.wip ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Rozpracovaná
            </p>
          ) : null}
        </div>
      </div>

      {perfect && best ? (
        <dl className="grid gap-1 text-xs text-muted-foreground">
          <Stat
            label="Čas"
            value={formatPracticeDuration(best.elapsedMs)}
          />
          <Stat
            label="Průměr / úloha"
            value={formatPracticeDuration(
              best.correct ? best.elapsedMs / best.correct : 0,
            )}
          />
          <p className="mt-1 inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
            <Trophy className="size-3.5" />
            Celá kapitola správně
          </p>
        </dl>
      ) : (
        <dl className="grid gap-1 text-xs text-muted-foreground">
          <Stat label="Dobře" value={best ? `${pct} %` : "—"} />
          <Stat label="Hotových úloh" value={String(total)} />
          <Stat label="Úloh dobře" value={best ? String(best.correct) : "—"} />
          <Stat label="Úloh špatně" value={best ? String(best.wrong) : "—"} />
          <Stat
            label="Čas"
            value={best ? formatPracticeDuration(best.elapsedMs) : "—"}
          />
          <Stat
            label="Průměr na 1 úlohu"
            value={
              best && done
                ? formatPracticeDuration(best.elapsedMs / done)
                : "—"
            }
          />
          <Stat
            label="Čas s penalizací"
            value={
              best
                ? formatPracticeDuration(best.elapsedMs + best.penaltyMs)
                : "—"
            }
          />
          <Stat
            label="Průměr s penalizací"
            value={
              best && done
                ? formatPracticeDuration(
                    (best.elapsedMs + best.penaltyMs) / done,
                  )
                : "—"
            }
          />
        </dl>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {column.wip ? (
          <Button asChild size="sm" className="flex-1">
            <Link
              href={`/ulohy/trenink?mode=chapter&chapter=${encodeURIComponent(column.chapter.id)}&resume=1`}
            >
              Pokračovat
            </Link>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link
            href={`/ulohy/trenink?mode=chapter&chapter=${encodeURIComponent(column.chapter.id)}`}
          >
            Zkusit znovu
          </Link>
        </Button>
      </div>
    </article>
  );
}
