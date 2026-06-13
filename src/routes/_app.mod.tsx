import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/mod")({ component: ModPage });

type ProposalStatus = "submitted" | "shortlisted" | "accepted" | "rejected";

interface Proposal {
  id: string;
  brand_name: string;
  brand_description: string;
  proposed_topic: string;
  proposed_authors: Array<{ name: string; credentials?: string; redditUsername?: string }>;
  ftc_disclosure_label: string;
  status: ProposalStatus;
  invite_token: string | null;
  created_at: string;
  slot_id: string;
  agency_id: string;
  slot?: { id: string; topic: string; subreddit: string; start_date: string; end_date: string };
}

interface SubmissionRow {
  id: string;
  title: string | null;
  brand_name: string | null;
  content: string | null;
  status: string;
  mod_feedback: string | null;
  created_at: string;
  invite_token: string | null;
}

const STATUS_COLORS: Record<ProposalStatus, string> = {
  submitted: "bg-blue-100 text-blue-700",
  shortlisted: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/s/${token}`;
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mt-3 rounded border border-green-200 bg-green-50 p-3">
      <p className="text-xs font-medium text-green-800">Author invite link generated</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs text-gray-700">{url}</code>
        <button
          onClick={copy}
          className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function ProposalCard({ proposal, onUpdate }: { proposal: Proposal; onUpdate: (p: Proposal) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showAccept, setShowAccept] = useState(false);

  const act = async (status: ProposalStatus) => {
    try {
      setBusy(true);
      setErr(null);
      let inviteToken: string | null = null;
      if (status === "accepted") {
        inviteToken = crypto.randomUUID();
        await supabase.from("invite_tokens" as never).insert({
          token: inviteToken,
          proposal_id: proposal.id,
          slot_id: proposal.slot_id,
        } as never);
      }
      const { data, error } = await supabase
        .from("proposals" as never)
        .update({ status, ...(inviteToken ? { invite_token: inviteToken } : {}) } as never)
        .eq("id", proposal.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      onUpdate({ ...proposal, ...(data as Partial<Proposal>) });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const isPending = proposal.status === "submitted" || proposal.status === "shortlisted";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{proposal.brand_name}</h3>
          <p className="text-xs text-gray-500">Agency: {proposal.agency_id.slice(0, 8)}…</p>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Proposed topic</p>
        <p className="text-sm text-gray-800">{proposal.proposed_topic}</p>
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Brand</p>
        <p className="text-sm text-gray-700">{proposal.brand_description}</p>
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Proposed authors</p>
        <ul className="mt-1 space-y-1">
          {proposal.proposed_authors.map((a, i) => (
            <li key={i} className="text-sm text-gray-800">
              <span className="font-medium">{a.name}</span>
              {a.credentials && <span className="text-gray-500"> — {a.credentials}</span>}
              {a.redditUsername && <span className="text-gray-500"> (u/{a.redditUsername})</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        <span>FTC: {proposal.ftc_disclosure_label}</span>
        <span>Submitted {new Date(proposal.created_at).toLocaleDateString()}</span>
      </div>

      {proposal.status === "accepted" && proposal.invite_token && (
        <InviteLink token={proposal.invite_token} />
      )}

      {isPending && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          {showAccept ? (
            <div className="flex items-center gap-2">
              <button
                disabled={busy}
                onClick={() => act("accepted")}
                className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {busy ? "Accepting…" : "Confirm accept"}
              </button>
              <button
                onClick={() => setShowAccept(false)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {proposal.status === "submitted" && (
                <button
                  disabled={busy}
                  onClick={() => act("shortlisted")}
                  className="rounded border border-yellow-400 px-3 py-1.5 text-sm font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                >
                  {busy ? "…" : "Shortlist"}
                </button>
              )}
              <button
                onClick={() => setShowAccept(true)}
                className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                Accept &amp; invite author
              </button>
              <button
                disabled={busy}
                onClick={() => act("rejected")}
                className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {busy ? "…" : "Reject"}
              </button>
            </div>
          )}
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
        </div>
      )}
    </div>
  );
}

function SubmissionReviewCard({ sub, onUpdate }: { sub: SubmissionRow; onUpdate: (s: SubmissionRow) => void }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(sub.mod_feedback ?? "");
  const [showFeedback, setShowFeedback] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const act = async (status: "approved" | "rejected") => {
    setBusy(true);
    const { data, error } = await supabase
      .from("submissions" as never)
      .update({ status, mod_feedback: feedback || null, updated_at: new Date().toISOString() } as never)
      .eq("id", sub.id)
      .select()
      .single();
    if (error) { setErr(error.message); setBusy(false); return; }
    onUpdate({ ...sub, ...(data as Partial<SubmissionRow>) });
    setBusy(false);
  };

  const isPending = sub.status === "submitted" || sub.status === "under_review";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{sub.title || "Untitled"}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{sub.brand_name}</p>
        </div>
        <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${
          sub.status === "submitted" ? "bg-sky-100 text-sky-700" :
          sub.status === "under_review" ? "bg-amber-100 text-amber-700" :
          sub.status === "approved" ? "bg-green-100 text-green-700" :
          "bg-red-100 text-red-600"
        }`}>{sub.status.replace("_", " ")}</span>
      </div>

      {sub.content && (
        <div className="rounded border border-gray-100 bg-gray-50 p-3 max-h-48 overflow-y-auto">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{sub.content}</pre>
        </div>
      )}

      {isPending && (
        <div className="pt-3 border-t border-gray-100 space-y-3">
          {showFeedback ? (
            <div className="space-y-2">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional feedback for the author…"
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => act("approved")}
                  className="px-3 py-1.5 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {busy ? "…" : "Approve & publish"}
                </button>
                <button type="button" disabled={busy} onClick={() => act("rejected")}
                  className="px-3 py-1.5 rounded border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50">
                  {busy ? "…" : "Request revisions"}
                </button>
                <button type="button" onClick={() => setShowFeedback(false)}
                  className="px-3 py-1.5 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowFeedback(true)}
              className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Review
            </button>
          )}
          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
      )}
    </div>
  );
}

function ModPage() {
  const { user, loading } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: proposalsData } = await supabase
        .from("proposals" as never)
        .select("*, slot:slots(id, topic, subreddit, start_date, end_date)")
        .order("created_at", { ascending: false });
      setProposals((proposalsData as Proposal[] | null) ?? []);

      const { data: submissionsData } = await supabase
        .from("submissions" as never)
        .select("*")
        .order("created_at", { ascending: false });
      setSubmissions((submissionsData as SubmissionRow[] | null) ?? []);

      setFetching(false);
    };
    void load();

    const proposalsChannel = supabase
      .channel("proposals-mod")
      .on(
        // @ts-expect-error - realtime payload typing
        "postgres_changes",
        { event: "*", schema: "public", table: "proposals" },
        (payload: { new: Proposal }) => {
          setProposals((prev) => {
            const updated = payload.new;
            const idx = prev.findIndex((p) => p.id === updated.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [updated, ...prev];
          });
        },
      )
      .subscribe();

    const submissionsChannel = supabase
      .channel("submissions-mod")
      .on(
        // @ts-expect-error - realtime payload typing
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        (payload: { new: SubmissionRow }) => {
          setSubmissions((prev) => {
            const updated = payload.new;
            const idx = prev.findIndex((s) => s.id === updated.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return [updated, ...prev];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(proposalsChannel);
      void supabase.removeChannel(submissionsChannel);
    };
  }, [user]);

  if (loading || fetching) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!user) return <Navigate to="/auth" />;

  const bySlot = new Map<string, { slot: Proposal["slot"]; proposals: Proposal[] }>();
  for (const p of proposals) {
    const key = p.slot_id;
    if (!bySlot.has(key)) bySlot.set(key, { slot: p.slot, proposals: [] });
    bySlot.get(key)!.proposals.push(p);
  }

  const updateProposal = (updated: Proposal) =>
    setProposals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

  const updateSubmission = (updated: SubmissionRow) =>
    setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

  return (
    <div className="mx-auto max-w-5xl space-y-10 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mod — Proposal review</h1>
        <p className="text-sm text-gray-600">Review agency proposals and issue author invites.</p>
      </div>

      {bySlot.size === 0 ? (
        <p className="text-sm text-gray-500">No proposals yet.</p>
      ) : (
        <div className="space-y-8">
          {[...bySlot.entries()].map(([slotId, { slot, proposals: slotProposals }]) => (
            <section key={slotId}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  {slot ? `r/${slot.subreddit} — ${slot.topic}` : slotId}
                </h2>
                <span className="text-xs text-gray-500">
                  {slotProposals.length} proposal{slotProposals.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid gap-3">
                {slotProposals.map((p) => (
                  <ProposalCard key={p.id} proposal={p} onUpdate={updateProposal} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-gray-900">Submissions</h2>
        <p className="text-sm text-gray-600 mt-1">Review author drafts and approve or request revisions.</p>
      </div>

      {submissions.length === 0 ? (
        <p className="text-sm text-gray-500">No submissions yet.</p>
      ) : (
        <div className="grid gap-3">
          {submissions.map((s) => (
            <SubmissionReviewCard key={s.id} sub={s} onUpdate={updateSubmission} />
          ))}
        </div>
      )}
    </div>
  );
}
