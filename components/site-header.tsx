"use client";

import { UlohyLink as Link } from "@/components/ulohy-link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { KnightMark } from "@/components/knight-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { SCHOOL } from "@/lib/school";
import { useClientPathname } from "@/lib/use-client-path";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/ulohy", label: "Jednotažky" },
  { href: "/ulohy/trenink", label: "Trénink" },
  { href: "/pro-trenery", label: "Pro trenéry" },
];

const HOME_LINKS = [
  { href: "/#nabidka", label: "Škola" },
  { href: "/#jak-to-funguje", label: "Jak to funguje" },
  { href: "/#o-nas", label: "Trenérka" },
];

export function SiteHeader() {
  const pathname = useClientPathname();
  const { user, ready } = useAuth();
  const [stuck, setStuck] = useState(false);

  const home = pathname === "/";

  useEffect(() => {
    if (!home) {
      setStuck(false);
      return;
    }
    const root = document.querySelector(".home-root");
    if (!root) return;
    const onScroll = () => setStuck(root.scrollTop > 12);
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [home]);

  return (
    <header
      className={cn(
        "print:hidden z-30 shrink-0",
        home
          ? cn("home-header absolute inset-x-0 top-0", stuck && "is-stuck")
          : "border-b border-border bg-header",
      )}
    >
      <div
        className={cn(
          home
            ? "home-header-inner"
            : "flex h-12 items-center justify-between gap-4 px-4",
        )}
      >
        <Link
          href="/"
          className={cn(
            "flex shrink-0 items-center gap-2 tracking-tight",
            home ? "home-logo" : "text-sm font-semibold",
          )}
        >
          <KnightMark className={home ? "size-8" : "size-6"} />
          {SCHOOL.shortName}
        </Link>
        <nav
          className={cn(
            "flex min-w-0 items-center overflow-x-auto",
            home ? "home-nav" : "gap-1 text-sm text-muted-foreground",
          )}
        >
          {(home ? HOME_LINKS : LINKS).map((link) => {
            const active = home
              ? false
              : link.href === "/ulohy"
                ? pathname === "/ulohy" ||
                  (pathname.startsWith("/ulohy/") &&
                    !pathname.startsWith("/ulohy/trenink"))
                : pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  home
                    ? "whitespace-nowrap"
                    : "rounded-md px-2 py-1 whitespace-nowrap hover:text-foreground",
                  !home && active && "bg-foreground/8 text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        {home ? (
          <div className="home-header-cta">
            <Link href="/ulohy" className="home-nav-btn">
              Jednotažky
            </Link>
            <Link href="/#kontakt" className="home-nav-btn">
              Kontakt
            </Link>
            {ready ? (
              user ? (
                <Link
                  href="/ucet"
                  title="Nastavení"
                  aria-label="Nastavení"
                  className="home-nav-account"
                >
                  <UserAvatar user={user} className="size-7 text-[10px]" />
                </Link>
              ) : (
                <Link href="/ucet" className="home-nav-account">
                  Přihlásit
                </Link>
              )
            ) : null}
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-end gap-1">
            <ThemeToggle />
            {ready ? (
              user ? (
                <Link
                  href="/ucet"
                  title="Nastavení"
                  aria-label="Nastavení"
                  className="rounded-full p-0.5 hover:opacity-90"
                >
                  <UserAvatar user={user} className="size-7 text-[10px]" />
                </Link>
              ) : (
                <Link
                  href="/ucet"
                  className="px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Přihlásit
                </Link>
              )
            ) : null}
            <Link
              href="/admin"
              className="px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Admin
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
