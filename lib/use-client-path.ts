"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { onUlohyLocation } from "@/lib/ulohy-nav";

export function useClientPathname() {
  const nextPath = usePathname();
  const [path, setPath] = useState(nextPath);

  useEffect(() => {
    return onUlohyLocation(() => setPath(window.location.pathname));
  }, []);

  useEffect(() => {
    setPath(nextPath);
  }, [nextPath]);

  return path;
}
