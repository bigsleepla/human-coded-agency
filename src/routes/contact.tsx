import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Human-Coded" },
      {
        name: "description",
        content: "Get in touch with Human-Coded.",
      },
      { property: "og:title", content: "Contact — Human-Coded" },
      {
        property: "og:description",
        content: "Get in touch with Human-Coded.",
      },
    ],
  }),
  component: ContactPage,
});

const emailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address.")
  .max(255);

const CARDS = [
  { label: "Email", value: "info@humancoded.com", href: "mailto:info@humancoded.com" },
  { label: "Phone", value: "555-555-5555", href: "tel:5555555555" },
  { label: "Location", value: "Los Angeles, CA" },
] as const;

function ContactPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid email.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setEmail("");
      toast.success("Thanks — we'll be in touch.");
    }, 400);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-10 py-6">
        <Link to="/home" className="text-sm uppercase tracking-wide text-muted-foreground hover:text-foreground">
          ← Human-Coded
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Contact
        </h1>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {card.label}
              </div>
              {"href" in card && card.href ? (
                <a
                  href={card.href}
                  className="mt-2 block text-lg font-medium hover:underline"
                >
                  {card.value}
                </a>
              ) : (
                <div className="mt-2 text-lg font-medium">{card.value}</div>
              )}
            </div>
          ))}
        </div>

        <section className="mt-16 max-w-md">
          <h2 className="text-xl font-semibold">Start a conversation</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Leave your email and we'll reach out.
          </p>
          <form onSubmit={onSubmit} className="mt-4 flex gap-2">
            <Input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Submit"}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
