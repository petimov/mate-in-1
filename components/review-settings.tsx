"use client";

import { useEffect, useState } from "react";

import { useReviewPrefs } from "@/components/review-prefs-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GOOD_PRESETS,
  formatIntervalLabel,
  formatIntervals,
  parseIntervalInput,
} from "@/lib/review-prefs";
import { cn } from "@/lib/utils";

export function ReviewSettings() {
  const { prefs, setPrefs } = useReviewPrefs();
  const [goodText, setGoodText] = useState(formatIntervals(prefs.goodIntervals));
  const [againText, setAgainText] = useState(
    formatIntervals(prefs.againIntervals),
  );
  const [againTimes, setAgainTimes] = useState(String(prefs.againTimes));

  useEffect(() => {
    setGoodText(formatIntervals(prefs.goodIntervals));
    setAgainText(formatIntervals(prefs.againIntervals));
    setAgainTimes(String(prefs.againTimes));
  }, [prefs]);

  function saveGood(intervals: number[]) {
    setPrefs({ ...prefs, goodIntervals: intervals, intervalUnit: "min" });
  }

  function saveAgain(partial: { intervals?: number[]; times?: number }) {
    setPrefs({
      ...prefs,
      againIntervals: partial.intervals ?? prefs.againIntervals,
      againTimes: partial.times ?? prefs.againTimes,
      intervalUnit: "min",
    });
  }

  return (
    <div className="grid gap-8">
      <div>
        <h3 className="text-sm font-semibold">Správný tah</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Mezery: <code className="text-xs">10m</code>,{" "}
          <code className="text-xs">2h</code>, <code className="text-xs">3d</code>.
          Holé číslo = dny. Prázdné / Žádné = nevrací se.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {GOOD_PRESETS.map((preset) => {
            const active =
              JSON.stringify(preset.intervals) ===
              JSON.stringify(prefs.goodIntervals);
            return (
              <Button
                key={preset.label}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                onClick={() => saveGood(preset.intervals)}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-2">
          <Label htmlFor="good-intervals">Vlastní (čárkou)</Label>
          <Input
            id="good-intervals"
            value={goodText}
            placeholder="10m, 1h, 1d, 3d"
            onChange={(event) => setGoodText(event.target.value)}
            onBlur={() => saveGood(parseIntervalInput(goodText))}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold">Špatný tah</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Kolikrát a v jakých mezerách. <code className="text-xs">0</code> /{" "}
          <code className="text-xs">10m</code> = hned nebo za 10 min. Kolikrát 0
          = špatný se neopakuje.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="again-times">Kolikrát</Label>
            <Input
              id="again-times"
              type="number"
              min={0}
              max={20}
              value={againTimes}
              onChange={(event) => setAgainTimes(event.target.value)}
              onBlur={() => {
                const n = Number(againTimes);
                saveAgain({
                  times: Number.isFinite(n) ? n : prefs.againTimes,
                });
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="again-intervals">Intervaly (čárkou)</Label>
            <Input
              id="again-intervals"
              value={againText}
              placeholder="10m, 1h, 1d"
              onChange={(event) => setAgainText(event.target.value)}
              onBlur={() =>
                saveAgain({ intervals: parseIntervalInput(againText) })
              }
            />
          </div>
        </div>
        <p
          className={cn(
            "mt-3 text-xs text-muted-foreground",
            prefs.againTimes === 0 && "text-amber-700 dark:text-amber-300",
          )}
        >
          {prefs.againTimes === 0
            ? "Špatné se nevrací."
            : `Až ${prefs.againTimes}×. Mezery: ${
                prefs.againIntervals.length
                  ? prefs.againIntervals.map(formatIntervalLabel).join(" → ")
                  : "hned"
              }.`}
        </p>
      </div>
    </div>
  );
}
