"use client";

import type { ReactNode } from "react";
import { UlohyLink as Link } from "@/components/ulohy-link";
import { ChevronRight } from "lucide-react";

import {
  chapterChain,
  chapterHref,
  type Chapter,
  type CurriculumCourse,
} from "@/lib/curriculum";
import { cn } from "@/lib/utils";

type ChapterBreadcrumbProps = {
  course: CurriculumCourse;
  chapters: Chapter[];
  chapter?: Chapter | null;
  className?: string;
};

function Crumb({
  href,
  current,
  children,
}: {
  href?: string;
  current?: boolean;
  children: ReactNode;
}) {
  const className = cn(
    "rounded-md px-2 py-0.5 text-xs font-medium",
    current
      ? "bg-primary text-primary-foreground"
      : "bg-primary/15 text-primary hover:bg-primary/25",
  );
  if (!href || current) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function ChapterBreadcrumb({
  course,
  chapters,
  chapter,
  className,
}: ChapterBreadcrumbProps) {
  const chain = chapter ? chapterChain(chapters, chapter.id) : [];

  return (
    <nav
      aria-label="Drobečková navigace"
      className={cn("flex flex-wrap items-center gap-1.5 text-sm", className)}
    >
      <Crumb href="/ulohy" current={chain.length === 0}>
        {course.title}
      </Crumb>
      {chain.map((item, index) => {
        const last = index === chain.length - 1;
        return (
          <span key={item.id} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            <Crumb
              href={chapterHref(course.slug, chapters, item)}
              current={last}
            >
              {item.title}
            </Crumb>
          </span>
        );
      })}
    </nav>
  );
}
