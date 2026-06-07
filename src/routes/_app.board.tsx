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
import { Eye, Hammer, Send, Archive, GripVertical, Flame, Calendar, Kanban } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/board")({
  component: BoardPage,
});

const COLUMNS: { stage: Stage; label: string; icon: typeof Eye; tone: string }[] = [
  { stage: "watching", label: "Watching", icon: Eye, tone: "text-sky-700 bg-sky-100" },
  { stage: "in_progress", label: "In Progress", icon: Hammer, tone: "text-amber-800 bg-amber-100" },
  { stage: "submitted", label: "Submitted", icon: Send, tone: "text-primary bg-primary/10" },
  { stage: "closed", label: "Closed", icon: Archive, tone: "text-muted-foreground bg-muted" },
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
    <div className="relative min-h-full">
      <div className="pointer-events-none absolute inset-0 bg-geo-grid opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_15%,transparent_65%)]" />
      <div className="relative p-6 md:p-8">
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Kanban className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Slot Board</h1>
            <p className="text-sm text-muted-foreground">
              Drag cards between columns to update their stage.
            </p>
          </div>
        </div>

        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => (
              <Column key={col.stage} column={col} count={grouped[col.stage].length}>
                {grouped[col.stage].map((bm) => (
                  <Card
                    key={bm.id}
                    bm={bm}
                    heat={heatById[bm.slot_id] ?? 0}
                    onOpen={() => setOpenSlot(bm.slot_id)}
                  />
                ))}
                {grouped[col.stage].length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/70 bg-background/40 py-6 text-center text-xs text-muted-foreground">
                    Nothing here
                  </div>
                )}
              </Column>
            ))}
          </div>
        </DndContext>
        <SlotWorkspace slotId={openSlot} onClose={() => setOpenSlot(null)} />
      </div>
    </div>
  );
}

function Column({
  column,
  count,
  children,
}: {
  column: (typeof COLUMNS)[number];
  count: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.stage });
  const Icon = column.icon;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card/70 p-4 backdrop-blur-sm transition-all duration-150",
        isOver ? "border-primary/60 bg-primary/5 shadow-md" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", column.tone)}>
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <h2 className="text-sm font-semibold">{column.label}</h2>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {count}
        </span>
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
      className={cn(
        "group rounded-xl border border-border bg-card p-3 text-sm shadow-sm transition-all duration-150 hover:shadow-md",
        isDragging && "opacity-60 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...listeners}
          {...attributes}
          aria-label="Drag"
          className="-ml-1 mt-0.5 cursor-grab rounded-md p-1 text-muted-foreground/60 hover:bg-muted hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <button
            onClick={onOpen}
            className="text-left font-medium leading-tight hover:underline"
          >
            {bm.slot?.topic ?? "Untitled"}
          </button>
          <div className="mt-1 text-xs text-muted-foreground">r/{bm.slot?.subreddit}</div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            heatBadgeClass(heat),
          )}
        >
          <Flame className="h-3 w-3" />
          {heat}
        </span>
      </div>
      {bm.slot?.deadline && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          due {format(new Date(bm.slot.deadline), "MMM d")}
        </div>
      )}
    </div>
  );
}
