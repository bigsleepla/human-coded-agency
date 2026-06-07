import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) toast.error(error.message);
      else navigate({ to: "/" });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm, then sign in.");
    }
  };

  const modes: { value: Mode; label: string; desc: string; icon: typeof LogIn }[] = [
    { value: "signin", label: "Sign in", desc: "I already have an account", icon: LogIn },
    { value: "signup", label: "Create account", desc: "I'm new here", icon: UserPlus },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-geo-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_70%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Human-Coded</h1>
            <p className="text-sm text-muted-foreground">
              Agency portal for sponsored Reddit editorial.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="mb-5">
            <Label className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              How are you getting in?
            </Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as Mode)}
              className="grid grid-cols-2 gap-3"
            >
              {modes.map((m) => {
                const Icon = m.icon;
                const active = mode === m.value;
                return (
                  <label
                    key={m.value}
                    htmlFor={`mode-${m.value}`}
                    className={cn(
                      "group relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 transition-all duration-150",
                      active
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl",
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2.25} />
                      </div>
                      <RadioGroupItem id={`mode-${m.value}`} value={m.value} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.desc}</div>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy
                ? mode === "signin"
                  ? "Signing in…"
                  : "Creating…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
