export function UlohySkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <div className="h-8 w-48 animate-pulse rounded-md bg-foreground/8" />
      <div className="mt-2 h-4 w-32 animate-pulse rounded-md bg-foreground/6" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}
