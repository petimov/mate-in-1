"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PieceRenderObject } from "react-chessboard";

import {
  BOARD_THEME_KEY,
  DEFAULT_BOARD_ID,
  DEFAULT_PIECE_ID,
  PIECE_SET_KEY,
  getBoardTheme,
  getPieceRenderers,
  type BoardTheme,
} from "@/lib/board-appearance";

type BoardAppearanceContextValue = {
  boardId: string;
  pieceId: string;
  setBoardId: (id: string) => void;
  setPieceId: (id: string) => void;
  board: BoardTheme;
  pieces: PieceRenderObject;
  hydrated: boolean;
};

const BoardAppearanceContext = createContext<BoardAppearanceContextValue | null>(
  null,
);

function readStored(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function BoardAppearanceProvider({ children }: { children: ReactNode }) {
  const [boardId, setBoardIdState] = useState(DEFAULT_BOARD_ID);
  const [pieceId, setPieceIdState] = useState(DEFAULT_PIECE_ID);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBoardIdState(readStored(BOARD_THEME_KEY, DEFAULT_BOARD_ID));
    setPieceIdState(readStored(PIECE_SET_KEY, DEFAULT_PIECE_ID));
    setHydrated(true);
  }, []);

  const setBoardId = (id: string) => {
    setBoardIdState(id);
    try {
      window.localStorage.setItem(BOARD_THEME_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const setPieceId = (id: string) => {
    setPieceIdState(id);
    try {
      window.localStorage.setItem(PIECE_SET_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<BoardAppearanceContextValue>(
    () => ({
      boardId,
      pieceId,
      setBoardId,
      setPieceId,
      board: getBoardTheme(boardId),
      pieces: getPieceRenderers(pieceId),
      hydrated,
    }),
    [boardId, pieceId, hydrated],
  );

  return (
    <BoardAppearanceContext.Provider value={value}>
      {children}
    </BoardAppearanceContext.Provider>
  );
}

export function useBoardAppearance(): BoardAppearanceContextValue {
  const value = useContext(BoardAppearanceContext);
  if (!value) {
    throw new Error("useBoardAppearance needs BoardAppearanceProvider");
  }
  return value;
}
