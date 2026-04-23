# Issue #1 — Stable list keys on the Home page

## The problem

React renders lists by diffing a new render's children against the previous render's children. To do that efficiently it needs a stable identity per child. In `src/pages/Home/index.tsx` the list was:

```tsx
{issues.map((issue) => (
  <ListItem>...</ListItem>
))}
```

No identity information was given, so React fell back to using each child's **position** in the array as identity and emitted:

> Warning: Each child in a list should have a unique "key" prop.

On the Home page the list is static and nothing reorders, so the symptom is only a console warning. But the warning is a linter for a real class of bugs that surface as soon as the list becomes dynamic:

1. **Stale state bound to the wrong row.** If a child holds local state (uncontrolled `<input>`, an open menu, an animation timer) and you remove the first row, React — matching by index — thinks every surviving row just "became" the row above it. Their DOM nodes get reused, but their state now belongs to the wrong data.
2. **Broken transitions / refs.** `<Grow>`, focus, measured DOM nodes, and anything depending on a stable DOM element across renders break the same way.
3. **Unnecessary remounts or missed updates** when rows reorder.

## What the challenge was probably testing

1. Can you read a console warning and trace it to its cause?
2. Do you understand *why* React needs keys, not just *that* it wants one? The lazy fix is `key={index}`; the correct fix is a stable id tied to the data.
3. Do you pick a *stable* id? `issue.title` kind of works but is fragile (titles change, two rows could share a title). A dedicated `id` field is the canonical answer.

## How the fix works

Two changes in `src/pages/Home/index.tsx`:

1. Each entry in the `issues` array gets an explicit, human-readable `id`.
2. The renderer uses it: `<ListItem key={issue.id}>`.

Each `<ListItem>` now has a stable, unique identity across renders. React's reconciler matches old children to new children by id, preserves their DOM/state across any future reorders, and the warning disappears.

The refactor (hoisting `issues` to module scope + an `Issue` interface) signals intent: the data is static, the ids are stable by construction.

## The regression test

`src/pages/Home/index.test.tsx`:

- Spies on `console.error` (React's dev-warning channel).
- Renders `<Home />`.
- Scans the spy's calls for the exact key-warning string.
- Fails if it finds one.

This is a regression test for the whole component: if anyone later adds another `.map` without a key, the same test catches it.

## Alternative solutions

1. **`key={issue.id}` with a dedicated id field.** *(Chosen.)* Stable across reorders/edits/inserts; self-documenting; matches how real data looks from a backend.
2. **`key={issue.title}`.** No schema change, but breaks silently if two rows share a title, or the title is edited (unnecessary remount).
3. **`key={index}`.** Suppresses the warning in one line; is exactly the anti-pattern the warning exists for. Rejected by the PRD.
4. **`crypto.randomUUID()` per render.** Catastrophic — a fresh key every render means every row unmounts and remounts every render. Focus, animations, scroll position all wiped.
5. **`useId()` per row / `useMemo` ids.** Hooks can't be called inside `.map` (needs a wrapper component), and ids assigned on first render don't survive a parent remount. More machinery than the problem warrants.
6. **Key by translation key / CMS id.** Overkill here, but how it would look in production if the copy were translated — the translation key *is* the stable id.

---

## Lower-level: how React's reconciler actually uses the key

### The two-tree architecture

Every render, React produces a **tree of elements**. Elements are plain JS objects: `{ type: ListItem, props: {...}, key: "x" }`. They are disposable — a fresh tree every render.

Separately, React maintains a **tree of fibers** internally. A fiber is the persistent node. It holds:

- the component instance (or the DOM node, for host elements),
- the hook state (`useState`, `useRef`, `useEffect` cleanup fns),
- a link to its corresponding DOM node,
- pointers to parent/sibling/child fibers.

Elements are the blueprint you hand React; fibers are the actual living building. **Reconciliation** maps a new blueprint onto the existing building — updating what it can, demolishing and rebuilding what it can't. Hook state lives on the fiber, not the element. *Preserving a fiber across renders preserves its state.*

### The matching rule

For each pair of "old fiber" and "new element" at the same tree position:

1. **Same `type` and same `key`?** → Reuse the fiber. Update props, recurse into children.
2. **Anything else?** → Unmount the old fiber (run cleanups, fire `useEffect` destructors, destroy the DOM node). Mount a new one (fresh state, fresh refs, effects from scratch).

For sibling lists specifically:

- **With keys**: build a `Map<key, oldFiber>`; look up each new element by key. O(n).
- **Without keys**: pair by array index.

### Worked example: deleting the first row

Old children: `[A, B, C]` — three `<Row>` fibers, each with a `useState` holding e.g. an "is-expanded" flag.
New children: `[B, C]` (user deleted A).

**Without keys** (positional match):

```
new[0] = B  ←→  old[0] = A    same type, update props
new[1] = C  ←→  old[1] = B    same type, update props
                old[2] = C    no match → unmount
```

A and B's fibers are reused with new props. Their `useState` is intact. So A's "expanded" flag is now attached to B's data; B's is now on C's; C's flag (plus any `useEffect` cleanup) is silently destroyed. DOM looks right; behavior is subtly wrong.

**With keys** (map match):

```
new[0] key="B"  ←→  old fiber key="B"   reuse
new[1] key="C"  ←→  old fiber key="C"   reuse
                    old fiber key="A"   no match → unmount
```

State travels with data. Correct.

### Angular `trackBy` vs React `key`

|                                     | Angular `*ngFor`                    | React `.map`                 |
|-------------------------------------|-------------------------------------|------------------------------|
| Default identity                    | object reference (`===` on item)    | array index                  |
| Override mechanism                  | `trackBy: fn` returning an id       | `key={id}` prop              |
| Behavior if you `.map()` to copy    | tears everything down (refs change) | happily reuses (positions stable) |
| Behavior on reorder without override | tears down + rebuilds matched items | silently pairs by wrong position |

The defaults push you toward *different* failure modes. Angular's default punishes you immediately (visible remounts — you notice). React's default punishes you invisibly (stale state on surviving rows). That's why React has an explicit dev warning for it and Angular generally doesn't.

### Two things `key` does that `trackBy` doesn't

**1. Force-remount as an API.** Changing the key of a *single* element tells React "treat this as a different thing":

```tsx
<UserForm key={userId} user={user} />
```

When `userId` changes, the entire form subtree unmounts and remounts: draft values, validation flags, focus — all reset. Angular has no single-primitive equivalent; you'd use `*ngIf` or reset the form manually.

**2. Scope is siblings, not global.** Keys only need to be unique among direct siblings in the same parent. Two `<Row key="1">` in different lists don't conflict. `key={"row-" + idx}` inside one list is unique but not stable across reorders — that's the subtle failure mode.

### Mental model to carry forward

- Elements = description, recreated every render, cheap.
- Fibers = identity + state, persist across renders. *That's where your `useState` actually lives.*
- `key` (or, for singletons, component `type`) is the equality function React uses to decide which fiber a new element inherits.
- If you wouldn't trust array index as a primary key in a database, don't trust it as a React key.
