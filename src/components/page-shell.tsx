import type { ReactNode } from "react";
import { SiteLogo } from "@/components/site-logo";
import { SiteNav } from "@/components/site-nav";
import { CookieBanner } from "@/components/cookie-banner";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <SiteLogo variant="dark" />
      <SiteNav variant="dark" />
      <main className="max-w-6xl pl-[58px] md:pl-[64px] lg:pl-[82px] pr-6 pt-[320px] md:pt-[280px] pb-20">
        {children}
      </main>
      <CookieBanner />
    </div>
  );
}
