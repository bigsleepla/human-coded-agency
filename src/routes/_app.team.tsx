import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, Pencil, Eye, Users, UserPlus, Trash2, AtSign } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/team")({
  component: TeamPage,
});

interface MemberRow {
  id: string;
  role: "admin" | "editor" | "viewer";
  reddit_username: string | null;
  agency_id: string;
}

const ROLES = [
  {
    value: "admin" as const,
    label: "Admin",
    desc: "Full access · manage team",
    icon: Shield,
  },
  {
    value: "editor" as const,
    label: "Editor",
    desc: "Create & edit submissions",
    icon: Pencil,
  },
  {
    value: "viewer" as const,
    label: "Viewer",
    desc: "Read-only access",
    icon: Eye,
  },
];

function RoleBadge({ role }: { role: MemberRow["role"] }) {
  const r = ROLES.find((x) => x.value === role)!;
  const Icon = r.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium">
      <Icon className="h-3.5 w-3.5" />
      {r.label}
    </span>
  );
}

function TeamPage() {
  const { agency, user } = useAuth();
  const myReddit = (user?.user_metadata?.reddit_username as string | undefined) ?? null;
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [redditUsername, setRedditUsername] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);

  const myMember = members.find((m) => m.reddit_username === myReddit);
  const isAdmin = myMember?.role === "admin";

  const load = async () => {
    if (!agency) return;
    const { data } = await supabase
      .from("agency_members")
      .select("*")
      .eq("agency_id", agency.id);
    setMembers((data as MemberRow[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agency]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agency) return;
    const clean = redditUsername.replace(/^u\//i, "").replace(/^\/+/, "").trim();
    if (!clean) return;
    setBusy(true);
    const { error } = await supabase.from("agency_members").insert({
      agency_id: agency.id,
      reddit_username: clean,
      role,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRedditUsername("");
    setRole("editor");
    toast.success("Member added.");
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
    <div className="relative min-h-full">
      {/* Geometric backdrop accent */}
      <div className="pointer-events-none absolute inset-0 bg-geo-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />

      <div className="relative mx-auto max-w-4xl space-y-6 p-6 md:p-8">
        {/* Header card */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute right-6 top-6 h-16 w-16 rounded-2xl border border-border/60 bg-background/30 rotate-12" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Users className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Team Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage who can access {agency?.brand_name}.
              </p>
            </div>
          </div>
        </div>

        {/* Invite card */}
        {isAdmin && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-foreground">
                <UserPlus className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div>
                <div className="text-sm font-semibold">Add a member</div>
                <div className="text-xs text-muted-foreground">
                  They'll link in when they sign up with this Reddit username.
                </div>
              </div>
            </div>

            <form onSubmit={invite} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reddit" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Reddit username
                </Label>
                <div className="relative">
                  <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reddit"
                    placeholder="teammate_handle"
                    value={redditUsername}
                    onChange={(e) => setRedditUsername(e.target.value)}
                    required
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  Role
                </Label>
                <RadioGroup
                  value={role}
                  onValueChange={(v) => setRole(v as typeof role)}
                  className="grid gap-2 sm:grid-cols-3"
                >
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const selected = role === r.value;
                    return (
                      <label
                        key={r.value}
                        htmlFor={`role-${r.value}`}
                        className={cn(
                          "group relative flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all duration-150",
                          "hover:bg-accent/40 active:scale-[0.98]",
                          selected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-background/30",
                        )}
                      >
                        <RadioGroupItem
                          id={`role-${r.value}`}
                          value={r.value}
                          className="mt-0.5 h-5 w-5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Icon className="h-4 w-4" strokeWidth={2.25} />
                            {r.label}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{r.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={busy} size="lg">
                  <UserPlus className="h-4 w-4" />
                  {busy ? "Adding…" : "Add member"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Members card */}
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">Members</div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {members.length}
              </span>
            </div>
          </div>

          <ul className="divide-y divide-border">
            {members.length === 0 && (
              <li className="px-6 py-10 text-center text-sm text-muted-foreground">
                No members yet.
              </li>
            )}
            {members.map((m) => {
              const initials =
                m.reddit_username?.slice(0, 2).toUpperCase() ?? "??";
              const isMe = m.reddit_username === myReddit;
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-accent/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-sm font-semibold text-foreground">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {m.reddit_username ? `u/${m.reddit_username}` : "—"}
                      {isMe && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                  <RoleBadge role={m.role} />
                  {isAdmin && !isMe && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(m.id)}
                      aria-label="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
