"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { mode, toggle } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 shrink-0 text-muted-foreground"
      onClick={toggle}
      title={mode === "dark" ? "Světlý režim" : "Tmavý režim"}
      aria-label={mode === "dark" ? "Světlý režim" : "Tmavý režim"}
    >
      {mode === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}
