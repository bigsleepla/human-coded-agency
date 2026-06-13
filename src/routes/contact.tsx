import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";

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
  { label: "Email", value: "info@humancoded.app", href: "mailto:info@humancoded.app" },
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
    <PageShell>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Contact
          </h1>

          <p className="mt-8 text-2xl md:text-3xl font-medium leading-snug">
            Start a conversation.
          </p>

          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Whether you're a brand, an author, or a moderator — reach out and
            we'll get back to you.
          </p>

          <section className="mt-16 border-t border-border pt-12">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Leave your email
            </h2>
            <p className="mt-4 text-lg text-foreground font-medium">
              We'll reach out shortly.
            </p>
            <form onSubmit={onSubmit} className="mt-6 flex gap-2 max-w-md">
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
        </div>

        <aside className="lg:sticky lg:top-10 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-auto space-y-6 lg:border-l lg:border-border lg:pl-8">
          <div className="space-y-2">
            <p className="text-foreground font-medium">
              Reach us
            </p>
            <div className="space-y-3">
              {CARDS.map((card) => (
                <div key={card.label}>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </div>
                  {"href" in card && card.href ? (
                    <a
                      href={card.href}
                      className="mt-1 block text-base font-medium hover:underline"
                    >
                      {card.value}
                    </a>
                  ) : (
                    <div className="mt-1 text-base font-medium">{card.value}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-foreground font-medium">
              Want to learn more?
            </p>
            <Link to="/about" className="text-primary hover:underline font-medium block">
              About Human-Coded →
            </Link>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
