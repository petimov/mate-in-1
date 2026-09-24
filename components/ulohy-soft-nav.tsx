"use client";

import { useEffect } from "react";

import { isUlohyPath, softUlohyGo } from "@/lib/ulohy-nav";

export function UlohySoftNav() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }
      const raw = link.getAttribute("href");
      if (!raw || raw.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(link.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (!isUlohyPath(url.pathname)) return;
      if (!isUlohyPath(window.location.pathname)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      softUlohyGo(url.pathname + url.search + url.hash);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
