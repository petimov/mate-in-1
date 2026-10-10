"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  FolderPlus,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  childChapters,
  chapterChain,
  newId,
  nextSort,
  uniqueSlug,
  sortCourses,
  sortPuzzles,
  puzzlesInChapter,
  nextChapterKind,
  nextChapterSide,
  chapterKindOf,
  chapterSideOf,
  chapterSideLabel,
  chapterSideShort,
  siblingCopyTitle,
  childCopyTitle,
  titleEndsWithSNumber,
  type Chapter,
  type Curriculum,
} from "@/lib/curriculum";
import { puzzleKind } from "@/lib/puzzles";
import type { Puzzle } from "@/lib/types";
import { cn } from "@/lib/utils";

type CurriculumTreeProps = {
  curriculum: Curriculum;
  puzzles: Puzzle[];
  courseId: string;
  selectedPuzzleId?: string;
  selectedChapterId: string | null;
  onSelectCourse: (id: string) => void;
  onSelectChapter: (id: string | null) => void;
  onSelectPuzzle: (puzzle: Puzzle) => void;
  onCurriculum: (next: Curriculum, label?: string) => void;
  onMovePuzzle: (puzzleId: string, chapterId: string | null, beforeId?: string) => void;
  onNewPuzzle: (
    chapterId: string,
    titleHint?: string,
    sourcePuzzle?: Puzzle,
  ) => void;
  onDeletePuzzles: (ids: string[]) => void;
  onDeleteSubtree: (chapterIds: string[], label: string) => void;
  onDeleteCourse: (id: string) => void;
  onRenamePuzzle: (puzzle: Puzzle, title: string) => void;
  onDuplicatePuzzle: (puzzle: Puzzle) => void;
  onUndo: () => void;
  canUndo: boolean;
  undoLabel: string | null;
};

export function CurriculumTree({
  curriculum,
  puzzles,
  courseId,
  selectedPuzzleId,
  selectedChapterId,
  onSelectCourse,
  onSelectChapter,
  onSelectPuzzle,
  onCurriculum,
  onMovePuzzle,
  onNewPuzzle,
  onDeletePuzzles,
  onDeleteSubtree,
  onDeleteCourse,
  onRenamePuzzle,
  onDuplicatePuzzle,
  onUndo,
  canUndo,
  undoLabel,
}: CurriculumTreeProps) {
  const [newCourse, setNewCourse] = useState("");
  const [newChapter, setNewChapter] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const openInit = useRef(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameCourseId, setRenameCourseId] = useState<string | null>(null);
  const [renameCourseValue, setRenameCourseValue] = useState("");
  const [dropChapterId, setDropChapterId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const ids = curriculum.chapters.map((item) => item.id);
    if (!ids.length) return;
    const openAtDepth = (id: string) =>
      chapterChain(curriculum.chapters, id).length <= 2;
    setOpen((current) => {
      if (!openInit.current) {
        openInit.current = true;
        return Object.fromEntries(ids.map((id) => [id, openAtDepth(id)]));
      }
      const next = { ...current };
      let changed = false;
      for (const id of ids) {
        if (!(id in next)) {
          next[id] = openAtDepth(id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [curriculum.chapters]);

  const courses = sortCourses(curriculum.courses);
  const course = courses.find((item) => item.id === courseId) ?? courses[0];
  const roots = course
    ? childChapters(curriculum.chapters, null, course.id)
    : [];
  function setChapters(chapters: Chapter[], label: string) {
    onCurriculum({ ...curriculum, chapters }, label);
  }

  function addCourse() {
    const title = newCourse.trim();
    if (!title) return;
    const id = newId();
    const slug = uniqueSlug(
      title,
      curriculum.courses.map((item) => item.slug),
    );
    onCurriculum(
      {
        ...curriculum,
        courses: [
          ...curriculum.courses,
          { id, slug, title, sort: nextSort(curriculum.courses) },
        ],
      },
      `Nový kurz „${title}“`,
    );
    setNewCourse("");
    onSelectCourse(id);
  }

  function renameCourse(id: string) {
    const title = renameCourseValue.trim();
    setRenameCourseId(null);
    if (!title) return;
    const current = curriculum.courses.find((item) => item.id === id);
    if (!current) return;
    const slug = uniqueSlug(
      title,
      curriculum.courses
        .filter((item) => item.id !== id)
        .map((item) => item.slug),
    );
    onCurriculum(
      {
        ...curriculum,
        courses: curriculum.courses.map((item) =>
          item.id === id ? { ...item, title, slug } : item,
        ),
      },
      `Přejmenovat kurz „${title}“`,
    );
  }

  function deleteCourse(id: string) {
    onDeleteCourse(id);
  }

  function addChapter(parentId: string | null) {
    if (!course) return;
    const title = (parentId ? window.prompt("Název podkapitoly") : newChapter)?.trim();
    if (!title) return;
    const siblings = childChapters(curriculum.chapters, parentId, course.id);
    const slug = uniqueSlug(
      title,
      curriculum.chapters
        .filter((item) => item.courseId === course.id)
        .map((item) => item.slug),
    );
    const id = newId();
    setChapters(
      [
        ...curriculum.chapters,
        {
          id,
          courseId: course.id,
          parentId,
          slug,
          title,
          sort: nextSort(siblings),
          kind: "cviceni",
          side: "white",
        },
      ],
      parentId ? `Nová podkapitola „${title}“` : `Nová kapitola „${title}“`,
    );
    if (!parentId) setNewChapter("");
    setOpen((current) => ({
      ...current,
      [id]: true,
      ...(parentId ? { [parentId]: true } : {}),
    }));
    onSelectChapter(id);
  }

  function usedSlugs() {
    return curriculum.chapters
      .filter((item) => item.courseId === course?.id)
      .map((item) => item.slug);
  }

  function usedTitles(parentId: string | null) {
    return childChapters(curriculum.chapters, parentId, course?.id).map(
      (item) => item.title,
    );
  }

  function revealNewChapter(id: string, parentId: string | null) {
    setOpen((current) => ({
      ...current,
      [id]: true,
      ...(parentId ? { [parentId]: true } : {}),
    }));
    onSelectChapter(id);
  }

  function addSiblingOf(chapter: Chapter) {
    if (!course) return;
    const siblings = childChapters(
      curriculum.chapters,
      chapter.parentId,
      course.id,
    );
    const title = siblingCopyTitle(chapter.title, usedTitles(chapter.parentId));
    const extra: Chapter = {
      id: newId(),
      courseId: course.id,
      parentId: chapter.parentId,
      slug: uniqueSlug(title, usedSlugs()),
      title,
      sort: 0,
      kind: chapterKindOf(chapter),
      side: chapter.side ?? chapterSideOf(curriculum.chapters, chapter.id),
    };
    const index = siblings.findIndex((item) => item.id === chapter.id);
    const ordered = [
      ...siblings.slice(0, index + 1),
      extra,
      ...siblings.slice(index + 1),
    ];
    const sortOf = new Map(ordered.map((item, i) => [item.id, i]));
    extra.sort = sortOf.get(extra.id) ?? index + 1;
    setChapters(
      [
        ...curriculum.chapters.map((item) =>
          sortOf.has(item.id) ? { ...item, sort: sortOf.get(item.id)! } : item,
        ),
        extra,
      ],
      `Nová kapitola „${title}“`,
    );
    revealNewChapter(extra.id, extra.parentId);
    // Kopie pozice jen u výkladu — cvičení zůstane prázdné.
    if (chapterKindOf(chapter) !== "vyklad") return;
    const source = puzzlesInChapter(
      puzzles,
      chapter.id,
      false,
      curriculum.chapters,
    )[0];
    onNewPuzzle(extra.id, extra.title, source);
  }

  function addChildOf(parent: Chapter, sourcePuzzle?: Puzzle) {
    if (!course) return;
    const isVyklad = chapterKindOf(parent) === "vyklad";
    // Cvičení: jen kapitola (prompt), ne hybrid s prázdnou úlohou.
    // Výklad: auto název + kopie pozice do nové podkapitoly.
    const title = isVyklad
      ? childCopyTitle(parent.title, usedTitles(parent.id))
      : window.prompt("Název podkapitoly")?.trim() ?? "";
    if (!title) return;
    const kids = childChapters(curriculum.chapters, parent.id, course.id);
    const extra: Chapter = {
      id: newId(),
      courseId: course.id,
      parentId: parent.id,
      slug: uniqueSlug(title, usedSlugs()),
      title,
      sort: nextSort(kids),
      kind: chapterKindOf(parent),
      side: parent.side ?? chapterSideOf(curriculum.chapters, parent.id),
    };
    setChapters([...curriculum.chapters, extra], `Nová podkapitola „${title}“`);
    revealNewChapter(extra.id, parent.id);
    if (!isVyklad) return;
    const source =
      sourcePuzzle ??
      puzzlesInChapter(puzzles, parent.id, false, curriculum.chapters)[0];
    onNewPuzzle(extra.id, extra.title, source);
  }

  function renameChapter(chapter: Chapter) {
    const title = renameValue.trim();
    if (!title) {
      setRenameId(null);
      return;
    }
    setChapters(
      curriculum.chapters.map((item) =>
        item.id === chapter.id ? { ...item, title } : item,
      ),
      `Přejmenovat „${chapter.title}“`,
    );
    setRenameId(null);
  }

  function cycleKind(chapter: Chapter) {
    setChapters(
      curriculum.chapters.map((item) =>
        item.id === chapter.id
          ? { ...item, kind: nextChapterKind(item.kind) }
          : item,
      ),
      `Typ „${chapter.title}“`,
    );
  }

  function cycleSide(chapter: Chapter) {
    setChapters(
      curriculum.chapters.map((item) =>
        item.id === chapter.id
          ? { ...item, side: nextChapterSide(item.side ?? chapterSideOf(curriculum.chapters, item.id)) }
          : item,
      ),
      `Barva „${chapter.title}“`,
    );
  }

  function deleteChapter(chapter: Chapter) {
    const ids = new Set<string>();
    const walk = (id: string) => {
      ids.add(id);
      for (const child of curriculum.chapters) {
        if (child.parentId === id) walk(child.id);
      }
    };
    walk(chapter.id);
    const extra = ids.size - 1;
    const puzzleCount = puzzles.filter(
      (item) => item.chapterId && ids.has(item.chapterId),
    ).length;
    const parts = [`Smazat „${chapter.title}“`];
    if (extra) parts.push(`i ${extra} podkapitol`);
    const head = `${parts.join(" ")}?`;
    const tail = [
      puzzleCount ? `${puzzleCount} úloh vypadne ze stromu (zůstanou v DB).` : "",
      "Ctrl+Z vrátí.",
    ]
      .filter(Boolean)
      .join(" ");
    if (!window.confirm(`${head} ${tail}`)) {
      return;
    }
    onDeleteSubtree([...ids], `Smazat „${chapter.title}“`);
  }

  function moveChapter(chapter: Chapter, dir: -1 | 1) {
    const siblings = childChapters(
      curriculum.chapters,
      chapter.parentId,
      chapter.courseId,
    );
    const index = siblings.findIndex((item) => item.id === chapter.id);
    const swap = siblings[index + dir];
    if (!swap) return;
    setChapters(
      curriculum.chapters.map((item) => {
        if (item.id === chapter.id) return { ...item, sort: swap.sort };
        if (item.id === swap.id) return { ...item, sort: chapter.sort };
        return item;
      }),
      `Pořadí „${chapter.title}“`,
    );
  }

  function onDropChapter(event: DragEvent, chapterId: string | null) {
    event.preventDefault();
    event.stopPropagation();
    const puzzleId = event.dataTransfer.getData("text/puzzle-id");
    if (!puzzleId) return;
    onMovePuzzle(puzzleId, chapterId);
  }

  function onDropBefore(event: DragEvent, puzzle: Puzzle) {
    event.preventDefault();
    event.stopPropagation();
    const puzzleId = event.dataTransfer.getData("text/puzzle-id");
    if (!puzzleId || puzzleId === puzzle.id) return;
    onMovePuzzle(puzzleId, puzzle.chapterId ?? null, puzzle.id);
  }

  function coursePuzzleIds() {
    if (!course) return [];
    const chapterIds = new Set(
      curriculum.chapters
        .filter((item) => item.courseId === course.id)
        .map((item) => item.id),
    );
    return puzzles
      .filter((item) => item.chapterId && chapterIds.has(item.chapterId))
      .map((item) => item.id);
  }

  function togglePuzzle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleChapterPuzzles(chapterId: string) {
    const ids = puzzlesInChapter(
      puzzles,
      chapterId,
      true,
      curriculum.chapters,
    ).map((item) => item.id);
    setSelected((current) => {
      const next = new Set(current);
      const allOn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return [...next];
    });
  }

  function massDelete() {
    if (!selected.length) return;
    if (!window.confirm(`Smazat ${selected.length} úloh? Ctrl+Z vrátí.`)) return;
    onDeletePuzzles(selected);
    setSelected([]);
  }

  function renamePuzzle(puzzle: Puzzle) {
    const title = renameValue.trim();
    setRenameId(null);
    if (!title || title === puzzle.title) return;
    onRenamePuzzle(puzzle, title);
  }

  function coursePuzzleList() {
    if (!course) return [];
    function walk(parentId: string | null): Puzzle[] {
      const kids = childChapters(curriculum.chapters, parentId, course!.id);
      const list: Puzzle[] = [];
      for (const kid of kids) {
        list.push(...walk(kid.id));
        list.push(
          ...puzzlesInChapter(puzzles, kid.id, false, curriculum.chapters),
        );
      }
      return list;
    }
    return walk(null);
  }

  function openAncestors(chapterId: string) {
    setOpen((current) => {
      const next = { ...current };
      let id: string | null = chapterId;
      while (id) {
        next[id] = true;
        id = curriculum.chapters.find((item) => item.id === id)?.parentId ?? null;
      }
      return next;
    });
  }

  function revealPuzzle(puzzle: Puzzle) {
    if (puzzle.chapterId) {
      openAncestors(puzzle.chapterId);
      onSelectChapter(puzzle.chapterId);
    }
    onSelectPuzzle(puzzle);
  }

  function neighborPuzzle(fromId: string | undefined, dir: -1 | 1) {
    const list = coursePuzzleList();
    if (!list.length) return null;
    const index = fromId
      ? list.findIndex((item) => item.id === fromId)
      : -1;
    if (index < 0) {
      if (selectedChapterId) {
        const inChapter = list.filter(
          (item) => item.chapterId === selectedChapterId,
        );
        if (inChapter.length) {
          return dir > 0 ? inChapter[0] : inChapter[inChapter.length - 1];
        }
      }
      return dir > 0 ? list[0] : list[list.length - 1];
    }
    return list[index + dir] ?? null;
  }

  function stepPuzzle(fromId: string | undefined, dir: -1 | 1) {
    const next = neighborPuzzle(fromId, dir);
    if (next) revealPuzzle(next);
  }

  function stepSNumberSiblings(dir: -1 | 1): boolean {
    const chapterId = selectedPuzzleId
      ? puzzles.find((item) => item.id === selectedPuzzleId)?.chapterId
      : selectedChapterId;
    const chapter = curriculum.chapters.find((item) => item.id === chapterId);
    if (!chapter || !titleEndsWithSNumber(chapter.title)) return false;
    const siblings = childChapters(
      curriculum.chapters,
      chapter.parentId,
      chapter.courseId,
    );
    const index = siblings.findIndex((item) => item.id === chapter.id);
    const next = siblings[index + dir];
    if (!next) return false;
    const first = puzzlesInChapter(
      puzzles,
      next.id,
      false,
      curriculum.chapters,
    )[0];
    if (first) {
      revealPuzzle(first);
      return true;
    }
    openAncestors(next.id);
    onSelectChapter(next.id);
    onNewPuzzle(next.id);
    return true;
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (event.ctrlKey || event.metaKey) return;
      const up =
        event.key === "ArrowUp" ||
        event.code === "KeyZ" ||
        event.code === "KeyY" ||
        event.key === "z" ||
        event.key === "Z" ||
        event.key === "y" ||
        event.key === "Y";
      const down =
        event.key === "ArrowDown" ||
        event.code === "KeyX" ||
        event.key === "x" ||
        event.key === "X";
      if (!up && !down) return;
      event.preventDefault();
      const dir: -1 | 1 = up ? -1 : 1;
      if (event.shiftKey || event.altKey) {
        const puzzle = puzzles.find((item) => item.id === selectedPuzzleId);
        if (puzzle) movePuzzleDir(puzzle, dir);
        return;
      }
      if (stepSNumberSiblings(dir)) return;
      stepPuzzle(selectedPuzzleId, dir);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!selectedPuzzleId) return;
    const chapterId = puzzles.find(
      (item) => item.id === selectedPuzzleId,
    )?.chapterId;
    if (chapterId) openAncestors(chapterId);
    const node = document.querySelector(
      `[data-puzzle-id="${CSS.escape(selectedPuzzleId)}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [selectedPuzzleId, puzzles]);

  function movePuzzleDir(puzzle: Puzzle, dir: -1 | 1) {
    const siblings = sortPuzzles(
      puzzles.filter((item) => (item.chapterId ?? null) === (puzzle.chapterId ?? null)),
    );
    const index = siblings.findIndex((item) => item.id === puzzle.id);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= siblings.length) return;
    if (dir < 0) {
      onMovePuzzle(puzzle.id, puzzle.chapterId ?? null, siblings[next].id);
      return;
    }
    const after = siblings[next + 1];
    onMovePuzzle(puzzle.id, puzzle.chapterId ?? null, after?.id);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 text-[14px] leading-snug">
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        {courses.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-0.5 rounded pl-1",
              item.id === course?.id
                ? "bg-[#00d26a] text-black"
                : "bg-transparent text-muted-foreground",
            )}
          >
            {renameCourseId === item.id ? (
              <Input
                value={renameCourseValue}
                className="h-7 w-28 text-[14px]"
                autoFocus
                onChange={(event) => setRenameCourseValue(event.target.value)}
                onBlur={() => renameCourse(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") renameCourse(item.id);
                  if (event.key === "Escape") setRenameCourseId(null);
                }}
              />
            ) : (
              <button
                type="button"
                className="px-1 py-0.5 text-[14px]"
                onClick={() => onSelectCourse(item.id)}
              >
                {item.title}
              </button>
            )}
            <IconBtn
              title="Přejmenovat kurz"
              onClick={() => {
                setRenameCourseId(item.id);
                setRenameCourseValue(item.title);
              }}
            >
              <Pencil className="size-3" />
            </IconBtn>
            <IconBtn
              title={
                courses.length <= 1
                  ? "Poslední kurz nejde smazat"
                  : "Smazat kurz"
              }
              onClick={() => {
                if (courses.length <= 1) return;
                if (
                  !window.confirm(
                    `Smazat kurz „${item.title}“ i jeho kapitoly? Ctrl+Z vrátí.`,
                  )
                ) {
                  return;
                }
                deleteCourse(item.id);
              }}
            >
              <Trash2 className="size-3" />
            </IconBtn>
          </div>
        ))}
        <Input
          placeholder="Nový kurz"
          className="h-7 min-w-24 flex-1 px-1.5 text-[14px]"
          value={newCourse}
          onChange={(event) => setNewCourse(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addCourse();
          }}
        />
        <Button type="button" variant="outline" className="h-7 px-1.5 text-[14px]" onClick={addCourse}>
          <Plus className="size-3" />
          Kurz
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-7 px-1.5 text-[14px]"
          disabled={!canUndo}
          title={undoLabel ? `Zpět: ${undoLabel} (Ctrl+Z)` : "Nic k vrácení"}
          onClick={onUndo}
        >
          <Undo2 className="size-3" />
          Zpět
        </Button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <button
          type="button"
          className="text-[13px] text-muted-foreground hover:text-foreground"
          onClick={() => {
            const ids = coursePuzzleIds();
            const allOn = ids.length > 0 && ids.every((id) => selected.includes(id));
            setSelected(allOn ? [] : ids);
          }}
        >
          {(() => {
            const ids = coursePuzzleIds();
            return ids.length > 0 && ids.every((id) => selected.includes(id))
              ? "Zrušit výběr"
              : "Vybrat vše";
          })()}
        </button>
        {selected.length > 0 ? (
          <div className="flex items-center gap-1">
            <span className="text-[13px] text-muted-foreground">
              {selected.length}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-1.5 text-[13px]"
              onClick={() => setSelected([])}
            >
              Zrušit
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-7 px-1.5 text-[13px]"
              onClick={massDelete}
            >
              <Trash2 className="size-3" />
              Smazat
            </Button>
          </div>
        ) : null}
        <Input
          placeholder="Nová kapitola"
          className="h-7 min-w-24 flex-1 px-1.5 text-[14px]"
          value={newChapter}
          onChange={(event) => setNewChapter(event.target.value)}
        />
        <Button type="button" variant="outline" className="h-7 px-1.5 text-[14px]" onClick={() => addChapter(null)}>
          <FolderPlus className="size-3" />
          Kapitola
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {roots.map((chapter) => (
          <ChapterNode
            key={chapter.id}
            chapter={chapter}
            chapters={curriculum.chapters}
            puzzles={puzzles}
            selectedChapterId={selectedChapterId}
            selectedPuzzleId={selectedPuzzleId}
            selectedPuzzleIds={selected}
            open={open}
            renameId={renameId}
            renameValue={renameValue}
            setOpen={setOpen}
            setRenameId={setRenameId}
            setRenameValue={setRenameValue}
            onSelectChapter={(id) => {
              if (id) openAncestors(id);
              onSelectChapter(id);
            }}
            onSelectPuzzle={(puzzle) => {
              if (puzzle.chapterId) openAncestors(puzzle.chapterId);
              onSelectPuzzle(puzzle);
            }}
            onRename={renameChapter}
            onDelete={deleteChapter}
            onMove={moveChapter}
            onAddSibling={addSiblingOf}
            onAddChild={addChildOf}
            onCycleKind={cycleKind}
            onCycleSide={cycleSide}
            onDropChapter={onDropChapter}
            onDropBefore={onDropBefore}
            onMovePuzzleDir={movePuzzleDir}
            onStepPuzzle={stepPuzzle}
            onTogglePuzzle={togglePuzzle}
            onToggleChapterPuzzles={toggleChapterPuzzles}
            dropChapterId={dropChapterId}
            setDropChapterId={setDropChapterId}
            onNewPuzzle={onNewPuzzle}
            onRenamePuzzle={renamePuzzle}
            onDuplicatePuzzle={onDuplicatePuzzle}
            onDeletePuzzle={(puzzle) => {
              if (!window.confirm(`Smazat „${puzzle.title}“? Ctrl+Z vrátí.`)) return;
              onDeletePuzzles([puzzle.id]);
            }}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

function ChapterNode({
  chapter,
  chapters,
  puzzles,
  selectedChapterId,
  selectedPuzzleId,
  selectedPuzzleIds,
  open,
  renameId,
  renameValue,
  setOpen,
  setRenameId,
  setRenameValue,
  onSelectChapter,
  onSelectPuzzle,
  onRename,
  onDelete,
  onMove,
  onAddSibling,
  onAddChild,
  onCycleKind,
  onCycleSide,
  onDropChapter,
  onDropBefore,
  onMovePuzzleDir,
  onStepPuzzle,
  onTogglePuzzle,
  onToggleChapterPuzzles,
  dropChapterId,
  setDropChapterId,
  onNewPuzzle,
  onRenamePuzzle,
  onDuplicatePuzzle,
  onDeletePuzzle,
  depth,
}: {
  chapter: Chapter;
  chapters: Chapter[];
  puzzles: Puzzle[];
  selectedChapterId: string | null;
  selectedPuzzleId?: string;
  selectedPuzzleIds: string[];
  open: Record<string, boolean>;
  renameId: string | null;
  renameValue: string;
  setOpen: (value: Record<string, boolean> | ((current: Record<string, boolean>) => Record<string, boolean>)) => void;
  setRenameId: (id: string | null) => void;
  setRenameValue: (value: string) => void;
  onSelectChapter: (id: string | null) => void;
  onSelectPuzzle: (puzzle: Puzzle) => void;
  onRename: (chapter: Chapter) => void;
  onDelete: (chapter: Chapter) => void;
  onMove: (chapter: Chapter, dir: -1 | 1) => void;
  onAddSibling: (chapter: Chapter) => void;
  onAddChild: (chapter: Chapter, sourcePuzzle?: Puzzle) => void;
  onCycleKind: (chapter: Chapter) => void;
  onCycleSide: (chapter: Chapter) => void;
  onDropChapter: (event: DragEvent, chapterId: string | null) => void;
  onDropBefore: (event: DragEvent, puzzle: Puzzle) => void;
  onMovePuzzleDir: (puzzle: Puzzle, dir: -1 | 1) => void;
  onStepPuzzle: (fromId: string | undefined, dir: -1 | 1) => void;
  onTogglePuzzle: (id: string) => void;
  onToggleChapterPuzzles: (chapterId: string) => void;
  dropChapterId: string | null;
  setDropChapterId: (id: string | null) => void;
  onNewPuzzle: (
    chapterId: string,
    titleHint?: string,
    sourcePuzzle?: Puzzle,
  ) => void;
  onRenamePuzzle: (puzzle: Puzzle) => void;
  onDuplicatePuzzle: (puzzle: Puzzle) => void;
  onDeletePuzzle: (puzzle: Puzzle) => void;
  depth: number;
}) {
  const kids = childChapters(chapters, chapter.id);
  const items = puzzlesInChapter(puzzles, chapter.id, false, chapters);
  const branch = puzzlesInChapter(puzzles, chapter.id, true, chapters);
  const selectedSet = new Set(selectedPuzzleIds);
  const branchSelected = branch.filter((item) => selectedSet.has(item.id)).length;
  const branchAll = branch.length > 0 && branchSelected === branch.length;
  const branchSome = branchSelected > 0 && !branchAll;
  const expanded = open[chapter.id] === true;
  const isVyklad = chapterKindOf(chapter) === "vyklad";
  // Výklad: úloha = kapitola. Puzzle řádky ve stromu schovat (vypadaly jako subkapitoly).
  const treeItems = isVyklad ? [] : items;
  const hasTreeChildren = kids.length > 0 || treeItems.length > 0;
  const badgeCount = isVyklad ? kids.length : kids.length + items.length;
  const leafPuzzle = isVyklad ? items[0] : undefined;
  const chapterActive =
    selectedChapterId === chapter.id ||
    Boolean(leafPuzzle && leafPuzzle.id === selectedPuzzleId);
  const duplicateFromChapter = () => {
    const source =
      leafPuzzle ??
      puzzlesInChapter(puzzles, chapter.id, true, chapters)[0];
    if (source) onDuplicatePuzzle(source);
    else onAddSibling(chapter);
  };
  return (
    <div
      className="mb-0"
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDropChapterId(chapter.id);
      }}
      onDragLeave={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && event.currentTarget.contains(next)) return;
        if (dropChapterId === chapter.id) setDropChapterId(null);
      }}
      onDrop={(event) => {
        event.stopPropagation();
        setDropChapterId(null);
        onDropChapter(event, chapter.id);
      }}
    >
      <div
        className={cn(
          "group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded px-0.5 py-0",
          chapterActive ? "bg-[#81b64c]/15" : "hover:bg-foreground/5",
          dropChapterId === chapter.id && "ring-2 ring-[#81b64c] bg-[#81b64c]/20",
        )}
      >
        <div
          className="flex min-w-0 items-center gap-1"
          style={{ paddingLeft: depth * 12 }}
        >
          <TreeCheck
            title="Vybrat úlohy v kapitole"
            checked={branchAll}
            indeterminate={branchSome}
            onToggle={() => onToggleChapterPuzzles(chapter.id)}
          />
          {hasTreeChildren ? (
            <button
              type="button"
              className="shrink-0 text-muted-foreground"
              onClick={() =>
                setOpen((current) => ({ ...current, [chapter.id]: !expanded }))
              }
            >
              {expanded ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
            </button>
          ) : (
            <span
              className="inline-flex size-3 shrink-0 items-center justify-center text-[10px] leading-none text-muted-foreground"
              aria-hidden
            >
              •
            </span>
          )}
          {renameId === chapter.id ? (
            <Input
              value={renameValue}
              className="h-7 min-w-0 flex-1 text-sm"
              autoFocus
              onChange={(event) => setRenameValue(event.target.value)}
              onBlur={() => onRename(chapter)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onRename(chapter);
                if (event.key === "Escape") setRenameId(null);
              }}
            />
          ) : (
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left text-[15px] leading-5"
              onClick={() => onSelectChapter(chapter.id)}
            >
              {chapter.title}
              {badgeCount > 0 ? (
                <span className="ml-2 text-[12px] text-muted-foreground">
                  {badgeCount}
                </span>
              ) : null}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {isVyklad ? (
            <IconBtn
              title="Podkapitola · nesting o úroveň níž"
              onClick={(event) => {
                event.stopPropagation();
                onAddChild(chapter, leafPuzzle);
              }}
            >
              <Plus className="size-3" />
            </IconBtn>
          ) : (
            <IconBtn
              title="Nová úloha"
              onClick={(event) => {
                event.stopPropagation();
                setOpen((current) => {
                  const next = { ...current, [chapter.id]: true };
                  let id: string | null = chapter.parentId;
                  while (id) {
                    next[id] = true;
                    id =
                      chapters.find((item) => item.id === id)?.parentId ??
                      null;
                  }
                  return next;
                });
                onNewPuzzle(chapter.id);
              }}
            >
              <Plus className="size-3" />
            </IconBtn>
          )}
          <button
            type="button"
            title={isVyklad ? "Výklad" : "Cvičení"}
            className="w-5 shrink-0 rounded text-center text-[12px] font-semibold uppercase text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            onClick={() => onCycleKind(chapter)}
          >
            {isVyklad ? "V" : "C"}
          </button>
          <button
            type="button"
            title={chapterSideLabel(chapter.side ?? chapterSideOf(chapters, chapter.id))}
            className="w-5 shrink-0 rounded text-center text-[12px] font-semibold uppercase text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            onClick={() => onCycleSide(chapter)}
          >
            {chapterSideShort(chapter.side ?? chapterSideOf(chapters, chapter.id))}
          </button>
          <div
            className={cn(
              "items-center",
              chapterActive || selectedChapterId === chapter.id
                ? "flex"
                : "hidden group-hover:flex",
            )}
          >
          <IconBtn title="Nahoru" onClick={() => onMove(chapter, -1)}>
            <ChevronsUp className="size-3" />
          </IconBtn>
          <IconBtn title="Dolů" onClick={() => onMove(chapter, 1)}>
            <ChevronsDown className="size-3" />
          </IconBtn>
          <IconBtn
            title="Přejmenovat"
            onClick={() => {
              setRenameId(chapter.id);
              setRenameValue(chapter.title);
            }}
          >
            <Pencil className="size-3" />
          </IconBtn>
          {isVyklad ? (
            <IconBtn
              title="Stejná pozice · stejná úroveň · index +1"
              onClick={(event) => {
                event.stopPropagation();
                duplicateFromChapter();
              }}
            >
              <Plus className="size-3" />
            </IconBtn>
          ) : (
            <IconBtn
              title="Podkapitola"
              onClick={(event) => {
                event.stopPropagation();
                onAddChild(chapter);
              }}
            >
              <Plus className="size-3" />
            </IconBtn>
          )}
          <IconBtn
            title="Smazat"
            className="ml-1.5"
            onClick={() => onDelete(chapter)}
          >
            <Trash2 className="size-3" />
          </IconBtn>
          </div>
        </div>
      </div>
      {expanded && hasTreeChildren ? (
        <div>
          {[
            ...kids.map((child) => ({
              type: "chapter" as const,
              id: child.id,
              sort: child.sort,
              child,
            })),
            ...treeItems.map((puzzle) => ({
              type: "puzzle" as const,
              id: puzzle.id,
              sort: puzzle.sort ?? 0,
              puzzle,
            })),
          ]
            .sort((a, b) => a.sort - b.sort || (a.type === "chapter" ? -1 : 1))
            .map((row) =>
              row.type === "chapter" ? (
            <ChapterNode
              key={row.child.id}
              chapter={row.child}
              chapters={chapters}
              puzzles={puzzles}
              selectedChapterId={selectedChapterId}
              selectedPuzzleId={selectedPuzzleId}
              selectedPuzzleIds={selectedPuzzleIds}
              open={open}
              renameId={renameId}
              renameValue={renameValue}
              setOpen={setOpen}
              setRenameId={setRenameId}
              setRenameValue={setRenameValue}
              onSelectChapter={onSelectChapter}
              onSelectPuzzle={onSelectPuzzle}
              onRename={onRename}
              onDelete={onDelete}
              onMove={onMove}
              onAddSibling={onAddSibling}
              onAddChild={onAddChild}
              onCycleKind={onCycleKind}
              onCycleSide={onCycleSide}
              onDropChapter={onDropChapter}
              onDropBefore={onDropBefore}
              onMovePuzzleDir={onMovePuzzleDir}
              onStepPuzzle={onStepPuzzle}
              onTogglePuzzle={onTogglePuzzle}
              onToggleChapterPuzzles={onToggleChapterPuzzles}
              dropChapterId={dropChapterId}
              setDropChapterId={setDropChapterId}
              onNewPuzzle={onNewPuzzle}
              onRenamePuzzle={onRenamePuzzle}
              onDuplicatePuzzle={onDuplicatePuzzle}
              onDeletePuzzle={onDeletePuzzle}
              depth={depth + 1}
            />
              ) : (
            <PuzzleRow
              key={row.puzzle.id}
              puzzle={row.puzzle}
              active={row.puzzle.id === selectedPuzzleId}
              checked={selectedSet.has(row.puzzle.id)}
              renaming={renameId === row.puzzle.id}
              renameValue={renameValue}
              onSelect={onSelectPuzzle}
              onToggle={() => onTogglePuzzle(row.puzzle.id)}
              onDropBefore={onDropBefore}
              onMoveDir={onMovePuzzleDir}
              onStep={(dir) => onStepPuzzle(row.puzzle.id, dir)}
              onStartRename={() => {
                setRenameId(row.puzzle.id);
                setRenameValue(row.puzzle.title);
              }}
              onRename={() => onRenamePuzzle(row.puzzle)}
              onCancelRename={() => setRenameId(null)}
              onRenameValue={setRenameValue}
              onAddChild={() => onDuplicatePuzzle(row.puzzle)}
              onDuplicate={() => onDuplicatePuzzle(row.puzzle)}
              onDelete={() => onDeletePuzzle(row.puzzle)}
              showCopy={false}
              depth={depth + 1}
            />
              ),
            )}
        </div>
      ) : null}
    </div>
  );
}

function PuzzleRow({
  puzzle,
  active,
  checked,
  renaming,
  renameValue,
  onSelect,
  onToggle,
  onDropBefore,
  onMoveDir,
  onStep,
  onStartRename,
  onRename,
  onCancelRename,
  onRenameValue,
  onAddChild,
  onDuplicate,
  onDelete,
  showCopy,
  depth,
}: {
  puzzle: Puzzle;
  active: boolean;
  checked: boolean;
  renaming: boolean;
  renameValue: string;
  onSelect: (puzzle: Puzzle) => void;
  onToggle: () => void;
  onDropBefore: (event: DragEvent, puzzle: Puzzle) => void;
  onMoveDir: (puzzle: Puzzle, dir: -1 | 1) => void;
  onStep: (dir: -1 | 1) => void;
  onStartRename: () => void;
  onRename: () => void;
  onCancelRename: () => void;
  onRenameValue: (value: string) => void;
  onAddChild?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  showCopy?: boolean;
  depth: number;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button, input")) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData("text/puzzle-id", puzzle.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={(event) => {
        event.stopPropagation();
        onDropBefore(event, puzzle);
      }}
      data-puzzle-id={puzzle.id}
      className={cn(
        "group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded px-0.5 py-0 text-left text-[15px] leading-5",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      <div
        className="flex min-w-0 items-center gap-1"
        style={{ paddingLeft: depth * 12 }}
      >
        <TreeCheck
          title="Vybrat úlohu"
          checked={checked}
          onToggle={onToggle}
        />
        {showCopy ? (
          <span
            className="inline-flex size-3 shrink-0 items-center justify-center text-[10px] leading-none text-muted-foreground"
            aria-hidden
          >
            •
          </span>
        ) : (
          <GripVertical className="size-3 shrink-0 text-muted-foreground" />
        )}
        {renaming ? (
          <Input
            value={renameValue}
            className="h-7 min-w-0 flex-1 text-sm"
            autoFocus
            onChange={(event) => onRenameValue(event.target.value)}
            onBlur={onRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") onRename();
              if (event.key === "Escape") onCancelRename();
            }}
          />
        ) : (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left"
            onClick={() => onSelect(puzzle)}
          >
            {puzzle.title}
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {showCopy ? (
          <IconBtn
            title="Stejná pozice · stejná úroveň · index +1"
            onClick={() => onAddChild?.()}
          >
            <Plus className="size-3" />
          </IconBtn>
        ) : (
          <span className="w-5 text-center text-[12px] uppercase text-muted-foreground">
            {puzzleKind(puzzle) === "squares" ? "P" : "T"}
          </span>
        )}
        <div
          className={cn(
            "items-center",
            active ? "flex" : "hidden group-hover:flex",
          )}
        >
        <IconBtn
          title="Předchozí úloha · Shift: posunout"
          onClick={(event) => {
            if (event.shiftKey) onMoveDir(puzzle, -1);
            else onStep(-1);
          }}
        >
          <ChevronsUp className="size-3" />
        </IconBtn>
        <IconBtn
          title="Další úloha · Shift: posunout"
          onClick={(event) => {
            if (event.shiftKey) onMoveDir(puzzle, 1);
            else onStep(1);
          }}
        >
          <ChevronsDown className="size-3" />
        </IconBtn>
        <IconBtn title="Přejmenovat" onClick={onStartRename}>
          <Pencil className="size-3" />
        </IconBtn>
        {showCopy ? (
          <IconBtn
            title="Stejná pozice · stejná úroveň · index +1"
            onClick={() => onDuplicate()}
          >
            <Plus className="size-3" />
          </IconBtn>
        ) : null}
        <IconBtn title="Smazat" className="ml-1.5" onClick={onDelete}>
          <Trash2 className="size-3" />
        </IconBtn>
        </div>
      </div>
    </div>
  );
}

function TreeCheck({
  title,
  checked,
  indeterminate,
  onToggle,
}: {
  title: string;
  checked: boolean;
  indeterminate?: boolean;
  onToggle: () => void;
}) {
  return (
    <input
      type="checkbox"
      title={title}
      className="size-3.5 shrink-0 cursor-pointer accent-primary"
      checked={checked}
      ref={(node) => {
        if (node) node.indeterminate = Boolean(indeterminate);
      }}
      onChange={onToggle}
      onClick={(event) => event.stopPropagation()}
    />
  );
}

function IconBtn({
  title,
  onClick,
  className,
  children,
}: {
  title: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      className={cn(
        "rounded p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
