"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { AuthorQaStrip } from "@/components/author-qa-strip";
import {
  PARAM_COLORS,
  PARAM_DISTANCE_LABEL,
  PARAM_DISTANCES,
  PARAM_FLAG_KEYS,
  PARAM_FLAG_LABEL,
  PARAM_KING_LABEL,
  PARAM_KINGS,
  PARAM_MODE_LABEL,
  PARAM_MODES,
  PARAM_PIECE_LABEL,
  PARAM_PIECES,
  PARAM_ROLE_LABEL,
  PARAM_ROLES,
  DEFAULT_DIFFICULTY_FORMULA,
  countArrowPieces,
  countPiecesOnFen,
  difficultyVars,
  evalDifficultyFormula,
  inferDistance,
  patchAuthorQa,
  type ParamFlagKey,
  type PuzzleParams,
} from "@/lib/puzzle-params";
import {
  getReviewPrefs,
  setReviewPrefs,
  subscribeReviewPrefs,
} from "@/lib/review-prefs";
import { cn } from "@/lib/utils";

type Props = {
  value: PuzzleParams;
  onChange: (next: PuzzleParams) => void;
  fen?: string;
  /** První tah řešení (UCI) — pro auto V/D. */
  solutionUci?: string;
  wrongCount?: number;
  markup?: { after?: { arrows?: unknown } } | null;
  /** Pokud není, bere se z prefs (editovatelný v adminu). */
  difficultyFormula?: string;
  className?: string;
  compact?: boolean;
  showComputed?: boolean;
  showLateFlags?: boolean;
  /** Umožnit editaci vzorce T (admin). */
  editFormula?: boolean;
  /** QA stopa Flagy (nic · n · ✓). Vypnout u defaultů kapitoly. */
  showQa?: boolean;
};

function ParamRing({
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
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-sm text-muted-foreground",
        active ? "ring-1 ring-foreground/25" : "hover:bg-foreground/5",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  labels,
  onPick,
}: {
  label: string;
  options: readonly T[];
  value?: T;
  labels?: Record<T, string>;
  onPick: (next: T | undefined) => void;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-0.5">
      <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="inline-flex flex-wrap">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <ParamRing
              key={opt}
              active={active}
              title={labels?.[opt] ?? opt}
              onClick={() => onPick(active ? undefined : opt)}
            >
              {opt === "C" ? "Č" : opt}
            </ParamRing>
          );
        })}
      </span>
    </div>
  );
}

export function PuzzleParamsEditor({
  value,
  onChange,
  fen = "",
  solutionUci = "",
  wrongCount = 0,
  markup,
  difficultyFormula,
  className,
  compact = false,
  showComputed = true,
  showLateFlags = true,
  editFormula = false,
  showQa = true,
}: Props) {
  const prefsFormula = useSyncExternalStore(
    subscribeReviewPrefs,
    () => getReviewPrefs().difficultyFormula,
    () => DEFAULT_DIFFICULTY_FORMULA,
  );
  const formula = difficultyFormula?.trim() || prefsFormula;
  const [draftFormula, setDraftFormula] = useState(formula);
  const [formulaOpen, setFormulaOpen] = useState(false);
  useEffect(() => {
    setDraftFormula(formula);
  }, [formula]);
  const computedDistance = inferDistance(fen, solutionUci);
  useEffect(() => {
    if (!computedDistance || value.distance) return;
    onChange({ ...value, distance: computedDistance });
    // Jen doplnění prázdného V/D.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedDistance, fen, solutionUci, value.distance]);
  const arrowPieces = countArrowPieces(markup);
  const q = fen ? countPiecesOnFen(fen) : 0;
  const vars = difficultyVars({
    fen,
    arrowPieces,
    wrongCount,
    flags: value.flags,
  });
  const liveFormula =
    editFormula && formulaOpen ? draftFormula : formula;
  const difficulty = evalDifficultyFormula(liveFormula, vars);

  function setField<K extends keyof PuzzleParams>(
    key: K,
    next: PuzzleParams[K] | undefined,
  ) {
    const copy: PuzzleParams = { ...value };
    if (next === undefined || next === null) delete copy[key];
    else copy[key] = next;
    onChange(copy);
  }

  function toggleFlag(key: ParamFlagKey) {
    const flags = { ...(value.flags ?? {}) };
    if (flags[key]) delete flags[key];
    else flags[key] = true;
    const next: PuzzleParams = { ...value };
    if (Object.keys(flags).length) next.flags = flags;
    else delete next.flags;
    if (Object.keys(flags).length && next.qa?.flags?.none) {
      next.qa = patchAuthorQa(next.qa, "flags", {
        passes: next.qa.flags.passes,
        done: next.qa.flags.done,
      });
    }
    onChange(next);
  }

  const hasFlags = Boolean(
    value.flags && Object.values(value.flags).some(Boolean),
  );

  const earlyFlags = PARAM_FLAG_KEYS.filter((k) =>
    ["U", "B", "P", "Z"].includes(k),
  );
  const lateFlags = PARAM_FLAG_KEYS.filter((k) =>
    ["V", "O", "L", "CH"].includes(k),
  );

  return (
    <div className={cn("grid gap-2", className)}>
      <ChipGroup
        label="Figura"
        options={PARAM_PIECES}
        value={value.piece}
        labels={PARAM_PIECE_LABEL}
        onPick={(piece) => setField("piece", piece)}
      />
      <ChipGroup
        label="Barva"
        options={PARAM_COLORS}
        value={value.color}
        onPick={(color) => setField("color", color)}
      />
      <ChipGroup
        label="Král"
        options={PARAM_KINGS}
        value={value.king}
        labels={PARAM_KING_LABEL}
        onPick={(king) => setField("king", king)}
      />
      <ChipGroup
        label="Role"
        options={PARAM_ROLES}
        value={value.role}
        labels={PARAM_ROLE_LABEL}
        onPick={(role) => setField("role", role)}
      />
      <ChipGroup
        label="Typ"
        options={PARAM_MODES}
        value={value.mode}
        labels={PARAM_MODE_LABEL}
        onPick={(mode) => setField("mode", mode)}
      />
      <ChipGroup
        label="Vzdál."
        options={PARAM_DISTANCES}
        value={value.distance ?? computedDistance}
        labels={PARAM_DISTANCE_LABEL}
        onPick={(distance) => setField("distance", distance)}
      />

      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
          Flagy
        </span>
        {earlyFlags.map((key) => (
          <FlagChip
            key={key}
            flag={key}
            active={Boolean(value.flags?.[key])}
            onToggle={() => toggleFlag(key)}
          />
        ))}
        {showLateFlags
          ? lateFlags.map((key) => (
              <FlagChip
                key={key}
                flag={key}
                active={Boolean(value.flags?.[key])}
                onToggle={() => toggleFlag(key)}
              />
            ))
          : null}
        {showQa ? (
          <AuthorQaStrip
            className="ml-1"
            track={value.qa?.flags}
            hasContent={hasFlags}
            onChange={(track) => {
              const next: PuzzleParams = { ...value };
              const qa = patchAuthorQa(value.qa, "flags", track);
              if (qa) next.qa = qa;
              else delete next.qa;
              if (track.none) delete next.flags;
              onChange(next);
            }}
          />
        ) : null}
      </div>

      {showComputed ? (
        <div className="space-y-1.5">
          <div
            className={cn(
              "grid gap-1 text-[11px] text-muted-foreground",
              compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2",
            )}
          >
            <span title="Q · počet figur na šachovnici">
              Figur <strong className="text-foreground">{q}</strong>
            </span>
            <span title="R · figury ze šipek po tahu">
              Ze šipek <strong className="text-foreground">{arrowPieces}</strong>
            </span>
            <span title="S · počet špatných tahů">
              Špatných <strong className="text-foreground">{wrongCount}</strong>
            </span>
            <span title="F · V = vedle krále, D = dál (z matu)">
              Vzdál.{" "}
              <strong className="text-foreground">
                {value.distance ?? computedDistance ?? "—"}
              </strong>
              {computedDistance &&
              value.distance &&
              value.distance !== computedDistance ? (
                <span className="ml-1 text-muted-foreground">
                  (prog. {computedDistance})
                </span>
              ) : null}
            </span>
            <span title="T · koeficient obtížnosti">
              Obtížnost <strong className="text-foreground">{difficulty}</strong>
              {editFormula ? (
                <>
                  {" · "}
                  <button
                    type="button"
                    className="text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground"
                    onClick={() => setFormulaOpen((open) => !open)}
                  >
                    Vzorec
                  </button>
                </>
              ) : null}
            </span>
          </div>
          {editFormula && formulaOpen ? (
            <input
              type="text"
              spellCheck={false}
              autoFocus
              className="h-8 w-full rounded-md border border-border bg-background px-2 font-mono text-[11px] text-foreground"
              value={draftFormula}
              title="q r s f · u b p z v o l ch"
              onChange={(event) => setDraftFormula(event.target.value)}
              onBlur={() => {
                const next =
                  draftFormula.trim() || DEFAULT_DIFFICULTY_FORMULA;
                setDraftFormula(next);
                setReviewPrefs({
                  ...getReviewPrefs(),
                  difficultyFormula: next,
                });
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setDraftFormula(formula);
                  setFormulaOpen(false);
                  return;
                }
                if (event.key !== "Enter") return;
                (event.target as HTMLInputElement).blur();
                setFormulaOpen(false);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FlagChip({
  flag,
  active,
  onToggle,
}: {
  flag: ParamFlagKey;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <ParamRing
      active={active}
      title={PARAM_FLAG_LABEL[flag]}
      onClick={onToggle}
    >
      {flag}
    </ParamRing>
  );
}

export function ParamsBadgeInline({ params }: { params?: PuzzleParams }) {
  if (!params) return null;
  const bits = [
    params.piece,
    params.color === "C" ? "Č" : params.color,
    params.king,
    params.role,
    params.mode,
    params.distance,
  ].filter(Boolean);
  if (!bits.length) return null;
  return (
    <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
      {bits.join("·")}
    </span>
  );
}
