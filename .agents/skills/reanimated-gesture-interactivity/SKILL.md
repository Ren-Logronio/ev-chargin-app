---
name: reanimated-gesture-interactivity
description: Enables combining react-native-reanimated with react-native-gesture-handler for full touch-driven UI interactivity — press-scale feedback, swipe-to-dismiss, drag-and-drop, pinch-to-zoom, pull-to-refresh-style rubber-banding. Activate whenever a task needs a view's animation to be driven directly by a user's finger (not just a fire-and-forget animation on mount/press).
metadata:
  source: local
  pinned-versions: react-native-reanimated@4.5.1, react-native-gesture-handler@2.32.0
---

# Combining Reanimated + Gesture Handler

Read `../reanimated-animations/SKILL.md` and `../gesture-handler-interactions/SKILL.md`
first if you haven't — this skill assumes both and only covers the seam between them.
In particular, remember the version trap: this project uses the **legacy**
`Gesture.X()` builder API (`react-native-gesture-handler@2.32.0`), not the newer hook
API that `docs.swmansion.com` shows by default.

## The core seam

`GestureDetector` callbacks are auto-workletized, so you write straight to shared
values inside them, and `useAnimatedStyle` picks the change up on the UI thread —
no bridge hop, no `setState`, no re-render:

```tsx
const offset = useSharedValue(0);
const pressed = useSharedValue(false);

const pan = Gesture.Pan()
  .onBegin(() => { pressed.value = true; })
  .onChange((e) => { offset.value += e.changeX; })
  .onFinalize(() => {
    offset.value = withSpring(0);
    pressed.value = false;
  });

const style = useAnimatedStyle(() => ({
  transform: [{ translateX: offset.value }, { scale: withTiming(pressed.value ? 1.05 : 1) }],
}));

<GestureDetector gesture={pan}>
  <Animated.View style={[styles.card, style]} />
</GestureDetector>;
```

`onChange` gives deltas (`changeX`/`changeY`) — accumulate into the shared value.
`onUpdate` gives the total since gesture start (`translationX/Y`) — assign directly,
don't accumulate.

## Recipe: press-scale feedback on a button

This repo's `src/components/ui/button.tsx` already gets press feedback for free via
NativeWind's `active:` variants on a plain `Pressable` — **don't reach for
Gesture Handler for a simple button press**, it adds a dependency and a
`GestureHandlerRootView` requirement for no benefit over `active:bg-primary/90`.

Reach for Reanimated + Gesture Handler only when the feedback needs values a CSS-ish
`active:` class can't express — e.g. a *continuous* scale tied to press duration, or
a component that isn't already a `Pressable`:

```tsx
const scale = useSharedValue(1);
const tap = Gesture.Tap()
  .onBegin(() => { scale.value = withTiming(0.96, { duration: 100 }); })
  .onFinalize(() => { scale.value = withTiming(1, { duration: 100 }); });
const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

<GestureDetector gesture={tap}>
  <Animated.View style={style}>{children}</Animated.View>
</GestureDetector>;
```

## Recipe: swipe-to-dismiss (e.g. a session/notification card)

```tsx
const CARD_WIDTH = 320;
const translateX = useSharedValue(0);

const pan = Gesture.Pan()
  .onChange((e) => { translateX.value += e.changeX; })
  .onEnd((e) => {
    const shouldDismiss = Math.abs(translateX.value) > CARD_WIDTH * 0.4;
    if (shouldDismiss) {
      translateX.value = withTiming(
        Math.sign(translateX.value) * CARD_WIDTH * 1.5,
        { duration: 200 },
        (finished) => { if (finished) scheduleOnRN(onDismiss); }
      );
    } else {
      translateX.value = withDecay({ velocity: e.velocityX, clamp: [-CARD_WIDTH, CARD_WIDTH], rubberBandEffect: true });
    }
  });

const style = useAnimatedStyle(() => ({
  transform: [{ translateX: translateX.value }],
  opacity: interpolate(translateX.value, [-CARD_WIDTH, 0, CARD_WIDTH], [0, 1, 0], Extrapolation.CLAMP),
}));
```
Notes:
- Calling a JS-side callback (`onDismiss` — e.g. removing the item from a list/store)
  from inside a worklet requires `scheduleOnRN` (not a bare call); see the checklist
  below for why `scheduleOnRN` and not `runOnJS`.
- `withDecay`'s `rubberBandEffect: true` + `clamp` gives a natural "snap back if not
  far enough" feel without hand-rolling a threshold spring.

## Recipe: drag-and-drop / free positioning

Accumulate from a saved offset so the item doesn't jump on the next gesture:

```tsx
const offset = useSharedValue({ x: 0, y: 0 });
const start = useSharedValue({ x: 0, y: 0 });

const pan = Gesture.Pan()
  .onChange((e) => {
    offset.value = { x: start.value.x + e.translationX, y: start.value.y + e.translationY };
  })
  .onEnd(() => { start.value = offset.value; });

const style = useAnimatedStyle(() => ({
  transform: [{ translateX: offset.value.x }, { translateY: offset.value.y }],
}));
```

## Recipe: pinch-to-zoom (+ pan, composed)

```tsx
const scale = useSharedValue(1);
const savedScale = useSharedValue(1);

const pinch = Gesture.Pinch()
  .onUpdate((e) => { scale.value = savedScale.value * e.scale; })
  .onEnd(() => { savedScale.value = scale.value; });

const composed = Gesture.Simultaneous(panGesture, pinch);
```
Use `Gesture.Simultaneous` (not `Race`) when pan-while-zoomed should keep working —
this is the same pattern as swmansion's own gallery-viewer example (pan + pinch +
rotation all `Simultaneous`).

## Interaction with scroll views / lists

If a pan/swipe gesture lives inside a `ScrollView`/`FlatList`, wrap the two in
`Gesture.Race(scrollNativeGesture, panGesture)` (via `Gesture.Native()` for the
scroll view) or set tight `activeOffsetX`/`failOffsetY` on the `Pan` gesture so a
mostly-vertical scroll doesn't get hijacked by a horizontal swipe gesture, and vice
versa. Test on a real device/simulator — this is the #1 source of "gesture feels
janky" bugs, not the animation math.

## Checklist before shipping a gesture-driven animation

1. Root is wrapped in `GestureHandlerRootView` — **as of this writing,
   `src/app/_layout.tsx` does not have this wrapper** (see the version-trap note in
   `../gesture-handler-interactions/SKILL.md`'s setup section); add it before this
   feature ships, don't assume it's already there.
2. Any JS-side side effect from a worklet callback (navigation, store update,
   haptics) goes through `scheduleOnRN` — never called bare. Prefer `scheduleOnRN`
   over `runOnJS`, which is deprecated in the installed `react-native-worklets` (still
   works, but new code shouldn't use it — see `../reanimated-animations/SKILL.md`).
3. `onChange` deltas are accumulated (`+=`); `onUpdate` totals are assigned (`=`).
4. Gesture instances aren't reused across more than one `GestureDetector`.
5. Composition (`Simultaneous`/`Race`/`Exclusive`) chosen deliberately, not left at
   the default of "just one gesture" when nested inside scrollable content.
