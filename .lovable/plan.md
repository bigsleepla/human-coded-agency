## Pages to update

Pages currently without `PageShell`:

- `src/routes/onboarding.tsx` — public-facing form, no shell
- `src/routes/s.$token.tsx` — public shared-slot page, no shell

## Pages intentionally skipped

- `src/routes/__root.tsx` — router root, not a page
- `src/routes/index.tsx` — redirect-only, no UI
- `src/routes/_app.tsx` and all `_app.*` children (`board`, `browse`, `submissions.*`, `team`) — already wrapped in the authenticated `AppShell` layout (different shell on purpose)
- `src/routes/home.tsx` — landing page that already uses `SiteNav` + `SiteLogo` (the building blocks of `PageShell`) with a custom full-bleed canvas background; wrapping it in `PageShell` would break the hero canvas

## Plan

1. Wrap `onboarding.tsx`'s form in `<PageShell>` (centered card, matching auth/tos/privacy styling).
2. Wrap `s.$token.tsx`'s shared-slot content in `<PageShell>` so public viewers see the same nav/logo/background.

No business logic changes — purely presentational wrapping.

Confirm and I'll switch to build mode and apply.