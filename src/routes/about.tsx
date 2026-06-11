import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";

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
    <PageShell>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          About
        </h1>

        <p className="mt-8 text-2xl md:text-3xl font-medium leading-snug">
          Sponsored content, held to a higher standard.
        </p>

        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Human-Coded is the publishing agency behind the WhitePaper: peer-reviewed, expert-authored sponsored posts, published natively on Reddit with the community's editors at the gate.
        </p>

        <section className="mt-16">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Our story
          </h2>
          <div className="mt-6 space-y-4 text-lg text-muted-foreground leading-relaxed">
            <p>
              Reddit is where the internet goes for real expertise, but brands have no credible way in. Communities filter out promotional accounts for good reason: undisclosed marketing erodes the trust that makes them valuable.
            </p>
            <p>
              We believe the problem isn't sponsorship. It's the absence of editorial standards around it. So we borrowed the model that has governed credibility for three centuries: the scientific journal, where funding is disclosed, authors are named, and editors, not sponsors, decide what gets published.
            </p>
            <p className="text-foreground font-medium">
              We apply that model to Reddit.
            </p>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            What we publish
          </h2>
          <div className="mt-6 space-y-4 text-lg text-muted-foreground leading-relaxed">
            <p>
              The WhitePaper is a new content category: a long-form, expert-authored post on a topic a community actually cares about, sponsored by a brand and disclosed as such. Prominently, before the title, every time.
            </p>
            <p>
              Every WhitePaper passes through three independent hands:
            </p>
            <ul className="space-y-4 pl-6 list-disc marker:text-foreground">
              <li>
                <strong className="text-foreground">A named human author:</strong>{" "}
                a credentialed expert who writes under their own Reddit account and stakes their reputation on the work. Not a brand account. Not a ghostwriter. Not an AI.
              </li>
              <li>
                <strong className="text-foreground">A community moderator acting as editor:</strong>{" "}
                the people who know their community best review every WhitePaper before it publishes, with full authority to request revisions or decline. Moderators are never compensated; their role is editorial, and their incentive is the quality of their community.
              </li>
              <li>
                <strong className="text-foreground">A sponsor, fully disclosed:</strong>{" "}
                the brand's involvement is stated up front, locked at the proposal stage, and rendered above the content itself. Disclosure isn't a footnote in our system. It's enforced in the architecture: a WhitePaper literally cannot render without it.
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            What we believe
          </h2>
          <div className="mt-6 space-y-6 text-lg text-muted-foreground leading-relaxed">
            <div>
              <h3 className="text-foreground font-medium">
                Disclosure is a feature, not a tax.
              </h3>
              <p className="mt-1">
                Readers trust content more, not less, when the sponsorship is plain. Hiding the relationship is what destroys value for the community, the author, and the brand.
              </p>
            </div>
            <div>
              <h3 className="text-foreground font-medium">
                Editors outrank sponsors.
              </h3>
              <p className="mt-1">
                A sponsor pays for the opportunity to be reviewed, not for the right to be published. Editorial independence is confirmed on every piece, and the moderator's decision is final.
              </p>
            </div>
            <div>
              <h3 className="text-foreground font-medium">
                Expertise should be human, named, and accountable.
              </h3>
              <p className="mt-1">
                In an era of synthetic content, a real person with real credentials putting their name on real work is the scarcest asset on the internet. We build everything around protecting it.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Who we work with
          </h2>
          <div className="mt-6 space-y-6 text-lg text-muted-foreground leading-relaxed">
            <div>
              <h3 className="text-foreground font-medium">Brands</h3>
              <p className="mt-1">
                that want a verified, disclosed path into the communities where their customers already are, and that understand earning a community's attention means meeting its standards.
              </p>
            </div>
            <div>
              <h3 className="text-foreground font-medium">Authors</h3>
              <p className="mt-1">
                with genuine expertise who want a structured, credentialed publishing channel and fair recognition for their work.
              </p>
            </div>
            <div>
              <h3 className="text-foreground font-medium">Moderators</h3>
              <p className="mt-1">
                who want editorial control over what paid content, if any, enters their community, with the tools of a journal editor rather than a spam filter.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16 space-y-6 border-t border-border pt-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-foreground font-medium">
              Have a community your brand should be part of?
            </p>
            <Link to="/contact" className="text-primary hover:underline font-medium">
              Propose a WhitePaper →
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-foreground font-medium">
              Are you an expert who wants to publish?
            </p>
            <span className="text-muted-foreground">
              Learn about authoring → <span className="text-muted-foreground/60">(coming soon)</span>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-foreground font-medium">
              Moderate a community?
            </p>
            <span className="text-muted-foreground">
              See the editor's dashboard → <span className="text-muted-foreground/60">(coming soon)</span>
            </span>
          </div>
        </section>
    </PageShell>
  );
}
}
