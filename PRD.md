# PRD: Fix Known Bugs in the React Bug-Bounty App

## Problem Statement

The app's home page (`src/pages/Home/index.tsx`) advertises itself as a bug-bounty
challenge and lists five known defects. A developer picking this up sees a console
warning, a formatting glitch in the intro copy, a missing user avatar in the app bar,
an intermittently-broken countdown timer, and no way to switch UI language between
English and German (the German locale file is empty). Shipping the app in this state
undermines the "demo quality" message and blocks the optional i18n UX.

## Solution

Resolve all five items listed on the home page in a single coordinated pass:

1. Provide stable list keys on the home page so React stops logging the warning.
2. Render the `<b>known</b>` markup in the intro translation as actual bold text
   without modifying the i18n source strings.
3. Repair the user-loading flow so the avatar appears on app start, and fix the
   latent provider bug that would surface as soon as the first issue is patched.
4. Make the countdown deterministic: cleanly tear down its timer and drive it from
   wall-clock time so HMR reloads and tab throttling cannot corrupt it.
5. Add a language switcher (EN / DE) in the app bar with persisted preference, and
   populate the German locale so the switch has a visible effect.

## User Stories

1. As a developer reviewing the app, I want the React key-prop warning to be gone
   from the console, so that real warnings are not drowned out by noise.
2. As a reader of the home page, I want the word "known" to appear in bold in the
   intro sentence, so that the phrasing matches the copy's intent.
3. As a content editor, I want the bold styling to work without the translation
   strings being modified, so that i18n content remains the single source of truth.
4. As a signed-in user, I want my avatar with initials to appear in the top-right of
   the app bar when I load the app, so that I have visual confirmation I'm logged in.
5. As a user, I want the avatar to stay visible across re-renders and not flash away,
   so that the header feels stable.
6. As a user watching the header countdown, I want the timer to tick down exactly
   once per second, so that the displayed time is believable.
7. As a developer using hot-reload, I want the countdown to resume correctly after a
   file save, so that I don't have to hard-reload to verify behavior.
8. As a user who leaves the tab in the background and returns, I want the countdown
   to reflect real elapsed time, so that it does not drift.
9. As a German-speaking user, I want to switch the UI language to German from the
   app bar, so that I can use the app in my preferred language.
10. As an English-speaking user, I want to switch back to English, so that language
    selection is reversible.
11. As a returning user, I want my language choice to persist across reloads, so that
    I don't have to re-select it every session.
12. As a user on a locale with missing keys, I want the UI to fall back to English,
    so that no raw key strings ever appear on screen.
13. As a developer reading the home page, I want each listed issue to be rendered
    from a stable identifier, so that reordering or editing the list does not cause
    subtle rendering bugs.

## Implementation Decisions

**Bug 1 — Missing key prop**
- Add an explicit `id: string` field to each entry in the `issues` array on the home
  page; use it as the `key` on the rendered list item. Index-based keys are
  rejected as an anti-pattern.

**Bug 2 — Bold "known"**
- Render the `home.intro` string with the `<Trans>` component from `react-i18next`,
  mapping `{{ b: <strong /> }}`. i18n JSON strings are not modified.
- When the German translation is populated (Bug 5), its `home.intro` must also use
  `<b>…</b>` around the German equivalent to preserve the bold across languages.

**Bug 3 — Avatar missing**
- Fix the typo `this.urser = result` in the user store so the observable `user`
  property is actually assigned.
- Fix the user store provider so the store instance is memoized across renders
  (`useMemo(() => new Store(), [])`) instead of being reinstantiated inside the
  provider's render. This prevents the "second bug" — once the first fix lands,
  any ancestor re-render would replace the store and reset `user` to `null`.
- Out of scope for now: the latent crash in `AvatarMenu.stringAvatar` when
  `firstName` is undefined. It's not on the happy path with the current mock.

**Bug 4 — Countdown**
- Return a cleanup from the `useEffect` in `AppHeader` that clears the interval.
- Derive remaining time from a wall-clock deadline captured on mount
  (`Date.now() + 1h`), recomputed on each tick, rather than incrementing a counter.
  This makes the timer drift-free, robust to tab throttling, and idempotent under
  HMR.
- Starting value stays at 1 hour per mount; no cross-reload persistence.

**Bug 5 — Language switcher**
- New icon-button + menu control placed to the left of the avatar in `AppHeader`,
  offering EN and DE (two-letter labels, no flags).
- Current language is read from and written to `i18n.language`; user selection is
  persisted in `localStorage` under a single key. On app init, the persisted value
  (if present) takes precedence over the browser language. No new dependency.
- `fallbackLng: "en"` (already configured) covers any missing DE keys.
- Populate `src/i18n/locales/de.json` with German translations for every key
  currently used: `appTitle`, `logout`, `routes./home`, `home.welcome`,
  `home.intro` (with `<b>…</b>` around the German word for "known"), and
  `home.sidenote`. Translations drafted in the plan and corrected on review.

**Cross-cutting**
- No new runtime dependencies are added. No test framework is introduced; each
  user story must be verifiable by a short manual reproduction described in the
  follow-on implementation plan.

## Out of Scope

- The latent `AvatarMenu.stringAvatar` crash when `firstName` is undefined.
- Upgrading `react-scripts` from 4 to 5 (Node / OpenSSL legacy issue).
- Adding a test suite (Jest / RTL) — manual repro steps are accepted.
- Additional languages beyond EN and DE.
- Persisting countdown state across reloads.
- Server-side user fetching or real authentication — the mocked `getOwnUser`
  service stays as-is.
- Routing, theming, or styling changes unrelated to the listed bugs.

## Further Notes

- The home-page `issues` array is the source of truth for which bugs are in scope;
  it should be kept in sync if any item is dropped or deferred.
- React 17 (not 18) — `useEffect` runs once in dev, no strict-mode double-invoke.
  The countdown glitch therefore surfaces primarily via Fast Refresh, not mount
  double-firing.
- `i18n.tsx` currently forces `lng: FALLBACK_LANGUAGE || browserLanguage`, which
  pins English on startup. The language-switcher work will replace that with
  `persistedLang ?? browserLanguage ?? FALLBACK_LANGUAGE`.
- Follow-on: once this PRD is approved, the `prd-to-plan` skill can slice it into
  tracer-bullet phases (e.g. per-bug vertical slices).
