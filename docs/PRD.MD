# Pennywick: Product Requirements Document

| Field | Value |
|---|---|
| Owner | Francis Offiong |
| Status | Draft v1 |
| Track | Mobile portfolio, Week 1, Project 2 |
| Stack | React Native (Expo) |
| Build window | Sat 14 Nov to Sun 15 Nov 2026 (adjust if different) |
| Target ship | Sun 15 Nov 2026, 11 PM (hard stop) |

## 1. Summary

Pennywick is a fast, private expense tracker. It works fully offline with no account. Users log income and expenses in seconds, see where money goes, set category budgets and automate recurring entries. An optional account backs up and syncs data across devices.

## 2. Problem

Small everyday spending (cash, transfers, wallets) is easy to forget and slow to log, so people cannot say where their money went. Existing tools often demand signup, assume steady internet, or make logging a multi-step form. (Validate with 3 people before or during the build.)

## 3. Users

| Persona | Needs |
|---|---|
| Everyday spender | Log quickly, see totals and budgets, avoid overspending |
| Privacy-minded saver | No forced account, hide amounts, keep data on the phone |

## 4. Goals and non-goals

**Goals**
- G1. Logging an expense takes about 3 taps and under 5 seconds
- G2. Summaries (Home, Budgets, Insights) are instant and always consistent with entries
- G3. Money is exact (integer minor units), with correct local-date handling
- G4. All core features work offline with no account
- G5. Optional account syncs without loss or duplication
- G6. Fast and smooth on a low-end Android phone

**Non-goals**
- Bank or SMS import, open banking, payments
- Multiple currencies per account, currency conversion
- Shared or household budgets (that is Hearthlist territory)
- Receipt scanning, push notifications
- Encryption at rest

## 5. Scope and priorities

| Priority | Items |
|---|---|
| **P0** (must ship, fully local) | Onboarding with currency; seeded categories; add, edit, delete entries with keypad; History with search and day groups; Home summary; categories management; budgets with states; Insights (donut, daily bars, month compare); cached monthly totals with consistency test; empty and error states; docs |
| **P1** (should ship) | Recurring rules with idempotent generation; CSV export; privacy mode; dark theme; optional account with outbox push, pull and sync chip; frequent-entry chips; undo toasts |
| **P2** (if time allows) | App lock (biometric); sync center details; demo data loader; large-amount confirm; budget local notifications (stretch) |

**Cut order if behind schedule:** app lock, then dark theme, then frequent-entry chips, then sync center details, then Insights month comparison. Account sync stays P1 because the track requires a fullstack story; if time runs out, ship with push-only backup and say so in Known limitations.

## 6. User stories and acceptance criteria

| ID | Story | Acceptance criteria | Pri |
|---|---|---|---|
| US-01 | As a new user, I can start without an account | First launch asks only for currency, then shows Home; no signup | P0 |
| US-02 | I can log an expense quickly | Add flow: keypad amount, category tap, Save; entry appears instantly; works offline | P0 |
| US-03 | I can log income | Segmented control switches kind; income appears in totals and History | P0 |
| US-04 | Amounts are exact | 0.1 + 0.2 style inputs total exactly; tests cover rounding and large values | P0 |
| US-05 | I can set the entry date | Defaults to today (local); can pick Yesterday or any date; month changes recalc totals | P0 |
| US-06 | I can edit and delete entries | Edit via sheet with autosave; delete with 5 s undo | P0 |
| US-07 | I can browse and search History | Day-grouped, daily subtotals, search by note or category, filter by kind, category, date range | P0 |
| US-08 | I can see this month at a glance | Home shows spent, income, left, top categories, recent entries; updates instantly | P0 |
| US-09 | I can manage categories | Add, rename, recolor, reorder, archive; cannot delete a category with entries (archive instead) | P0 |
| US-10 | I can set monthly budgets | Per-category limit; states On track, Watch (80% or more), Over; "N left" or "N over" | P0 |
| US-11 | I can see insights | Month picker; category donut with legend; daily bars; comparison with previous month; empty-month state | P0 |
| US-12 | Summaries never disagree with entries | Test: after random add, edit, delete and move-month operations, cached totals equal brute-force totals | P0 |
| US-13 | I can automate recurring entries | Weekly or monthly rules; generated on launch and foreground catch-up; no duplicates; day 31 clamps to month end | P1 |
| US-14 | I can export my data | CSV share sheet; correct quoting; formula-injection-safe; includes category names and dates | P1 |
| US-15 | I can hide amounts | Eye icon masks amounts everywhere; setting persists | P1 |
| US-16 | I can use dark theme | System, light, dark; applies instantly | P1 |
| US-17 | Frequent entries are one tap | After choosing a category, up to 3 chips with common note and amount prefill the form | P1 |
| US-18 | I can optionally sign in to back up and sync | Sign up or in from Settings; local data uploads; chip shows state; app stays fully usable without it | P1 |
| US-19 | Sync is safe | Killing the app mid-sync loses nothing; retries use backoff; duplicates impossible (client IDs, idempotent creates) | P1 |
| US-20 | Another device sees my data | Sign in on a second device pulls all entries, categories, budgets and rules | P1 |
| US-21 | Accounts never mix silently | Signing in as a different account than the one tied to local data prompts to replace or cancel | P1 |
| US-22 | I can lock the app | Optional biometric lock after 60 s in background | P2 |
| US-23 | I can demo with fictional data | Dev-only loader creates about 3 months of data | P2 |
| US-24 | The app is accessible | Labels, roles, 48 dp targets, 200% font scale, money read as words | P0 |

## 7. Functional requirements

- FR-1. Every read comes from local SQLite; no screen blocks on network
- FR-2. Money is stored as integer minor units; floats never touch stored amounts
- FR-3. Entry dates are local `YYYY-MM-DD`; `month_key` is derived and stored
- FR-4. Every entry write recomputes affected `monthly_totals` buckets in the same transaction
- FR-5. Sync is opt-in; when signed in, each write also inserts an outbox row in the same transaction
- FR-6. Client generates IDs; seeded categories and generated recurring entries use deterministic IDs
- FR-7. Deletes are soft (tombstones)
- FR-8. Retries use exponential backoff with jitter; permanent errors are parked
- FR-9. Auth tokens are stored in the secure store
- FR-10. API rules restrict each user to their own records

## 8. Non-functional requirements

| Area | Requirement (targets, measure on a release build on a low-end Android phone) |
|---|---|
| Startup | Cold start to interactive under 2 s |
| Add flow | Save reflected in UI under 100 ms; add flow under 5 s of user time |
| Scrolling | 60 fps in History with 5,000 entries |
| Size | Release APK under 40 MB |
| Correctness | 0 mismatches in the aggregate consistency test; money tests pass |
| Offline | All P0 flows pass in airplane mode |
| Security | Token in secure store; owner-scoped API rules; CSV injection mitigated; no secrets in repo |
| Privacy | No analytics SDKs; nothing leaves the phone unless the user signs in |
| Accessibility | WCAG AA contrast targets; screen reader labels; 200% font scale |

## 9. Success criteria

- [ ] Add flow measured: taps and seconds recorded in `story.md`
- [ ] Aggregate consistency test passes over 1,000 random operations
- [ ] Recurrence tests pass (catch-up, month-end clamp, idempotency)
- [ ] Airplane-mode test: 20 offline entries sync with 0 lost and 0 duplicated
- [ ] Performance budgets measured and recorded
- [ ] All seven docs complete and the demo recorded

## 10. Schedule

| When | Work | Done when |
|---|---|---|
| Fri evening | Docs done, backend collections drafted | `cursorcontext.md` ready for the agent |
| Sat AM | Scaffold, theme, Drizzle schema, utilities with tests, repositories with aggregates | T1 to T5 pass |
| Sat midday | Home, Add keypad, History, edit and undo, categories | Fully usable offline, single device |
| Sat PM | Budgets, Insights, aggregate consistency test | All P0 stories pass |
| Sun AM | Recurring, CSV, privacy mode, dark theme; backend, auth, push and pull | Two devices converge |
| Sun midday | Sync status, error boundaries, accessibility pass | P1 stories pass |
| Sun PM | Performance measurement, docs sync, demo recording | Everything recorded |
| Sun 11 PM | **Hard stop.** Unfinished items go to Known limitations | Shipped |

Week 2 (Flutter) starts Monday; there is no buffer day.

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scope too large for two days | Miss the ship date | Strict P0 first, cut order in section 5, local-only version is shippable on its own |
| Custom keypad polish eats time | Delays Add flow | Build plain keypad first, polish after Home and History work |
| Date and month edge cases | Wrong totals | Pure date helpers with tests before any UI |
| Sync work duplicates Hearthlist effort | Lost time | Copy and generalize the Hearthlist sync core; do not redesign it |
| Drizzle plus Expo SQLite friction | Lost hours | Same setup as Hearthlist; reuse its config |
| Hermes Intl differences for currency formatting | Wrong display | Own formatter with grouping separators; test on device |

## 12. Assumptions and open questions

- Assumption: one device ordinarily active; at most 2 devices per account
- Assumption: under 20,000 entries per user
- Question: should budgets roll over unspent amounts? (MVP: no)
- Question: should "Left" use income or total budget? (MVP: income minus expenses, and budgets shown separately)

## 13. Future

Budget notifications, receipt photos, encryption at rest, multiple currencies, backend move to Go or Python with Postgres.