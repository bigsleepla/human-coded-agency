import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/playground")({
  component: PlaygroundPage,
});

function PlaygroundPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Blank canvas */}
    </div>
  );
}
