---
name: reanimated-animations
description: Enables writing and reviewing UI animations with react-native-reanimated (shared values, useAnimatedStyle, withTiming/withSpring/withDecay, layout & entering/exiting animations). Activate whenever a task involves animating any view, prop, or layout change in this app — fades, scale/translate transforms, list item enter/exit, progress bars, spring-back interactions, etc.
metadata:
  source: local
  pinned-versions: react-native-reanimated@4.5.1, react-native-worklets@0.10.1, react-native@0.86.2, expo@57.0.9
---

# Reanimated 4 animations

This project is pinned to **react-native-reanimated 4.5.1**. Reanimated 4 is a
major-version jump from 3.x: it **only supports the React Native New Architecture
(Fabric)**, and the worklet runtime/babel plugin was split into a separate package,
`react-native-worklets` (installed here at 0.10.1). If you ever see v3-era snippets
online that import `runOnJS`/`runOnUI` from `react-native-reanimated` directly or
reference the old Reanimated babel plugin path, prefer this project's setup instead.

> If anything below seems off for the installed version, re-fetch the source page
> (URLs are given per section) rather than trusting memory — Reanimated's API has
> changed across major versions (see `guides/migration-from-3.x`).

## Setup (already done in this repo — for reference only)

- `babel.config.js` plugin must be `'react-native-worklets/plugin'`, and it **must be
  last**. In this repo's actual `babel.config.js` it's listed as the last entry of the
  `presets` array (alongside `babel-preset-expo` and `nativewind/babel`), not a
  separate `plugins` array — match that placement, don't add a new `plugins` array.
- Root wrapper isn't Reanimated-specific; New Architecture is required (Fabric is on
  by default in Expo SDK 57 / RN 0.86).
- Source: `docs/fundamentals/getting-started`

## Core building blocks

### Animated components
`Animated.View`, `Animated.Text`, `Animated.ScrollView`, etc. are Reanimated-aware
wrappers around RN built-ins. Wrap any other component (including this repo's own
`src/components/ui/*`) with `Animated.createAnimatedComponent(MyComponent)` to make
it animatable.

### Shared values — `useSharedValue`
The driving factor of every animation. Always read/write through `.value`, never
reassign the binding itself.

```tsx
import { useSharedValue } from 'react-native-reanimated';

const width = useSharedValue(100);
width.value = 150;              // ok
// width = 150;                  // wrong — do not do this
```

### `useAnimatedStyle` / `useAnimatedProps`
Use `useAnimatedStyle` to compute a style object from shared values — it lets you do
math/conditionals that inline `style={{ width }}` can't:

```tsx
const animatedStyles = useAnimatedStyle(() => ({
  transform: [{ translateX: withSpring(translateX.value * 2) }],
}));

<Animated.View style={[styles.box, animatedStyles]} />;
```

`useAnimatedProps` is the equivalent for non-style props (e.g. animating an SVG
`r`/`cx` attribute) — the target component must be wrapped with
`createAnimatedComponent` and receive the result via the `animatedProps` prop.

### `useDerivedValue`
Creates a new **readonly** shared value computed from other shared values, staying
reactive without a re-render:

```tsx
const derived = useDerivedValue(() => sv.value * 50);
```
Use `useAnimatedReaction` instead if you need the *previous* value of a shared value,
not just its current derived value.

Source: `docs/core/useSharedValue`, `docs/core/useAnimatedStyle`,
`docs/core/useDerivedValue`, `docs/fundamentals/animating-styles-and-props`.

## Animation functions

| Function | Use for |
|---|---|
| `withTiming(toValue, { duration, easing })` | Duration/easing-based tweening |
| `withSpring(toValue, config?)` | Bouncy, physically-based motion |
| `withDecay({ velocity, deceleration, clamp, rubberBandEffect, rubberBandFactor })` | Friction/momentum motion (e.g. after a pan gesture's release velocity) |

Assign the result straight to `.value`:
```tsx
offset.value = withSpring(target);
offset.value = withDecay({ velocity: e.velocityX, clamp: [0, 300], rubberBandEffect: true });
```

Source: `docs/animations/withTiming`, `docs/animations/withSpring`,
`docs/animations/withDecay`.

## Modifiers (composing animations)

Built-in modifiers: `withDelay`, `withRepeat`, `withSequence`, `withClamp`. They
nest freely:

```tsx
offset.value = withDelay(
  DELAY,
  withSequence(
    withTiming(-OFFSET, { duration: TIME / 2 }),
    withRepeat(withTiming(OFFSET, { duration: TIME }), 5, true), // 3rd arg = reverse
    withTiming(0, { duration: TIME / 2 })
  )
);
```
`withRepeat(animation, numberOfReps, reverse?)` — pass `0` or a negative number to
repeat indefinitely.

Source: `docs/fundamentals/applying-modifiers`.

## `interpolate`

Map a driving value onto another range (opacity, rotation, color-adjacent numeric
props). Default extrapolation `EXTEND`s past the range — pass `Extrapolation.CLAMP`
for progress bars / scroll-linked effects:

```tsx
import { interpolate, Extrapolation } from 'react-native-reanimated';

const opacity = interpolate(sv.value, [0, 100], [0, 1], Extrapolation.CLAMP);
```
Per-edge control: `{ extrapolateLeft: Extrapolation.CLAMP, extrapolateRight: Extrapolation.EXTEND }`.

Source: `docs/utilities/interpolate`.

## Layout animations (mount/unmount/reorder)

Apply via `entering`/`exiting` props — no manual shared values needed for simple
cases:

```tsx
import { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

<Animated.View entering={FadeIn} exiting={FadeOut} layout={LinearTransition} />;
```

- Families: `FadeIn/Out`, `SlideIn/Out*`, `ZoomIn/Out*`, `BounceIn/Out*`,
  `FlipInEasyX/Y`, `LightSpeed*`, `Pinwheel*`, `Roll*`, `Rotate*`, `Stretch*`.
- Chain modifiers: `.duration(ms)`, `.easing(fn)`, `.springify()` (+ `.damping()`,
  `.mass()`, `.stiffness()`), `.delay(ms)`, `.withCallback((finished) => {})`.
- **Define these outside the component (or via `useMemo`)** — the docs explicitly
  recommend this to avoid recreating the animation object every render:
  ```tsx
  const enter = FadeInDown.delay(200).springify();
  ```
- `layout` prop (`LinearTransition`, `SequencedTransition`, `FadingTransition`,
  `JumpingTransition`, `CurvedTransition`, `EntryExitTransition`) animates position/
  size changes when a component re-renders in a new spot (e.g. list reordering,
  conditional layout shifts).

Source: `docs/layout-animations/entering-exiting-animations`,
`docs/layout-animations/layout-transitions`.

## Worklets — the one rule that matters most

`useAnimatedStyle`, `useDerivedValue`, and gesture callbacks (see
[[gesture-handler-interactions]]) are **automatically workletized** — their
callback body runs on the UI thread, not the JS thread. Consequences:

- Mark any other function that must also run on the UI thread with a
  `'worklet';` directive as its first statement.
- Worklets are closures: only variables actually referenced inside the worklet body
  get captured. Don't capture large objects — destructure the specific field you
  need instead.
- To call back into JS from a worklet (e.g. `setState`, analytics, navigation), use
  `scheduleOnRN(fn)` (`runOnJS` in older docs/snippets). To force JS→UI, use
  `scheduleOnUI(worklet)`.
- Worklet functions are **not hoisted** like normal JS functions.

Source: `docs/guides/worklets`, `docs/fundamentals/glossary`.

## Related

- Driving animations from touch: `../gesture-handler-interactions/SKILL.md`
- Combining both for full interactivity (drag, swipe-to-dismiss, pinch-zoom,
  press-scale): `../reanimated-gesture-interactivity/SKILL.md`
