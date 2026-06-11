import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SiteNav } from "@/components/site-nav";
import { CookieBanner } from "@/components/cookie-banner";

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
    <div
      className="relative min-h-[calc(100vh-3.5rem)] text-foreground"
      style={{
        background: `linear-gradient(to bottom, oklch(0.25 0.005 85), var(--background))`,
      }}
    >
      <Link
        to="/home"
        aria-label="Human-Coded — Home"
        className="absolute top-10 left-10 z-10 select-none font-normal leading-[0.95] tracking-tight text-white no-underline"
        style={{
          fontFamily:
            'Garet, "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
        }}
      >
        <div className="text-[40px] md:text-[60px] lg:text-[90px] italic">
          <span style={{ marginRight: "6px" }}>|</span>HUMAN
        </div>
        <div className="text-[40px] md:text-[60px] lg:text-[90px] lg:ml-[42px] ml-[18px]">
          -CODED
        </div>
      </Link>
      <SiteNav />

      <main className="mx-auto max-w-3xl px-6 pt-[260px] md:pt-[320px] lg:pt-[420px] pb-24">
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

        <section className="mt-16">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Reach us
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {CARDS.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6"
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
        </section>

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
      </main>

      <CookieBanner />
    </div>
  );
}
