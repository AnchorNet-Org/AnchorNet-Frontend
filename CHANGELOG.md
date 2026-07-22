# Changelog

All notable changes to the AnchorNet web app are documented here.

## [0.9.0]

### Added

- **UX:** added a support link to the AnchorNet GitHub issues page on all error
  boundaries via the shared `RouteError` component.
- **Accessibility:** `aria-sort` on every sortable table header
  (`AnchorTable`, `SettlementTable`, `PoolTable`), reflecting `none`,
  `ascending`, or `descending`.

## [0.8.0]

### Added

- **Accessibility:** `useFocusShortcut` hook — pressing `/` anywhere on the
  page focuses the current search box (dashboard pools, anchors,
  settlements), unless focus is already inside another text field.

### Testing

- Covered the toast stack's 5-second auto-dismiss timer (previously only
  manual dismiss was tested).

## [0.7.0]

### Added

- **App:** a custom 404 `not-found` page with a link back home.
- **UI:** a `CopyButton` component, wired into both detail pages next to
  their address-like fields (anchor id, settlement anchor address).

### Testing

- Filled every remaining component/hook/lib test gap: `AnchorsPanel`,
  `SettlementsPanel`, `PoolsPanel`, `AnchorDetail`, `SettlementDetail`,
  `Card`, `ConnectButton`, `MetricsBar`, `QuoteForm`, `SiteFooter`,
  `SiteHeader`, `WalletProvider`, `TableSkeleton`, `useAsync`, `useInterval`,
  `useToast`, `useWallet`, and `metricsApi` all now have coverage.

## [0.6.0]

### Added

- **Search:** a client-side search box on the dashboard's pools panel
  (matches asset), alongside the existing anchors/settlements search boxes.
- **Pagination:** a page-size selector (10/25/50 rows) for the settlements
  list, replacing the fixed page size.
- **Visualization:** a hand-rolled inline-SVG `PoolDistributionBar` showing
  each asset's share of total liquidity, with a colour-keyed legend, shown
  above the pools table.
- **Accessibility:** `ConfirmDialog` now autofocuses its (non-destructive)
  cancel button, closes on Escape, and traps Tab focus between its two
  buttons.
- **Route UX:** every list/detail route (`/dashboard`, `/anchors`,
  `/anchors/[id]`, `/settlements`, `/settlements/[id]`) now has its own
  `loading.tsx` spinner and `error.tsx` fallback (via a shared `RouteError`
  component with a "Try again" action), instead of relying solely on
  in-panel loading/error states.
- **Tests:** component coverage for the new `ConfirmDialog` keyboard
  behaviour, `PoolDistributionBar`, `RouteError`, and previously-untested
  presentational components (`Spinner`, `StatCard`, `EmptyState`).

## [0.5.0]

### Added

- **Sorting:** the anchors table (Anchor / Registered / Status) and the pools
  table (Asset / Total liquidity / Anchors) are now sortable, matching the
  settlements table.
- **Search:** a client-side search box on the anchors panel (matches id/name)
  and the settlements panel (matches id/anchor/asset), layered on top of the
  existing status filter tabs and sortable columns.
- **Confirmation dialogs:** deactivating an anchor or cancelling a settlement
  now opens a `ConfirmDialog` instead of firing immediately, on both the list
  panels and their detail pages.
- **Wallet:** the mock wallet connection is persisted to `localStorage`, so a
  connected account survives a page refresh.
- **Tests:** component coverage for `AnchorTable`/`PoolTable` sorting,
  `ConfirmDialog`, `AnchorForm`/`SettlementForm` validation, the
  `matchesQuery` search helper, and wallet session persistence.

## [0.4.0]

### Added

- **Detail pages:** `/anchors/[id]` and `/settlements/[id]`, showing full
  record detail (status, dates, fees) with their own deactivate/execute/cancel
  actions, linked from the anchors and settlements tables.
- **API clients:** `fetchAnchor` and `fetchSettlement` single-record lookups
  against `GET /api/v1/anchors/:id` and `GET /api/v1/settlements/:id`.
- **Sorting:** a reusable `useSortableData` hook, and sortable Anchor / Amount
  / Status columns on the settlements table.
- **Tests:** component-level coverage with React Testing Library under a
  jsdom Vitest environment (`StatusBadge`, `ToastProvider`,
  `SettlementTable`), plus coverage for `useSortableData` and the new API
  client methods.

## [0.3.0]

### Added

- **Settlements:** "Load more" pagination over `/api/v1/settlements`, paging
  through `?page=`/`?pageSize=` instead of fetching the full list up front.
- **Validation:** inline, field-level error messages on `AnchorForm` and
  `SettlementForm` instead of silently ignoring an invalid submission.
- **Toasts:** an app-wide `ToastProvider`/`useToast` notification stack,
  surfacing success and error feedback for register, deactivate, open,
  execute and cancel actions.
- **Anchors:** client-side status filter tabs (All / Active / Inactive) over
  the fetched anchor list.
- **Loading UX:** an animated `TableSkeleton` in place of a bare "Loading…"
  line for the anchors, settlements and pools tables.
- **Tests:** Vitest coverage for settlement pagination and the toast stack
  helpers.

## [0.2.0]

### Added

- **Pages:** `/anchors` (register, list, deactivate) and `/settlements` (open,
  execute, cancel), plus a live metrics bar on `/dashboard`.
- **API clients:** anchors, settlements and metrics clients on a shared
  `apiRequest` helper.
- **Wallet:** a mock wallet connect (`WalletProvider`, `useWallet`,
  `ConnectButton`) in the header.
- **Hooks:** `useAsync` (with silent `refresh`) and `useInterval` for polling.
- **UI:** StatusBadge, Spinner, EmptyState, tables, forms and panels for anchors
  and settlements; shared site footer.
- **Tests:** Vitest coverage for the API clients and formatting/wallet helpers.

## [0.1.0]

### Added

- Initial landing page and a liquidity dashboard with pools and a routing quote
  form, backed by a typed API client and Vitest setup.
