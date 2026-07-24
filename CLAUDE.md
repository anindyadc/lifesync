# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build to dist/
npm run lint      # ESLint (flat config, src/**/*.{js,jsx})
npm run preview   # Preview a production build locally
```

There is no test runner configured in this repo. Verify changes by running the app (`npm run dev`) and exercising the affected app module in the browser.

Local dev requires a `.env` file with `VITE_FIREBASE_*` keys (see `Readme.md` for the full list) pointing at a Firebase project with Authentication (Email/Password) and Firestore enabled.

## Architecture

LifeSync is a single-page React (Vite) app that hosts several independent "mini apps" behind one Firebase Auth + Firestore backend, gated by a per-user permission list.

### App shell and access control
- `src/App.jsx` is the shell: it listens to `onAuthStateChanged`, loads the user's profile document, and switches between mini apps via local `activeApp` state (no router — there's no routing dependency at all, view switching is plain state).
- User profiles live at `artifacts/default-app-id/public/data/userProfiles/{uid}` with `role` (`'user'` | `'admin'`) and `allowedApps` (array of app keys like `taskflow`, `walletwatch`). `isAllowed(appKey)` in `App.jsx`/`Sidebar.jsx` gates both the sidebar entry and the rendered component; admins bypass the check.
- `src/apps/admin/index.jsx` is the admin-only UI for toggling `role` and `allowedApps` on other users' profile docs.
- `src/components/Sidebar.jsx` and `App.jsx` duplicate the same nav/permission logic — when adding a new mini app, both files need the new case/button, plus `firestore.rules` and (if you want it enforced) `admin`'s `APPS_LIST`.

### Mini app module pattern
Each app under `src/apps/<name>/` is self-contained and follows the same shape:
- `index.jsx` — the app's root component, receives `user` as a prop, owns tab/view state.
- `hooks/use<Name>.js` — the only place that talks to Firestore for that app: sets up an `onSnapshot` listener scoped to `artifacts/default-app-id/users/{uid}/<collection>`, and exposes CRUD functions (`add*`, `update*`, `delete*`). Components never call Firestore directly.
- `components/` — presentational pieces specific to that app (forms, lists, charts, export/report views).
- Some apps have a second hook for exports, e.g. `hooks/useTaskExport.js`, `hooks/useExport.js` (CSV/PDF via `jspdf`/`jspdf-autotable`/`html2canvas`).

### Applications

- **TaskFlow** (`apps/taskflow`) — task manager with subtasks, per-task/subtask time logs (add/delete only, no direct edit — delete and re-add to change a log), manual or auto-computed progress, a month-navigable dashboard (stats, priority breakdown chart, report table), and a "My Tasks" list with status filtering. The `report` tab adds From/To date filtering that applies to both the on-screen table and CSV/PDF export (`hooks/useTaskExport.js`).
- **WalletWatch** (`apps/walletwatch`) — expense tracker. Transactions carry amount (sign-normalized: `reimbursement` category forces positive, everything else negative), category, custom free-text tags, a payment mode/account, and a group/event label. Supports a "settle" flow (`relatedTxn`) that links a reimbursement entry back to the original expense and marks it `settled`. Categories are user-editable labels stored in the `settings/walletConfig` doc (`constants.js` seeds the defaults and assigns colors from the validated `CATEGORICAL_PALETTE` by fixed creation-order slot, not a content hash); tag/group colors are deterministic via `getTagColor` in `lib/utils.js`. Two shared pure helpers live in `constants.js` (not a component file, so Fast Refresh doesn't choke on non-component exports): `isSettledSpend` (personal, non-pending, non-official spend — the definition of "spent" used by every KPI/total in the app) and `getAccountKey` (an expense's free-text account, or its Payment Mode's label as fallback). The Dashboard tab (`components/DashboardStats.jsx` + `OverviewCharts.jsx`) is a 4-tile KPI row (spend, pending reimbursement, avg daily, txn count, with a month-over-month delta) plus a mobile-first chart set — 6-month trend, 7-day outflow, a consolidated Category Breakdown, Payment Mode / By-Account breakdowns, and top Trips/Events — that collapses to a single column when a section has nothing to show rather than leaving an empty grid cell. The History tab (`components/TransactionList.jsx`) groups by month/event/individual with progressive "Show More" disclosure, and has its own filter toolbar: free-text search (description/tags/trip/account/category), a date range, multi-select checkbox-dropdown filters for Tags/Trips/Accounts (`MultiSelectFilter`, reused across all three) plus Payment Mode pill toggles, a sort control (date or amount, asc/desc), and its own CSV/PDF export scoped to whatever's currently filtered — the header's global export buttons (`index.jsx`) only render on the Dashboard tab now, since they're scoped to the Dashboard's selected month and would otherwise silently export the wrong data while browsing History. Month/event group headers show a Spent/Lent/Official split (via `isSettledSpend`) instead of a raw signed-amount sum. Row icons come from `CATEGORY_ICONS` (per default category id, falling back to `DEFAULT_CATEGORY_ICON` for custom categories) and a Payment Mode/Account badge. The Add/Edit modal (`components/TransactionForm.jsx`) is a dense, sticky-header/scrollable-body/sticky-footer sheet; its Trip/Tag/Account text fields are autocomplete comboboxes whose suggestion buttons need `onMouseDown={(e) => e.preventDefault()}` (not just `onClick`) — otherwise the input's `onBlur` fires and hides the list before the click registers, especially on mobile where the closing keyboard makes the race worse.
- **ChangeManager** (`apps/changemanager`) — infrastructure change log with list, per-server timeline, and archive views; supports search/filter by server or application name, CSV/PDF export of the filtered set, and archive/unarchive instead of hard delete for decluttering (hard delete is also available via a confirm modal).
- **IncidentLogger** (`apps/incidentlogger`) — incident tracking with priority (`low`/`medium`/`high`/`critical`) and status (`open`/`resolved`), a dedicated "resolve" modal that stamps `resolvedBy`/`resolvedDate`, edit/delete of existing incidents, CSV/PDF export (`hooks/useIncidentExport.js`), and search by server/application combined with the status filter. `index.jsx` talks to Firestore directly (its own `onSnapshot`/`addDoc` calls) rather than through a hook, unlike other apps — this is intentional here (the previously-dead `hooks/useIncidents.js` was removed).
- **Investment** (`apps/investment`) — tracks holdings (holder, type, name, maturity date) with list, maturity-calendar (`FullCalendar`), search/filter by holder or type, a small stats summary (`components/InvestmentStats.jsx`), and CSV/PDF export; amounts are AES-encrypted client-side before being written (see notes below).
- **MediWatch** (`apps/mediwatch`) — prescription/medicine tracker with active/archived filtering plus search by patient/doctor/disease, multi-page photo capture (mobile camera or gallery upload, capped at 8 photos per prescription), per-medicine dosage/frequency/duration and optional alternate name, relative tagging (Self/Spouse/Father/Mother/Child/etc.), CSV/PDF export, and "smart archiving" that auto-archives prior active prescriptions for the same patient+doctor+disease (trimmed/case-insensitive match) when a new one is added (`archiveOld` flag in `addPrescription`).
- **Admin** (`apps/admin`) — table of all user profiles with inline toggles for `role` (admin/user) and per-app `allowedApps` checkboxes, search by name/email, and an explicit per-row Save (changes are local state until saved).

### Firestore data layout
All app data is namespaced under a single fixed `appId` (`'default-app-id'`, defined in `src/lib/firebase.js` and re-declared per-hook — not imported consistently, so check the local `APP_ID`/`appId` constant when editing a hook):
- `artifacts/{appId}/public/data/userProfiles/{uid}` — profiles/permissions (public-readable to any authenticated user, admin-writable).
- `artifacts/{appId}/users/{uid}/{collectionName}/{docId}` — per-user, per-app data, one collection per app (e.g. `tasks`, `expenses`, `prescriptions`).
- `artifacts/{appId}/users/{uid}/settings/walletConfig` — WalletWatch's single settings doc (category definitions).

`firestore.rules` is the authoritative security model (the copy embedded in `Readme.md` is an older/manual version — trust the actual `firestore.rules` file). It uses one generic rule keyed on the `{appName}` path segment plus `hasAppPermission(appName)`, so a new app collection is automatically covered as long as its Firestore path segment matches the `allowedApps` entry name — no rule changes needed unless the path shape differs (as WalletWatch's `settings/walletConfig` does).

### Notable implementation details
- MediWatch stores prescription photos as compressed Base64 strings directly in Firestore documents (via `browser-image-compression`), not Firebase Storage — this was a deliberate choice to avoid Storage costs/config. A submit-time guard caps the total encoded payload well under Firestore's 1MiB document limit and the photo count at 8; `firebase/storage` is still used by `mediwatch`'s hook to delete Storage-backed URLs (legacy or removed-during-edit photos), never Base64 ones.
- Investment amounts are AES-encrypted client-side (`crypto-js`) before being written to Firestore (`amountEncrypted` field) and decrypted on read. The key comes from `VITE_INVESTMENT_SECRET_KEY` (see `Readme.md`'s env var list) — if unset, the hook falls back to an insecure placeholder and logs a console warning. Even configured, this is obfuscation against casual DB browsing, not real access control, since the key still ships in the client bundle. `decryptAmount` returns `null` (not `0`) when decryption fails or yields `NaN`, so UI code must handle a `null` amount as "undecryptable" distinctly from a real zero.
- Dates in Firestore are a mix of Firestore `Timestamp` and plain `'YYYY-MM-DD'` strings depending on the app/field; use the shared `safeGetDate` helper from `src/lib/utils.js` (Timestamp → `.toDate()`, `'YYYY-MM-DD'` string → local midnight, otherwise generic `new Date()`) instead of parsing dates ad hoc — a raw `new Date('YYYY-MM-DD')` parses as UTC and silently shows the wrong day for users east of UTC.
- Shared UI primitives (`src/components/ui/`, `src/lib/utils.js`'s `cn`) follow the shadcn/Radix + `tailwind-merge`/`clsx` convention; prefer reusing `cn()` and existing `components/ui/*` over new one-off className logic. `src/components/ConfirmModal.jsx` is the standard confirm-dialog component (accessible: focus-trap-on-open, Escape-to-close, backdrop click, busy-guard against double-submit) — WalletWatch has its own visually-distinct local variant (`apps/walletwatch/components/ConfirmModal.jsx`) with the same accessibility behavior; Investment uses the Radix-based `components/AlertDialog.jsx` instead. Prefer the shared one for any new destructive-action confirmation.
- Path alias `@` → `src/` is configured in `vite.config.js`.

## Deployment

- Deploys to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main` (no staging branch/environment currently). Firebase env vars are injected from GitHub Actions secrets at build time.
- `vite.config.js`'s `base: '/lifesync/'` must match the GitHub repo name — if the repo is renamed or forked, update this first or the deployed app 404s on assets.
- Version bumps use `npm version <major|minor|patch> -m "chore(release): %s"`; commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`).
