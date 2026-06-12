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

    const { error: metaErr } = await supabase.auth.updateUser({
      data: { reddit_username: cleanReddit },
    });
    if (metaErr) {
      toast.error(metaErr.message);
      setBusy(false);
      return;
    }

    const { data: existing } = await supabase
      .from("agencies")
      .select("*")
      .eq("reddit_username", cleanReddit)
      .maybeSingle();

    let agencyId = existing?.id as string | undefined;
    if (!existing) {
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
      agencyId = created.id;
    }

    if (agencyId) {
      await supabase.from("agency_members").insert({
        agency_id: agencyId,
        role: "admin",
        reddit_username: cleanReddit,
      });
    }

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
