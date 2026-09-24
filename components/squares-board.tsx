"use client";

import { Chessboard, type SquareHandlerArgs } from "react-chessboard";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Check, X } from "lucide-react";

import { BoardFrame } from "@/components/board-frame";
import { useBoardAppearance } from "@/components/board-appearance-provider";
import { boardSquareStyles, mergeSquareStyles } from "@/lib/board-appearance";
import {
  flipOrientation,
  useTrainerControls,
} from "@/components/trainer-controls-provider";
import { playBoardSound } from "@/lib/board-sound";
import { orientationFromFen } from "@/lib/chess";
import {
  markupCircleColor,
  markupFillStyles,
  toChessboardArrows,
  type BoardMarkup,
} from "@/lib/markup";
import { sameSquares } from "@/lib/squares";
import { cn } from "@/lib/utils";

const BOARD_STYLE: CSSProperties = {
  width: "100%",
  overflow: "visible",
};

const MARKED: CSSProperties = { backgroundColor: "rgba(212, 160, 23, 0.55)" };
const WRONG: CSSProperties = { backgroundColor: "rgba(239, 68, 68, 0.48)" };

export type SquaresBoardHandle = {
  check: () => boolean;
  markedCount: () => number;
};

type SquaresBoardProps = {
  fen: string;
  expectedSquares: string[];
  interactive: boolean;
  onCorrect: () => void;
  onWrong?: (squares: string[]) => void;
  markup?: BoardMarkup;
};

export const SquaresBoard = forwardRef<SquaresBoardHandle, SquaresBoardProps>(
  function SquaresBoard(
    { fen, expectedSquares, interactive, onCorrect, onWrong, markup },
    ref,
  ) {
    const { board, pieces } = useBoardAppearance();
    const { flipped } = useTrainerControls();
    const [marked, setMarked] = useState<string[]>([]);
    const [ready, setReady] = useState(false);
    const [feedback, setFeedback] = useState<"idle" | "wrong" | "ok">("idle");
    const markedRef = useRef<string[]>([]);
    markedRef.current = marked;
    const onCorrectRef = useRef(onCorrect);
    onCorrectRef.current = onCorrect;
    const onWrongRef = useRef(onWrong);
    onWrongRef.current = onWrong;
    const interactiveRef = useRef(interactive);
    interactiveRef.current = interactive;

    useEffect(() => {
      setReady(true);
    }, []);

    useEffect(() => {
      setMarked([]);
      setFeedback("idle");
    }, [fen, expectedSquares.join(",")]);

    const orientation = useMemo(
      () => flipOrientation(orientationFromFen(fen), flipped),
      [fen, flipped],
    );

    const toggle = useCallback((square: string) => {
      if (!interactiveRef.current) return;
      setFeedback("idle");
      setMarked((current) =>
        current.includes(square)
          ? current.filter((item) => item !== square)
          : [...current, square],
      );
    }, []);

    const check = useCallback(() => {
      if (!interactiveRef.current) return false;
      const ok = sameSquares(markedRef.current, expectedSquares);
      if (ok) {
        setFeedback("ok");
        playBoardSound("correct");
        onCorrectRef.current();
        return true;
      }
      setFeedback("wrong");
      playBoardSound("wrong");
      onWrongRef.current?.(markedRef.current);
      window.setTimeout(() => {
        setFeedback((current) => (current === "wrong" ? "idle" : current));
      }, 900);
      return false;
    }, [expectedSquares]);

    useImperativeHandle(
      ref,
      () => ({
        check,
        markedCount: () => markedRef.current.length,
      }),
      [check],
    );

    const squareStyles = useMemo(() => {
      const extra: Record<string, CSSProperties> = {
        ...markupFillStyles(markup),
      };
      for (const square of marked) {
        extra[square] = feedback === "wrong" ? WRONG : MARKED;
      }
      return mergeSquareStyles(board, extra);
    }, [board, feedback, marked, markup]);

    const squareRenderer = useCallback(
      ({
        square,
        children,
      }: SquareHandlerArgs & { children?: ReactNode }) => {
        const circle = markupCircleColor(square, markup);
        return (
          <div className="relative h-full w-full" style={squareStyles[square]}>
            {children}
            {circle ? (
              <span
                className="cb-circle"
                style={{ ["--cb-circle" as string]: circle }}
              />
            ) : null}
          </div>
        );
      },
      [markup, squareStyles],
    );

    const onSquareClick = useCallback(
      ({ square }: SquareHandlerArgs) => {
        toggle(square);
      },
      [toggle],
    );

    const options = useMemo(
      () => ({
        id: "school-squares-board",
        position: fen,
        boardOrientation: orientation,
        allowDragging: false,
        allowDrawingArrows: false,
        arrows: toChessboardArrows(markup),
        showAnimations: false,
        pieces,
        squareStyles,
        squareRenderer,
        onSquareClick,
        boardStyle: BOARD_STYLE,
        ...boardSquareStyles(board),
      }),
      [
        board,
        fen,
        markup,
        onSquareClick,
        orientation,
        pieces,
        squareRenderer,
        squareStyles,
      ],
    );

    return (
      <div
        className={cn(
          "relative aspect-square w-full select-none overflow-visible",
          feedback === "wrong" && "ring-2 ring-red-500",
          feedback === "ok" && "ring-2 ring-[#81b64c]",
        )}
        onContextMenu={(event) => event.preventDefault()}
      >
        <BoardFrame orientation={orientation} className="h-full w-full">
          {ready ? (
            <Chessboard options={options} />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}
        </BoardFrame>

        {feedback === "wrong" ? (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-6">
            <div className="flex items-center gap-2 rounded-full border border-red-400/40 bg-zinc-950/90 px-4 py-2 text-red-300 shadow-2xl">
              <X className="size-4" strokeWidth={3} />
              <p className="text-sm font-semibold">Špatně</p>
            </div>
          </div>
        ) : null}

        {feedback === "ok" ? (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-6">
            <div className="flex items-center gap-2 rounded-full border border-[#81b64c]/50 bg-zinc-950/90 px-4 py-2 text-[#81b64c] shadow-2xl">
              <Check className="size-4" strokeWidth={3} />
              <p className="text-sm font-semibold">Správně</p>
            </div>
          </div>
        ) : null}

        {interactive && feedback === "idle" && marked.length > 0 ? (
          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-zinc-950/80 px-3 py-1 text-xs text-zinc-300">
            {marked.length}{" "}
            {marked.length === 1 ? "pole" : marked.length < 5 ? "pole" : "polí"}
          </p>
        ) : null}
      </div>
    );
  },
);
