import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/team")({
  component: TeamPage,
});

interface MemberRow {
  id: string;
  email: string | null;
  role: "admin" | "editor" | "viewer";
  user_id: string | null;
  reddit_username?: string | null;
  created_at?: string;
}

function TeamPage() {
  const { agency, user } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);

  const myMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = myMember?.role === "admin";

  const load = async () => {
    if (!agency) return;
    const { data } = await supabase
      .from("agency_members")
      .select("*")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: true });
    setMembers((data as MemberRow[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agency]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency) return;
    setBusy(true);
    const { error } = await supabase.from("agency_members").insert({
      agency_id: agency.id,
      email: email.trim().toLowerCase(),
      role,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmail("");
    setRole("editor");
    toast.success("Invitation added. They'll join after signing up with this email.");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("agency_members").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Member removed.");
      load();
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Team Settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Manage who can access {agency?.brand_name}.
      </p>

      {isAdmin && (
        <form onSubmit={invite} className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="mb-3 text-sm font-medium">Invite a member</div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 space-y-1">
              <Label htmlFor="email" className="text-xs">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="teammate@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1 sm:w-40">
              <Label className="text-xs">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={busy}>
                {busy ? "Inviting…" : "Invite"}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            They'll be linked to your agency the next time they sign in with this email.
          </p>
        </form>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Reddit</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {m.reddit_username ? `u/${m.reddit_username}` : "—"}
                </TableCell>
                <TableCell className="capitalize">{m.role}</TableCell>
                <TableCell className="text-muted-foreground">
                  {m.user_id ? "Active" : "Pending"}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    {m.user_id !== user?.id && (
                      <Button variant="ghost" size="icon" onClick={() => remove(m.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
