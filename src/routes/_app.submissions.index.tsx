import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, type SubmissionStatus } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FileText, Plus, Pencil, Send, Eye, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/submissions/")({
  component: SubmissionsListPage,
});

interface SubmissionRow {
  id: string;
  title: string | null;
  brand_name: string | null;
  status: SubmissionStatus;
  created_at: string;
  slot_id: string | null;
  slot?: { topic: string } | null;
}

const STATUS_META: Record<
  SubmissionStatus,
  { label: string; icon: typeof Pencil; cls: string }
> = {
  draft: { label: "Draft", icon: Pencil, cls: "bg-muted text-muted-foreground" },
  submitted: { label: "Submitted", icon: Send, cls: "bg-sky-100 text-sky-800" },
  under_review: { label: "Under review", icon: Eye, cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", icon: CheckCircle2, cls: "bg-primary/15 text-primary" },
  rejected: { label: "Rejected", icon: XCircle, cls: "bg-red-100 text-red-700" },
};

function SubmissionsListPage() {
  const { agency } = useAuth();
  const [rows, setRows] = useState<SubmissionRow[]>([]);

  useEffect(() => {
    if (!agency) return;
    (async () => {
      const { data } = await supabase
        .from("submissions")
        .select("id, title, brand_name, status, created_at, slot_id, slot:slots(topic)")
        .eq("agency_id", agency.id)
        .order("created_at", { ascending: false });
      setRows((data as unknown as SubmissionRow[]) ?? []);
    })();
  }, [agency]);

  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none absolute inset-0 bg-geo-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_15%,transparent_65%)]" />
      <div className="relative space-y-6 p-6 md:p-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Submissions</h1>
              <p className="text-sm text-muted-foreground">
                All submissions from your agency.
              </p>
            </div>
          </div>
          <Button asChild size="lg">
            <Link to="/submissions/new">
              <Plus className="h-4 w-4" /> New submission
            </Link>
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div className="text-sm text-muted-foreground">No submissions yet.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {rows.map((r) => {
              const meta = STATUS_META[r.status];
              const Icon = meta.icon;
              const body = (
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-foreground">
                    <FileText className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {r.title || "Untitled draft"}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {r.slot?.topic && <span>{r.slot.topic}</span>}
                      {r.brand_name && <span>· {r.brand_name}</span>}
                      <span>· {format(new Date(r.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                      meta.cls,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </span>
                </div>
              );
              return r.status === "draft" ? (
                <Link key={r.id} to="/submissions/$id" params={{ id: r.id }}>
                  {body}
                </Link>
              ) : (
                <div key={r.id}>{body}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
