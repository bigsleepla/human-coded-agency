import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Human-Coded" },
      {
        name: "description",
        content:
          "How Human-Coded collects, uses, and protects personal information, including GDPR, CCPA, and COPPA rights.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {new Date().getFullYear()}
        </p>

        <h2 className="mt-10 text-xl font-semibold">1. Who we are</h2>
        <p className="mt-2 text-muted-foreground">
          Human-Coded ("we", "us") operates this website and the Human-Coded
          agency portal. Contact: info@humancoded.app.
        </p>

        <h2 className="mt-8 text-xl font-semibold">2. Information we collect</h2>
        <ul className="mt-2 list-disc pl-6 text-muted-foreground space-y-1">
          <li>Account information you provide (email, Reddit username, agency).</li>
          <li>Submission content you upload to the portal.</li>
          <li>Technical data (IP, device, browser) needed to operate the site.</li>
          <li>Optional analytics and marketing data, only with your consent.</li>
        </ul>

        <h2 className="mt-8 text-xl font-semibold">3. Legal bases (GDPR)</h2>
        <p className="mt-2 text-muted-foreground">
          We process personal data under contract (to deliver the service),
          legitimate interest (security, basic site operation), and consent
          (analytics, marketing). You may withdraw consent at any time.
        </p>

        <h2 className="mt-8 text-xl font-semibold">4. Your rights</h2>
        <p className="mt-2 text-muted-foreground">
          You have the right to access, correct, delete, restrict, port, and
          object to processing of your personal data. EU/UK residents may
          lodge a complaint with their supervisory authority.
        </p>

        <h2 className="mt-8 text-xl font-semibold">
          5. California residents (CCPA / CPRA)
        </h2>
        <p className="mt-2 text-muted-foreground">
          California residents have the right to know what personal
          information we collect, to delete it, to correct inaccurate data,
          and to opt out of the "sale" or "sharing" of personal information.
          We do not sell personal information. To exercise these rights, email
          info@humancoded.app or use the "Reject all" option in our cookie
          banner.
        </p>

        <h2 className="mt-8 text-xl font-semibold">6. Children (COPPA)</h2>
        <p className="mt-2 text-muted-foreground">
          Our services are not directed to children under 13. We do not
          knowingly collect personal information from children under 13. If
          you believe a child has provided us personal data, contact
          info@humancoded.app and we will delete it.
        </p>

        <h2 className="mt-8 text-xl font-semibold">7. Cookies and tracking</h2>
        <p className="mt-2 text-muted-foreground">
          We use strictly necessary cookies by default. Analytics and
          marketing cookies are off until you opt in. You can change your
          choices at any time by clearing site data or revisiting our cookie
          banner.
        </p>

        <h2 className="mt-8 text-xl font-semibold">8. Data retention</h2>
        <p className="mt-2 text-muted-foreground">
          We retain personal data only as long as necessary to provide the
          service and meet legal obligations.
        </p>

        <h2 className="mt-8 text-xl font-semibold">9. Contact</h2>
        <p className="mt-2 text-muted-foreground">
          Questions or data requests: info@humancoded.app, Human-Coded, Los
          Angeles, CA.
        </p>
      </div>
    </PageShell>
  );
}
