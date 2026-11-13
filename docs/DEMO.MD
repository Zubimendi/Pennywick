# Pennywick: Demo Guide

## Goals

- A 90 to 120 second recorded demo for the README and portfolio
- A 5 minute live version for interviews
- Prove three things: logging is fast, summaries are instant and right, and it works with no account and no signal

## Setup (the evening before)

| Item | Detail |
|---|---|
| Demo data | A dev-only "Load demo data" action (Settings, developer section, hidden in release) that creates about 3 months of realistic entries, budgets and two recurring rules |
| Devices | One phone or emulator for the main demo; a second device only if you show sync |
| Backend | PocketBase running and reachable, only for the sync segment |
| Network control | Airplane mode toggle ready |
| Screen recording | Android built-in recorder or `adb shell screenrecord`; iOS Simulator (Mac only): `xcrun simctl io booted recordVideo demo.mp4` |
| Cleanup | Notifications off, battery above 50%, clean wallpaper |

Note: demo data must be clearly fictional. Never use real transactions or bank details in a recording.

## 90 second script

| Time | Screen | Action | Voiceover |
|---|---|---|---|
| 0:00 | Home | Show hero, budgets, recent entries | "Pennywick answers one question: where did my money go?" |
| 0:08 | Add | Tap add, type 1500 on the keypad, tap Transport, Save | "Logging is amount first. Three taps." |
| 0:18 | Home | Show hero and Transport budget update instantly | "Totals and budgets update immediately, because summaries are cached and kept consistent in the same database transaction." |
| 0:28 | Add | Add another using a frequent-entry chip | "Frequent entries are one tap." |
| 0:36 | Home | Tap the eye icon | "Privacy mode hides every amount." |
| 0:42 | History | Search "bolt", swipe delete, tap Undo | "Search, delete and undo, no confirmation dialogs." |
| 0:52 | Insights | Show donut and daily bars, tap a segment | "Insights compare this month with last." |
| 1:02 | Phone | Turn on airplane mode, add an entry | "No signal, no problem. There is no account either." |
| 1:10 | Settings | Open Recurring, show Rent rule | "Recurring entries generate themselves, and never duplicate." |
| 1:18 | Settings | Export CSV, show share sheet | "Export is spreadsheet-safe." |
| 1:28 | Close | Show repo and architecture doc | "Local-first, exact money, consistent caches." |

## Sync segment (live version, optional)

1. Settings, Backup and sync, sign in on device A. Show the chip go to Syncing, then Up to date.
2. Sign in as the same account on device B. Show the first pull with skeletons, then identical data.
3. Add an entry on A while B is offline. Reconnect B. Show it appear.

## Edge case demos (live version)

1. Add a recurring rule on day 31; show it clamps in a short month (use the preview dates).
2. Edit an old entry to a different month; show both months' totals change correctly.
3. Show the sign-in-as-different-account warning.

## Shots to capture for the README

1. Home (light)
2. Add keypad
3. Insights with donut and bars
4. Budgets with all three states
5. Dark theme Home
6. History with day groups

## Turning the recording into a GIF

```bash
ffmpeg -i demo.mp4 -vf "fps=12,scale=360:-1:flags=lanczos" -loop 0 demo.gif
```

Keep the GIF under about 8 MB; keep the full MP4 for the portfolio site.

## Pre-demo checklist

- [ ] Demo data loaded and verified fictional
- [ ] Airplane mode toggle tested
- [ ] Backend reachable (if showing sync)
- [ ] Notifications off, battery above 50%
- [ ] 10 second test recording done
- [ ] Fallback video ready

## If something breaks live

Say what you expect, open Settings to show what the app thinks is happening, and switch to the recorded demo.