import { useEffect, useState } from "react";
import { supabase, type Stage } from "@/integrations/supabase/client";
import { heatBadgeClass, heatLevel } from "@/lib/heat";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

interface SlotWorkspaceProps {
  slotId: string | null;
  onClose: () => void;
}

interface SlotRow {
  id: string;
  topic: string;
  subreddit: string;
  deadline: string | null;
  criteria: string | null;
  notes: string | null;
  created_at: string | null;
}

interface ActivityRow {
  slot_id: string;
  heat_score: number | null;
}

interface NoteRow {
  id: string;
  slot_id: string;
  body: string;
  created_at: string;
  reddit_username: string | null;
  author_id: string | null;
}

export function SlotWorkspace({ slotId, onClose }: SlotWorkspaceProps) {
  const navigate = useNavigate();
  const { agency } = useAuth();
  const [slot, setSlot] = useState<SlotRow | null>(null);
  const [heat, setHeat] = useState<number | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!slotId) return;
    let cancelled = false;
    (async () => {
      const [{ data: s }, { data: a }, { data: n }] = await Promise.all([
        supabase.from("slots").select("*").eq("id", slotId).maybeSingle(),
        supabase.from("slot_activity").select("*").eq("slot_id", slotId).maybeSingle(),
        supabase
          .from("slot_notes")
          .select("*")
          .eq("slot_id", slotId)
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setSlot((s as SlotRow) ?? null);
      setHeat(((a as ActivityRow | null)?.heat_score) ?? 0);
      setNotes((n as NoteRow[]) ?? []);
    })();

    const channel = supabase
      .channel(`slot-notes-${slotId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "slot_notes", filter: `slot_id=eq.${slotId}` },
        (payload) => {
          setNotes((prev) => [...prev, payload.new as NoteRow]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [slotId]);

  const sendNote = async () => {
    if (!slotId || !draft.trim() || !agency) return;
    setSending(true);
    const { error } = await supabase.from("slot_notes").insert({
      slot_id: slotId,
      body: draft.trim(),
      reddit_username: agency.reddit_username,
      agency_id: agency.id,
    });
    setSending(false);
    if (error) toast.error(error.message);
    else setDraft("");
  };

  return (
    <Sheet open={!!slotId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {slot && (
          <>
            <SheetHeader>
              <div className="flex items-start justify-between gap-3">
                <SheetTitle className="text-lg">{slot.topic}</SheetTitle>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${heatBadgeClass(heat)}`}
                >
                  heat {heat ?? 0} · {heatLevel(heat)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                r/{slot.subreddit}
                {slot.deadline && ` · due ${format(new Date(slot.deadline), "MMM d, yyyy")}`}
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {slot.criteria && (
                <Section title="Criteria">{slot.criteria}</Section>
              )}
              {slot.notes && <Section title="Slot notes">{slot.notes}</Section>}

              <Button
                className="w-full"
                onClick={() => {
                  onClose();
                  navigate({ to: "/submissions/new", search: { slotId: slot.id } });
                }}
              >
                Start Submission
              </Button>

              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-medium text-muted-foreground">Team notes</h3>
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-border bg-card p-3">
                  {notes.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground">No notes yet.</p>
                  )}
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>u/{n.reddit_username ?? "anon"}</span>
                        <span>{format(new Date(n.created_at), "MMM d, HH:mm")}</span>
                      </div>
                      <div className="whitespace-pre-wrap">{n.body}</div>
                    </div>
                  ))}
                </div>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Add a note for your team…"
                  rows={3}
                />
                <Button onClick={sendNote} disabled={sending || !draft.trim()} size="sm">
                  Post note
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="whitespace-pre-wrap text-sm text-foreground">{children}</div>
    </div>
  );
}

export type { Stage };
