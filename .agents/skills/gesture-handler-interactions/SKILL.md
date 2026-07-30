---
name: gesture-handler-interactions
description: Enables implementing touch gesture interactions with react-native-gesture-handler (tap, pan, pinch, rotation, long-press, fling, composed gestures). Activate whenever a task involves recognizing drag/swipe/pinch/rotate/long-press/multi-touch gestures, or building custom pressable/draggable/swipeable UI beyond a plain Pressable onPress.
metadata:
  source: local
  pinned-versions: react-native-gesture-handler@2.32.0, react-native@0.86.2, expo@57.0.9
---

# Gesture Handler 2.x (legacy Gesture API) — read this version note first

> **Version trap:** this project is pinned to `react-native-gesture-handler@2.32.0`
> (exact version, no `^`/`~`, matching Expo SDK 57). As of this writing,
> `docs.swmansion.com/react-native-gesture-handler` defaults its **`/docs/gestures/*`
> and `/docs/fundamentals/*` pages to a newer hook-based API** (things like
> `usePanGesture`/`useTapGesture`, described in an "Upgrading to v3" guide). **That
> hook API does not exist in 2.32.0 and must not be used here.** The API this project
> actually has — the `Gesture.Pan()`/`Gesture.Tap()` builder chained with
> `GestureDetector` — is documented on the *same site* under the
> **`/docs/legacy-gestures/*`** path. Always fetch `legacy-gestures/*` URLs, not
> `gestures/*`, when looking this up. (Confirmed by checking `node_modules`/
> `package.json` — if this package is ever upgraded past 3.0, re-derive this skill
> from the current, non-legacy docs instead.)

## What it is / setup

A declarative API exposing native touch/gesture recognition to React Native,
replacing RN's built-in Gesture Responder System for better performance and control.

The app root must be wrapped once in `GestureHandlerRootView` (already required by
Expo Router apps; check `src/app/_layout.tsx` before adding another one) — gestures
are not recognized outside of it, and composition (`Race`/`Simultaneous`/`Exclusive`)
only works between gestures mounted under the *same* root view.

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

<GestureHandlerRootView style={{ flex: 1 }}>
  {/* app */}
</GestureHandlerRootView>;
```

Source: `docs/fundamentals/getting-started` (installation), `docs/legacy-gestures/*`
(API used here).

## Core pattern: `Gesture.X()` + `GestureDetector`

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const tap = Gesture.Tap()
  .onBegin(() => { pressed.value = true; })
  .onFinalize(() => { pressed.value = false; });

<GestureDetector gesture={tap}>
  <Animated.View style={styles.box} />
</GestureDetector>;
```

`GestureDetector`:
- Creates/updates native handlers from the gesture config, and can recognize
  multiple composed gestures at once.
- Callbacks are **automatically workletized** when Reanimated is present — you can
  write directly to shared values inside `.onUpdate()` etc. with no extra ceremony.
- Uses the **first native view** in its subtree — collapsed intermediate views break
  detection; add `collapsable={false}` if gestures stop firing in a nested view.
- A gesture instance **cannot be reused across multiple `GestureDetector`s** — create
  a new one (or `useMemo`) per detector.
- Not compatible with the old `Animated` API or Reanimated 1.
- Web-only props: `userSelect` (default `"none"`), `touchAction` (default
  `"none"`), `enableContextMenu`.

Source: `docs/legacy-gestures/gesture-detector`.

## Callback lifecycle (shared by every gesture)

- `onBegin` — handler starts receiving touches
- `onStart` — gesture recognized, transitions to active
- `onUpdate` — fires repeatedly while active, with full current state (continuous gestures)
- `onChange` — fires repeatedly while active, with delta since last event (continuous gestures)
- `onEnd` — recognized gesture finishes
- `onFinalize` — handler is done regardless of success/failure
- `onTouchesDown/Move/Up/Cancelled` — raw per-finger touch tracking

## Gesture types & key config/event fields

### `Gesture.Pan()` — drag
- Config: `minDistance`, `minVelocity`/`minVelocityX`/`minVelocityY`, `minPointers`,
  `maxPointers`, `activeOffsetX`/`Y`, `failOffsetX`/`Y`, `activateAfterLongPress`,
  `averageTouches` (Android), `enableTrackpadTwoFingerGesture` (iOS).
- Event data: `translationX/Y` (accumulated since gesture start), `velocityX/Y`,
  `x/y` (relative to the attached view), `absoluteX/Y` (relative to window — prefer
  these when the view itself is being transformed).

```tsx
const offset = useSharedValue(0);
const pan = Gesture.Pan()
  .onChange((e) => { offset.value += e.changeX; })
  .onFinalize((e) => {
    offset.value = withDecay({ velocity: e.velocityX, rubberBandEffect: true });
  });
```

### `Gesture.Pinch()` — pinch-to-zoom
- Event data: `scale` (relative to the two touches), `velocity`, `focalX/Y`.
```tsx
const pinch = Gesture.Pinch()
  .onUpdate((e) => { scale.value = savedScale.value * e.scale; })
  .onEnd(() => { savedScale.value = scale.value; });
```

### `Gesture.Rotation()`
- Event data: `rotation` (radians), `velocity`, `anchorX/Y`.
```tsx
const rotation = Gesture.Rotation()
  .onUpdate((e) => { rotationSv.value = savedRotation.value + e.rotation; })
  .onEnd(() => { savedRotation.value = rotationSv.value; });
```

### `Gesture.Tap()`
- Config: `minPointers` (default 1), `numberOfTaps` (default 1), `maxDuration`
  (default 500ms), `maxDelay` (default 500ms, gap allowed between multiple taps),
  `maxDistance`, `maxDeltaX/Y`.
- Use `Gesture.Exclusive(doubleTap, singleTap)` to disambiguate single vs. double tap
  (put the higher-priority/more-specific gesture first).

### `Gesture.LongPress()`
- Config: `minDuration` (default 500ms), `maxDistance` (default 10pt).
```tsx
const longPress = Gesture.LongPress().onEnd((e, success) => {
  if (success) console.log(`held for ${e.duration}ms`);
});
```

### `Gesture.Fling()` — quick directional swipe
- Config: `direction(Directions.RIGHT | Directions.LEFT)`, `numberOfPointers`.
```tsx
const fling = Gesture.Fling()
  .direction(Directions.RIGHT)
  .onStart(() => { position.value = withTiming(position.value + 10); });
```

Source: `docs/legacy-gestures/pan-gesture`, `pinch-gesture`, `rotation-gesture`,
`tap-gesture`, `long-press-gesture`, `fling-gesture`.

## Composing multiple gestures

```tsx
const composed = Gesture.Simultaneous(
  panGesture,
  Gesture.Simultaneous(pinchGesture, rotationGesture)
);

<GestureDetector gesture={composed}><Animated.View style={style} /></GestureDetector>;
```

- `Gesture.Race(a, b, ...)` — only one can become active; first to activate cancels
  the rest (e.g. a `Pan` inside a `ScrollView` where only one should win).
- `Gesture.Simultaneous(a, b, ...)` — all can be active at once, no cancellation
  (drag + pinch + rotate together, e.g. a photo viewer).
- `Gesture.Exclusive(a, b, ...)` — only one active, but `a` has priority over `b`
  (single-tap vs. double-tap).

Source: `docs/legacy-gestures/gesture-composition`.

## Related

- Turning gesture events into motion: `../reanimated-animations/SKILL.md`
- Full worked patterns (press-scale, swipe-to-dismiss, drag-and-drop, pinch-zoom):
  `../reanimated-gesture-interactivity/SKILL.md`
