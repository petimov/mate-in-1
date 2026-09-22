"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail } from "lucide-react";

import { AccountSettings } from "@/components/account-settings";
import { useAuth } from "@/components/auth-provider";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UcetPage() {
  return (
    <PageShell>
      <Suspense>
        <AccountForm />
      </Suspense>
    </PageShell>
  );
}

function AccountForm() {
  const { user, ready, signIn, signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "/ulohy";
  const next = nextParam.startsWith("/ulohy/trenink") ? "/ulohy" : nextParam;
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!ready) {
    return <div className="mx-auto h-40 max-w-2xl" />;
  }

  if (user) {
    return <AccountSettings />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    const result =
      mode === "in"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);
    setBusy(false);
    if (result.error) {
      setStatus(result.error);
      return;
    }
    if (result.confirmEmail) {
      setConfirmOpen(true);
      return;
    }
    router.push(next);
    router.refresh();
  }

  function afterConfirm() {
    setConfirmOpen(false);
    setMode("in");
    setPassword("");
    setShowPassword(false);
    router.replace(`/ucet?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-semibold tracking-tight">
        {mode === "in" ? "Přihlášení" : "Registrace"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Účet drží opakování. Studuj kapitolu, pak jen to, co už znáš.
      </p>
      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Heslo</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
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
        {status ? <p className="text-sm text-red-500">{status}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? "…" : mode === "in" ? "Přihlásit" : "Vytvořit účet"}
        </Button>
      </form>
      <button
        type="button"
        className="mt-4 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => {
          setMode(mode === "in" ? "up" : "in");
          setStatus(null);
        }}
      >
        {mode === "in" ? "Nemáš účet? Registrace." : "Už účet máš? Přihlášení."}
      </button>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Zavřít"
            onClick={afterConfirm}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#4d88d8]/15 text-[#4d88d8]">
              <Mail className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Ověř e-mail</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Poslali jsme odkaz na <span className="text-foreground">{email}</span>.
              Otevři ho, pak se přihlas.
            </p>
            <Button className="mt-6 w-full" onClick={afterConfirm}>
              Pokračovat k přihlášení
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
