import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

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
    const { data: created, error } = await supabase
      .from("agencies")
      .insert({
        supabase_user_id: user.id,
        brand_name: brandName.trim(),
        reddit_username: cleanReddit,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      setBusy(false);
      return;
    }
    // Create the admin agency_members record (best-effort; ignore conflict).
    await supabase.from("agency_members").insert({
      agency_id: created.id,
      user_id: user.id,
      role: "admin",
      email: user.email,
    });
    await refreshAgency();
    toast.success("Welcome aboard.");
    navigate({ to: "/board" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Tell us about your agency</h1>
          <p className="text-sm text-muted-foreground">
            This information appears on submissions and shared links.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Brand name</Label>
            <Input
              id="brand"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Acme Editorial"
              required
              maxLength={120}
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
            />
            <p className="text-xs text-muted-foreground">
              Without the <code>u/</code> prefix.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Continue"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
