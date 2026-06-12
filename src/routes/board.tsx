import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
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
import {
  Eye,
  Hammer,
  Send,
  Archive,
  GripVertical,
  Flame,
  Calendar,
  Kanban,
  Compass,
  FileText,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/board")({
  head: () => ({
    meta: [
      { title: "Slot Board — Human-Coded" },
      {
        name: "description",
        content: "Manage your sponsored editorial slots.",
      },
    ],
  }),
  component: BoardPage,
});

const APP_NAV = [
  { to: "/board", label: "Slot Board", icon: Kanban },
  { to: "/browse", label: "Browse Slots", icon: Compass },
  { to: "/submissions", label: "Submissions", icon: FileText },
  { to: "/team", label: "Team Settings", icon: Users },
] as const;

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
  const { user, agency, loading, signOut } = useAuth();
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

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          Loading…
        </div>
      </PageShell>
    );
  }
  if (!user) return <Navigate to="/auth" />;
  if (!agency) return <Navigate to="/onboarding" />;

  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  return (
    <PageShell>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-12">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-geo-grid opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_15%,transparent_65%)]" />
          <div className="relative">
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

        <aside className="lg:sticky lg:top-10 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-auto space-y-6 lg:border-l lg:border-border lg:pl-8">
          <div className="space-y-2">
            <p className="text-foreground font-medium">Agency</p>
            <div className="text-sm text-muted-foreground">{agency.brand_name}</div>
            <div className="text-xs text-muted-foreground">u/{agency.reddit_username}</div>
          </div>

          <div className="space-y-2">
            <p className="text-foreground font-medium">Navigate</p>
            <div className="space-y-1">
              {APP_NAV.map((item) => {
                const active = pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={async () => {
              await signOut();
              window.location.href = "/auth";
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </aside>
      </div>
    </PageShell>
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
