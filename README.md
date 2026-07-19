# anchornet-frontend

Web app for **AnchorNet** — the liquidity coordination network for Stellar anchors. Built with Next.js for wallets, payment UI, and Stellar integration.

## Overview

- **Stack:** Next.js, React, TypeScript, Tailwind CSS
- **Role:** User-facing UI for payments and Stellar wallet integration

## Prerequisites

- Node.js 18+
- npm (or yarn/pnpm)

## Setup

```bash
# Clone the repo (or use your fork)
git clone <repo-url>
cd anchornet-frontend

# Install dependencies
npm install

# Run in development
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

The dashboard talks to the AnchorNet API. Copy `.env.example` to `.env.local`
and point it at your backend:

```bash
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Pages

- `/` – landing page with an overview and links to each section
- `/dashboard` – live metrics bar (auto-refreshing), aggregated pools in a
  **sortable table** (Asset / Total liquidity / Anchors) with a **search box**
  that matches on asset and an inline-SVG **distribution bar** showing each
  asset's share of total liquidity, and a routing **quote form** that
  previews fees, deliverable amount, and route
- `/anchors` – register, list and deactivate liquidity anchors, with
  **status filter tabs** (All / Active / Inactive), a **search box** that
  matches on id/name, and **sortable columns** (Anchor / Registered /
  Status) over the fetched list
- `/anchors/[id]` – full record detail for a single anchor (status,
  registration date) with its own deactivate action, linked from the anchors
  table
- `/settlements` – open settlements and execute / cancel pending ones, with
  a **"Load more" button** that pages through the API's `?page=`/`?pageSize=`
  results instead of fetching everything up front (with a **page-size
  selector** for 10/25/50 rows per page), a **search box** that matches on
  id/anchor/asset, and **sortable columns** (Anchor / Amount / Status) over
  the currently loaded rows
- `/settlements/[id]` – full record detail for a single settlement (anchor,
  asset, amount, fee, status) with its own execute/cancel actions, linked
  from the settlements table
- any unmatched route – a custom 404 page with a link back home

Both detail pages have a **copy button** next to their address-like fields
(anchor id, settlement anchor address) for quickly grabbing the value.

Every list/detail route also has its own `loading.tsx` (a spinner shown while
the route segment loads) and `error.tsx` (a "Try again" fallback, via the
shared `RouteError` component) for graceful loading and error states.

Registering an anchor or opening a settlement is validated inline (missing or
invalid fields are flagged next to the input before the request is sent), and
every mutating action — register, deactivate, open, execute, cancel — reports
success or failure via a **toast notification** in the bottom corner of the
screen. Toasts are announced via `aria-live="polite"` and auto-dismiss after
five seconds, but pause on hover or keyboard focus and resume the countdown
from the remaining time when the pointer leaves or focus is lost — so a toast
never lingers indefinitely just because it was glanced at, and never vanishes
while a user is reading or interacting with it. Deactivating an anchor or
cancelling a settlement first opens a
**confirmation dialog**, on both the list panels and their detail pages, so a
misclick can't silently take a destructive action. The dialog is keyboard
accessible: it autofocuses the (non-destructive) cancel button, closes on
**Escape**, and traps Tab focus between its two buttons. Tables show an
animated skeleton while their first page of data is loading, instead of a
bare "Loading…" line. Sortable column headers expose their current direction
via `aria-sort` for assistive technology.

A mock **wallet connect** lives in the header (a stand-in for a real Stellar
wallet integration); the connected account is persisted to `localStorage` so
it survives a page refresh.

Every search box (dashboard pools, anchors, settlements) can be focused from
anywhere on the page by pressing **`/`**, unless focus is already inside
another text field.

### Structure

```
src/app/        routes (landing, dashboard, anchors + [id], settlements + [id]),
                 each list/detail route with its own loading.tsx and error.tsx,
                 plus a root-level not-found.tsx
src/components/  UI (Card, tables, forms with inline validation, skeleton
                 loaders, panels, badges, toasts, confirm dialog, wallet,
                 detail views, distribution bar, route error fallback,
                 copy button, header/footer)
src/hooks/       useAsync, useInterval, useWallet, useToast, useSortableData,
                 useFocusShortcut
src/lib/         types, formatting, search matching, toast stack helpers,
                 wallet session persistence, API clients (liquidity,
                 anchors, settlements, metrics)
```

## Testing

Unit tests run with [Vitest](https://vitest.dev) over the `src/lib` helpers,
API clients and `src/hooks` (`npm test`). Component behaviour (toasts, status
badges, sortable tables, forms, confirm dialogs — including keyboard
accessibility — the pool distribution bar, and small presentational pieces
like `Spinner`/`StatCard`/`EmptyState`/`RouteError`) is covered with
[React Testing Library](https://testing-library.com/react) under a jsdom
environment. Lint and build are separate CI steps.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests (Vitest) |

## Contributing

1. Fork the repo and create a branch from `main`.
2. Install deps: `npm install`. Run `npm run lint` and `npm run build`.
3. Open a pull request. CI runs lint, build, and test on push/PR to `main`.

## License

MIT
