# Pennywick

[![Expo](https://img.shields.io/badge/Expo-React%20Native-000020?logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Drizzle%20ORM-003B57?logo=sqlite)](https://orm.drizzle.team/)
[![Backend](https://img.shields.io/badge/Backend-PocketBase-B8DBE4)](https://pocketbase.io/)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS-lightgrey)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

A fast, private expense tracker that works with no signup, no signal and no spreadsheet. Project 2 of a mobile portfolio track.

The problem behind most abandoned budget apps: logging is slow, so people stop, and the data that would help them never exists. Pennywick makes logging a three-tap job and then does the boring part — totals, budgets and trends — instantly and correctly.

<!-- Add after build: docs/media/demo.gif and screenshots (home, add keypad, insights, budgets, dark theme, history) -->

---

## Architectural Core: The Three Pillars

Pennywick is designed around three foundational principles documented in `docs/ARCHITECTURE.MD`:

### 1. Local-First: SQLite Is the Source of Truth

Every screen reads from the local database. Nothing waits on the network. The app is fully functional without an account or internet connection.

- **SQLite** via Drizzle ORM is the authoritative store for all transactions, categories, budgets and recurring rules.
- **PocketBase** is an optional backup and sync target — rebuildable from local data on first sign-in.
- **Write order:** Local DB first (entity + cached totals + outbox row, all in one transaction). Server push second. A network failure means the entry is saved; sync catches up later.

| Divergence | Harm | Handling |
|---|---|---|
| On server, deleted locally | None — pull applies the tombstone | Self-healing |
| In local DB, not on server | **Real** — entry unsaved remotely | Outbox retry with backoff |

### 2. Cached Totals: Same Transaction, Always Consistent

The core correctness guarantee — summaries never disagree with entries — is enforced by a single database transaction, not by eventual recalculation:

```
BEGIN;
-- Insert/update/delete the transaction row
-- Recompute affected (month_key, category_id, kind) buckets from source rows
-- If signed in: insert outbox row
COMMIT;
```

Recomputing from source (not applying deltas) is idempotent, handles every operation uniformly, and cannot drift. A test runs **1,000 random operations** and asserts the cache equals a brute-force `rebuildAll()`.

### 3. Money Is Exact Integers

Amounts are stored as integer minor units (kobo/cents). Floats never touch stored amounts. `0.1 + 0.2` style drift is impossible. Formatting to display units happens only at the edges via `MoneyText`.

---

## Additional Systems

- **Deterministic IDs:** Seeded categories use fixed IDs (`seed` + slug); recurring entries use `rc` + SHA-256(`ruleId:YYYY-MM-DD`). Two devices generating the same occurrence produce the same record — sync merges, never duplicates.
- **Outbox Sync with Coalescing:** Create+updates → one create. Create+delete (unsynced) → both dropped. Drain in dependency order (categories first). Backoff: `min(300s, 2s × 2^attempts)` ±20% jitter.
- **Account Guard:** `sync_owner_id` prevents silently merging two people's finances. Different account → "Replace local data or cancel?"
- **Recurrence Engine:** Weekly and monthly rules generate entries on launch/foreground with deterministic IDs. Day 31 clamps to month end. Catch-up capped at 366 per rule per run.
- **CSV Export:** Formula-injection-safe (`=+\-@` cells prefixed with `'`), proper quoting, `\r\n` line endings.
- **Privacy Mode:** Eye icon hides all amounts everywhere. No analytics SDKs. Nothing leaves the phone unless the user signs in.

---

## System Architecture

```
  user ─ add ──▶ ┌───────────────────────────┐
                 │ Repositories                │  one transaction: entity write,
                 │ (transactions, categories,  │  bucket recompute, outbox insert
                 │  budgets, recurring_rules)  │
                 └──────────┬──────────────────┘
                            │
              ┌─────────────┼─────────────────┐
              ▼             ▼                  ▼
     ┌──────────────┐ ┌──────────────┐  ┌──────────────┐
     │ SQLite        │ │ monthly_     │  │ Outbox       │
     │ (Drizzle ORM) │ │ totals       │  │ (if signed   │
     │ source of     │ │ (cache,      │  │  in only)    │
     │ truth         │ │  local only) │  └──────┬───────┘
     └──────┬───────┘ └──────────────┘         │
            │                            sync engine
     live queries                     (push + pull + merge)
            │                                  │
            ▼                                  ▼
     ┌──────────────┐               ┌──────────────────┐
     │ React Native  │               │ PocketBase API    │
     │ UI (Expo)     │               │ (optional server) │
     └──────────────┘               └──────────────────┘
```

---

## Project Structure

```
pennywick/
├── app/                         Expo Router routes (screens only)
│   ├── (onboarding)/welcome.tsx
│   ├── (tabs)/index.tsx         Home
│   ├── (tabs)/history.tsx
│   ├── (tabs)/insights.tsx
│   ├── (tabs)/budgets.tsx
│   ├── add.tsx                  Modal
│   └── settings/               index, categories, recurring, account, sync
├── src/
│   ├── db/
│   │   ├── schema.ts            Drizzle schema (all tables)
│   │   ├── client.ts            expo-sqlite + Drizzle setup
│   │   ├── migrations/          Generated by drizzle-kit
│   │   ├── repositories/        transactions, categories, budgets, recurring,
│   │   │                        settings, outbox
│   │   └── aggregates.ts        recomputeBuckets, rebuildAll
│   ├── domain/                  Pure logic (no I/O)
│   │   ├── money.ts             parseAmount, formatMoney (integer minor units)
│   │   ├── dates.ts             Local dates, monthKey, boundaries
│   │   ├── recurrence.ts        Occurrence generator, deterministic IDs
│   │   ├── budgets.ts           Status thresholds (onTrack/watch/over)
│   │   ├── insights.ts          Shares, percent change, top 8 + Other
│   │   └── quickEntry.ts        Frequent-entry suggestion queries
│   ├── sync/                    Only active when signed in
│   │   ├── engine.ts            Orchestrator: debounced requestSync
│   │   ├── outbox.ts            Coalescing logic
│   │   ├── push.ts              Drain with dependency order
│   │   ├── pull.ts              Cursor-based pull, 200/page
│   │   ├── backoff.ts           Exponential backoff with jitter
│   │   ├── merge.ts             LWW merge, skip pending outbox records
│   │   └── status.ts            Derived sync status
│   ├── api/
│   │   ├── pb.ts                PocketBase JS SDK client
│   │   ├── auth.ts              Signup, login, refresh, logout
│   │   └── errors.ts            Error taxonomy + Result<T, AppError>
│   ├── features/                Per-feature hooks and components
│   ├── ui/
│   │   ├── theme/               Design tokens (light + dark), token types
│   │   ├── components/          Button, TextField, Chip, Screen, MoneyText,
│   │   │                        Toast, EmptyState, EntryRow, DayHeader, etc.
│   │   └── charts/              DonutChart, DailyBars (custom SVG)
│   ├── lib/
│   │   ├── id.ts                UUID + deterministic ID helpers
│   │   ├── clock.ts             Monotonic now() for LWW timestamps
│   │   ├── logger.ts            Logger interface (no PII)
│   │   └── csv.ts               CSV builder with injection protection
│   └── data/
│       ├── defaultCategories.ts Fixed-ID seed categories
│       └── currencies.ts        Supported currencies
├── backend/
│   ├── PB_VERSION               Pinned PocketBase version
│   ├── pb_hooks/                Conflict guard, validation hooks
│   └── pb_migrations/           Collections and API rules as code
├── docs/
│   ├── PRD.MD                   Problem, scope, user stories
│   ├── DESIGN.MD                UI/UX, tokens, screen specs
│   ├── ARCHITECTURE.MD          Data model, sync, errors, performance
│   ├── STORY.MD                 Engineering narrative + interview pitch
│   ├── DEMO.MD                  Demo script and recording guide
│   └── CURSOR_CONTEXT.MD        AI agent build instructions
├── .env.example
├── package.json
└── README.MD                    This file
```

---

## Getting Started

### Prerequisites

- Node.js LTS and npm
- Android emulator or a phone with Expo Go
- PocketBase binary (pinned version in `backend/PB_VERSION`) — only needed for the optional sync feature

### 1. Run the App (local-only, no backend needed)

```bash
npm install
cp .env.example .env
npx expo start
```

Scan the QR code with Expo Go, or press `a` for Android emulator / `i` for iOS simulator.

### 2. Run the Backend (optional, for backup and sync)

```bash
cd backend
./pocketbase superuser create you@example.com 'choose-a-strong-password'
./pocketbase serve --http=0.0.0.0:8090
```

Migrations and hooks in `pb_migrations` and `pb_hooks` are applied automatically.

Set `EXPO_PUBLIC_API_URL` in `.env`:

| Device | URL |
|---|---|
| Android emulator | `http://10.0.2.2:8090` |
| Phone on same Wi-Fi | `http://<your-LAN-IP>:8090` |
| Phone over USB (`adb reverse tcp:8090 tcp:8090`) | `http://localhost:8090` |

Use HTTPS for anything beyond local demos.

### 3. Run Tests

```bash
npm test
```

---

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Start Expo dev server |
| `npm test` | Run unit and integration tests |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a Drizzle migration after schema changes |

---

## API Endpoints (PocketBase)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| **Auth** | | | |
| `POST` | `/api/collections/users/records` | — | Create account |
| `POST` | `/api/collections/users/auth-with-password` | — | Login (returns token) |
| `POST` | `/api/collections/users/auth-refresh` | Token | Refresh auth token |
| **Categories** | | | |
| `GET` | `/api/collections/categories/records` | Token | List categories (owner-scoped) |
| `POST` | `/api/collections/categories/records` | Token | Create category |
| `PATCH` | `/api/collections/categories/records/{id}` | Token | Update category |
| **Transactions** | | | |
| `GET` | `/api/collections/transactions/records` | Token | List (filterable by month_key, category) |
| `POST` | `/api/collections/transactions/records` | Token | Create transaction |
| `PATCH` | `/api/collections/transactions/records/{id}` | Token | Update transaction |
| **Budgets** | | | |
| `GET` | `/api/collections/budgets/records` | Token | List budgets |
| `POST` | `/api/collections/budgets/records` | Token | Create budget |
| `PATCH` | `/api/collections/budgets/records/{id}` | Token | Update budget |
| **Recurring Rules** | | | |
| `GET` | `/api/collections/recurring_rules/records` | Token | List rules |
| `POST` | `/api/collections/recurring_rules/records` | Token | Create rule |
| `PATCH` | `/api/collections/recurring_rules/records/{id}` | Token | Update rule |

All collections support PocketBase filter, sort, and pagination query parameters.

---

## Test Suite

The test suite proves each architectural claim by running it:

```bash
npm test
```

| Test | Claim |
|---|---|
| `parseAmount` and `formatMoney` | Integer minor units only; no float drift |
| Date helpers | Month ends, leap years, week start Monday, timezone stability |
| Recurrence generation | Catch-up after 40 days; day 31 → Feb 28/29; deterministic IDs stable |
| Budget status | On track < 0.8, Watch 0.8–1.0, Over > 1.0 |
| Insights math | Shares, percent change, top 8 + Other grouping |
| CSV escaping | Formula injection blocked; quoting correct |
| Backoff and jitter | Exponential growth, cap at 300s, ±20% jitter |
| Outbox coalescing | Create+update → create; create+delete → drop; update+delete → delete |
| Aggregate consistency | 1,000 random ops → cached totals = `rebuildAll()` output |
| Sync engine | Fake server + injected failures (network, 500, 429, 401, 409, duplicate, crash) |

---

## Postman Collection

A complete Postman test collection covering all API areas with happy paths and edge cases:

```
docs/pennywick.postman_collection.json
```

Import into Postman, or run via Newman CLI:

```bash
newman run docs/pennywick.postman_collection.json \
  --env-var "baseUrl=http://localhost:8090"
```

---

## Design Decisions (Settled — Don't Relitigate)

1. **Money is integer minor units.** Never store or sum floats. Convert at the edges only.
2. **Dates are local calendar strings.** Entries store `YYYY-MM-DD` in the user's local timezone. Never derive a day from UTC.
3. **Cached totals recomputed in the same transaction.** Idempotent, uniform for all operations, cannot drift.
4. **Optional account.** Time-to-value is the first screen, not a signup form.
5. **Reuse the Hearthlist outbox sync pattern.** Proven design; shows the pattern generalizes.
6. **Single LWW timestamp per record.** Single-user data; low conflict risk.
7. **Deterministic IDs for seeds and recurring entries.** Cross-device idempotency.
8. **Custom SVG charts.** Smaller bundle, full control, accessible.
9. **Soft deletes.** Deletions must propagate across devices.
10. **No SMS or bank import.** Privacy, store-policy risk and fragility. Manual logging made fast instead.

---

## Known Limitations

- One currency per account (changing currency does not convert existing amounts)
- The local database is not encrypted at rest; optional app lock protects the UI only
- Last-write-wins per record; a rare edit of the same transaction on two devices keeps the later edit
- Clock skew between devices can lose ties (documented)
- No bank or SMS import (intentionally, for privacy and store-policy reasons)
- No push notifications
- Single-node PocketBase backend

---

## Roadmap (V2)

- Local notifications at 80% and 100% of a budget
- Receipt photo attachment
- Encryption at rest
- Multiple currencies per account
- Tags/labels for cross-category grouping
- Backend migration to Go or Python with Postgres
- Home screen widgets
- Split transactions across categories

---

## Documentation

| Doc | Contents |
|---|---|
| [PRD.MD](docs/PRD.MD) | Problem, scope, user stories, acceptance criteria |
| [DESIGN.MD](docs/DESIGN.MD) | UI/UX, tokens, screen specifications, patterns |
| [ARCHITECTURE.MD](docs/ARCHITECTURE.MD) | Data model, derived data, recurrence, sync, errors, performance |
| [STORY.MD](docs/STORY.MD) | Engineering narrative, interview pitch, tags |
| [DEMO.MD](docs/DEMO.MD) | Demo script and recording guide |
| [CURSOR_CONTEXT.MD](docs/CURSOR_CONTEXT.MD) | AI agent build instructions and rules |

---

## License

MIT
