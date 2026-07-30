# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Other Skills

Read https://docs.expo.dev/llms.txt

Read https://www.nativewind.dev/llms.txt if tasks involves styling via tailwind

Read https://reactnativereusables.com/docs if tasks involves creating, modifying, and adding components

Read https://rnfirebase.io/ if task involves interfacing with firebase

Read https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/your-first-animation and https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/introduction/ and also https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/reanimated-interactions if task involves animating ui or interactive ui

# Firebase functions

Read .agents\skills for firebase functions tasks

# Module architecture (src/modules)

`src/modules` is sliced by **feature** and wired by **dependency direction**, not by
technical layer. Each feature has an interface, zero or more implementations, and a
context that hands the active implementation to the rest of the app. The dependency
flow is one-directional:

```
interfaces/  <-- context/  <-- implementations/  <-- app (src/app layouts/screens)
   (contract)   (React glue)   (concrete impl)        (composition root)
```

Nothing in `interfaces/` or `context/` may import from an implementation module.
Implementation modules depend on `interfaces/` and `context/`, never the other way
around. This keeps every feature swappable: an implementation is replaceable without
touching the contract or the screens that consume it.

## The three layers

### 1. `interfaces/` — shared contracts

One file per feature domain (e.g. `auth.ts`, `charging.ts`). Defines the TypeScript
interfaces every implementation must satisfy and the plain data shapes (`AuthUser`,
`ChargingSessionEvent`, ...) that flow through the app. No React, no vendor SDKs, no
implementation logic — just types.

This is the layer screens and other modules should type against. If code needs to
know "what shape is a user," it imports from here, not from a concrete implementation.

### 2. `context/` — the app-facing seam

One React context per feature (e.g. `auth-context.ts`), typed against the
`interfaces/` contract (`createContext<AuthContext | null>(...)`). This is what
screens actually consume via `useContext`/a `use*` hook — they never import a
concrete implementation directly.

The context module only defines the `Context` object and its `Provider` export. It
holds no logic and knows nothing about *which* implementation fills it — that's
decided at composition time (see below).

### 3. Implementation modules — concrete, swappable, one per vendor/strategy

Sibling folders named after the concrete implementation, not the feature (e.g.
`firebase-auth/`, not `auth-impl/`). If a feature ever needs a second implementation
(say, a mock or a different vendor), it becomes another sibling folder — the
interface and context stay untouched.

Each implementation module follows this internal shape:

- `services/` — a class or object implementing the `interfaces/` contract
  (`FirebaseAuthService implements AuthService`). Wraps the vendor SDK. Pure logic,
  no React.
- `providers/` — a React component that takes a service instance as a prop, owns
  whatever local state/subscriptions the context needs, and renders the matching
  `context/` `Provider` (`FirebaseAuthProvider` renders `AuthContextProvider`).

The provider component is intentionally decoupled from constructing the service —
the service instance is passed in, not instantiated inside the provider. Wiring
`new FirebaseAuthService(auth)` to `<FirebaseAuthProvider authService={...}>` happens
at the composition root.

## Composition root

`src/app/_layout.tsx` (or a screen/layout further down the tree, for feature-scoped
context) is where implementations get selected and wired to context. This is the
only place allowed to import both a concrete implementation and a `context/`
provider together:

```tsx
const authService = new FirebaseAuthService(auth);

export function App () {
  ...
<FirebaseAuthProvider authService={authService}>
  <Stack />
</FirebaseAuthProvider>
}
```

Swapping Firebase for another auth backend means writing a new sibling module and
changing this one wiring point — no changes to `interfaces/`, `context/`, or any
screen that consumes `useContext(authContext)`.

## Adding a new feature module

1. Add the contract to `interfaces/<feature>.ts`.
2. Add `context/<feature>-context.ts` typed against that contract.
3. Add an implementation folder `<vendor-or-strategy>-<feature>/` with
   `services/` (implements the interface) and `providers/` (renders the context
   provider).
4. Wire the implementation into the context provider at the composition root.

## Adding a second implementation of an existing feature

Add a new sibling implementation folder that implements the same `interfaces/`
contract and renders the same `context/` provider. Never branch inside an existing
implementation module — a new strategy is a new folder.
