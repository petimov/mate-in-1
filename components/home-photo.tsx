"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

export function HomePhoto({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [ok, setOk] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn(ok ? "block" : "hidden", className)}
      onLoad={() => setOk(true)}
      onError={() => setOk(false)}
    />
  );
}
