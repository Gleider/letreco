---
title: "Game State Not Resetting When Daily Word Changes in Letreco"
date: 2026-04-17
category: ui-bugs
module: game-frontend
problem_type: ui_bug
component: frontend_stimulus
symptoms:
  - "Frontend showed stale game session after daily word rotated at noon BRT"
  - "Users who completed or were mid-game saw old attempts instead of a fresh board"
  - "Won/lost status persisted across word rotations"
root_cause: logic_error
resolution_type: code_fix
severity: high
tags:
  - game-state
  - polling
  - visibilitychange
  - daily-word-rotation
  - react
  - nextjs
  - wordle
---

# Game State Not Resetting When Daily Word Changes in Letreco

## Problem

The Letreco frontend (Next.js) did not detect when the backend rotated the daily word (noon BRT via NestJS cron), leaving users stuck on the previous game session with stale attempts, keyboard colors, and win/loss state.

## Symptoms

- After the daily word rotated at noon BRT (`'0 15 * * *'` = 15:00 UTC), the game board still showed previous attempts
- Users who had won or lost saw the congratulations/failure message for the old word
- The virtual keyboard retained color feedback from the previous game
- Only a full page refresh would show the new game

## What Didn't Work

- **Initial design: localStorage date check only** (session history) — The original plan specified clearing state when `localStorage` date differed from today. This was never implemented, and even if it had been, it would not catch mid-session word changes since the browser doesn't know the server's rotation schedule.
- **Mount-only state loading** — The first implementation loaded game state from the API in a single `useEffect` on component mount. This worked for initial page loads but had no mechanism to detect subsequent word changes while the tab was open or backgrounded.

## Solution

Added three complementary detection mechanisms to `apps/web/app/page.tsx`:

### 1. `gameNumber` tracking via `useRef`

A `useRef` stores the current game number without triggering re-renders on every poll tick. When the server returns a different `gameNumber`, all game state resets.

```tsx
const gameNumberRef = useRef(0);

const loadGameState = useCallback(async () => {
  const state = await getGameStatus(playerId);
  const serverGameNumber = state.gameNumber || 0;

  // New game detected — reset everything
  if (gameNumberRef.current > 0 && serverGameNumber !== gameNumberRef.current) {
    setAttempts(state.attempts || []);
    setCurrentGuess('');
    setGameStatus(state.status || 'playing');
    setGameNumber(serverGameNumber);
    setLetterStatuses(buildLetterStatuses(state.attempts || []));
    setRevealingRow(undefined);
    setIsRevealing(false);
    setShowStats(false);
    setMessage('');
    gameNumberRef.current = serverGameNumber;
    return;
  }

  // Initial load (same game)
  gameNumberRef.current = serverGameNumber;
  // ... set state from server
}, []);
```

### 2. `visibilitychange` event listener

Catches users returning to a backgrounded tab after the rotation has happened:

```tsx
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      loadGameState();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, [loadGameState]);
```

### 3. 60-second polling interval

Catches users who leave the tab open and active through the rotation:

```tsx
useEffect(() => {
  const interval = setInterval(loadGameState, 60_000);
  return () => clearInterval(interval);
}, [loadGameState]);
```

## Why This Works

The root cause was that the frontend had no mechanism to detect server-side state changes after initial mount. The fix addresses this with two complementary triggers:

- **`visibilitychange`** covers the common case: user backgrounds the tab, word rotates, user returns. The API is called immediately on tab focus.
- **60-second polling** covers the edge case: user leaves the tab active and visible through the rotation time. Within 60 seconds, the new `gameNumber` is detected.

Using `useRef` instead of `useState` for the `gameNumber` comparison is critical — it prevents unnecessary re-renders on every 60-second poll tick when the game hasn't changed, while still providing a stable reference for comparison across renders.

The reset is **comprehensive**: attempts, current guess, game status, keyboard letter statuses, reveal animation state, stats modal visibility, and toast messages are all cleared. This prevents any visual artifact from the previous game leaking into the new one.

## Prevention

- **Always design for server-state divergence in client apps** — When a backend has scheduled state changes (cron jobs, time-based rotations), the frontend must have a mechanism to detect and react to those changes. Mount-only loading is insufficient.
- **Use `gameNumber` or version tokens for change detection** — Comparing a monotonically increasing identifier is more reliable than date-based checks, especially when the rotation doesn't happen at midnight.
- **Combine `visibilitychange` with periodic polling** — Neither alone covers all cases. `visibilitychange` misses active tabs; polling misses backgrounded tabs that return between intervals.
- **Test the rotation transition explicitly** — The word rotation at noon BRT should be tested by verifying that a client with state from game N correctly resets when the server advances to game N+1.

## Related Issues

- **Accented words breaking virtual keyboard** — Solved in the same session. The word list (`apps/api/src/seed/words.json`) contained accented Portuguese words (a, e, c) that couldn't be typed on the a-z virtual keyboard. Fixed by filtering the word list to keyboard-compatible words only (11640 -> 8445) and adding a PostgreSQL regex filter (`text ~ '^[a-z]{5}$'`) in `apps/api/src/word/word.service.ts` to prevent accented words from ever being selected. Validation tests added in `apps/api/src/word/__tests__/word.validation.spec.ts`.
- **Data loss from EC2 recreation** — Docker PostgreSQL volumes were destroyed every time the EC2 instance was recreated. Migrated both gleider-dev and letreco to AWS RDS PostgreSQL with Terraform `lifecycle { prevent_destroy = true }` on both EC2 and RDS resources.
- **Origin plan**: `docs/plans/2026-04-15-002-feat-letreco-wordle-pt-br-plan.md` (in gleider-dev repo) — Three assumptions in this plan diverged from the implemented solutions: the accent scope boundary, the EC2 Docker deployment model, and the date-only reset logic.
