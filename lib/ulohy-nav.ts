"use client";

const EVENT = "mate-ulohy-nav";

export function isUlohyPath(pathname: string) {
  return pathname === "/ulohy" || pathname.startsWith("/ulohy/");
}

function hrefOf(href: string) {
  const url = new URL(href, window.location.href);
  return url.pathname + url.search + url.hash;
}

export function softUlohyGo(href: string, replace = false) {
  const next = hrefOf(href);
  const cur =
    window.location.pathname + window.location.search + window.location.hash;
  if (next === cur) return;
  if (replace) window.history.replaceState(null, "", next);
  else window.history.pushState(null, "", next);
  window.dispatchEvent(new Event(EVENT));
}

export function onUlohyLocation(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("popstate", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("popstate", cb);
  };
}

