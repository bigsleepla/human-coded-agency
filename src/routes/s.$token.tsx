import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { heatBadgeClass } from "@/lib/heat";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/s/$token")({ component: SharedTokenPage });

// ── types ──────────────────────────────────────────────────────────────────

interface InviteBrief {
  kind: "invite";
  token: string;
  proposalId: string;
  slotId: string;
  brandName: string;
  brandDescription: string;
  proposedTopic: string;
  proposedAuthors: Array<{ name: string; credentials?: string; redditUsername?: string }>;
  ftcLabel: string;
  subreddit: string;
  slotTopic: string;
  claimed: boolean;
  existingSubmissionId?: string;
}

interface SlotBrief {
  kind: "slot";
  id: string;
  topic: string;
  subreddit: string;
  deadline: string | null;
  criteria: string | null;
  notes: string | null;
  heat: number;
}

type Brief = InviteBrief | SlotBrief;

// ── invite claim view ──────────────────────────────────────────────────────

function InviteView({ brief }: { brief: InviteBrief }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (brief.claimed && brief.existingSubmissionId) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-sm text-muted-foreground">This invite has already been claimed.</p>
          <button
            onClick={() => navigate({ to: "/write/$token", params: { token: brief.token } })}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Continue writing →
          </button>
        </div>
      </PageShell>
    );
  }

  const accept = async () => {
    try {
      setBusy(true);
      setErr(null);
      const { error } = await supabase.from("submissions" as never).insert({
        slot_id: brief.slotId,
        invite_token: brief.token,
        title: brief.proposedTopic,
        brand_name: brief.brandName,
        authors: brief.proposedAuthors,
        content: "",
        status: "draft",
      } as never);
      if (error) throw new Error(error.message);
      await supabase
        .from("invite_tokens" as never)
        .update({ claimed_by: "author" } as never)
        .eq("token", brief.token);
      navigate({ to: "/write/$token", params: { token: brief.token } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to claim invite");
      setBusy(false);
    }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Author invite</div>
          <h1 className="text-2xl font-semibold">{brief.proposedTopic}</h1>
          <p className="mt-1 text-sm text-muted-foreground">r/{brief.subreddit}</p>
        </div>

        <section className="mb-6">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Brand</h2>
          <p className="text-sm font-medium">{brief.brandName}</p>
          <p className="text-sm text-muted-foreground">{brief.brandDescription}</p>
        </section>

        <section className="mb-6">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposed authors</h2>
          <ul className="space-y-1">
            {brief.proposedAuthors.map((a, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{a.name}</span>
                {a.credentials && <span className="text-muted-foreground"> — {a.credentials}</span>}
                {a.redditUsername && <span className="text-muted-foreground"> (u/{a.redditUsername})</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">FTC disclosure</h2>
          <p className="text-sm">{brief.ftcLabel}</p>
        </section>

        {err && <p className="mb-3 text-sm text-red-600">{err}</p>}

        <button
          disabled={busy}
          onClick={accept}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Setting up…" : "Accept & start writing →"}
        </button>
      </div>
    </PageShell>
  );
}

// ── slot share view ────────────────────────────────────────────────────────

function SlotView({ brief }: { brief: SlotBrief }) {
  return (
    <PageShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Shared slot</div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{brief.topic}</h1>
          <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${heatBadgeClass(brief.heat)}`}>
            heat {brief.heat}
          </span>
        </div>
        <div className="mb-6 text-sm text-muted-foreground">
          r/{brief.subreddit}
          {brief.deadline && ` · due ${format(new Date(brief.deadline), "MMM d, yyyy")}`}
        </div>
        {brief.criteria && (
          <section className="mb-6">
            <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Criteria</h2>
            <p className="whitespace-pre-wrap text-sm">{brief.criteria}</p>
          </section>
        )}
        {brief.notes && (
          <section>
            <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</h2>
            <p className="whitespace-pre-wrap text-sm">{brief.notes}</p>
          </section>
        )}
      </div>
    </PageShell>
  );
}

// ── page ───────────────────────────────────────────────────────────────────

function SharedTokenPage() {
  const { token } = Route.useParams();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: invite } = await supabase
        .from("invite_tokens" as never)
        .select("token, proposal_id, slot_id, claimed_by")
        .eq("token", token)
        .maybeSingle();

      if (invite) {
        const inv = invite as {
          token: string;
          proposal_id: string;
          slot_id: string;
          claimed_by: string | null;
        };
        const [{ data: proposal }, { data: slot }, { data: existingSub }] = await Promise.all([
          supabase.from("proposals" as never).select("*").eq("id", inv.proposal_id).maybeSingle(),
          supabase.from("slots").select("subreddit, topic").eq("id", inv.slot_id).maybeSingle(),
          supabase
            .from("submissions" as never)
            .select("id")
            .eq("invite_token", token)
            .maybeSingle(),
        ]);
        setBrief({
          kind: "invite",
          token,
          proposalId: inv.proposal_id,
          slotId: inv.slot_id,
          brandName: (proposal as any)?.brand_name ?? "",
          brandDescription: (proposal as any)?.brand_description ?? "",
          proposedTopic: (proposal as any)?.proposed_topic ?? "",
          proposedAuthors: (proposal as any)?.proposed_authors ?? [],
          ftcLabel: (proposal as any)?.ftc_disclosure_label ?? "",
          subreddit: (slot as any)?.subreddit ?? "",
          slotTopic: (slot as any)?.topic ?? "",
          claimed: !!inv.claimed_by,
          existingSubmissionId: (existingSub as any)?.id,
        });
        setLoading(false);
        return;
      }

      const { data: link } = await supabase
        .from("slot_share_links")
        .select("slot_id")
        .eq("token", token)
        .maybeSingle();

      if (!link) {
        setError("This link is invalid or has expired.");
        setLoading(false);
        return;
      }

      const [{ data: s }, { data: a }] = await Promise.all([
        supabase.from("slots").select("*").eq("id", link.slot_id).maybeSingle(),
        supabase.from("slot_activity").select("heat_score").eq("slot_id", link.slot_id).maybeSingle(),
      ]);
      setBrief({
        kind: "slot",
        id: link.slot_id,
        topic: (s as any)?.topic ?? "",
        subreddit: (s as any)?.subreddit ?? "",
        deadline: (s as any)?.deadline ?? null,
        criteria: (s as any)?.criteria ?? null,
        notes: (s as any)?.notes ?? null,
        heat: (a as any)?.heat_score ?? 0,
      });
      setLoading(false);
    })();
  }, [token]);

  if (loading)
    return (
      <PageShell>
        <p className="text-muted-foreground">Loading…</p>
      </PageShell>
    );
  if (error || !brief)
    return (
      <PageShell>
        <p className="text-center text-muted-foreground">{error ?? "Not found."}</p>
      </PageShell>
    );

  if (brief.kind === "invite") return <InviteView brief={brief} />;
  return <SlotView brief={brief} />;
}
