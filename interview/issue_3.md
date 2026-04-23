# Issue #3 — User avatar appears on app start and survives re-renders

## The problem

On app start, a mocked `getOwnUser` call resolves after 500 ms with `{firstName: "Aria", lastName: "Test", eMail: "linda.bolt@osapiens.com"}`. The avatar with initials "AT" should appear in the top-right of the app bar and stay there across ancestor re-renders. Before this fix, it never appeared — and once the first step of the fix was applied, the whole app went blank after ~500 ms.

The issue explicitly pairs two defects, and the fix surfaces a third one.

1. `src/api/services/User/store.ts` has `this.urser = result` inside `runInAction`. The observable property is `user`; the typo silently creates a throwaway field, so `user` stays `null` forever and the avatar never renders.
2. `src/api/services/User/index.tsx` instantiates `new Store()` inline in `StoreProvider`'s render. Any re-render of an ancestor builds a brand-new store, resets `user` to `null`, and retriggers the fetch — so after fix #1 the avatar would flash away on every ancestor re-render.
3. (Surfaced, not listed.) `src/components/AvatarMenu/index.tsx` is a plain function component. With fix #1 populating `user`, the guard `user && user.eMail && <Grow><AvatarMenu/></Grow>` finally lets MUI's `<Grow>` mount `<AvatarMenu>` for the first time. `<Grow>` injects a ref into its child and reads `node.scrollTop` during its enter transition; function components drop injected refs, so `nodeRef.current` is `null`, `reflow(null)` throws, and with no error boundary above `<Root>` React 17 unmounts the whole tree → blank screen. The typo was masking this bug by keeping `<Grow>` from ever mounting its child.

## What the challenge was probably testing

1. Do you understand that a component's function body runs on *every* render, and that anything you construct in there is fresh each time? The inline `new Store()` is the trap.
2. Do you read a MobX bug all the way — typo writes go quietly, observable reads don't — rather than chasing the symptom ("avatar is missing") back to the store itself?
3. When the visible bug moves (missing avatar → blank screen) do you re-run the diagnosis, or do you keep patching against the first hypothesis? Fix #3 is the one that tests whether you actually understand React's ref contract vs. just how MobX + Context compose.

## How the fix works

Three changes, one per defect.

**1. Typo — `src/api/services/User/store.ts`**

```ts
runInAction(() => {
  this.user = result; // was `this.urser`
});
```

`makeAutoObservable(this)` makes the properties present at construction time observable. `user: User | null = null` is the observable; writing to `this.urser` silently attached a non-observable field, so no reaction fired, so no observer ever saw a change.

**2. Memoize the store — `src/api/services/User/index.tsx`**

```tsx
export const StoreProvider: React.FC = (props) => {
  const { children } = props;
  const store = useMemo(() => new Store(), []);

  return (
    <UserStoreContext.Provider value={store}>
      {children}
    </UserStoreContext.Provider>
  );
};
```

`useMemo` with an empty dependency array computes the factory once per fiber instance and caches the result. The store now lives for the lifetime of `<StoreProvider>`'s mount, not the lifetime of one render pass. Consumers see the same instance across any ancestor re-render; the fetched `user` isn't thrown away.

**3. forwardRef in AvatarMenu — `src/components/AvatarMenu/index.tsx`**

```tsx
const AvatarMenu = React.forwardRef<HTMLDivElement, AvatarMenuProps>(
  (props, ref) => {
    // ...
    return (
      <div ref={ref}>
        <Avatar onClick={handleClick} {...stringAvatar(user)} />
        {/* ... */}
      </div>
    );
  }
);
```

`<Grow>` does `cloneElement(children, { ref: handleRef })` and reads `nodeRef.current` during its enter callback. `React.forwardRef` opts the component into the ref channel; attaching the received `ref` to the root `<div>` gives Grow the DOM node it needs to reflow and animate.

## The regression tests

Four tests, each pinning one invariant:

- `src/api/services/User/store.test.ts` — instantiates `UserStore`, calls `getOwnUser()`, asserts `store.user` is populated. Fails against the typo with `expect(received).not.toBeNull()`.
- `src/api/services/User/index.test.tsx` — renders `<StoreProvider>` inside a parent with a forced re-render, captures the context value on each render, asserts both captures are the same object reference. Fails against inline `new Store()` because each render is a fresh instance.
- `src/components/AvatarMenu/index.test.tsx` — renders `<Grow in><AvatarMenu .../></Grow>`, spies on `console.error`, asserts no `scrollTop`-related error is logged. Fails against the plain function component with React 17's "The above error occurred" stack.
- `src/api/services/User/integration.test.tsx` — mounts the real `<App />`, lets the mocked 500 ms promise resolve, asserts the tree is still mounted and no fatal error was logged. End-to-end smoke test for the AC "avatar appears within ~500 ms".

## Alternative solutions

**For the store (#1–#2)**

1. **`useMemo(() => new Store(), [])`.** *(Chosen.)* One instance per `<StoreProvider>` mount, stable across renders, scoped to the subtree, reset on full unmount (fine for tests, Storybook, multi-tenant shells).
2. **Module-scope singleton** — `const store = new Store()` outside the component. Simplest, matches Angular's `providedIn: 'root'`. Rejected because it aliases across test files, across Storybook stories, and across any future multi-provider shell; hides the decision from readers.
3. **`useState(() => new Store())[0]`** or a `useRef`-guarded assignment. Semantically equivalent to `useMemo([])`. More defensible in a post-React-18-compiler world where memo isn't a guarantee; for React 17 `useMemo` reads cleaner ("cached derived value") than "state slot I never update" or "mutable ref I pretend is immutable."

**For the ref (#3)**

1. **`React.forwardRef` on `AvatarMenu` itself.** *(Chosen.)* Fixes the contract at the component boundary, once. Any future usage inside a transition, portal, tooltip, or popper is safe for free.
2. **Delete the `<Grow>` wrapper.** One-liner, removes the animation. Deletes the symptom, not the cause; the next engineer to wrap `<AvatarMenu>` in a transition re-hits the bug.
3. **Wrap at the call site: `<Grow><div><AvatarMenu .../></div></Grow>`.** The extra `<div>` gives Grow a ref-able host. Works, but has to be repeated every time — every `<Grow>`/`<Fade>`/`<Slide>`/`<Tooltip>`/`<Popper>` site becomes a reminder that this component violates the MUI composition contract.

## Scope note

The PRD calls out a separate latent crash — `AvatarMenu.stringAvatar` indexing `firstName[1]` when `firstName` is undefined — as explicitly out of scope, because the mock always provides `firstName`. That is *not* the crash this fix addresses; the crash here is in `<Grow>`'s enter callback, caused by the missing `forwardRef`. It was caught because Issue #3's acceptance criterion "avatar appears within ~500 ms" is not satisfiable without it.

---

## Lower-level: what actually fails, step by step

### Why `new Store()` inline is wrong

A function component is, literally, the render function. React calls it top-to-bottom every time it decides the component needs to re-render. Everything you write in its body is recreated on each call. That's fine for JSX (it's a disposable description) and for values React already knows to stabilize (hook return values, `useCallback`/`useMemo` outputs). It's catastrophic for anything that holds identity — a store, a subscription, a WebSocket — because the *value you hand to a consumer changes reference every render*.

`<Context.Provider value={v}>` uses `Object.is` on `value` to decide whether consumers should re-render. A new object every render means: every consumer re-renders, and (the killer part here) every consumer that destructures a field off that value is reading from a different object. MobX's `observer` can't save you — `store.user` on the old instance is not the same observable slot as `store.user` on the new instance. Reactions fire on the old one, the component is already reading from the new one.

`useMemo(() => new Store(), [])` is how you promote "created per render" to "created per mount." React stores the cached value on the fiber (the persistent internal node that survives across renders; closest Angular analog is the component *view instance*, the thing that persists while the template re-evaluates). As long as that fiber lives, the same store lives.

### Why MUI `<Grow>` needs a ref-forwarding child

`<Grow>` is a thin wrapper over `react-transition-group`'s `<Transition>`. Transitions have to measure their target element — to compute height for auto timeouts, to force a reflow so the browser's animation starts clean, to apply inline transition styles. `<Grow>` does this:

```ts
const nodeRef = React.useRef(null);
const foreignRef = useForkRef(children.ref, ref);
const handleRef  = useForkRef(nodeRef, foreignRef);
// ...
const handleEnter = (node /* = nodeRef.current */) => {
  reflow(node);                  // node.scrollTop
  // compute duration from node.clientHeight, then setTimeout the exit
};
return React.cloneElement(children, { ref: handleRef, ... });
```

`cloneElement` with `ref: handleRef` is *always* attempted. Whether the ref actually binds to a DOM node depends on the child's own contract:

- **DOM element** (`<div>`, `<button>`, ...): ref auto-binds to the element.
- **`React.forwardRef` component**: receives `ref` as a second arg and can pass it onto its own DOM child (or a `useImperativeHandle`).
- **Plain function component**: silently drops the ref. In dev you get `Warning: Function components cannot be given refs...`; at runtime `nodeRef.current` stays `null`, and the first `node.scrollTop` in `onEnter` throws.

React 17 has no opt-in Suspense-style error boundary at the root. An uncaught render-phase error bubbles past every ancestor without an `ErrorBoundary`, and `react-dom` responds by unmounting the tree. The DOM goes blank. That's the "app is shown briefly, then goes blank" the user reported — the 500 ms is the mocked fetch delay; the blank is the unmount.

### Why the three bugs interact

Before the typo fix, `user` was `null` forever, `user.eMail` was falsy, and the `<Grow>` in `<AppHeader>` never rendered its child. The ref bug was latent and the app's "first render" of the avatar subtree never happened. Fixing the typo makes `user` populate, which makes the guard truthy, which mounts `<Grow>`, which tries to get a ref to `<AvatarMenu>`, which fails. Fixing the memoization is necessary to stop the *repeat* of that cycle on every ancestor re-render: without it, every ancestor re-render throws away the loaded user, runs the fetch again 500 ms later, and re-mounts `<Grow>` with a new `<AvatarMenu>` child (and a new chance to crash). All three fixes are required for the AC "avatar appears within ~500 ms and stays there across re-renders" to hold.

### Angular mental map

| Concept | Angular | React |
|---|---|---|
| Component's "home" for state across renders | component instance (class fields, DI-resolved services) | fiber (`useState`/`useRef`/`useMemo` slots) |
| Service lifetime / scoping | DI injector: `providedIn: 'root' \| 'platform' \| 'any'` + module/component providers | `<Context.Provider value={...}>` + wherever you construct the value (module scope, `useMemo`, `useRef`, `useState`) |
| "Construct once per consumer scope" | `providers: [MyService]` on a component or lazy module | `useMemo(() => new Store(), [])` inside the provider component |
| "Construct once, globally" | `@Injectable({ providedIn: 'root' })` | module-scope `const store = new Store()` |
| Parent grabbing the child's DOM | `@ViewChild('x', { read: ElementRef })` → child exposes its host `ElementRef` | `ref={someRef}` → child must `React.forwardRef` and attach to a real DOM element |
| Animation wrapper needing the element | `@angular/animations` + trigger on host element | `<Grow>` / `<Slide>` / `<Fade>` wrapping a ref-forwarding child |

The two most misleading places for an Angular dev arriving at React:

1. **DI default inverted.** Angular caches service instances for you; React's Context does nothing — whatever object you pass to `value` is *that* render's value, full stop. Mental model for React: Context is a pub/sub channel, not an injector. If you want "inject a service," you still have to construct the service somewhere stable — `useMemo([])` is the idiomatic "per injector scope."
2. **`ref` is not a prop you forward for free.** In Angular, every component has a host element and `ElementRef` is available by construction. In React, a function component has no host; it opts into being referenceable via `forwardRef`. If you skip that opt-in, any MUI transition, portal, popper, or tooltip that wraps your component will fail in the same way `<Grow>` did here.

### Two things to carry forward

1. **Anything with identity goes in a stable slot.** If the object owns state (a store, a subscription, a cache, an event emitter), don't construct it in a render body. `useMemo([])` for per-mount singletons, module scope for app-wide singletons, `useRef` only when you actually need mutable identity.
2. **If a component might ever live inside a transition/portal/popper, give it `forwardRef`.** It's a one-time cost at the component boundary, not a per-usage cost at every call site. Skipping it is a ticking latent bug that only fires the first time someone wraps the component.
