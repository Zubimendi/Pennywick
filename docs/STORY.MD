# Pennywick: Story

## The problem

Ask someone where their money went this month and you often get a shrug. Much of everyday spending is small, fast and spread across cash, transfers and wallets: a bike ride, airtime, pepper and tomatoes, a power token. Bank apps only see part of it. Spreadsheets get abandoned because opening one at a bus stop is a chore. Most trackers either need an account up front or fall apart when the network does.

The result is not a lack of discipline, it is friction. If logging takes more than a few seconds, people stop, and the data that would help them never exists.

## Who it's for

- **The everyday spender:** wants to know where the money goes and stay inside a budget, with the least possible effort.
- **The privacy-minded saver:** does not want to hand financial data to a stranger's server just to log a bus fare.

(Validation note, fill in after talking to 3 people: how do they track spending today, why did they stop, what would make them keep going.)

## Honest framing

Expense trackers are a crowded category, and this one is not trying to beat the incumbents on features. It is a vehicle for demonstrating engineering that users feel: instant response, exact money math, summaries that are always right, and an app that never needs the network to be useful. I say that plainly in interviews, because it is the real reason this exists.

## What I set out to prove

1. I can make the primary flow fast by design: amount-first entry, smart defaults, frequent-entry chips.
2. I can keep cached summaries consistent with their source data by writing both in the same transaction, and prove it with a test that compares them to a brute-force recompute.
3. I treat money as exact integers in minor units, never floating point.
4. I can make recurring entries idempotent so two devices never create duplicates.
5. I can make an account optional, so time-to-value is the first screen, not a signup form.
6. I handle the unglamorous edge cases: month-end dates, timezones, CSV formula injection, account switching.

## Key decisions

| Decision | Why |
|---|---|
| Money stored as integer minor units (kobo) | Floating point drifts; integers are exact and sum correctly |
| Date stored as local `YYYY-MM-DD` plus `month_key` | Spending belongs to the user's local day; UTC would put late-night spending in the wrong day or month |
| Cached `monthly_totals` recomputed per affected bucket in the same transaction | Instant summaries, always consistent, idempotent, and the same code serves edits, deletes and sync merges |
| Optional account | Removes signup friction; sync is a bonus, not a gate |
| Reuse the Hearthlist outbox sync pattern | Proven design from last project; shows the pattern generalizes |
| Single last-write-wins timestamp per record | One user rarely edits the same entry on two devices at once; simpler than Hearthlist's two groups |
| Deterministic IDs for generated recurring entries and seeded categories | Two devices generating the same rent entry produce the same ID, so sync merges instead of duplicating |
| Hand-built SVG charts | Avoids a heavy dependency and keeps the bundle small |
| No SMS or bank import | Privacy, store-policy risk and fragility; manual logging made fast instead |
| Soft deletes | Deletions must reach other devices |

## What happened (fill in after the build)

- Built in: __ hours over two days
- Measured cold start on [device]: __ ms; History scroll with 5,000 entries: __ fps; Add flow time to saved (taps): __; release APK size: __ MB
- Aggregate consistency test: __ random operations, 0 mismatches
- Bugs worth telling: (the date or month-end edge case that surprised you)
- What I would change: (honest list)

## What I'd do next

Budget notifications, receipt photos, encryption at rest, multiple currencies, and moving the backend to Go or Python on Postgres with the same push and pull protocol.

## Interview pitch (2 minutes)

"Pennywick is an expense tracker designed around the speed of the add flow. It's local-first: SQLite is the source of truth, so it works offline and needs no account. Money is stored as integer kobo, and every write updates the entry and the cached monthly totals in one transaction by recomputing just the affected month and category buckets, so Home and Budgets are instant and never drift. I test that by comparing the cache against a brute-force recompute after random operations. Recurring rules generate entries on launch with deterministic IDs, so two devices can't create duplicates. If the user signs in, an outbox pushes changes to a PocketBase backend with retries and idempotent semantics, reusing the sync design from my previous project."

## Likely deep-dive questions

| Question | Short answer |
|---|---|
| Why integers for money? | Binary floats cannot represent most decimals exactly, so sums drift. Integer minor units are exact; formatting happens only at the edge. |
| How do you keep cached totals correct? | Each write recomputes the affected (month, category, kind) buckets from source rows inside the same transaction. Sync merges use the same function. A test compares the cache to a brute-force recompute. |
| Why not just query on demand? | For thousands of rows it would be fine. The cache keeps Home, Budgets and Insights O(buckets) instead of O(entries), and it demonstrates a real consistency pattern. I keep the brute-force query as a repair tool and test oracle. |
| Timezones? | Entries store the user's local calendar date, not an instant. "Today" is computed in local time. Travelling across timezones does not move existing entries. |
| How do recurring entries avoid duplicates? | Deterministic ID from rule ID plus occurrence date. Generating the same occurrence twice, or on two devices, yields the same record. Month-end rules clamp (day 31 becomes the last day). |
| Conflicts? | Last-write-wins per record using a client timestamp, clamped by the server. Single-user data makes real conflicts rare. Deletes are tombstones. |
| What if someone signs into a different account on the same phone? | The app remembers which account its data belongs to and asks the user to replace local data or cancel. It never silently merges two people's finances. |
| CSV security? | Notes are user text; a cell starting with `=`, `+`, `-` or `@` can run as a formula in a spreadsheet. The exporter prefixes such cells with a single quote and quotes fields properly. |
| Why PocketBase here? | Free, one binary, enough for per-user data with owner-scoped rules. The sync protocol is portable to a Go or Python service. |