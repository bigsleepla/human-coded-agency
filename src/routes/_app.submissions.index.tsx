import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, type SubmissionStatus } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  draft: "bg-muted text-muted-foreground border border-border",
  submitted: "bg-heat-low/20 text-heat-low border border-heat-low/40",
  under_review: "bg-heat-mid/20 text-heat-mid border border-heat-mid/40",
  approved: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
  rejected: "bg-heat-high/20 text-heat-high border border-heat-high/40",
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
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Submissions</h1>
          <p className="text-sm text-muted-foreground">All submissions from your agency.</p>
        </div>
        <Button asChild>
          <Link to="/submissions/new">New submission</Link>
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Topic</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground">{r.slot?.topic ?? "—"}</TableCell>
                <TableCell>{r.brand_name ?? "—"}</TableCell>
                <TableCell>
                  {r.status === "draft" ? (
                    <Link
                      to="/submissions/$id"
                      params={{ id: r.id }}
                      className="font-medium hover:underline"
                    >
                      {r.title || "Untitled draft"}
                    </Link>
                  ) : (
                    <span className="font-medium">{r.title || "Untitled"}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                    {r.status.replace("_", " ")}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(r.created_at), "MMM d, yyyy")}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No submissions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
