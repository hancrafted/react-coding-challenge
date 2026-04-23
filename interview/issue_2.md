# Issue #2 — Render bold "known" via `<Trans>` without changing i18n strings

## The problem

`src/i18n/locales/en.json` contains literal markup inside the translated sentence:

```json
"intro": "...Here the list of <b>known</b> issues:"
```

The Home page rendered it with `{t("home.intro")}`. Because React escapes text output, the user literally saw the characters `<b>known</b>` on screen instead of a bold word. The fix must not touch the JSON (translators own content) and must not use `dangerouslySetInnerHTML` or manual string splitting.

## What the challenge was probably testing

1. Do you know that `react-i18next` has a first-class primitive for "inject a React element into the middle of a translated sentence"?
2. Can you articulate why `<Trans>` is preferable to the two obvious-but-wrong alternatives (`dangerouslySetInnerHTML`, string-splitting)?
3. Do you keep content and presentation separated — translation owns the sentence, component owns the tag that renders bold?

## How the fix works

Two edits in `src/pages/Home/index.tsx`:

1. Import `Trans` alongside `useTranslation`.
2. Replace `{t("home.intro")}` with:

   ```tsx
   <Trans i18nKey="home.intro" components={{ b: <strong /> }} />
   ```

At render time `<Trans>` looks up `home.intro` (same as `t()` would), then parses the resulting string's `<tagName>` markers as pseudo-JSX. Every `<b>` in the translation is replaced by the element under `components.b` — here a `<strong />`. The text between `<b>` and `</b>` is injected as that element's children. Result in the DOM:

```html
… the list of <strong>known</strong> issues:
```

Notes:

- `<strong />` is self-closing **on purpose**. Children come from the translation, not from JSX. Any children you pass here are ignored.
- The key `b` in `components` simply has to match the tag name used inside the translation string; if the JSON said `<link>…</link>` you'd pass `components={{ link: <a href="..." /> }}`.
- The translation file stays untouched; `de.json` can reword, reorder, or drop `<b>…</b>` without any code change.
- `<b>` is a purely visual tag; mapping it to `<strong>` at the render layer silently upgrades to the semantic element (better for a11y/SEO).

## The regression test

Appended to `src/pages/Home/index.test.tsx`: render `<Home />`, query for a `<strong>` element whose text is exactly `known`, assert it exists. With the old `{t(...)}` code the test fails (no `<strong>` in the DOM); with `<Trans>` it passes. This pins the behavior so a future refactor that "simplifies" back to `{t("home.intro")}` trips the test immediately.

## Alternative solutions

1. **`<Trans components={{ b: <strong /> }} />`.** *(Chosen.)* Idiomatic `react-i18next`; keeps JSON as the single source of truth; produces a real DOM element (no HTML-string parsing); translator-safe.
2. **`<span dangerouslySetInnerHTML={{ __html: t("home.intro") }} />`.** One line, works. Reintroduces the XSS surface React normally closes — any translation value that ever becomes user-influenced (e.g. contains a `{{name}}` filled from user input) becomes an injection vector. Explicitly forbidden by the PRD.
3. **Manual split: `t("home.intro").split(/<b>|<\/b>/)` then render `{before}<strong>{bold}</strong>{after}`.** No new dependency, but hard-codes the markup shape and word order of one language. The moment `de.json` rewords or uses two bolds, it silently renders wrong. Also forbidden by the PRD.
4. **Break the key into three** (`home.intro.before`, `home.intro.bold`, `home.intro.after`). Works without `<Trans>`, but forces every translator to keep that exact three-part structure forever. Pollutes the translation file with presentation concerns.

---

## Lower-level: mental model coming from ngx-translate

The easy mappings are identical to Angular:

| Concept | ngx-translate | react-i18next |
|---|---|---|
| Plain lookup | `{{ 'home.intro' \| translate }}` | `t('home.intro')` |
| Named interpolation | `"Hello {{name}}"` → `translate:{name}` | `"Hello {{name}}"` → `t('k', { name })` |
| Namespaces | feature-module `TranslateModule.forChild` | `useTranslation('app')` |

The interesting delta is **rich content**. ngx-translate has no first-class primitive for "insert a real Angular component in the middle of a translated sentence", so teams reach for `[innerHTML]`, string splitting, or multiple keys — all the anti-patterns we reject above. `<Trans>` *is* that missing primitive.

### How `<Trans>` parses a translation

Given `"... <b>known</b> issues:"` and `components={{ b: <strong /> }}`:

```
tokens:    [text "… "] [<b>] [text "known"] [</b>] [text " issues:"]
tag map:   <b>  →  components.b  →  <strong />
children:  text between <b>…</b> becomes children of <strong />
output:    … <strong>known</strong> issues:
```

### Variants worth recognizing

```tsx
// Named tags (this PR). Best when tag name carries meaning.
<Trans i18nKey="home.intro" components={{ b: <strong /> }} />

// Indexed tags. Translation: "... <0>known</0> ..." — pass an array.
<Trans i18nKey="home.intro" components={[<strong />]} />

// Mix of {{values}} and <tags>. The {{count}} is filled from `values`;
// the <1> is replaced by the <a>.
// "You have <1>{{count}} messages</1> waiting."
<Trans
  i18nKey="inbox.summary"
  values={{ count }}
  components={[<span />, <a href="/inbox" />]}
/>
```

### Closest Angular analogy

Angular's built-in `$localize` / `i18n` attribute extracts inline tags as placeholders (`{$START_TAG_STRONG}known{$CLOSE_TAG_STRONG}`) that translators keep around. `<Trans components={{ b: <strong /> }}>` is the runtime, JSON-driven version of that same idea: tags in the translation are placeholders, `components` maps each placeholder tag name to a real React element.

### Two things to internalize

1. **Tag name in JSON ↔ key in `components`.** They only need to match each other. Rename both in lockstep if you want.
2. **The element in `components` is a shell.** Children, text, and interpolated values come from the translation — not from JSX. Treat the provided element as a *wrapper template*, not as a full node.
