import type { ReactNode } from "react";
import { SiteLogo } from "@/components/site-logo";
import { SiteNav } from "@/components/site-nav";
import { CookieBanner } from "@/components/cookie-banner";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <SiteLogo variant="dark" />
      <SiteNav variant="dark" />
      <main className="mx-auto max-w-3xl px-6 pt-[320px] md:pt-[280px] pb-20">
        {children}
      </main>
      <CookieBanner />
    </div>
  );
}
