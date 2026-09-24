"use client";

import { useState, type DragEvent, type ReactNode } from "react";
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
  puzzlesInChapter,
  nextChapterKind,
  chapterKindOf,
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
        kind: "vyklad",
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {courses.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              item.id === course?.id
                ? "bg-[#81b64c] text-zinc-950"
                : "bg-muted text-muted-foreground",
            )}
            onClick={() => onSelectCourse(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Nový kurz"
          value={newCourse}
          onChange={(event) => setNewCourse(event.target.value)}
        />
        <Button type="button" variant="outline" onClick={addCourse}>
          <Plus className="size-4" />
          Kurz
        </Button>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/40 p-2">
        {roots.map((chapter) => (
          <ChapterNode
            key={chapter.id}
            chapter={chapter}
            chapters={curriculum.chapters}
            puzzles={puzzles}
            selectedChapterId={selectedChapterId}
            selectedPuzzleId={selectedPuzzleId}
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
            onDropChapter={onDropChapter}
            onDropBefore={onDropBefore}
            onNewPuzzle={onNewPuzzle}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nová kapitola"
          value={newChapter}
          onChange={(event) => setNewChapter(event.target.value)}
        />
        <Button type="button" variant="outline" onClick={() => addChapter(null)}>
          <FolderPlus className="size-4" />
          Kapitola
        </Button>
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
  onDropChapter,
  onDropBefore,
  onNewPuzzle,
}: {
  chapter: Chapter;
  chapters: Chapter[];
  puzzles: Puzzle[];
  selectedChapterId: string | null;
  selectedPuzzleId?: string;
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
  onDropChapter: (event: DragEvent, chapterId: string | null) => void;
  onDropBefore: (event: DragEvent, puzzle: Puzzle) => void;
  onNewPuzzle: (chapterId: string) => void;
}) {
  const kids = childChapters(chapters, chapter.id);
  const items = puzzlesInChapter(puzzles, chapter.id, false, chapters);
  const expanded = open[chapter.id] !== false;

  return (
    <div
      className="mb-1"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDropChapter(event, chapter.id)}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-1 py-1",
          selectedChapterId === chapter.id ? "bg-[#81b64c]/15" : "hover:bg-foreground/5",
        )}
      >
        <button
          type="button"
          className="text-muted-foreground"
          onClick={() =>
            setOpen((current) => ({ ...current, [chapter.id]: !expanded }))
          }
        >
          {expanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
        {renameId === chapter.id ? (
          <Input
            value={renameValue}
            className="h-7 text-sm"
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
            className="min-w-0 flex-1 truncate text-left text-sm"
            onClick={() => onSelectChapter(chapter.id)}
          >
            {chapter.title}
            <span className="ml-2 text-[10px] text-muted-foreground">{items.length}</span>
          </button>
        )}
        <button
          type="button"
          title="Druh kapitoly"
          className="shrink-0 rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          onClick={() => onCycleKind(chapter)}
        >
          {chapterKindOf(chapter) === "cviceni" ? "Cvičení" : "Výklad"}
        </button>
        {selectedChapterId === chapter.id ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 px-2"
            onClick={() => onNewPuzzle(chapter.id)}
          >
            Nová
          </Button>
        ) : null}
        <IconBtn title="Nahoru" onClick={() => onMove(chapter, -1)}>
          <ChevronsUp className="size-3.5" />
        </IconBtn>
        <IconBtn title="Dolů" onClick={() => onMove(chapter, 1)}>
          <ChevronsDown className="size-3.5" />
        </IconBtn>
        <IconBtn
          title="Přejmenovat"
          onClick={() => {
            setRenameId(chapter.id);
            setRenameValue(chapter.title);
          }}
        >
          <Pencil className="size-3.5" />
        </IconBtn>
        <IconBtn title="Podkapitola" onClick={() => onAddSub(chapter.id)}>
          <Plus className="size-3.5" />
        </IconBtn>
        <IconBtn title="Smazat" onClick={() => onDelete(chapter)}>
          <Trash2 className="size-3.5" />
        </IconBtn>
      </div>
      {expanded ? (
        <div className="ml-4 border-l border-white/10 pl-2">
          {kids.map((child) => (
            <ChapterNode
              key={child.id}
              chapter={child}
              chapters={chapters}
              puzzles={puzzles}
              selectedChapterId={selectedChapterId}
              selectedPuzzleId={selectedPuzzleId}
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
              onDropChapter={onDropChapter}
              onDropBefore={onDropBefore}
              onNewPuzzle={onNewPuzzle}
            />
          ))}
          {items.map((puzzle) => (
            <PuzzleRow
              key={puzzle.id}
              puzzle={puzzle}
              active={puzzle.id === selectedPuzzleId}
              onSelect={onSelectPuzzle}
              onDropBefore={onDropBefore}
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
  onSelect,
  onDropBefore,
}: {
  puzzle: Puzzle;
  active: boolean;
  onSelect: (puzzle: Puzzle) => void;
  onDropBefore: (event: DragEvent, puzzle: Puzzle) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/puzzle-id", puzzle.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDropBefore(event, puzzle)}
      onClick={() => onSelect(puzzle)}
      className={cn(
        "mb-0.5 flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm",
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{puzzle.title}</span>
      <span className="text-[10px] uppercase text-muted-foreground">
        {puzzleKind(puzzle) === "squares" ? "Pole" : "Tah"}
      </span>
    </button>
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
