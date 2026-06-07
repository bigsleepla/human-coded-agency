import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { supabase, type Stage } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { heatBadgeClass } from "@/lib/heat";
import { format } from "date-fns";
import { SlotWorkspace } from "@/components/slot-workspace";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/board")({
  component: BoardPage,
});

const COLUMNS: { stage: Stage; label: string }[] = [
  { stage: "watching", label: "Watching" },
  { stage: "in_progress", label: "In Progress" },
  { stage: "submitted", label: "Submitted" },
  { stage: "closed", label: "Closed" },
];

interface BookmarkRow {
  id: string;
  slot_id: string;
  stage: Stage;
  agency_id: string;
  slot?: {
    id: string;
    topic: string;
    subreddit: string;
    deadline: string | null;
  } | null;
}

function BoardPage() {
  const { agency } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [heatById, setHeatById] = useState<Record<string, number>>({});
  const [openSlot, setOpenSlot] = useState<string | null>(null);

  useEffect(() => {
    if (!agency) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("slot_bookmarks")
        .select("id, slot_id, stage, agency_id, slot:slots(id, topic, subreddit, deadline)")
        .eq("agency_id", agency.id);
      if (cancelled) return;
      const rows = (data as unknown as BookmarkRow[]) ?? [];
      setBookmarks(rows);
      const ids = rows.map((r) => r.slot_id);
      if (ids.length) {
        const { data: heat } = await supabase
          .from("slot_activity")
          .select("slot_id, heat_score")
          .in("slot_id", ids);
        const map: Record<string, number> = {};
        ((heat as { slot_id: string; heat_score: number | null }[]) ?? []).forEach((h) => {
          map[h.slot_id] = h.heat_score ?? 0;
        });
        if (!cancelled) setHeatById(map);
      }
    };
    load();

    const channel = supabase
      .channel(`bookmarks-${agency.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "slot_bookmarks",
          filter: `agency_id=eq.${agency.id}`,
        },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [agency]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const grouped = useMemo(() => {
    const g: Record<Stage, BookmarkRow[]> = {
      watching: [],
      in_progress: [],
      submitted: [],
      closed: [],
    };
    bookmarks.forEach((b) => g[b.stage]?.push(b));
    return g;
  }, [bookmarks]);

  const onDragEnd = async (e: DragEndEvent) => {
    const id = e.active.id as string;
    const newStage = e.over?.id as Stage | undefined;
    if (!newStage) return;
    const current = bookmarks.find((b) => b.id === id);
    if (!current || current.stage === newStage) return;
    setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, stage: newStage } : b)));
    const { error } = await supabase
      .from("slot_bookmarks")
      .update({ stage: newStage })
      .eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Slot Board</h1>
        <p className="text-sm text-muted-foreground">
          Drag cards between columns to update their stage.
        </p>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <Column key={col.stage} stage={col.stage} label={col.label} count={grouped[col.stage].length}>
              {grouped[col.stage].map((bm) => (
                <Card
                  key={bm.id}
                  bm={bm}
                  heat={heatById[bm.slot_id] ?? 0}
                  onOpen={() => setOpenSlot(bm.slot_id)}
                />
              ))}
              {grouped[col.stage].length === 0 && (
                <p className="text-center text-xs text-muted-foreground">Nothing here.</p>
              )}
            </Column>
          ))}
        </div>
      </DndContext>
      <SlotWorkspace slotId={openSlot} onClose={() => setOpenSlot(null)} />
    </div>
  );
}

function Column({
  stage,
  label,
  count,
  children,
}: {
  stage: Stage;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-3 transition-colors ${
        isOver ? "border-primary/60 bg-card/70" : ""
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-medium">{label}</h2>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Card({
  bm,
  heat,
  onOpen,
}: {
  bm: BookmarkRow;
  heat: number;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: bm.id });
  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : undefined
      }
      className={`group rounded-md border border-border bg-card p-3 text-sm shadow-sm ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={onOpen}
          className="text-left font-medium leading-tight hover:underline"
        >
          {bm.slot?.topic ?? "Untitled"}
        </button>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${heatBadgeClass(heat)}`}>
          {heat}
        </span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">r/{bm.slot?.subreddit}</div>
      {bm.slot?.deadline && (
        <div className="mt-1 text-xs text-muted-foreground">
          due {format(new Date(bm.slot.deadline), "MMM d")}
        </div>
      )}
      <button
        {...listeners}
        {...attributes}
        className="mt-2 w-full cursor-grab rounded bg-muted/40 py-1 text-[10px] text-muted-foreground hover:bg-muted active:cursor-grabbing"
      >
        drag
      </button>
    </div>
  );
}
