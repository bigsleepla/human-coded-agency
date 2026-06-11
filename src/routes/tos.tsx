import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/tos")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Human-Coded" },
      {
        name: "description",
        content: "Terms governing your use of Human-Coded.",
      },
    ],
  }),
  component: TosPage,
});

function TosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-10 py-6">
        <Link to="/home" className="text-sm uppercase tracking-wide text-muted-foreground hover:text-foreground">
          ← Human-Coded
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().getFullYear()}
        </p>

        <h2 className="mt-10 text-xl font-semibold">1. Acceptance</h2>
        <p className="mt-2 text-muted-foreground">
          By accessing or using Human-Coded, you agree to these Terms. If you
          do not agree, do not use the service.
        </p>

        <h2 className="mt-8 text-xl font-semibold">2. Use of the service</h2>
        <p className="mt-2 text-muted-foreground">
          You agree to use the service in compliance with all applicable laws
          and Reddit's rules. You are responsible for the content you submit.
        </p>

        <h2 className="mt-8 text-xl font-semibold">3. Accounts</h2>
        <p className="mt-2 text-muted-foreground">
          You must provide accurate information and keep your credentials
          secure. You must be at least 13 years old (or the age of digital
          consent in your jurisdiction).
        </p>

        <h2 className="mt-8 text-xl font-semibold">4. Intellectual property</h2>
        <p className="mt-2 text-muted-foreground">
          You retain ownership of content you submit. You grant us a limited
          license to host and process it as required to operate the service.
        </p>

        <h2 className="mt-8 text-xl font-semibold">5. Disclaimer & liability</h2>
        <p className="mt-2 text-muted-foreground">
          The service is provided "as is" without warranties. To the maximum
          extent permitted by law, Human-Coded is not liable for indirect or
          consequential damages.
        </p>

        <h2 className="mt-8 text-xl font-semibold">6. Termination</h2>
        <p className="mt-2 text-muted-foreground">
          We may suspend or terminate accounts that violate these Terms.
        </p>

        <h2 className="mt-8 text-xl font-semibold">7. Contact</h2>
        <p className="mt-2 text-muted-foreground">
          info@humancoded.com — Human-Coded, Los Angeles, CA.
        </p>
      </main>
    </div>
  );
}
