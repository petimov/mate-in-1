import { MARKUP_ARROW_OPTIONS } from "@/lib/markup";

export type LichessArrow = {
  startSquare: string;
  endSquare: string;
  color: string;
};

type LichessArrowsProps = {
  arrows?: LichessArrow[] | null;
  orientation?: "white" | "black";
};

const VIEW = 8;

function squareCenter(
  square: string,
  orientation: "white" | "black",
): { x: number; y: number } | null {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  if (file < 0 || file > 7 || !Number.isFinite(rank) || rank < 0 || rank > 7) {
    return null;
  }
  const col = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 7 - rank : rank;
  return { x: col + 0.5, y: row + 0.5 };
}

export function LichessArrows({
  arrows,
  orientation = "white",
}: LichessArrowsProps) {
  const list = arrows ?? [];
  if (list.length === 0) return null;

  const destCounts = new Map<string, number>();
  for (const arrow of list) {
    destCounts.set(arrow.endSquare, (destCounts.get(arrow.endSquare) ?? 0) + 1);
  }

  const startPad = MARKUP_ARROW_OPTIONS.arrowStartOffset;
  const shortPad = 1 / MARKUP_ARROW_OPTIONS.arrowLengthReducerDenominator;
  const sharedPad = 1 / MARKUP_ARROW_OPTIONS.sameTargetArrowLengthReducerDenominator;
  const width = 1 / MARKUP_ARROW_OPTIONS.arrowWidthDenominator;

  return (
    <svg
      className="lichess-arrows"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        {list.map((arrow, index) => (
          <marker
            key={`head-${arrow.startSquare}-${arrow.endSquare}-${index}`}
            id={`lichess-arrowhead-${arrow.startSquare}-${arrow.endSquare}-${index}`}
            markerWidth="2.2"
            markerHeight="2.6"
            refX="1.15"
            refY="1.3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L2.2,1.3 L0,2.6 z" fill={arrow.color} />
          </marker>
        ))}
      </defs>
      {list.map((arrow, index) => {
        const from = squareCenter(arrow.startSquare, orientation);
        const to = squareCenter(arrow.endSquare, orientation);
        if (!from || !to) return null;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) return null;
        const endPad =
          (destCounts.get(arrow.endSquare) ?? 1) > 1 ? sharedPad : shortPad;
        const sx = from.x + (dx * startPad) / len;
        const sy = from.y + (dy * startPad) / len;
        const ex = from.x + (dx * (len - endPad)) / len;
        const ey = from.y + (dy * (len - endPad)) / len;
        return (
          <path
            key={`${arrow.startSquare}-${arrow.endSquare}-${index}`}
            d={`M${sx},${sy} L${ex},${ey}`}
            fill="none"
            stroke={arrow.color}
            strokeWidth={width}
            strokeLinecap="round"
            opacity={MARKUP_ARROW_OPTIONS.opacity}
            markerEnd={`url(#lichess-arrowhead-${arrow.startSquare}-${arrow.endSquare}-${index})`}
          />
        );
      })}
    </svg>
  );
}
