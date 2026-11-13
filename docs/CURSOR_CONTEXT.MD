# Pennywick: Agent Context (Cursor)

Read this file, `docs/architecture.md`, `docs/prd.md` and `docs/design.md` before writing code. Work one task at a time from section 12. After each task, stop, summarize what changed, and wait for the next instruction.

## 1. Project snapshot

Pennywick is a local-first expense tracker. React Native (Expo, TypeScript strict). SQLite (Drizzle) is the source of truth. Cached monthly totals are kept consistent in the same transaction as every write. An optional account syncs through a custom outbox to a PocketBase backend. No paid services, no analytics SDKs.

If the Hearthlist repository's `src/sync` folder is available to you, copy and generalize it for this project (entity types: category, transaction, budget, recurring_rule). If it is not available, implement the sync design in `docs/architecture.md` section 6.

## 2. Non-negotiable rules

1. **Money is integer minor units.** Never store or sum floats. Convert at the edges with `src/domain/money.ts` only.
2. **Dates are local calendar strings.** Entries store `occurred_on` as `YYYY-MM-DD` in the user's local timezone and a derived `month_key` (`YYYY-MM`). Never derive an entry's day from UTC.
3. UI code never calls the network. Only `src/sync` and `src/api` touch PocketBase.
4. UI code never writes tables directly. All writes go through repositories in `src/db/repositories/`.
5. Every repository write runs in **one transaction**: entity change, recompute of affected `monthly_totals` buckets, and (if signed in) an outbox row.
6. UI reads via Drizzle live queries. No fetching in components.
7. Tokens live in `expo-secure-store` only.
8. No new dependency without a one-line justification and my approval.
9. No raw color, spacing or font-size literals in components; use tokens from `src/ui/theme`.
10. No `any`. No `// @ts-ignore` without an explanatory comment and my approval.
11. Minimal diffs when editing existing files; do not rewrite whole files or reformat unrelated code.
12. Do not invent library APIs. If unsure, read the installed package types or docs and say what you checked.
13. Never log amounts, notes or emails. Log ids and error classes only.
14. No silent TODOs. State anything deferred in your summary.

## 3. Tech stack and install policy

- Expo (current SDK), Expo Router, TypeScript strict
- Install Expo-compatible packages with `npx expo install <pkg>`
- Data: `expo-sqlite`, `drizzle-orm`, `drizzle-kit`; open DB with change listeners enabled for live queries (verify against installed versions); follow Drizzle's Expo SQLite migration guide
- UI state: Zustand (UI-only: toasts, sheet state, theme, privacy flag cache)
- Lists and charts: `@shopify/flash-list`, `react-native-svg` (custom donut and bars), `react-native-reanimated`, `react-native-gesture-handler`, `expo-haptics`
- Secure and system: `expo-secure-store`, `@react-native-community/netinfo`, `expo-crypto` (SHA-256 for deterministic IDs), `expo-file-system` and `expo-sharing` (CSV), `expo-local-authentication` (P2 only)
- Network: PocketBase JS SDK with URL polyfill
- Tests: Jest (`jest-expo` where RN is needed; plain Jest for pure logic)
- Lint and format: ESLint, Prettier

## 4. Folder structure

```text
app/                        routes only
  (onboarding)/welcome.tsx
  (tabs)/index.tsx          Home
  (tabs)/history.tsx
  (tabs)/insights.tsx
  (tabs)/budgets.tsx
  add.tsx                   modal
  settings/index.tsx, categories.tsx, recurring.tsx, recurring-edit.tsx, account.tsx, sync.tsx
src/
  db/
    schema.ts, client.ts, migrations/
    repositories/           transactions.ts, categories.ts, budgets.ts, recurring.ts, settings.ts, outbox.ts
    aggregates.ts           recomputeBuckets, rebuildAll
  domain/                   money.ts, dates.ts, recurrence.ts, budgets.ts, insights.ts, quickEntry.ts
  sync/                     engine.ts, outbox.ts, push.ts, pull.ts, backoff.ts, merge.ts, status.ts
  api/                      pb.ts, auth.ts, errors.ts
  features/                 per-feature hooks and components
  ui/                       theme, components, charts
  lib/                      id.ts, clock.ts, logger.ts, csv.ts
  data/                     defaultCategories.ts, currencies.ts
backend/
  pb_hooks/, pb_migrations/
docs/
```

## 5. Data and architecture rules

- Schema is in `docs/architecture.md` section 4. Amounts: `amount_minor INTEGER` (always positive; `kind` is `expense` or `income`).
- `monthly_totals` is a cache keyed by (`month_key`, `category_id`, `kind`). It is **local only** (never synced). After any change to transactions (local write or sync merge), call `recomputeBuckets(tx, affectedKeys)` which re-sums from source rows for each affected key. An edit that changes month, category or kind affects both old and new keys.
- `rebuildAll()` recomputes everything; use after migrations or sync imports and in tests as the oracle.
- Seeded categories use fixed IDs (see `src/data/defaultCategories.ts`): `seed` + slug padded with `0` to 15 lowercase alphanumeric characters. All devices seed identical rows.
- Recurring-generated entries use deterministic IDs: `rc` + first 13 hex chars of SHA-256(`ruleId:YYYY-MM-DD`). Creating the same occurrence twice must be a no-op.
- Timestamps for LWW (`updated_at`) use `now()` from `src/lib/clock.ts` (monotonic per device, integer ms). Do not call `Date.now()` for stored timestamps.
- "Today" and month boundaries come from `src/domain/dates.ts` using local time; weeks start Monday.

## 6. Sync rules (only when signed in)

- Entities: category, transaction, budget, recurring_rule. One LWW timestamp (`updated_at`) per record.
- Outbox: coalesce before drain (create+updates becomes one create; create+delete for unsynced entity drops both; updates+delete becomes delete). Process in `seq` order, categories first, then rules and budgets, then transactions.
- Retryable (network, timeout, 5xx, 429): backoff base 2 s, factor 2, jitter plus or minus 20%, cap 5 minutes; stop the drain to preserve order. Permanent (400, 403, 422): park the op, continue. 401: refresh once, then flag "needs sign-in" and keep local use intact. 409 `stale_write`: fetch server record, apply, drop op. Duplicate create: GET and treat as success. Delete 404: success.
- Pull with `updated >= cursor`, sorted `updated,id`, 200 per page, idempotent apply. Skip entities with pending outbox ops. After applying a page, recompute affected buckets in the same transaction.
- Account guard: store `sync_owner_id` in settings. Signing in as a different user than `sync_owner_id` must prompt "Replace local data or cancel" and never merge silently.
- First sign-in with local data: enqueue creates for all non-seed records and any modified seed rows; seeds unchanged since install are skipped.
- Sync starts after first interactive render, never at module load.

## 7. Error handling rules

- Use `Result<T, AppError>` in repositories and API wrappers.
- Map errors via `src/api/errors.ts` to: `network`, `transient`, `auth`, `forbidden`, `validation`, `conflict`, `notFound`, `local`, `unknown`.
- UI never shows raw error strings; use microcopy from `docs/design.md`.
- Each route exports an Expo Router `ErrorBoundary`.
- Local DB failure shows a recovery screen with a Restart action; never auto-delete data.

## 8. UI rules

- Follow `docs/design.md` exactly: tokens, 48 dp targets (keypad keys at least 64 x 56), tabular digits for money, calm copy.
- `MoneyText` is the only component that formats currency; it respects privacy mode and provides an accessibility label in words.
- Every control has `accessibilityRole`, label and state. Respect reduce motion.
- History uses FlashList over a flattened array (day headers as items), memoized rows, stable keys.
- Charts are custom SVG components with text alternatives; render only when focused.

## 9. Domain behaviors (specify exactly)

- `parseAmount` and keypad input: digits and one decimal separator, max 2 decimal places, max 12 integer digits; empty equals zero; backspace removes one char.
- `formatMoney(minor, currency)`: own formatter with thousands grouping and currency symbol; do not rely solely on `Intl`.
- Budget status: spent / limit below 0.8 is `onTrack`, 0.8 up to and including 1.0 is `watch`, above 1.0 is `over`; show "N left" or "N over".
- Recurrence: weekly (weekday) and monthly (day of month, clamped to the month's last day). On launch and on foreground, generate all missing occurrences from `last_generated_on` (or `start_on`) through today, capped at 366 per rule per run.
- Month comparison: percent change versus previous month; if previous is zero show "No spending last month".
- CSV: header row; columns `date,kind,category,amount,note`; amounts as decimal strings; quote every text field and double inner quotes; for any text cell beginning with `=`, `+`, `-` or `@`, prefix a single quote. Use `\r\n`.

## 10. Testing rules

- Pure modules first, with tests before use: money, dates, recurrence, budgets, insights, quickEntry, csv, backoff, outbox coalescing, merge.
- **Aggregate consistency test:** run 1,000 random operations (add, edit amount, edit category, edit date across months, delete, undo) against an in-memory database or a faithful fake; after each batch assert `monthly_totals` equals `rebuildAll()` output. If SQLite cannot run in Jest here, test the bucket recompute logic against an in-memory model of the same SQL semantics and say so.
- Recurrence tests: catch-up after 40 days, day 31 in February, repeated generation is a no-op, deterministic ID stability.
- Sync integration test with a fake server and injected failures (network, 500, 429, 401, 409, duplicate create, crash between success and outbox delete).
- Run `npm run typecheck`, `npm run lint`, `npm test` before declaring a task done.

## 11. Code style

- TypeScript strict; explicit return types on exported functions
- Components `PascalCase.tsx`; other files `camelCase.ts`; alias `@/` maps to `src/`
- Small functions; comments explain why
- Conventional Commits, one commit per task

## 12. Build order

Each task is done only when its acceptance check passes.

| Task | Work | Acceptance |
|---|---|---|
| T1 | Scaffold Expo app, strict TS, Expo Router, ESLint, Prettier, alias | App boots; typecheck and lint pass |
| T2 | Theme tokens (light and dark), base components (`Button`, `TextField`, `Chip`, `Screen`, `EmptyState`, `MoneyText`, `Toast`) | Both themes render; no raw literals |
| T3 | Drizzle schema, client, migration, seed default categories with fixed IDs | DB created on first launch; seeds identical across installs |
| T4 | `money`, `dates`, `clock`, `id`, `logger`, `errors`, `csv` with tests | Tests pass |
| T5 | Repositories for transactions, categories, budgets, settings with `recomputeBuckets` in the same transaction; `rebuildAll` | Aggregate consistency test passes |
| T6 | Onboarding (currency) and Home (hero, top categories, recent, privacy toggle) | Works offline; empty state correct |
| T7 | Add modal: keypad, kind switch, category chips, date chip, save | Entry appears instantly; totals update |
| T8 | History: FlashList, day groups, search, filters, entry sheet, delete with undo | Edit across months updates both months' totals |
| T9 | Categories management (add, rename, recolor, reorder, archive) | Cannot delete a used category |
| T10 | Budgets screen and status logic | All three states visible |
| T11 | Insights: month picker, donut, daily bars, comparison | Matches `monthly_totals`; empty month handled |
| T12 | Recurrence engine, rules screens, launch and foreground catch-up | Recurrence tests pass; no duplicates |
| T13 | Settings: currency, theme, privacy default, CSV export | Export opens share sheet; injection test passes |
| T14 | Frequent-entry chips | Chips appear after category selection |
| T15 | Backend: collections, API rules, conflict hook, migrations | Cross-user access rejected (manual) |
| T16 | PocketBase client, secure-store auth, optional sign in, `sync_owner_id` guard | Sign in as other account triggers prompt |
| T17 | Outbox, coalescing, backoff, push drain (generalize Hearthlist) | Integration tests pass for injected failures |
| T18 | Pull and merge with bucket recompute | Second device shows identical data and totals |
| T19 | `SyncChip` and sync center | All states reachable |
| T20 | Error boundaries, empty states, accessibility pass | Screen reader and 200% font checks pass |
| T21 | Dev demo-data loader; performance pass; measurements | Budgets recorded in `story.md` |
| T22 | App lock (P2) | Locks after 60 s in background |
| T23 | README, scripts, docs sync | New clone runs from README alone |

## 13. Definition of done (every task)

- Acceptance check passes
- `npm run typecheck`, `npm run lint`, `npm test` green
- No new dependency without approval
- No raw literals in UI; accessibility props present
- Summary lists files changed, decisions made, and anything deferred

## 14. Stop and ask when

- A requirement conflicts with a library's actual behavior
- A new dependency seems necessary
- The data model would need to change
- Hearthlist's sync code is unavailable and a design choice is unclear

## 15. Starter prompts

> "Read cursorcontext.md, architecture.md, prd.md and design.md. Do T1 only. Stop when its acceptance check passes and summarize."

> "Do T5. Before coding, list the bucket-affecting cases (add, edit amount, edit category, edit date across months, delete, undo) and the test you will write for each."