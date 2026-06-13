import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/write/$token")({ component: AuthorWritePage });

interface Submission {
  id: string;
  title: string | null;
  content: string | null;
  brand_name: string | null;
  status: string;
  mod_feedback: string | null;
}

function AuthorWritePage() {
  const { token } = Route.useParams();
  const [sub, setSub] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from("submissions")
        .select("id, title, content, brand_name, status, mod_feedback")
        .eq("invite_token", token)
        .maybeSingle();
      if (err || !data) {
        setError("Submission not found. Make sure you opened the correct invite link.");
      } else {
        setSub(data as Submission);
        setContent((data as Submission).content ?? "");
        setTitle((data as Submission).title ?? "");
      }
      setLoading(false);
    })();
  }, [token]);

  const autosave = (newContent: string, newTitle: string) => {
    if (!sub) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await supabase
        .from("submissions")
        .update({ content: newContent, title: newTitle, updated_at: new Date().toISOString() })
        .eq("id", sub.id);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 1200);
  };

  const handleContentChange = (v: string) => {
    setContent(v);
    autosave(v, title);
  };

  const handleTitleChange = (v: string) => {
    setTitle(v);
    autosave(content, v);
  };

  const submitForReview = async () => {
    if (!sub) return;
    setSubmitting(true);
    const { error: err } = await supabase
      .from("submissions")
      .update({ status: "submitted", title, content, updated_at: new Date().toISOString() })
      .eq("id", sub.id);
    if (!err) {
      setSub({ ...sub, status: "submitted" });
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (loading) return <PageShell><p className="p-6 text-sm text-muted-foreground">Loading…</p></PageShell>;
  if (error || !sub) return <PageShell><p className="p-6 text-sm text-red-600">{error ?? "Not found."}</p></PageShell>;

  const isReadOnly = sub.status !== "draft";

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {sub.brand_name} · whitepaper
            </p>
            <p className="text-xs capitalize text-muted-foreground">
              {sub.status.replace("_", " ")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
            {saved && <span className="text-xs text-green-600">Saved</span>}
            {!isReadOnly && (
              <button
                onClick={submitForReview}
                disabled={submitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit for review"}
              </button>
            )}
          </div>
        </div>

        {/* Mod feedback */}
        {sub.mod_feedback && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Mod feedback</p>
            <p className="mt-1 text-sm text-amber-900">{sub.mod_feedback}</p>
          </div>
        )}

        {submitted && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-800">Submitted for review. The mod will get back to you.</p>
          </div>
        )}

        {/* Title */}
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Whitepaper title"
          disabled={isReadOnly}
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-lg font-semibold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
        />

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Write your whitepaper here. Markdown is supported."
          disabled={isReadOnly}
          rows={28}
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-mono leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 resize-none"
        />

        <p className="text-xs text-muted-foreground">
          {content.split(/\s+/).filter(Boolean).length} words · autosaved
        </p>
      </div>
    </PageShell>
  );
}
