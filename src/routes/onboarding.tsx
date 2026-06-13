import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — Human-Coded" },
      { name: "description", content: "Set up your Human-Coded agency account." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const { user, agency, loading, refreshAgency } = useAuth();
  const navigate = useNavigate();
  const [brandName, setBrandName] = useState("");
  const [redditUsername, setRedditUsername] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  if (agency) return <Navigate to="/board" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const cleanReddit = redditUsername.replace(/^u\//i, "").replace(/^\/+/, "").trim();

    // Block silent takeover: if an agency already exists for this Reddit
    // username, the new user must be invited by an existing admin rather
    // than auto-joined as admin.
    const { data: existing, error: lookupErr } = await supabase
      .from("agencies")
      .select("id, brand_name")
      .eq("reddit_username", cleanReddit)
      .maybeSingle();
    if (lookupErr) {
      toast.error(lookupErr.message);
      setBusy(false);
      return;
    }
    if (existing) {
      toast.error(
        `An agency (${existing.brand_name}) is already registered with u/${cleanReddit}. Ask one of its admins to invite you from Team Settings.`,
      );
      setBusy(false);
      return;
    }

    const { error: metaErr } = await supabase.auth.updateUser({
      data: { reddit_username: cleanReddit },
    });
    if (metaErr) {
      toast.error(metaErr.message);
      setBusy(false);
      return;
    }

    const { data: created, error } = await supabase
      .from("agencies")
      .insert({ brand_name: brandName.trim(), reddit_username: cleanReddit })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }

    await supabase.from("agency_members").insert({
      agency_id: created.id,
      role: "admin",
      reddit_username: cleanReddit,
    });

    await refreshAgency();
    toast.success("Welcome aboard.");
    navigate({ to: "/board" });
  };

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tell us about your agency</h1>
            <p className="text-sm text-muted-foreground">
              Appears on submissions and shared links.
            </p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8"
        >
          <div className="space-y-2">
            <Label htmlFor="brand">Brand name</Label>
            <Input
              id="brand"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Acme Editorial"
              required
              maxLength={120}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reddit">Reddit username</Label>
            <Input
              id="reddit"
              value={redditUsername}
              onChange={(e) => setRedditUsername(e.target.value)}
              placeholder="acme_editor"
              required
              maxLength={40}
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Without the <code>u/</code> prefix.
            </p>
          </div>
          <Button type="submit" className="h-11 w-full" disabled={busy}>
            {busy ? "Saving…" : "Continue"}
          </Button>
        </form>
      </div>
    </PageShell>
  );
}
