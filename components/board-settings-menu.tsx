"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";

import { BoardLookPicker } from "@/components/board-look-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PANEL_W = 352;

export function BoardSettingsMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLSpanElement>(null);

  function place() {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const height = Math.min(440, window.innerHeight - 24);
    const pad = 12;
    let left = compact ? r.left : r.right - PANEL_W;
    let top = r.bottom + 8;
    if (top + height > window.innerHeight - pad) {
      top = r.top - height - 8;
    }
    if (top < pad) top = pad;
    if (left < pad) left = pad;
    if (left + PANEL_W > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - PANEL_W - pad);
    }
    setPos({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, compact]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onReposition() {
      place();
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, compact]);

  return (
    <div ref={rootRef} className="relative">
      <span ref={btnRef} className="inline-flex">
        <Button
          type="button"
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={cn("text-muted-foreground", compact && "size-8")}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <Palette className="size-4" />
          {compact ? null : "Vzhled"}
        </Button>
      </span>
      {open ? (
        <div
          className="fixed z-50 w-[22rem] max-h-[min(440px,calc(100dvh-24px))] overflow-y-auto rounded-xl border border-border bg-card p-4 shadow-2xl"
          style={{ top: pos.top, left: pos.left }}
        >
          <BoardLookPicker />
        </div>
      ) : null}
    </div>
  );
}
