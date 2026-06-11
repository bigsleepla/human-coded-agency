## Goal

Create a reusable page template for all non-home routes (About, Contact, Privacy, ToS, etc.) that reuses the same logo + nav as the home page, but in a black-on-off-white color scheme with no cloud animation and no quote.

## What to build

1. **Make `SiteNav` color-aware.** Add a `variant?: "light" | "dark"` prop (default `"light"` = current white text for the home page). `"dark"` renders the links in near-black (`text-foreground/85 hover:text-foreground`) so they read on a light background.

2. **Extract the logo into `SiteLogo`** (`src/components/site-logo.tsx`). Same markup currently inlined in `home.tsx` (the `|HUMAN` / `-CODED` Link). Accept the same `variant` prop — `"light"` keeps `text-white`, `"dark"` uses `text-foreground` (near-black).

3. **Create `PageShell`** (`src/components/page-shell.tsx`):
   - Off-white background (new token `--page-surface: oklch(0.97 0.005 85)` in `src/styles.css`, applied via inline style or a utility) so it's a warm off-white, not pure `#fff`.
   - Renders `<SiteLogo variant="dark" />` and `<SiteNav variant="dark" />` in the same absolute positions used on home (top-left logo, top-right nav, mobile nav under logo).
   - Reserves vertical space under the logo so page content doesn't collide with it (roughly `pt-[220px] md:pt-[180px]` — matches current logo height).
   - Renders `{children}` inside a centered `<main>` container.
   - Includes `<CookieBanner />` at the bottom so it's consistent with home.

4. **Update home (`src/routes/home.tsx`)** to consume `<SiteLogo variant="light" />` instead of the inlined logo markup. Cloud canvas + quote behavior unchanged. No visual change on home.

5. **Convert one page as the reference** — `src/routes/about.tsx` — to use `<PageShell>`, dropping its current ad-hoc `<header>` with the `← Human-Coded` back link. Other routes (contact, privacy, tos) can be migrated in a follow-up; this turn is just the template + about as the proof.

## Out of scope

- No changes to the home page's cloud/quote behavior (the user said those features are off "for the template", meaning they shouldn't appear on the new template — not that they should be removed from home).
- No migration of contact/privacy/tos yet — confirm the look on About first, then roll out.

## Technical notes

- `--page-surface` added in `src/styles.css` under `:root` so it's reusable.
- `SiteNav` and `SiteLogo` keep their absolute positioning so PageShell doesn't need to reimplement layout; PageShell just adds top padding for the content area.
- No routing, data, or auth changes.

```text
PageShell
├── SiteLogo  variant="dark"   (absolute top-left)
├── SiteNav   variant="dark"   (absolute top-right, mobile under logo)
├── <main>    children          (padded so it clears the logo)
└── CookieBanner
```
