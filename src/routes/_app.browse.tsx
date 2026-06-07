import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, Share2, Search, Compass, Flame, Calendar, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { heatBadgeClass } from "@/lib/heat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { SlotWorkspace } from "@/components/slot-workspace";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/browse")({
  component: BrowsePage,
});

interface SlotRow {
  id: string;
  topic: string;
  subreddit: string;
  deadline: string | null;
  status: string | null;
}

function BrowsePage() {
  const { agency } = useAuth();
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [heatById, setHeatById] = useState<Record<string, number>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [openSlot, setOpenSlot] = useState<string | null>(null);

  useEffect(() => {
    if (!agency) return;
    (async () => {
      const { data: slotData } = await supabase
        .from("slots")
        .select("id, topic, subreddit, deadline, status")
        .order("deadline", { ascending: true, nullsFirst: false });
      const rows = (slotData as SlotRow[]) ?? [];
      setSlots(rows);
      if (rows.length) {
        const { data: heat } = await supabase
          .from("slot_activity")
          .select("slot_id, heat_score")
          .in("slot_id", rows.map((s) => s.id));
        const map: Record<string, number> = {};
        ((heat as { slot_id: string; heat_score: number | null }[]) ?? []).forEach((h) => {
          map[h.slot_id] = h.heat_score ?? 0;
        });
        setHeatById(map);
      }
      const { data: bms } = await supabase
        .from("slot_bookmarks")
        .select("slot_id")
        .eq("agency_id", agency.id);
      setBookmarkedIds(new Set(((bms as { slot_id: string }[]) ?? []).map((b) => b.slot_id)));
    })();
  }, [agency]);

  const filtered = slots.filter(
    (s) =>
      !search ||
      s.topic.toLowerCase().includes(search.toLowerCase()) ||
      s.subreddit.toLowerCase().includes(search.toLowerCase()),
  );

  const bookmark = async (slotId: string) => {
    if (!agency) return;
    const { error } = await supabase
      .from("slot_bookmarks")
      .insert({ slot_id: slotId, agency_id: agency.id, stage: "watching" });
    if (error) toast.error(error.message);
    else {
      setBookmarkedIds((prev) => new Set(prev).add(slotId));
      toast.success("Added to board.");
    }
  };

  const share = async (slotId: string) => {
    if (!agency) return;
    const { data, error } = await supabase
      .from("slot_share_links")
      .insert({ slot_id: slotId, created_by_agency_id: agency.id })
      .select("token")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Failed to create link");
      return;
    }
    const url = `${window.location.origin}/s/${data.token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard.");
  };

  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none absolute inset-0 bg-geo-dots opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <div className="relative space-y-6 p-6 md:p-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Compass className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Browse Slots</h1>
              <p className="text-sm text-muted-foreground">All open editorial slots.</p>
            </div>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search topic or subreddit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-full pl-9"
            />
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 py-16 text-center text-sm text-muted-foreground">
            No slots match.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const heat = heatById[s.id] ?? 0;
            const isBookmarked = bookmarkedIds.has(s.id);
            return (
              <div
                key={s.id}
                className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="absolute right-4 top-4 h-12 w-12 rounded-2xl border border-border/60 bg-muted/40 rotate-12 opacity-60 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
                <button
                  onClick={() => setOpenSlot(s.id)}
                  className="relative text-left"
                >
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    r/{s.subreddit}
                  </div>
                  <h3 className="mt-1 text-base font-semibold leading-snug group-hover:text-primary">
                    {s.topic}
                  </h3>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                      heatBadgeClass(heat),
                    )}
                  >
                    <Flame className="h-3 w-3" /> heat {heat}
                  </span>
                  {s.deadline && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(s.deadline), "MMM d, yyyy")}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex gap-2 pt-2">
                  <Button
                    variant={isBookmarked ? "secondary" : "default"}
                    size="sm"
                    disabled={isBookmarked}
                    onClick={() => bookmark(s.id)}
                    className="flex-1"
                  >
                    {isBookmarked ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-3.5 w-3.5" /> Bookmark
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => share(s.id)}>
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <SlotWorkspace slotId={openSlot} onClose={() => setOpenSlot(null)} />
      </div>
    </div>
  );
}
