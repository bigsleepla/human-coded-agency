import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { heatBadgeClass } from "@/lib/heat";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/s/$token")({
  component: SharedSlotPage,
});

interface SlotRow {
  id: string;
  topic: string;
  subreddit: string;
  deadline: string | null;
  criteria: string | null;
  notes: string | null;
}

function SharedSlotPage() {
  const { token } = Route.useParams();
  const [slot, setSlot] = useState<SlotRow | null>(null);
  const [heat, setHeat] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: link } = await supabase
        .from("slot_share_links")
        .select("slot_id")
        .eq("token", token)
        .maybeSingle();
      if (!link) {
        setError("This share link is invalid or has expired.");
        setLoading(false);
        return;
      }
      const [{ data: s }, { data: a }] = await Promise.all([
        supabase.from("slots").select("*").eq("id", link.slot_id).maybeSingle(),
        supabase.from("slot_activity").select("heat_score").eq("slot_id", link.slot_id).maybeSingle(),
      ]);
      setSlot((s as SlotRow) ?? null);
      setHeat(((a as { heat_score: number | null } | null)?.heat_score) ?? 0);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (error || !slot) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <p className="text-muted-foreground">{error ?? "Slot not found."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
        Shared slot
      </div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">{slot.topic}</h1>
        <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${heatBadgeClass(heat)}`}>
          heat {heat}
        </span>
      </div>
      <div className="mb-6 text-sm text-muted-foreground">
        r/{slot.subreddit}
        {slot.deadline && ` · due ${format(new Date(slot.deadline), "MMM d, yyyy")}`}
      </div>
      {slot.criteria && (
        <section className="mb-6">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Criteria
          </h2>
          <p className="whitespace-pre-wrap text-sm">{slot.criteria}</p>
        </section>
      )}
      {slot.notes && (
        <section>
          <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm">{slot.notes}</p>
        </section>
      )}
    </div>
  );
}
