"use client";

import { toEmbedUrl } from "@/lib/embed";

type VideoEmbedProps = {
  url: string;
  title: string;
};

export function VideoEmbed({ url, title }: VideoEmbedProps) {
  const embedUrl = toEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-black">
      <div className="relative aspect-video w-full">
        <iframe
          src={embedUrl}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
