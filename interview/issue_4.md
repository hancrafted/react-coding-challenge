# Issue #4 — Deterministic, drift-free app-header countdown

## The problem

`src/components/AppHeader/index.tsx` held a 1-hour countdown implemented as an incrementing counter:

```tsx
const [count, setCount] = useState(0);
const countdown = seconds - count;
useEffect(() => {
  setInterval(() => setCount((c) => c + 1), 1000);
}, []);
```

Three defects, each a different flavor of "the source of truth is the timer callback, not the clock":

1. **No cleanup.** `setInterval` is never paired with `clearInterval`. On unmount the interval keeps firing `setCount` on a dead fiber — React's own dev warning appears: *"Can't perform a React state update on an unmounted component … indicates a memory leak."* Under HMR / Fast Refresh the effect re-runs on every save and stacks another interval, so the visible clock accelerates.
2. **Counter drift.** `setInterval` is best-effort; the browser is free to delay or coalesce callbacks under load. Every missed callback is permanently lost time — the display falls behind real elapsed time and never catches up.
3. **Background-tab throttling.** Backgrounded tabs are throttled to ~1 callback per minute (or less). After 30 s backgrounded the counter has advanced by 0–1 ticks while 30 real seconds passed. When the tab is restored the display reads ~29 s ahead of reality.

## What the challenge was probably testing

1. Do you understand `useEffect` as a **resource-lifecycle contract**? Whatever the effect starts (timer, subscription, event listener, `AbortController`), it must return a function that stops it. Missing cleanups are the #1 React-hooks bug on a team coming from Angular, because Angular's DI + `OnDestroy` hide this for you.
2. Do you know that browser timers are **best-effort, not authoritative**? The fix is architectural — the clock is the source of truth; the timer is just a polling mechanism that asks the clock "what time is it now?"
3. Do you pick a test strategy that pins the *invariant* (real elapsed time reflected) rather than the *mechanism* (n callbacks fired)? A good test of this fix holds clock-time and callback-count as two independent variables.

## How the fix works

One function component; two real changes.

**1. Hoist a stable constant + derive display from state:**

```tsx
const COUNTDOWN_SECONDS = 60 * 60;
const [remainingSeconds, setRemainingSeconds] = useState(COUNTDOWN_SECONDS);
const countdownMinutes = `${Math.floor(remainingSeconds / 60)}`.padStart(2, "0");
const countdownSeconds = `${remainingSeconds % 60}`.padStart(2, "0");
```

`remainingSeconds` is what the render reads. It's an integer so padding is trivial; no more `~~` or `toFixed`.

**2. Capture a wall-clock deadline once, and *derive* remaining time from it on every tick:**

```tsx
useEffect(() => {
  const deadline = Date.now() + COUNTDOWN_SECONDS * 1000;
  const tick = () => {
    const msLeft = Math.max(0, deadline - Date.now());
    setRemainingSeconds(Math.ceil(msLeft / 1000));
  };
  const id = window.setInterval(tick, 1000);
  return () => window.clearInterval(id);
}, []);
```

`deadline` is a closure constant captured once at mount — stable for the life of that fiber. Each interval callback is a *query* against `Date.now()`, not an accumulator. Miss a tick, fire three in a row, skip 30 s because the tab was backgrounded — the next call that runs computes the correct remainder and the display jumps straight to the right value. The returned cleanup tears the interval down on unmount, on HMR, on any ancestor re-mount.

## The regression tests

`src/components/AppHeader/index.test.tsx` pins four invariants with Jest fake timers plus a spied `Date.now`:

- **Starts at `60:00`.** Format/initial-value pin.
- **Ticks `59:59` after exactly 1 s of wall + 1 s of callbacks.** Normal-case pin.
- **Reflects real elapsed, not callback count.** Advance `Date.now` by 30 s, fire exactly **one** interval callback, assert display is `59:30`. Fails against a counter (`59:59`), passes against a clock-derived one. This is the key regression.
- **Cleans up its interval.** Capture `jest.getTimerCount()` after mount, assert it decreases on unmount, then advance time 5 s and assert no "state update on unmounted component" warning fires. The `getTimerCount` decrease + absence of the React warning together pin cleanup without coupling to MUI's transition timers.

## Alternative solutions

1. **`useEffect` + `setInterval` polling `Date.now() - deadline` + cleanup.** *(Chosen.)* One interval at 1 Hz, drift-free by construction, survives HMR because the cleanup runs before the new effect, cheapest correct option.
2. **`requestAnimationFrame` loop keyed off `Date.now()`.** Also drift-free, also cleans up via `cancelAnimationFrame`. Rejected: 60 Hz for a display that changes at 1 Hz is wasted work, and rAF is throttled/paused in background tabs too — so the wake-up behavior is the same, with more code.
3. **`performance.now()` instead of `Date.now()`.** Monotonic; immune to the user changing their system clock mid-countdown. For this product the PRD specified *wall-clock deadline*, and manual clock changes aren't part of the threat model. Modern browsers keep `performance.now()` ticking in backgrounded tabs too, so the observable behavior is identical here. Kept `Date.now()` to match the issue wording exactly.

---

## Lower-level: why each piece matters

### Why `useEffect` cleanup is the whole ballgame

`useEffect(fn, [])` runs `fn` after the first commit of this fiber. The returned function runs:

- When this fiber unmounts.
- On HMR / Fast Refresh, before the replaced effect re-runs.
- In Strict Mode during development, immediately after the effect runs, to surface missed cleanups.

Anything your effect subscribes to must be unsubscribed in the returned function, or that resource outlives the component. In this case `setInterval` returns an opaque handle; `clearInterval(handle)` is the only way to stop it. React cannot guess what you started.

### Why the counter is wrong even with cleanup

Imagine you fixed only the cleanup. The display still drifts on a loaded event loop, and still reports the wrong time after a backgrounded tab wakes up. The cleanup fixes one defect (leaked interval); only the deadline fixes the other two (drift, throttling). Both fixes are necessary; neither is sufficient.

### Why the deadline-derived form is drift-free by construction

With a counter, error accumulates: `display = initial - Σ(callbacks_fired)`. Any missed callback is permanent bias.

With a deadline, error is *bounded* per read: `display = ceil((deadline - now()) / 1000)`. There is no history; whatever callback runs, runs against a fresh clock read. The only possible error is the ≤ 1 s quantization from `ceil`.

### Why `Math.ceil` and not `Math.floor` / `Math.round`

On mount, `deadline - Date.now()` is exactly `3_600_000 ms`. `ceil(3_600_000 / 1000) = 3600`, which renders as `60:00`. `floor` would also give 3600 at that instant but would transition to `59:59` 1 ms into the interval, while `ceil` keeps `60:00` for the full first second and switches to `59:59` exactly on the 1 s mark. `ceil` matches how humans read countdowns ("until this hits zero, at least this much time is left").

### Angular mental map

| Concern | Angular | React (this fix) |
|---|---|---|
| Start a timer when a view exists | `ngOnInit` + `setInterval` | `useEffect(fn, [])` body |
| Stop it when the view goes away | `ngOnDestroy` + `clearInterval` | `return () => clearInterval(id)` from the effect |
| HMR: re-swap the view without leaking | Angular re-runs lifecycle hooks if components re-mount | React runs the cleanup of the *old* effect before the new one |
| Deadline-driven stream | `timer(0, 1000).pipe(map(() => deadline - Date.now()))` | `setInterval(() => setX(deadline - Date.now()), 1000)` |
| Integer / format in template | pipe (`| number:'2.0-0'`) | `.padStart(2, "0")` |

The two footguns for an Angular dev landing in React here:

1. **DI did not save you this time.** Angular's `ngOnDestroy` is declarative — you override a method that Angular *guarantees* to call. React's equivalent is a value you must return from the effect. Forget to return it, and nothing stops the timer. The runtime has no way to notice.
2. **The render function runs every render.** If `deadline` were declared at the top of the component body (`const deadline = Date.now() + …`), it would be recomputed on every re-render — exactly the counter bug in a different costume. Putting it in the effect closure (or a `useRef`) is how you say "compute this once, hold it across renders."

### Two things to carry forward

1. **Effects own resources. Effects must return their teardown.** Any `setInterval`, `addEventListener`, `subscribe`, `new AbortController`, `new WebSocket`, `IntersectionObserver`, `ResizeObserver` you start inside `useEffect` must be stopped in the function you return. No exceptions — HMR and Strict Mode will punish you in dev, and users will hit memory leaks in prod.
2. **For anything clock-shaped, derive from the clock, don't accumulate callbacks.** Countdowns, time-since-X badges, session-expiry warnings, polling backoff windows — all of these should read `Date.now()` (or `performance.now()`) against a captured reference point. `setInterval` becomes the *trigger to re-render*, not the *source of truth*.
