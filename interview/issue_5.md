# Issue #5 — EN/DE language switcher with persisted preference

## The problem

The app has `react-i18next` wired up with an English bundle, but:

- `src/i18n/i18n.tsx` pins the language unconditionally with `lng: FALLBACK_LANGUAGE || browserLanguage`. `FALLBACK_LANGUAGE === "en"` is truthy, so `browserLanguage` is dead code — a `de-DE` browser still renders English.
- `src/i18n/locales/de.json` is an empty object, so even if DE were selected, every translated string would fall back to English and nothing visibly changes.
- There is no UI affordance to switch languages, and no mechanism to remember a user's choice across reloads.

## What the challenge was probably testing

1. Do you treat i18n as a **resolution pipeline** — persisted pref → browser pref → hard fallback — instead of a single config line?
2. Do you understand that a language switcher is not just a dropdown; it is a controlled component whose *value* must reflect the i18n instance's current language and whose *selection* must produce two side effects (runtime change + persistence) atomically?
3. Do you know that `react-i18next`'s `fallbackLng` is the safety net that lets you ship DE incrementally: any missing DE key must render the EN copy, never the raw key path?
4. Can you introduce the feature **without adding runtime dependencies**? `i18next-browser-languagedetector` is the obvious reach — rejecting it and writing 4 lines of `localStorage` is the right call for one key.

## How the fix works

Three surgical edits; zero new deps.

**1. `src/i18n/i18n.tsx` — resolution pipeline + persisted key export:**

```tsx
export const LANGUAGE_STORAGE_KEY = "app.language";
const getPersistedLanguage = (): string | null => {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch { return null; }
};
// …
lng: persistedLang ?? browserLanguage ?? FALLBACK_LANGUAGE,
fallbackLng: FALLBACK_LANGUAGE,
```

`??` (nullish coalescing) is the correct operator here — `""` and `"en"` are both valid locales and must not trigger fallback. The `try/catch` around `localStorage.getItem` is for Safari private mode / SSR / sandboxed iframes where access throws.

**2. `src/i18n/locales/de.json` — populated with every key the app currently reads:**

`appTitle`, `logout`, `routes./home`, `home.welcome`, `home.intro` (with `<b>bekannten</b>` so the `<Trans>` from issue #2 keeps bolding the German equivalent of "known"), and `home.sidenote`. Any key you later add to `en.json` and forget to translate falls back to English via `fallbackLng` — verified by test.

**3. `src/components/AppHeader/index.tsx` — `LanguageSwitcher` component:**

```tsx
const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = ((i18n.language || "en").split("-")[0] || "en") as Locale;
  const handleChange = (e: SelectChangeEvent) => {
    const locale = e.target.value as Locale;
    i18n.changeLanguage(locale);
    persistLocale(locale);
  };
  return (
    <Box onMouseDown={(e) => { if (e.button === 0) setOpen(true); }} …>
      <FormControl variant="standard" size="small" sx={{ minWidth: 64 }}>
        <Select open={open} onOpen={…} onClose={…} value={current} onChange={handleChange} … />
      </FormControl>
    </Box>
  );
};
```

Three non-obvious decisions baked in:

- **`FormControl` wrapper + `minWidth: 64`.** The `AppBar`'s right-side `Box` is a flex container with `flex: 1`. A bare `<Select>` inside a flex parent has `min-width: 0` and collapses to near-zero measurable width — the dropdown arrow (absolutely positioned, `pointer-events: none`) stays painted, but the display `<div>` that carries MUI's `onMouseDown` handler has no hit-area. Wrapping in `FormControl` with an explicit `minWidth` gives the display div real space under the glyph.
- **Controlled `open` state + redundant `onMouseDown` on the outer `Box`.** MUI's `Select` opens on its internal `onMouseDown`. Wiring a second handler on the wrapper Box is belt-and-suspenders: if any ancestor ever stops propagation or swallows the event, the dropdown still opens. `open` / `onOpen` / `onClose` make the Select obey our state instead of its own.
- **`i18n.language.split("-")[0]`.** `i18n.language` can be `"en-US"` on first load; the switcher's `value` must match one of the `MenuItem`s exactly or MUI logs "out-of-range value" warnings. Normalizing to the two-letter locale lets `value` land on `"en"` regardless of whether the full BCP-47 tag came from `navigator.language`.

## The regression tests

`src/components/AppHeader/index.test.tsx` adds 4 specs pinning the switcher contract, and `src/pages/Home/index.test.tsx` adds 2 specs pinning the locale surface:

- **Renders before the avatar with the current locale label** — DOM-order check via `compareDocumentPosition`.
- **Opens a menu exposing EN and DE options** — dispatches a bubbling `mousedown` (MUI's Select opens on mousedown, not click) and asserts both items are present.
- **Persists selection to `localStorage` and switches the i18n language** — click DE item, assert `localStorage["app.language"] === "de"` and `i18n.language === "de"`.
- **Reflects the active language in its label** — pre-set `i18n.changeLanguage("de")` before mount, assert the switcher reads `"DE"`.
- **Home renders in German when `i18n.language === "de"`** — asserts `Willkommen!` and that `bekannten` is wrapped in `<strong>` (the `<Trans>` from #2 still functions).
- **Home falls back to English when a DE key is missing** — removes `home.*` from the runtime DE bundle, asserts the page shows `Welcome!` rather than the raw key string `home.welcome`.

The last spec is the critical regression pin — it *proves* `fallbackLng` is doing its job, so incomplete DE translations ship safely.

## Alternative solutions

1. **`Select` standard variant + controlled `open`, + `localStorage` write.** *(Chosen.)* One dependency-free component, one storage key, reflects i18n state by reading `i18n.language` on every render. Idiomatic MUI, idiomatic React.
2. **`i18next-browser-languagedetector` + `i18next-localstorage-cache`.** Standard i18next pattern. Rejected because the issue forbids new runtime deps, and the detector ships a browser-language detection chain we already write in 3 lines.
3. **`ToggleButtonGroup` with two exclusive toggles.** One click to switch (vs. the Select's two), nicer for exactly-two options. Rejected because the acceptance criteria call for a menu-style control and Select scales past two locales without redesign.

---

## Lower-level: why each piece matters

### Why `??` and not `||` for the `lng` resolution

The original was `lng: FALLBACK_LANGUAGE || browserLanguage`. This has two bugs stacked:

- `||` treats any falsy left-hand side as "missing". `"en"` is truthy, so `browserLanguage` is unreachable — the detection is a no-op.
- Even if the operands were swapped, `||` still falls through on `""`, which is a *valid* (though meaningless) locale that a misconfigured browser might return. `??` falls through only on `null` / `undefined`, which is what "persisted pref not set" actually looks like.

The corrected precedence is `persisted ?? browser ?? fallback` — the pipeline reads top-down exactly as the acceptance criteria specify.

### Why persisting on selection (not on language-change event)

i18next exposes an `on("languageChanged", …)` event. Hooking persistence there would be more decoupled. Rejected because: (a) the Select already knows when it changed locale (it fires `onChange`), (b) centralizing the write in `persistLocale` keeps the storage key a single-file concern, and (c) `languageChanged` fires on *every* change including programmatic ones in tests, which would pollute `localStorage` from test runs unless explicitly cleared.

### Why `disableUnderline` on the Select

The `AppBar` has a dark background (`#08140C`). A standard-variant `Select` ships with a 1px bottom border that reads as a stray line under "EN". `disableUnderline` removes it. The text underneath keeps `color: inherit` so it takes the AppBar's white text color.

### Why tests dispatch `mousedown`, not `click`

MUI `Select`'s display `<div>` handles `onMouseDown`, not `onClick`. Calling `element.click()` in JSDOM fires a `click` event but not the preceding `mousedown`, so the menu never opens and the test falsely passes (finding zero MenuItems) or falsely fails (hitting the wrong code path). Dispatching `new MouseEvent("mousedown", { bubbles: true })` matches what the browser does on a real user click.

### Angular mental map

| Concern | Angular | React (this fix) |
|---|---|---|
| Translation service | `TranslateService` with `setDefaultLang` / `use` | `i18n` instance with `changeLanguage` |
| Init-time language resolution | `APP_INITIALIZER` reading `localStorage` + `translate.use(lang)` | `lng: persistedLang ?? browserLanguage ?? FALLBACK_LANGUAGE` in `i18n.init({})` |
| Missing-key fallback | `translate.setDefaultLang('en')` | `fallbackLng: "en"` |
| Get current language in a component | `translate.currentLang` | `useTranslation()` → `i18n.language` |
| Locale dropdown | `MatSelect` in `MatFormField` with `[(value)]="lang"` | `FormControl` > `Select` with `value` / `onChange` |
| Interpolate bold inside a translated string | `[innerHTML]="'key' | translate"` (risky) | `<Trans i18nKey="..." components={{ b: <strong/> }} />` |

### Two things to carry forward

1. **i18n is a resolution pipeline, not a single config value.** Always model it as `persisted ?? session/browser ?? fallback`, with `??` (not `||`) so empty strings and falsy-but-valid locales don't escape the pipeline. Writing the resolution explicitly beats bolting on `i18next-browser-languagedetector` for a switch this narrow.
2. **Controlled components in a flex parent need a guaranteed hit-area.** A `Select` that renders visually but collapses to zero click-width is a subtle class of bug — the user sees the arrow, the tests (if they query by `aria-label`) pass, and yet nothing opens. Wrapping in `FormControl` with an explicit `minWidth`, plus a redundant wrapper-level `onMouseDown`, makes the interaction immune to ancestor layout and event choices.
