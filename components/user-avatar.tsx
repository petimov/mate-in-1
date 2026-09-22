import { cn } from "@/lib/utils";

type NameSource = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function metaName(meta: Record<string, unknown> | null | undefined): string {
  for (const key of ["full_name", "name", "display_name"]) {
    const value = meta?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function userInitials(user: NameSource | null | undefined): string {
  const named = metaName(user?.user_metadata);
  if (named) {
    const parts = named.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
    }
    return named.slice(0, 2).toUpperCase();
  }
  const local = (user?.email ?? "").split("@")[0] ?? "";
  const bits = local.split(/[._+\-]+/).filter(Boolean);
  if (bits.length >= 2) {
    return `${bits[0]![0]!}${bits[1]![0]!}`.toUpperCase();
  }
  return (local.slice(0, 2) || "?").toUpperCase();
}

export function UserAvatar({
  user,
  className,
}: {
  user: NameSource;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#399393] text-[11px] font-bold tracking-wide text-white",
        className,
      )}
    >
      {userInitials(user)}
    </span>
  );
}
