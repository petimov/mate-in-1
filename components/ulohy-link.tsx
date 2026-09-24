"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

import { isUlohyPath, softUlohyGo } from "@/lib/ulohy-nav";

type Props = ComponentProps<typeof Link>;

function hrefString(href: Props["href"]) {
  if (typeof href === "string") return href;
  const path = href.pathname ?? "";
  const search = href.search ?? "";
  const hash = href.hash ?? "";
  return `${path}${search}${hash}`;
}

export function UlohyLink({ href, onClick, prefetch = false, ...rest }: Props) {
  function handle(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const next = hrefString(href);
    const path = next.split("?")[0]?.split("#")[0] ?? "";
    if (!isUlohyPath(path)) return;
    if (typeof window === "undefined" || !isUlohyPath(window.location.pathname)) {
      return;
    }
    event.preventDefault();
    softUlohyGo(next);
  }

  return <Link href={href} prefetch={prefetch} onClick={handle} {...rest} />;
}
