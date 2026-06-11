import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/experiments")({
  component: ExperimentsPage,
});

function ExperimentsPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
    </div>
  );
}
