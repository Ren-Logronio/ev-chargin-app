---
name: react-native-reusables
description: Enables creating, modifying, and adding UI components in this app using the React Native Reusables (RNR) conventions — a shadcn/ui-style registry of copy-in components built on Nativewind + RN Primitives. Activate whenever a task involves adding a new src/components/ui/* primitive, extending an existing one (Button, Input, Label, Text), or building a screen that needs a component RNR provides (Dialog, Select, DropdownMenu, Accordion, etc.).
metadata:
  source: local
  pinned-versions: components.json style=new-york, baseColor=neutral, cssVariables=true
---

# React Native Reusables (RNR)

> Not a runtime component library — there is no `react-native-reusables` npm package to
> import from. The CLI **copies component source into this repo**
> (`src/components/ui/*`), which you then own and can edit directly. Treat everything
> under `src/components/ui/` as project code, not a vendored dependency.

## What this project already has

- `components.json` — style `new-york`, base color `neutral`, CSS variables on,
  aliases `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`.
- Installed components: `button.tsx`, `input.tsx`, `label.tsx`, `text.tsx`
  (`src/components/ui/`).
- `src/lib/utils.ts` — the `cn()` helper (`twMerge(clsx(inputs))`), used by every
  component for className composition.
- `src/lib/theme.ts` + `global.css` — theme colors defined in both places (oklch),
  kept in sync manually. **If you change a color in one, update the other** — RNR's
  own docs call this out explicitly, there's no single source of truth file.
- `@rn-primitives/portal` is already a dependency, but **no `<PortalHost />` is
  mounted in `src/app/_layout.tsx` yet**. Before adding any portal-based component
  (Dialog, AlertDialog, DropdownMenu, Select, Popover, Tooltip, ContextMenu, Menubar,
  HoverCard), add `PortalHost` from `@rn-primitives/portal` near the root of
  `RootLayout` in `_layout.tsx` — otherwise those components will render nothing
  visible on native.

## Adding a new component

```bash
npx @react-native-reusables/cli@latest add <component>
# multiple at once:
npx @react-native-reusables/cli@latest add button dialog select
# everything:
npx @react-native-reusables/cli@latest add --all
```

This project uses npm (see `package-lock.json`), so always use the `npx` form above,
not `pnpm dlx`/`bunx`/`yarn dlx`. Useful flags: `-o/--overwrite` to re-pull a component
you've since diverged from upstream, `--styling-library nativewind` if it ever fails to
auto-detect (this project uses Nativewind, not Uniwind).

Run `npx @react-native-reusables/cli@latest doctor` if a newly-added component behaves
oddly — it checks the project setup (aliases, theme files, styling library detection)
for misconfiguration before you go debugging the component itself.

Full available component catalog (`/docs/components/*`): accordion, alert,
alert-dialog, aspect-ratio, avatar, badge, button, card, checkbox, collapsible,
context-menu, dialog, dropdown-menu, hover-card, input, label, menubar, popover,
progress, radio-group, select, separator, skeleton, switch, tabs, text, textarea,
toggle, toggle-group, tooltip.

There's also a Clerk-oriented "Authentication" blocks section
(`/docs/blocks/authentication`: sign-in-form, sign-up-form, forgot/reset-password,
verify-email, social-connections, user-menu) — **this project uses Firebase Auth**
(`src/modules/firebase-auth/`), not Clerk, so those blocks don't apply directly. Treat
them only as a UI-layout reference if building a new auth screen, not as installable
code, and re-wire any Clerk-specific logic to this project's `authContext`/
`FirebaseAuthService` instead.

## Key differences from web shadcn/ui (don't port web patterns blindly)

- **No cascading styles.** A child `Text` doesn't inherit a parent's className the
  way it would on the DOM. Components that need to push text styling down (like
  `Button`) wrap children in `TextClassContext.Provider` with the resolved variant
  classes — see `src/components/ui/button.tsx:93-101` for the pattern already in this
  repo. Follow this same wrapper approach for any new component whose text content
  should react to a `variant`/`size` prop.
- **No `data-*` attributes.** Variants that on web would key off `data-state`/
  `data-disabled` must instead key off props or local state (e.g. `props.disabled`,
  a `pressed` boolean) — see the `disabled && 'opacity-50'` line in `button.tsx`.
- **Icons go through a wrapper**, not raw `lucide-react-native` imports:
  ```tsx
  import { Icon } from '@/components/ui/icon'; // add via: npx @react-native-reusables/cli@latest add icon
  import { ArrowRight } from 'lucide-react-native';

  <Icon as={ArrowRight} className="text-red-500" size={16} />
  ```
  This exists so every icon usage gets consistent `className`→style mapping
  (via `cssInterop`) without wrapping each Lucide icon individually. Not yet
  installed in this repo — add it the first time a component needs an icon.
- **Some components can't be controlled with `open`/`onOpenChange`.** `DropdownMenu`
  and similar overlay components instead expose a `ref` you call `.open()`/`.close()`
  on after layout calculation — check the specific component's doc page
  (`docs/components/<name>`) before assuming a web-shadcn controlled-component API
  will work verbatim.
- **Styling is `cva` + Nativewind classes**, not CSS-in-JS — every variant surface
  (`variant`, `size`, etc.) is a `class-variance-authority` config object, exactly
  like `buttonVariants`/`buttonTextVariants` in the existing `button.tsx`. Use that
  file as the template when hand-rolling a new component variant instead of adding
  one via the CLI.

## Related

- Styling utility classes: this project's `nativewind`/tailwind setup (see
  `tailwind.config.js`, `global.css`).
- Driving a component's own transform/opacity beyond what `active:` classes can
  express: `../reanimated-animations/SKILL.md` and
  `../reanimated-gesture-interactivity/SKILL.md`.
