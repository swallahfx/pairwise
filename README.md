# Pairwise — Creator Marketplace for Indie & AI-Built Products

A gated marketplace where developers list products and browse creators with
visible, niche-specific rate cards — priced in Naira, funded and paid
on-platform via Paystack (creator payouts go to a Nigerian bank account;
Stripe Connect doesn't support Nigerian payout accounts at all, which is
why this isn't a Stripe app). Docker Compose, a service-layered
Express/Prisma backend, and a Next.js frontend, built as one running app
end to end: register or log in (including Google Sign-In), browse and
book a rate card, send/accept a custom offer, pick an applicant off a
posted request, fund the order through Paystack's hosted checkout, carry
it through the delivery/approval state machine, and leave a review.

Alongside the bespoke-work marketplace, **Upfront** is a second, separate
transaction shape: a creator or a company (`BRAND` — a distinct role from
`DEVELOPER`, since a company selling ad inventory isn't hiring anyone) can
list a future program — an upcoming content series or media property with
a described audience — and anyone can pay in advance to reserve a slot in
it before it exists. Different lister types get genuinely separate
onboarding/management pages (`/creators/me` vs. `/brands/me`), not a
shared generic form; buying is unified under one public `/upfront`
directory since any account type can be a buyer.

## Run it

```
cp backend/.env.example backend/.env       # add real Paystack + Google keys when you have them
cp frontend/.env.example frontend/.env
docker compose --env-file frontend/.env up --build
```

The `--env-file` flag matters: the frontend's `NEXT_PUBLIC_*` vars get
baked into the client bundle by `next build` inside the image, not read at
container start, so Compose needs frontend/.env at build time (as build
args — see `docker-compose.yml`), not just as the container's runtime env.

- Frontend: http://localhost:3300
- Backend:  http://localhost:4000
- Postgres: localhost:5532 (user/pass/db: `pairwise`)

(Non-standard host ports — 3300 and 5532 instead of 3000/5432 — because
this machine already had other projects' containers and a native Postgres
bound to the defaults. Containers still talk to each other over the
internal Docker network on the standard ports; only the host-side mapping
changed. Adjust freely in `docker-compose.yml` if your machine is clear.)

On every boot the backend runs `prisma migrate deploy` then seeds the
database with the same example creators, products, and rates used in the
design mockups (Mara Chen, Priya Nair, Fieldnote, etc.) — the seed is
idempotent (upserts by email), so restarting the stack never crashes on
duplicate data. Seeded login: any seeded creator's email (e.g.
`marabuilds@example.com`) / `password123`, the developer account
`dev@example.com` / `password123`, or the admin account
`admin@example.com` / `password123`. One extra creator,
`noah.bright@example.com`, is seeded already clearing the eligibility bar
but sitting PENDING, so the admin queue isn't empty on a fresh run.

### Optional: Paystack and Google Sign-In

Both work with placeholder values in `.env.example` — the app runs fine
without them, just with payments failing at the Paystack API call and the
Google button showing a "not configured" message instead of rendering.

- **Paystack**: get a test secret key from
  `https://dashboard.paystack.com/#/settings/developer` and set
  `PAYSTACK_SECRET_KEY` (backend only — nothing Paystack-related is needed
  on the frontend; funding redirects to Paystack's own hosted checkout
  page rather than collecting a card in-app). No webhook secret to
  configure — Paystack signs webhooks with your secret key itself.
- **Google Sign-In**: create a Web application OAuth Client ID at
  `https://console.cloud.google.com/apis/credentials`, add your frontend's
  origin (e.g. `http://localhost:3300`) as an authorized JavaScript
  origin — no redirect URI needed — and set `GOOGLE_CLIENT_ID` (backend)
  and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (frontend) to the same Client ID.

### A note on the webhook and local dev

Paystack's webhook needs a publicly reachable URL, which `localhost:4000`
isn't. Locally, funding is actually confirmed by
`checkout/[orderId]/callback` — the page Paystack redirects the browser
back to after its hosted checkout — which calls `GET
/payments/verify/:reference` to confirm the charge directly against
Paystack's API. The webhook (`POST /payments/webhook`) does the same
confirmation and is the durable source of truth once this is deployed
somewhere with a real domain; both paths call the same idempotent
`ordersService.confirmFunding`.

## Architecture

**Backend — service layer, one folder per domain:**

```
src/modules/<domain>/
  <domain>.routes.ts       Express router — HTTP verbs/paths only
  <domain>.controller.ts   Translates req/res <-> service calls, no logic
  <domain>.service.ts      All business rules live here
  <domain>.repository.ts   Prisma queries only, no rules
  <domain>.schema.ts       Zod input validation
```

Nothing skips a layer: a controller never imports Prisma, a repository
never enforces a rule. `creators.service.ts` is the clearest example —
the eligibility gate (minimum followers/engagement before a profile can
list a rate card) lives in exactly one place, not scattered across a
controller and a repository query. Clearing the gate isn't enough on its
own, though: it unlocks admin review, not an automatic APPROVED — a
creator sits PENDING until an `ADMIN`-role account explicitly approves or
rejects them at `/admin` (`GET/POST /creators/admin/...`, restricted to
that role). `ADMIN` is never a role the public register/Google-auth
endpoints will issue — it only exists on the seeded admin account or via
`POST /auth/admin/create-user`, an admin-only endpoint that can stand up
an account of any role (including another `ADMIN`) directly, with a
password the admin sets and hands off out of band — there's no invite
email, so whoever it's for logs in at `/login` exactly like anyone else,
using the credentials the admin gave them.

`upfront.service.ts` is a second, deliberately separate domain module
alongside `orders.service.ts` rather than a variant of it — a pre-sold
program slot has no submit/revision step and its lister can be a
`CreatorProfile` or a `BrandProfile`, neither of which fits Offer/Order's
fixed developer-hires-creator shape. It reuses `payments.service.ts`
as-is (already provider-agnostic, dealing in raw amounts and Paystack
references) and mirrors `orders.service.ts`'s authorization/state-machine
pattern one level simpler: `AGREED -> FUNDED -> APPROVED/AUTO_APPROVED ->
PAID`, with the 7-day auto-release keyed off the listing's `programDate`
instead of a submission timestamp. `payments.controller.ts`'s webhook and
verify-on-return handler both dispatch to whichever domain a Paystack
reference belongs to by its prefix (`order_...` vs `upfront_...`), so one
webhook endpoint serves both.

`payments.service.ts` isolates every Paystack call behind one module (a
thin `fetch` wrapper around Paystack's plain REST API, no vendor SDK).
Orders call `paymentsService.initializeTransaction` /
`transferToCreator` — they never call Paystack directly, which is exactly
what made swapping this module in for the original Stripe integration a
one-file change instead of a rewrite. `orders.service.ts` implements the
state machine explicitly (`AGREED -> FUNDED -> IN_PROGRESS -> SUBMITTED ->
APPROVED/AUTO_APPROVED -> PAID`), including the 7-day auto-release sweep
for unresponsive developers, and every transition checks the caller is
actually the developer or creator on that specific order — not just any
authenticated user. `auth.service.ts` supports both a password account and
Google Sign-In on the same `User` row, linking by verified email.

**Frontend — Next.js App Router, feature-first:**

```
src/app/<route>/page.tsx    One route = one page component
src/components/ui/          Shared primitives (NavBar, Pill, Card, Money, GoogleSignInButton)
src/lib/api.ts              One typed fetch client every page calls through
src/lib/auth.tsx            Auth context — token/user in localStorage
src/types/                  Shared types mirroring the Prisma models
```

Design tokens (`tailwind.config.ts`) are a direct port of the CSS
variables used in the original design artifacts — same names, same hex
values, same Space Grotesk + IBM Plex Sans pairing.

## What's built

**Backend, all four layers, type-checked clean:** Auth (password + Google
Sign-In, JWT, four roles — `DEVELOPER`/`CREATOR`/`BRAND` self-register,
`ADMIN` only via seed or another admin), Creators (directory, profile,
eligibility gate + admin approval queue), Brands (profile, no eligibility
gate — only its listings are reviewed), Rate Cards, Products, Advert
Requests, **Offers** (converges all three pricing paths — book a rate
card, send/accept a custom offer, apply to and accept a request response
— into one Order), Orders (full funding/release state machine with
per-action authorization), **Upfront** (listings from a creator or brand,
admin-reviewed, purchasable by any role, its own funding/release state
machine), Payments (Paystack transactions, bank-account payout setup
shared by creators and brands, webhook handler dispatching to whichever
domain a reference belongs to), admin CRUD across every domain (edit/delete
for creators, brands, products, requests, Upfront listings; dispute/refund
status overrides for Orders and Upfront purchases, since those are
financial records that never get silently deleted), Reviews (the developer
who hired a creator reviews them once an order is `PAID` — not the other
way round, since a review's job is to help the *next* buyer decide),
UpfrontReview (same shape for a completed Upfront purchase), Q&A (a public
pre-purchase question thread on a creator profile or Upfront listing,
answerable only by the account being asked about), Notifications
(in-app only — no outbound email service is configured — raised at every
order/purchase state change, review-queue decision, and Q&A event),
SavedCreator (a developer's bookmark list), and Analytics (GMV, platform
fee revenue, and status breakdowns for the admin dashboard, computed
live from existing tables rather than a separate snapshot).

**Frontend, wired to real API calls end to end:** register/login
(including Google, with a Developer/Creator/Brand picker), creator
directory (filter + sort) → creator profile (Book creates a real
offer+order and redirects to checkout, or send a custom offer) →
checkout (redirects to Paystack's hosted payment page, comes back through
a callback route that verifies the transaction) → order status (live
stepper, action buttons for start/submit/approve/request revision
depending on role and status, review form once paid) → Offers inbox
(creators accept/decline custom offers; developers pick an applicant off
their posted requests) → My Orders. **Upfront**: a public `/upfront`
directory and listing detail page with the same Paystack checkout/
callback pattern, a separate `/upfront/purchases` buyer history (kept
apart from `/orders` — a different kind of transaction), and Upfront
listing management split by lister type — inside the existing
`/creators/me` (its own tab, next to the unrelated rate-card tab) for
creators, and a new `/brands/me` for brands, both sharing one extracted
`PayoutAccountForm` component rather than duplicating the bank-resolve
flow. Also: products directory + detail, requests board, an admin panel
at `/admin` with five tabs — creator approvals, Upfront listing approvals,
a "create any account type directly" form, a "Manage data" tab (per-entity
edit/delete tables plus dispute/refund actions on Orders and Upfront
purchases), and an Analytics dashboard (GMV, fee revenue, status
breakdowns) — list-your-product and post-a-request forms. Creators,
Products, and Upfront all got search + dropdown filters alongside their
existing niche pills. A public rating badge (★ + review count) now shows
on creator/listing cards and profile pages, backed by a reviews list and
a leave-a-review form (developer-side on `/orders/[id]`, buyer-side on
`/upfront/purchases`); a `QuestionBox` component handles the public Q&A
thread on both creator profiles and Upfront listings; a `NotificationBell`
in the nav polls for in-app notifications and marks them read on click;
a heart-shaped `SaveButton` bookmarks a creator to the new
`/creators/saved` page; and a creator profile shows a reply-rate/response-
time badge once they've fielded at least 3 questions.

## Verified

`npm install`, `npx tsc --noEmit`, and `next build` pass clean on both
`backend/` and `frontend/`. The full stack has been run under
`docker compose up --build` and exercised in a real browser with a real
Paystack test secret key, including a full successful round trip: book a
rate card → redirected to Paystack's actual hosted checkout → paid with
their test-mode "Success" card → redirected back → order confirmed
`FUNDED`. Also verified live: register/login, send/accept a custom offer,
per-action authorization (a creator cannot fund their own order — a live
403), the Upfront flow end to end (create a listing as a brand → approve
it as admin → it appears at `/upfront` → buy a slot → Paystack checkout →
slot count decrements correctly), a non-admin blocked from every
`/admin`-only endpoint (a live 401), and the admin "create any account"
form actually producing a working login for the account it created. Also
verified live: the full Q&A round trip (ask as a developer → the
creator's notification bell shows an unread badge → click through to the
exact question → answer it → the answer appears publicly), saving and
unsaving a creator from `/creators/saved`, and the admin Analytics tab
rendering live GMV/status/role breakdowns pulled straight from the
database.
