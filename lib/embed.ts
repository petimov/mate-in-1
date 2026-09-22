const YT_WATCH = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/;
const LOOM_SHARE = /loom\.com\/(?:share|embed)\/([A-Za-z0-9-]+)/;

export function toEmbedUrl(rawUrl: string): string | null {
  const url = rawUrl.trim();
  if (!url) return null;

  const yt = url.match(YT_WATCH);
  if (yt?.[1]) {
    return `https://www.youtube.com/embed/${yt[1]}`;
  }

  const loom = url.match(LOOM_SHARE);
  if (loom?.[1]) {
    return `https://www.loom.com/embed/${loom[1]}`;
  }

  if (url.includes("/embed/")) return url;
  return null;
}
