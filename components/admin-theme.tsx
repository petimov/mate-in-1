"use client";

import { useEffect, type ReactNode } from "react";

export function AdminTheme({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("admin-theme");
    return () => document.documentElement.classList.remove("admin-theme");
  }, []);
  return children;
}
