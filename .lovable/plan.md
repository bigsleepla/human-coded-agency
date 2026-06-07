# Human-Coded Agency Portal

A dark-mode web app for content agencies to manage sponsored editorial submissions to Reddit, backed by your existing Supabase project (`leayhimwhbsoxwmtgbqf`).

## Backend setup

- Use **your own Supabase project** (not Lovable Cloud). I'll create a browser-side Supabase client in `src/integrations/supabase/client.ts` using the URL + anon key you provided.
- All data access happens client-side via supabase-js with RLS enforcing per-agency scoping (assumed already configured on your tables).
- Realtime subscriptions for `slot_notes` and `slot_bookmarks`.
- No server functions / no service-role key in the app.

> Note: I'll assume the existing tables have RLS policies scoping rows to `auth.uid()` via `agencies.supabase_user_id` / `agency_members.user_id`. If a query returns empty unexpectedly, that's where to look.

## Routes

```
/auth                       Login + Signup (email/password)
/onboarding                 First-login agency profile (brand name + Reddit username)
/_authenticated/
  board                     Slot Board (kanban, drag between 4 columns)
  browse                    Slot Browser (all open slots, bookmark + share)
  submissions               Submissions list table
  submissions/new           Submission form (optional ?slotId= prefill)
  submissions/$id           Edit a draft submission
  team                      Team Settings (admin only)
/s/$token                   Public shared-slot view (via slot_share_links)
```

Auth guard uses the integration-managed `_authenticated` layout pattern. After login, if no `agencies` row exists for the user, redirect to `/onboarding`.

## Pages

1. **Auth** — Email/password sign-in + sign-up with `emailRedirectTo: window.location.origin`.
2. **Onboarding** — One-time form, inserts into `agencies { supabase_user_id, brand_name, reddit_username }` and creates a matching `agency_members` row with role `admin`.
3. **Slot Board** — Kanban with columns Watching / In Progress / Submitted / Closed reading `slot_bookmarks` joined with `slots` and `slot_activity` (for heat). Cards show topic, subreddit, deadline, heat badge (gray/blue/yellow/red by score). Drag-and-drop via `@dnd-kit/core` updates `slot_bookmarks.stage`. Realtime keeps it in sync across the team.
4. **Slot Browser** — Table of open slots from `slots`. Bookmark button inserts into `slot_bookmarks` (stage = `watching`). Share button inserts into `slot_share_links`, copies `/s/<token>` to clipboard.
5. **Slot Workspace** — Slide-over (shadcn `Sheet`) opened from board/browser. Tabs: Details, Notes (live via Realtime, shows Reddit username + timestamp), and a "Start Submission" button → `/submissions/new?slotId=...`.
6. **Submission Form** — Slot pre-selected, brand pre-filled. Author rows (name + Reddit URL) with add/remove. Big textarea for content. Optional publish date + engagement window. Save Draft / Submit buttons set `status` accordingly.
7. **Submissions List** — Table with status badges, click drafts to edit.
8. **Team Settings** — Admin-only. Lists `agency_members` with roles. Invite via `supabase.auth.admin.inviteUserByEmail` — **this requires the service role and won't work from the browser**. See "Open question" below.

## Layout & design

- Dark mode default (set `class="dark"` on `<html>`).
- Sidebar nav (shadcn `Sidebar`): Slot Board, Browse Slots, Submissions, Team Settings — icons from lucide-react.
- Top bar: brand name + avatar with Reddit-username initials.
- Tailwind, minimal motion, neutral palette with a single accent. Heat badges are the only saturated color.

## Technical notes

- New deps: `@supabase/supabase-js`, `@dnd-kit/core`, `@dnd-kit/sortable`.
- Auth state hook subscribes to `onAuthStateChange`; router context carries `{ user, agency }`.
- Realtime: one channel per slot for notes; one channel for the agency's bookmarks on the board.
- Forms validated with `zod` + react-hook-form (already in template).
- All colors via semantic tokens in `src/styles.css`; no raw color classes in components.

## Open question

**Team invites:** `supabase.auth.admin.inviteUserByEmail` requires the **service role key**, which cannot live in the browser. Three options:

1. **Skip auto-invites for v1** — admins add a member by entering an email + role, which creates a pending `agency_members` row; the invitee signs up normally and gets linked on first login. Simplest, no server.
2. **Use a Supabase Edge Function in your project** with the service role — I'd write the function code for you to deploy.
3. **Enable Lovable Cloud just for a tiny server function** — adds a second Supabase project, probably overkill given you already have one.

I'll go with **option 1** unless you say otherwise.

## Out of scope for v1

- Verifying the Reddit username actually exists.
- Editing slots themselves (the spec only mentions reading them).
- Notifications beyond live note updates.
- Mobile-optimized drag-and-drop (kanban will work on desktop primarily).
