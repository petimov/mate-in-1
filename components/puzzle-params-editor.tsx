"use client";

import {
  PARAM_COLORS,
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
  countArrowPieces,
  countPiecesOnFen,
  difficultyVars,
  evalDifficultyFormula,
  mergeParams,
  type ParamFlagKey,
  type PuzzleParams,
} from "@/lib/puzzle-params";
import { cn } from "@/lib/utils";

type Props = {
  value: PuzzleParams;
  onChange: (next: PuzzleParams) => void;
  fen?: string;
  wrongCount?: number;
  markup?: { after?: { arrows?: unknown } } | null;
  difficultyFormula?: string;
  className?: string;
  compact?: boolean;
  showComputed?: boolean;
  showLateFlags?: boolean;
};

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
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            title={labels?.[opt] ?? opt}
            className={cn(
              "inline-flex h-6 min-w-6 items-center justify-center rounded border px-1.5 text-[11px] font-semibold",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
            onClick={() => onPick(active ? undefined : opt)}
          >
            {opt === "C" ? "Č" : opt}
          </button>
        );
      })}
    </div>
  );
}

export function PuzzleParamsEditor({
  value,
  onChange,
  fen = "",
  wrongCount = 0,
  markup,
  difficultyFormula,
  className,
  compact = false,
  showComputed = true,
  showLateFlags = true,
}: Props) {
  const arrowPieces = countArrowPieces(markup);
  const q = fen ? countPiecesOnFen(fen) : 0;
  const vars = difficultyVars({
    fen,
    arrowPieces,
    wrongCount,
    flags: value.flags,
  });
  const difficulty = evalDifficultyFormula(
    difficultyFormula ?? "",
    vars,
  );

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
    const flags = { ...value.flags };
    if (flags[key]) delete flags[key];
    else flags[key] = true;
    onChange(
      mergeParams(value, {
        flags: Object.keys(flags).length ? flags : undefined,
      }),
    );
  }

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
        value={value.distance}
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
      </div>

      {showComputed ? (
        <div
          className={cn(
            "grid gap-1 text-[11px] text-muted-foreground",
            compact ? "grid-cols-2" : "grid-cols-4",
          )}
        >
          <span title="Počet figur">
            Q <strong className="text-foreground">{q}</strong>
          </span>
          <span title="Figury ze šipek">
            R <strong className="text-foreground">{arrowPieces}</strong>
          </span>
          <span title="Špatné tahy">
            S <strong className="text-foreground">{wrongCount}</strong>
          </span>
          <span title="Koeficient obtížnosti">
            T <strong className="text-foreground">{difficulty}</strong>
          </span>
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
    <button
      type="button"
      title={PARAM_FLAG_LABEL[flag]}
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded border px-1.5 text-[11px] font-semibold",
        active
          ? "border-amber-600 bg-amber-500/20 text-amber-900 dark:text-amber-200"
          : "border-border text-muted-foreground hover:border-foreground/40",
      )}
      onClick={onToggle}
    >
      {flag}
    </button>
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
