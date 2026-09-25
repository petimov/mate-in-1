"use client";

import { useEffect, useState, type DragEvent, type ReactNode } from "react";
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  childChapters,
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
  CH_MAT,
  CH_MAT_VEZI,
  CH_MAT_STRELCEM,
  CH_MAT_KONEM,
  CH_MAT_DAMOU,
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
  onCurriculum: (next: Curriculum) => void;
  onMovePuzzle: (puzzleId: string, chapterId: string | null, beforeId?: string) => void;
  onNewPuzzle: (chapterId: string) => void;
  onDeletePuzzles: (ids: string[]) => void;
  onRenamePuzzle: (puzzle: Puzzle, title: string) => void;
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
  onRenamePuzzle,
}: CurriculumTreeProps) {
  const [newCourse, setNewCourse] = useState("");
  const [newChapter, setNewChapter] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({
    [CH_MAT]: true,
    [CH_MAT_VEZI]: true,
    [CH_MAT_STRELCEM]: true,
    [CH_MAT_KONEM]: true,
    [CH_MAT_DAMOU]: true,
  });
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameCourseId, setRenameCourseId] = useState<string | null>(null);
  const [renameCourseValue, setRenameCourseValue] = useState("");
  const [dropChapterId, setDropChapterId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const courses = sortCourses(curriculum.courses);
  const course = courses.find((item) => item.id === courseId) ?? courses[0];
  const roots = course
    ? childChapters(curriculum.chapters, null, course.id)
    : [];
  function setChapters(chapters: Chapter[]) {
    onCurriculum({ ...curriculum, chapters });
  }

  function addCourse() {
    const title = newCourse.trim();
    if (!title) return;
    const id = newId();
    const slug = uniqueSlug(
      title,
      curriculum.courses.map((item) => item.slug),
    );
    onCurriculum({
      ...curriculum,
      courses: [
        ...curriculum.courses,
        { id, slug, title, sort: nextSort(curriculum.courses) },
      ],
    });
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
    onCurriculum({
      ...curriculum,
      courses: curriculum.courses.map((item) =>
        item.id === id ? { ...item, title, slug } : item,
      ),
    });
  }

  function deleteCourse(id: string) {
    if (curriculum.courses.length <= 1) return;
    const drop = new Set(
      curriculum.chapters
        .filter((item) => item.courseId === id)
        .map((item) => item.id),
    );
    for (const puzzle of puzzles) {
      if (puzzle.chapterId && drop.has(puzzle.chapterId)) {
        onMovePuzzle(puzzle.id, null);
      }
    }
    const nextCourses = curriculum.courses.filter((item) => item.id !== id);
    onCurriculum({
      ...curriculum,
      courses: nextCourses,
      chapters: curriculum.chapters.filter((item) => item.courseId !== id),
    });
    if (courseId === id) onSelectCourse(nextCourses[0]?.id ?? "");
    if (selectedChapterId && drop.has(selectedChapterId)) onSelectChapter(null);
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
    setChapters([
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
    ]);
    if (!parentId) setNewChapter("");
    if (parentId) setOpen((current) => ({ ...current, [parentId]: true }));
    onSelectChapter(id);
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
    );
  }

  function cycleSide(chapter: Chapter) {
    setChapters(
      curriculum.chapters.map((item) =>
        item.id === chapter.id
          ? { ...item, side: nextChapterSide(item.side ?? chapterSideOf(curriculum.chapters, item.id)) }
          : item,
      ),
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
    for (const puzzle of puzzles) {
      if (puzzle.chapterId && ids.has(puzzle.chapterId)) {
        onMovePuzzle(puzzle.id, null);
      }
    }
    setChapters(curriculum.chapters.filter((item) => !ids.has(item.id)));
    if (selectedChapterId && ids.has(selectedChapterId)) onSelectChapter(null);
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
    if (!window.confirm(`Smazat ${selected.length} úloh?`)) return;
    onDeletePuzzles(selected);
    setSelected([]);
  }

  function renamePuzzle(puzzle: Puzzle) {
    const title = renameValue.trim();
    setRenameId(null);
    if (!title || title === puzzle.title) return;
    onRenamePuzzle(puzzle, title);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      const puzzle = puzzles.find((item) => item.id === selectedPuzzleId);
      if (!puzzle) return;
      event.preventDefault();
      movePuzzleDir(puzzle, event.key === "ArrowUp" ? -1 : 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
    <div className="flex h-full min-h-0 flex-col gap-1">
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        {courses.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-0.5 rounded pl-1",
              item.id === course?.id
                ? "bg-[#81b64c] text-zinc-950"
                : "bg-muted text-muted-foreground",
            )}
          >
            {renameCourseId === item.id ? (
              <Input
                value={renameCourseValue}
                className="h-6 w-28 text-xs"
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
                className="px-1 py-0.5 text-xs"
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
                    `Smazat kurz „${item.title}“ i jeho kapitoly?`,
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
          className="h-6 min-w-24 flex-1 px-1.5 text-xs"
          value={newCourse}
          onChange={(event) => setNewCourse(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addCourse();
          }}
        />
        <Button type="button" variant="outline" className="h-6 px-1.5 text-xs" onClick={addCourse}>
          <Plus className="size-3" />
          Kurz
        </Button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <button
          type="button"
          className="text-[11px] text-muted-foreground hover:text-foreground"
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
            <span className="text-[11px] text-muted-foreground">
              {selected.length}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={() => setSelected([])}
            >
              Zrušit
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-6 px-1.5 text-[11px]"
              onClick={massDelete}
            >
              <Trash2 className="size-3" />
              Smazat
            </Button>
          </div>
        ) : null}
        <Input
          placeholder="Nová kapitola"
          className="h-6 min-w-24 flex-1 px-1.5 text-xs"
          value={newChapter}
          onChange={(event) => setNewChapter(event.target.value)}
        />
        <Button type="button" variant="outline" className="h-6 px-1.5 text-xs" onClick={() => addChapter(null)}>
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
            onSelectChapter={onSelectChapter}
            onSelectPuzzle={onSelectPuzzle}
            onRename={renameChapter}
            onDelete={deleteChapter}
            onMove={moveChapter}
            onAddSub={addChapter}
            onCycleKind={cycleKind}
            onCycleSide={cycleSide}
            onDropChapter={onDropChapter}
            onDropBefore={onDropBefore}
            onMovePuzzleDir={movePuzzleDir}
            onTogglePuzzle={togglePuzzle}
            onToggleChapterPuzzles={toggleChapterPuzzles}
            dropChapterId={dropChapterId}
            setDropChapterId={setDropChapterId}
            onNewPuzzle={onNewPuzzle}
            onRenamePuzzle={renamePuzzle}
            onDeletePuzzle={(puzzle) => {
              if (!window.confirm(`Smazat „${puzzle.title}“?`)) return;
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
  onAddSub,
  onCycleKind,
  onCycleSide,
  onDropChapter,
  onDropBefore,
  onMovePuzzleDir,
  onTogglePuzzle,
  onToggleChapterPuzzles,
  dropChapterId,
  setDropChapterId,
  onNewPuzzle,
  onRenamePuzzle,
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
  onAddSub: (parentId: string) => void;
  onCycleKind: (chapter: Chapter) => void;
  onCycleSide: (chapter: Chapter) => void;
  onDropChapter: (event: DragEvent, chapterId: string | null) => void;
  onDropBefore: (event: DragEvent, puzzle: Puzzle) => void;
  onMovePuzzleDir: (puzzle: Puzzle, dir: -1 | 1) => void;
  onTogglePuzzle: (id: string) => void;
  onToggleChapterPuzzles: (chapterId: string) => void;
  dropChapterId: string | null;
  setDropChapterId: (id: string | null) => void;
  onNewPuzzle: (chapterId: string) => void;
  onRenamePuzzle: (puzzle: Puzzle) => void;
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
  const expanded = open[chapter.id] !== false;

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
          selectedChapterId === chapter.id ? "bg-[#81b64c]/15" : "hover:bg-foreground/5",
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
              className="min-w-0 flex-1 truncate text-left text-[13px] leading-5"
              onClick={() => onSelectChapter(chapter.id)}
            >
              {chapter.title}
              <span className="ml-2 text-[10px] text-muted-foreground">
                {items.length}
              </span>
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            title={chapterKindOf(chapter) === "cviceni" ? "Cvičení" : "Výklad"}
            className="w-4 shrink-0 rounded text-center text-[10px] font-semibold uppercase text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            onClick={() => onCycleKind(chapter)}
          >
            {chapterKindOf(chapter) === "cviceni" ? "C" : "V"}
          </button>
          <button
            type="button"
            title={chapterSideLabel(chapter.side ?? chapterSideOf(chapters, chapter.id))}
            className="w-4 shrink-0 rounded text-center text-[10px] font-semibold uppercase text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            onClick={() => onCycleSide(chapter)}
          >
            {chapterSideShort(chapter.side ?? chapterSideOf(chapters, chapter.id))}
          </button>
          {selectedChapterId === chapter.id ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-5 px-1 text-[10px]"
                onClick={() => onNewPuzzle(chapter.id)}
              >
                +
              </Button>
          ) : null}
          <div
            className={cn(
              "items-center",
              selectedChapterId === chapter.id
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
          <IconBtn title="Podkapitola" onClick={() => onAddSub(chapter.id)}>
            <Plus className="size-3" />
          </IconBtn>
          <IconBtn title="Smazat" onClick={() => onDelete(chapter)}>
            <Trash2 className="size-3" />
          </IconBtn>
          </div>
        </div>
      </div>
      {expanded ? (
        <div>
          {kids.map((child) => (
            <ChapterNode
              key={child.id}
              chapter={child}
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
              onAddSub={onAddSub}
              onCycleKind={onCycleKind}
              onCycleSide={onCycleSide}
              onDropChapter={onDropChapter}
              onDropBefore={onDropBefore}
              onMovePuzzleDir={onMovePuzzleDir}
              onTogglePuzzle={onTogglePuzzle}
              onToggleChapterPuzzles={onToggleChapterPuzzles}
              dropChapterId={dropChapterId}
              setDropChapterId={setDropChapterId}
              onNewPuzzle={onNewPuzzle}
              onRenamePuzzle={onRenamePuzzle}
              onDeletePuzzle={onDeletePuzzle}
              depth={depth + 1}
            />
          ))}
          {items.map((puzzle) => (
            <PuzzleRow
              key={puzzle.id}
              puzzle={puzzle}
              active={puzzle.id === selectedPuzzleId}
              checked={selectedSet.has(puzzle.id)}
              renaming={renameId === puzzle.id}
              renameValue={renameValue}
              onSelect={onSelectPuzzle}
              onToggle={() => onTogglePuzzle(puzzle.id)}
              onDropBefore={onDropBefore}
              onMoveDir={onMovePuzzleDir}
              onStartRename={() => {
                setRenameId(puzzle.id);
                setRenameValue(puzzle.title);
              }}
              onRename={() => onRenamePuzzle(puzzle)}
              onCancelRename={() => setRenameId(null)}
              onRenameValue={setRenameValue}
              onDelete={() => onDeletePuzzle(puzzle)}
              depth={depth + 1}
            />
          ))}
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
  onStartRename,
  onRename,
  onCancelRename,
  onRenameValue,
  onDelete,
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
  onStartRename: () => void;
  onRename: () => void;
  onCancelRename: () => void;
  onRenameValue: (value: string) => void;
  onDelete: () => void;
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
      className={cn(
        "group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded px-0.5 py-0 text-left text-[13px] leading-5",
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
        <GripVertical className="size-3 shrink-0 text-muted-foreground" />
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
        <span className="w-4 text-center text-[10px] uppercase text-muted-foreground">
          {puzzleKind(puzzle) === "squares" ? "P" : "T"}
        </span>
        <div
          className={cn(
            "items-center",
            active ? "flex" : "hidden group-hover:flex",
          )}
        >
        <IconBtn title="Nahoru" onClick={() => onMoveDir(puzzle, -1)}>
          <ChevronsUp className="size-3" />
        </IconBtn>
        <IconBtn title="Dolů" onClick={() => onMoveDir(puzzle, 1)}>
          <ChevronsDown className="size-3" />
        </IconBtn>
        <IconBtn title="Přejmenovat" onClick={onStartRename}>
          <Pencil className="size-3" />
        </IconBtn>
        <IconBtn title="Smazat" onClick={onDelete}>
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
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      className="rounded p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
