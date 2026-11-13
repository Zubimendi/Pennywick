# Pennywick: Design

## 1. Design goals

1. **Logging must take seconds.** The add flow is the product. Everything else rewards the habit.
2. **Answer "where did it go?" at a glance.** Home shows the month's story without scrolling.
3. **Calm with money.** No alarming reds for ordinary spending; warnings are gentle and specific.
4. **Private by default.** Amounts can be hidden with one tap; nothing leaves the phone unless the user signs in.
5. **Light on low-end phones.** System fonts, no images, hand-built lightweight charts.

## 2. Patterns replicated from top apps

| Pattern | Seen in | How Pennywick uses it | Why it works |
|---|---|---|---|
| Amount-first keypad | Cash App, Venmo, bank transfer flows | Add screen opens on a big keypad; category and date come after | The number is the effort; the rest is defaulted |
| Big number hero | Revolut, Monzo | Home leads with "Spent this month" in large type | Answers the main question instantly |
| Budget progress with "left to spend" | Monzo | Each budget shows a bar and "N left" or "N over" | Remaining is more useful than percent used |
| Hide balance toggle | Banking apps | Eye icon on Home masks all amounts | Safe to open in public |
| Undo toast instead of confirm | Gmail, Todoist | Delete shows "Entry removed. Undo" for 5 seconds | Faster and recoverable |
| Day-grouped transaction list with daily totals | Bank apps | History groups by day with a subtotal | Easier to scan |
| Frequent-entry chips | Keyboard suggestions, Google Pay | After picking a category, chips like "Bolt 1,500" prefill note and amount | Repeat spending takes 2 taps |
| Month picker with comparison | Apple Health, Monzo | Insights shows "12% less than last month" | Gives the number meaning |
| Empty states with a first action | Polished apps | Empty home asks "Log your first expense" | Avoids a blank screen |
| Skeletons only where the network is unavoidable | Instagram | Only during the first pull after signing in on a new device | Local reads are instant; fake loaders would be dishonest |

## 3. Design tokens

All colors are targets; confirm contrast with a checker before release.

### Color (light)

| Token | Hex | Use | Approx. contrast |
|---|---|---|---|
| `bg` | `#F6F8F7` | Screen background | n/a |
| `surface` | `#FFFFFF` | Cards, sheets | n/a |
| `text` | `#14201D` | Primary text | about 15:1 on bg |
| `textSecondary` | `#52625D` | Secondary text | about 5.9:1 on bg |
| `primary` | `#0F766E` | Buttons, active tab, income | about 5.5:1 with white text |
| `primaryPressed` | `#0B5C56` | Pressed | higher |
| `expense` | `#9F1239` | Expense amounts | about 8:1 on white |
| `income` | `#0F766E` | Income amounts | about 5.5:1 on white |
| `warning` | `#B45309` | Budget at 80% or more | about 5:1 on white |
| `danger` | `#B91C1C` | Budget exceeded | about 6.5:1 on white |
| `border` | `#E1E8E5` | Dividers | decorative |

Amounts always carry a sign or label ("+", "-", "Income") so meaning never relies on color alone.

### Color (dark)

| Token | Hex |
|---|---|
| `bg` | `#0E1513` |
| `surface` | `#18211E` |
| `text` | `#EAF2EF` |
| `textSecondary` | `#A6B7B1` |
| `primary` | `#2DD4BF` (use `#0E1513` text on it) |
| `expense` / `income` | `#FB7185` / `#2DD4BF` |
| `warning` / `danger` | `#FBBF24` / `#F87171` |
| `border` | `#2A3733` |

### Category colors

Ten fixed hues used for chart segments and icon backgrounds, each paired with an icon and a text label so color is never the only cue. Define as `cat1` to `cat10` in tokens, with light and dark variants. Segments beyond the top 8 collapse into "Other".

### Typography (system fonts)

| Style | Size / line height | Weight |
|---|---|---|
| Hero amount | 40 / 46 | Bold, tabular numbers |
| Title | 28 / 34 | Bold |
| Heading | 20 / 26 | Semibold |
| Body | 16 / 22 | Regular |
| Label | 14 / 20 | Medium |
| Caption | 13 / 18 | Regular |

Use tabular (monospaced) digits for all money so columns align. Text must scale to 200% without clipping; the hero amount shrinks to fit rather than wrapping.

### Spacing, shape, motion

| Token | Value |
|---|---|
| Spacing scale | 4, 8, 12, 16, 24, 32 |
| Screen horizontal padding | 16 |
| Minimum touch target | 48 x 48 (keypad keys at least 64 x 56) |
| Radius | 16 (cards), 12 (inputs), 999 (chips) |
| Motion durations | 120 ms taps, 200 ms layout changes, 250 ms sheets |

## 4. Information architecture

```text
Main tabs
  Home  (gear icon opens Settings)
  History
    Entry sheet (edit)
  Insights
  Budgets
Add entry (modal over any tab, from the center button)
Settings
  Categories
  Recurring
    Recurring editor
  Currency, theme, privacy
  Backup and sync
    Sign in, Sync center
  Export CSV
Onboarding (first run only): Welcome, Currency
```

Rules: four tabs, add button always one tap away, every screen reachable in 3 taps or fewer, hardware back pops one level.

## 5. Screen specifications

### S1. Onboarding (first run)
- One screen: short pitch, currency picker (default NGN), "Start tracking" button. No account prompt.
- Seeds default categories. Lands on empty Home.

### S2. Home
- Header: month name, eye icon (privacy), gear icon, sync chip only if signed in
- Hero card: "Spent this month" amount, small line "Income N, Left N" (or "No budget set" nudge)
- Budget strip: up to 3 budgets closest to their limit, with progress bars
- Top categories: 3 rows with amount and share
- Recent entries: last 5, "See all" link
- Center add button on the tab bar
- Empty state: "Nothing logged yet. Add your first expense." with the add button
- States: loading is not needed (local), privacy mode shows "••••"

```text
+------------------------------------------+
| November            (eye)  (gear)        |
+------------------------------------------+
| Spent this month                         |
| N 184,500                                |
| Income N 250,000     Left N 65,500       |
+------------------------------------------+
| BUDGETS                                  |
| Food        [#######---]  N 12,000 left  |
| Transport   [#########-]  N 1,500 left   |
+------------------------------------------+
| RECENT                                   |
| Bolt ride          Transport    -1,500   |
| Pepper and tomato  Food         -3,200   |
+------------------------------------------+
| Home   History   (+)   Insights  Budgets |
+------------------------------------------+
```

### S3. Add entry (modal)
- Top: segmented control Expense or Income (expense default, remembered)
- Amount display (hero size) with currency; custom keypad below with digits, decimal, backspace (long press clears)
- Category chips (horizontal, most used first), then Note field (optional), Date chip (defaults to Today; options: Yesterday, pick date)
- Frequent-entry chips appear after a category is chosen
- Save button enabled when amount is above zero; haptic and a short confirmation on save; "Add another" option remains in the toast
- States: invalid amount (zero) disables Save; very large amounts show a gentle "Is this right?" confirm above a threshold (default 10,000,000 in major units)

### S4. History
- Search field; filter chips (category, income or expense, date range)
- Day-grouped list with a daily total in each header
- Row: category icon, note or category name, amount with sign, small recurring badge if generated
- Tap opens the entry sheet; swipe left to delete with undo
- Empty state: no entries, or "No matches" with a clear filters button

### S5. Entry sheet (edit)
- Same fields as Add, plus Delete. Autosave on dismiss. Shows "Added Nov 3" and a recurring tag if applicable.

### S6. Insights
- Month picker with previous and next arrows
- Summary line: "You spent N, 12% less than October"
- Donut chart of expenses by category with legend (top 8 and Other); tap a segment to filter the list below
- Daily bar chart for the month, tap a bar to see that day
- Top categories list with amounts and shares
- Empty month: "No spending logged in November."

### S7. Budgets
- Month summary: total budgeted, total spent
- List of budgets: category, bar, "N left" or "N over", status text (On track, 80% used, Over)
- Add budget button; tap to edit limit; swipe to remove
- Empty state: "Set a monthly limit for a category you want to watch."

### S8. Settings
- Currency (shows a note that changing it does not convert amounts), theme, privacy mode default, app lock (P2)
- Categories (add, rename, reorder, archive), Recurring
- Export CSV
- Backup and sync: sign in or out, sync status
- About and app version

### S9. Categories and S10. Recurring editor
- Categories: list with icon and color, tap to edit name, icon, color, kind; archive instead of delete when entries exist
- Recurring editor: kind, amount, category, note, frequency (weekly or monthly), day, start date, active switch; preview of the next 3 dates

### S11. Sign in and Sync center
- Sign in or create account (email, password), explains "Optional. Your data stays on this phone unless you sign in."
- Sync center as in Hearthlist: status, last synced, waiting count, failed items with Retry or Discard

## 6. Component inventory

`Screen`, `Header`, `HeroAmount`, `MoneyText`, `Keypad`, `CategoryChip`, `CategoryIcon`, `EntryRow`, `DayHeader`, `BudgetBar`, `DonutChart`, `DailyBars`, `MonthPicker`, `SegmentedControl`, `BottomSheet`, `Toast` (with action), `EmptyState`, `Skeleton`, `Button`, `TextField`, `SyncChip`, `ErrorBoundaryFallback`. Tokens only; no raw hex or magic numbers.

## 7. Charts

Hand-built with `react-native-svg` to avoid a heavy chart library.
- Donut: arcs computed from category totals, minimum visible slice, text alternative below ("Food 38%, Transport 21%, ...")
- Bars: one bar per day, max height scales to the month's largest day, tap targets widened beyond the visual bar
- Both have accessible summaries read by screen readers and never rely on color alone (legend with names and values)
- Animations limited to a single 250 ms draw-in; skipped with reduce motion

## 8. Budget states

| State | Condition | Treatment |
|---|---|---|
| On track | under 80% | Primary bar, text "N left" |
| Watch | 80% to 100% | Warning bar, text "N left, 85% used" |
| Over | above 100% | Danger bar, text "N over" |

Messages are factual and calm. No shaming language.

## 9. Motion and haptics

- Light haptic on keypad keys (optional setting), success haptic on save, light haptic on delete
- Save: keypad sheet slides down 250 ms; the new row fades into History
- Respect reduce motion: replace movement with fades

## 10. Accessibility

- Every control has a role, label and state; keypad keys read as numbers, backspace as "delete digit"
- Money read as words ("one thousand five hundred naira") through accessibility labels
- 48 dp targets (keypad 64 x 56); contrast at least 4.5:1 for text
- Layout holds at 200% font scale; hero amount shrinks to fit
- Swipe actions have a non-gesture alternative in the entry sheet

## 11. Microcopy

| Situation | Copy |
|---|---|
| Empty home | "Nothing logged yet. Add your first expense." |
| Entry deleted | "Entry removed. Undo" |
| Over budget | "Food is N 3,200 over this month." |
| Offline with account | "You're offline. Everything is saved on this phone and will back up later." |
| Large amount | "That's a big one: N 12,500,000. Is this right?" |
| Currency change | "Changing currency does not convert existing amounts." |
| Switching accounts | "This phone has data from another account. Replace it with this account's data, or cancel?" |
| Export done | "Your file is ready to share." |

Tone: short, calm, plain. No exclamation marks, no jargon like "outbox" in the UI.

## 12. Low-end device considerations

- System fonts only; no images beyond icons
- FlashList with a flattened array (day headers as items), memoized rows, stable keys
- Charts only render when Insights is focused
- Defer sync boot, recurring catch-up and suggestion queries until after the first interactive frame
- Test on a phone with 3 GB RAM or less with a 5,000-entry dataset