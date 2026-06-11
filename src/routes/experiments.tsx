import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/experiments")({
  component: ExperimentsPage,
});

function ExperimentsPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Experiments</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is your blank canvas. Build something here.
        </p>
      </div>
    </div>
  );
}
