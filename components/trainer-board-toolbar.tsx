"use client";

import { RefreshCw, SkipForward, Volume2, VolumeX } from "lucide-react";

import { BoardSettingsMenu } from "@/components/board-settings-menu";
import { useTrainerControls } from "@/components/trainer-controls-provider";
import { Button } from "@/components/ui/button";
import { playBoardSound } from "@/lib/board-sound";
import { cn } from "@/lib/utils";

export function TrainerBoardToolbar() {
  const { flipped, sound, autoNext, toggleFlip, toggleSound, toggleAutoNext } =
    useTrainerControls();

  return (
    <div className="ml-auto flex items-center gap-0.5">
      <BoardSettingsMenu compact />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-8 text-muted-foreground",
          flipped && "bg-foreground/10 text-foreground",
        )}
        title="Otočit šachovnici"
        aria-pressed={flipped}
        onClick={toggleFlip}
      >
        <RefreshCw className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-8 text-muted-foreground",
          !sound && "text-foreground",
        )}
        title={sound ? "Vypnout zvuk" : "Zapnout zvuk"}
        aria-pressed={!sound}
        onClick={() => {
          const next = !sound;
          toggleSound();
          if (next) playBoardSound("move");
        }}
      >
        {sound ? (
          <Volume2 className="size-4" />
        ) : (
          <VolumeX className="size-4" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-8 text-muted-foreground",
          autoNext && "bg-foreground/10 text-foreground",
        )}
        title={
          autoNext
            ? "Vypnout automaticky další"
            : "Po vyřešení hned další úloha"
        }
        aria-pressed={autoNext}
        onClick={toggleAutoNext}
      >
        <SkipForward className="size-4" />
      </Button>
    </div>
  );
}
