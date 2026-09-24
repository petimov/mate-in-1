"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useUlohyLive } from "@/lib/use-ulohy-live";

export function HomeSubscriberRedirect() {
  const router = useRouter();
  const { live } = useUlohyLive();

  useEffect(() => {
    if (!live) return;
    router.replace("/ulohy");
  }, [live, router]);

  return null;
}
