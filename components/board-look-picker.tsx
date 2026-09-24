"use client";

import { defaultPieces } from "react-chessboard";

import { useBoardAppearance } from "@/components/board-appearance-provider";
import {
  BOARD_THEMES,
  PIECE_SETS,
  piecePreviewUrl,
  woodGrainUrl,
} from "@/lib/board-appearance";
import {
  BOARD_SOUND_PACKS,
  playBoardSound,
  type BoardSoundPack,
} from "@/lib/board-sound";
import { cn } from "@/lib/utils";

export function BoardLookPicker() {
  const { boardId, pieceId, soundPack, setBoardId, setPieceId, setSoundPack } =
    useBoardAppearance();

  function pickSound(id: BoardSoundPack) {
    setSoundPack(id);
    playBoardSound("move");
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Šachovnice
      </p>
      <div className="mb-4 grid grid-cols-5 gap-2">
        {BOARD_THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            title={theme.name}
            onClick={() => setBoardId(theme.id)}
            className={cn(
              "overflow-hidden rounded-md border-2",
              boardId === theme.id ? "border-primary" : "border-transparent",
            )}
          >
            <span className="grid aspect-square grid-cols-2 grid-rows-2">
              {(["light", "dark", "dark", "light"] as const).map((kind, i) => (
                <span
                  key={`${theme.id}-${i}`}
                  style={{
                    backgroundColor: kind === "light" ? theme.light : theme.dark,
                    backgroundImage: (kind === "light"
                      ? theme.lightTexture
                      : theme.darkTexture)
                      ? `url(${kind === "light" ? theme.lightTexture : theme.darkTexture})`
                      : theme.grain
                        ? woodGrainUrl(theme.light, kind === "dark" ? 4 : 11)
                        : undefined,
                    backgroundSize: "cover",
                  }}
                />
              ))}
            </span>
          </button>
        ))}
      </div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Zvuk tahu
      </p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {BOARD_SOUND_PACKS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => pickSound(item.id)}
            className={cn(
              "rounded-md border px-2 py-1.5 text-xs font-medium",
              soundPack === item.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-foreground/5",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Figurky
      </p>
      <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
        {PIECE_SETS.map((set) => {
          const src = piecePreviewUrl(set);
          return (
            <button
              key={set.id}
              type="button"
              title={set.name}
              onClick={() => setPieceId(set.id)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md border-2 bg-muted p-1",
                pieceId === set.id ? "border-primary" : "border-transparent",
              )}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={set.name} className="h-full w-full" />
              ) : (
                <span className="block h-full w-full">
                  {defaultPieces.wN({
                    svgStyle: { width: "100%", height: "100%" },
                  })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
