"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { UserAvatar } from "@/components/user-avatar";
import { BoardLookPicker } from "@/components/board-look-picker";
import { FenPreviewBoard } from "@/components/fen-preview-board";
import { SubscriptionPanel } from "@/components/subscription-panel";
import { ReviewSettings } from "@/components/review-settings";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function AccountSettings() {
  const { user, signOut, updatePassword } = useAuth();
  const { mode, setMode } = useTheme();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onPassword(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    setOk(false);
    if (password.length < 6) {
      setStatus("Heslo minimálně 6 znaků.");
      return;
    }
    if (password !== confirm) {
      setStatus("Hesla se neshodují.");
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) {
      setStatus(result.error);
      return;
    }
    setPassword("");
    setConfirm("");
    setOk(true);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {user ? <UserAvatar user={user} className="size-10 text-sm" /> : null}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Nastavení</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vzhled jde s účtem. Na jiném zařízení stejné.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => {
            void signOut();
            router.push("/");
          }}
        >
          Odhlásit
        </Button>
      </div>

      <section className="mt-10 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Předplatné</h2>
        <SubscriptionPanel />
      </section>

      <section className="mt-10 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Vzhled webu</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mode === "light" ? "default" : "outline"}
            onClick={() => setMode("light")}
          >
            Světlý
          </Button>
          <Button
            type="button"
            variant={mode === "dark" ? "default" : "outline"}
            onClick={() => setMode("dark")}
          >
            Tmavý
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Šachovnice</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-[10rem_1fr] sm:items-start">
          <FenPreviewBoard fen={START_FEN} className="mx-auto w-40 sm:mx-0" />
          <BoardLookPicker />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Opakování</h2>
        <div className="mt-4">
          <ReviewSettings />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Heslo</h2>
        <form className="mt-4 grid max-w-md gap-3" onSubmit={onPassword}>
          <div className="grid gap-2">
            <Label htmlFor="new-password">Nové heslo</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((open) => !open)}
                aria-label={showPassword ? "Skrýt heslo" : "Ukázat heslo"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Znovu heslo</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              minLength={6}
            />
          </div>
          {status ? <p className="text-sm text-red-500">{status}</p> : null}
          {ok ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Heslo uložené.
            </p>
          ) : null}
          <Button type="submit" disabled={busy || !password} className="w-fit">
            {busy ? "…" : "Změnit heslo"}
          </Button>
        </form>
      </section>
    </div>
  );
}
