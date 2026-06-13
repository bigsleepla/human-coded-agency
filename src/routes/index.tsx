import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Human-Coded" },
      { name: "description", content: "Human-Coded agency portal." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, agency, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/home" />;
  if (!agency) return <Navigate to="/onboarding" />;
  return <Navigate to="/board" />;
}
