import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Human-Coded" },
      { name: "description", content: "Sign in or create an account for the Human-Coded agency portal." },
      { property: "og:title", content: "Sign in — Human-Coded" },
      { property: "og:description", content: "Sign in or create an account for the Human-Coded agency portal." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
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
    <PageShell>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>

          <p className="mt-8 text-2xl md:text-3xl font-medium leading-snug">
            Agency portal for sponsored Reddit editorial.
          </p>

          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            {mode === "signin"
              ? "Welcome back. Sign in to access your dashboard."
              : "New here? Create an account to get started."}
          </p>

          <section className="mt-16 border-t border-border pt-12 max-w-md">
            <Label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
          </section>
        </div>

        <aside className="lg:sticky lg:top-10 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-auto space-y-6 lg:border-l lg:border-border lg:pl-8">
          <div className="space-y-2">
            <p className="text-foreground font-medium">
              {mode === "signin" ? "New to Human-Coded?" : "Already have an account?"}
            </p>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary hover:underline font-medium block text-left"
            >
              {mode === "signin" ? "Create an account →" : "Sign in instead →"}
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-foreground font-medium">Want to learn more?</p>
            <Link to="/about" className="text-primary hover:underline font-medium block">
              About Human-Coded →
            </Link>
            <Link to="/contact" className="text-primary hover:underline font-medium block">
              Contact us →
            </Link>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
