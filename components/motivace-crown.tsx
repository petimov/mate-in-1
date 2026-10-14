import { cn } from "@/lib/utils";

export function MotivaceCrown({
  className,
  title = "100 %",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 48"
      className={cn("text-amber-400", className)}
      aria-hidden
      role="img"
    >
      <title>{title}</title>
      <path
        fill="currentColor"
        d="M8 36 4 14l14 10L32 6l14 18 14-10-4 22H8Zm2 4h44v6H10v-6Z"
      />
      <circle cx="4" cy="12" r="3" fill="currentColor" />
      <circle cx="32" cy="4" r="3" fill="currentColor" />
      <circle cx="60" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

export function MotivacePieceMark({
  label,
  color,
  className,
}: {
  label: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full text-xs font-bold text-white shadow",
        className,
      )}
      style={{ backgroundColor: color }}
      title={label}
    >
      {label.slice(0, 1)}
    </span>
  );
}
