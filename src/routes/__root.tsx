import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import faviconIco from "@/assets/favicons/favicon.ico.asset.json";
import appleTouchIcon from "@/assets/favicons/apple-touch-icon.png.asset.json";
import icon192 from "@/assets/favicons/icon-192.png.asset.json";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Human-Coded — Agency Portal" },
      {
        name: "description",
        content:
          "Manage sponsored editorial submissions to Reddit communities.",
      },
      { property: "og:title", content: "Human-Coded — Agency Portal" },
      { name: "twitter:title", content: "Human-Coded — Agency Portal" },
      { name: "description", content: "Web app for content agencies to manage sponsored Reddit editorial submissions." },
      { property: "og:description", content: "Web app for content agencies to manage sponsored Reddit editorial submissions." },
      { name: "twitter:description", content: "Web app for content agencies to manage sponsored Reddit editorial submissions." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b77fb726-c1a9-4a30-b43a-0d88d9aafeaa/id-preview-8fbc4580--95f0cba9-7e2e-4aca-a4d4-5738daa35332.lovable.app-1781334457377.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b77fb726-c1a9-4a30-b43a-0d88d9aafeaa/id-preview-8fbc4580--95f0cba9-7e2e-4aca-a4d4-5738daa35332.lovable.app-1781334457377.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: faviconIco.url, sizes: "48x48" },
      { rel: "shortcut icon", href: faviconIco.url },
      { rel: "apple-touch-icon", href: appleTouchIcon.url, sizes: "180x180" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: icon192.url },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Page not found.</p>
      <Link to="/home" className="text-primary hover:underline">Return to home page</Link>
    </div>
  ),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
