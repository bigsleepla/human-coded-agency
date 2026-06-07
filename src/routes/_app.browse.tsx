import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { heatBadgeClass } from "@/lib/heat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { SlotWorkspace } from "@/components/slot-workspace";
import { toast } from "sonner";

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
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Browse Slots</h1>
          <p className="text-sm text-muted-foreground">All open editorial slots.</p>
        </div>
        <Input
          placeholder="Search topic or subreddit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Topic</TableHead>
              <TableHead>Subreddit</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Heat</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => {
              const heat = heatById[s.id] ?? 0;
              const isBookmarked = bookmarkedIds.has(s.id);
              return (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => setOpenSlot(s.id)}>
                  <TableCell className="font-medium">{s.topic}</TableCell>
                  <TableCell className="text-muted-foreground">r/{s.subreddit}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.deadline ? format(new Date(s.deadline), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${heatBadgeClass(heat)}`}
                    >
                      {heat}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isBookmarked}
                        onClick={() => bookmark(s.id)}
                      >
                        <Bookmark className="mr-1 h-3.5 w-3.5" />
                        {isBookmarked ? "Saved" : "Bookmark"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => share(s.id)}>
                        <Share2 className="mr-1 h-3.5 w-3.5" />
                        Share
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No slots match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <SlotWorkspace slotId={openSlot} onClose={() => setOpenSlot(null)} />
    </div>
  );
}
