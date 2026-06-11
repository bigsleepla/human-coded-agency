import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Human-Coded" },
      {
        name: "description",
        content:
          "Human-Coded crafts sponsored editorial for Reddit communities.",
      },
      { property: "og:title", content: "About — Human-Coded" },
      {
        property: "og:description",
        content:
          "Human-Coded crafts sponsored editorial for Reddit communities.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-10 py-6">
        <Link to="/home" className="text-sm uppercase tracking-wide text-muted-foreground hover:text-foreground">
          ← Human-Coded
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          About
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Copy to be added.
        </p>
      </main>
    </div>
  );
}
