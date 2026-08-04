---
name: nativewind-styling
description: Nativewind (Tailwind CSS for React Native) styling conventions for this app — className usage, dark mode variables, config file locations, and native-only gotchas. Activate for any task styling a component with `className`, editing `tailwind.config.js`/`src/global.css`, or debugging classes that don't apply.
metadata:
  source: local
  pinned-versions: "nativewind 4.2.6, tailwindcss 3.4.17 (not v4), no styling-library web target — android/ios only"
---

# Nativewind

Full docs: https://www.nativewind.dev/llms.txt. This project is native-only (`package.json`
scripts are only `android`/`ios`, no `web`) — don't reach for web-specific Tailwind/DOM
behavior that Nativewind doesn't emulate on native.

## Where this lives in this project

- `tailwind.config.js` — `content: ["./src/**/*.{js,jsx,ts,tsx}"]`, preset
  `nativewind/preset`, plus `tailwindcss-animate`. Theme colors are CSS-variable-backed
  (`hsl(var(--border))` etc.) so they can be re-themed without touching this file — see
  `src/lib/theme.ts` below.
- `src/global.css` — `@tailwind base/components/utilities` plus the actual `--background`,
  `--primary`, `--border`, ... custom property values, defined once under `:root` (light)
  and again under `.dark` (dark). **This is the single source of truth for color values**
  fed into `tailwind.config.js`'s `theme.extend.colors`.
- `src/lib/theme.ts` — `THEME.light`/`THEME.dark` duplicate the same oklch values as plain
  JS (for React Navigation's `NAV_THEME`, which can't consume CSS variables). **Any color
  change must be made in both `global.css` and `theme.ts`** — there is no single file that
  generates the other, per `../react-native-reusables/SKILL.md`.
- `babel.config.js` — `jsxImportSource: "nativewind"` on `babel-preset-expo`, plus the
  `nativewind/babel` preset. Both are required for `className` to compile to styles at all.
- `metro.config.js` — wraps the base config with `withNativeWind(config, { input:
  'src/global.css', inlineRem: 16 })`. If Metro doesn't pick up a `tailwind.config.js` or
  `global.css` change, clear the Metro cache (`expo start -c`) before assuming the styling
  is wrong.
- `src/lib/utils.ts` — `cn()` (`twMerge(clsx(inputs))`). Use this whenever composing
  conditional or overridable class strings — never string-concatenate classNames by hand,
  since Tailwind class conflicts (e.g. two `p-*` values) need `twMerge`'s resolution order.

## Dark mode

`tailwind.config.js` sets `darkMode: 'class'` (matching the official RNR template).
Nativewind's colorScheme starts by mirroring OS `Appearance`/system color scheme
automatically, so `dark:` variant classes (`className="bg-white dark:bg-black"`) still
track the system out of the box with **no manual wiring required** — `'class'` mode
doesn't mean you must toggle it yourself, it just means a manual override becomes
*possible*. This is separate from `src/app/_layout.tsx:33`'s own `useColorScheme()`
call from `react-native`, which only feeds React Navigation's `NAV_THEME` (a JS
object, not classNames) — don't confuse the two or assume changing one affects the
other.

If a component needs the current scheme in JS logic (not just classNames), read it via
Nativewind's own `useColorScheme()` from `nativewind`, not `react-native`'s — only
Nativewind's version is guaranteed to match the `dark:` class state:

```ts
import { useColorScheme } from 'nativewind'
const { colorScheme, setColorScheme } = useColorScheme()
```

With `darkMode: 'class'`, `setColorScheme()`/`toggleColorScheme()` now work (they'd
throw under the old `'media'` default). Calling `setColorScheme('dark' | 'light')`
pins the scheme and stops it from following OS changes until `setColorScheme('system')`
is called again — only reach for this if building an explicit in-app theme toggle, not
for normal system-following dark mode which already works without it.

## className usage and gotchas

- **Not every RN component accepts `className`.** Nativewind patches `View`, `Text`,
  `Image`, `Pressable`, `ScrollView`, `TextInput`, and other core RN primitives out of the
  box. A third-party component (e.g. from an unpatched vendor library) needs
  `cssInterop(Component, { className: 'style' })` called once (usually at the top of the
  file that wraps it) before `className` will have any effect — see how
  `@rn-primitives/*` components are wrapped in `src/components/ui/` for the pattern used
  here.
- **No cascading styles.** A `<Text>` nested inside a styled `<View>` does not inherit the
  parent's classes — this is exactly why `TextClassContext.Provider` exists in
  `src/components/ui/button.tsx`. Full detail already covered in
  `../react-native-reusables/SKILL.md` — don't re-solve this per component.
- **`active:`/`focus:` work, `hover:` is gated.** `tailwind.config.js` sets
  `future.hoverOnlyWhenSupported: true`, so `hover:` classes only apply on inputs that
  report hover capability (i.e. web/mouse-driven), not on a touchscreen — don't rely on
  `hover:` alone to convey pressed state on native, use `active:` or a `pressed` prop
  instead.
- **Arbitrary values work** (`w-[137px]`, `text-[#1a2b3c]`) but arbitrary *properties*
  (`[mask-type:luminance]`) generally don't have a native RN equivalent — check
  https://www.nativewind.dev/llms.txt for the current supported-properties list before
  reaching for an obscure utility, since RN's style system doesn't implement full CSS.
- **`className` ordering/specificity follows Tailwind's own cascade, not source order** —
  when two classes conflict, resolve it with `cn()`/`twMerge`, not by reordering the
  string and hoping the last one wins.
- **Platform variants** (`ios:`, `android:`, `web:` — Nativewind-specific, not standard
  Tailwind) are the idiomatic way to branch styling per-platform, e.g.
  `className="pt-4 ios:pt-12"`, rather than importing RN's `Platform.select` just to swap
  a className string.

## Adding a new theme color

1. Add the CSS variable to **both** `:root` and `.dark` blocks in `src/global.css`.
2. Add the matching key to `theme.extend.colors` in `tailwind.config.js` (as
   `'hsl(var(--your-name))'`, following the existing entries).
3. Add the same oklch value to **both** `THEME.light` and `THEME.dark` in
   `src/lib/theme.ts` if the color needs to reach React Navigation (`NAV_THEME`) — skip
   this step if it's purely a Tailwind utility color never used outside `className`.

## Related

- Component-level styling conventions (variants via `cva`, icon wrapper, portal-based
  components): `../react-native-reusables/SKILL.md`.
- Driving styles via animated values instead of static classes (`useAnimatedStyle`,
  shared values) rather than `active:`/`dark:` classes:
  `../reanimated-animations/SKILL.md`.
