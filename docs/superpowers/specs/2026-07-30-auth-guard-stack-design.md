# Auth Guard Stack — Login + Home

## Purpose

Add a working authentication guard to the app: unauthenticated users see an
email/password login screen; authenticated users see a "Hello" home screen
with a logout button. This exercises the existing `firebase-auth` module
(interfaces/context/implementation already scaffolded in `src/modules`) end
to end.

## Architecture

Uses Expo Router v57's `Stack.Protected` guard pattern. The root layout reads
`user` from the existing `authContext` (populated by `FirebaseAuthProvider`,
which already wraps the `Stack` in `src/app/_layout.tsx`) and renders one of
two mutually exclusive `Stack.Protected` blocks:

```tsx
<Stack>
  <Stack.Protected guard={!!user}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
  </Stack.Protected>
  <Stack.Protected guard={!user}>
    <Stack.Screen name="login" options={{ headerShown: false }} />
  </Stack.Protected>
</Stack>
```

Because `FirebaseAuthProvider` wraps the `Stack`, the guard logic must live
in a small inner component (below the provider) that calls
`useContext(authContext)` — the root `RootLayout` component itself sits
above the provider and cannot read the context directly.

No group routes are needed; `login` and `index` are flat top-level routes.

## Routes

```
src/app/
  _layout.tsx   — root layout: FirebaseAuthProvider + guarded Stack
  login.tsx     — email/password login screen
  index.tsx     — "Hello" home screen (protected) + logout button
```

## Auth module changes

`AuthService` (src/modules/interfaces/auth.ts) gains a `logout` method:

```ts
export interface AuthService {
  // ...existing members
  logout: () => Promise<void>;
}
```

`FirebaseAuthService` implements it using `signOut` from
`@react-native-firebase/auth`. `AuthContext` is unchanged — screens already
have access to `authService` via context, so `authContext.authService.logout()`
is sufficient; no new context field is needed.

## UI components

Install reactnativereusables components used by the login form and logout
button, matching the project's existing `components.json` (shadcn-style)
setup:

```
npx @react-native-reusables/cli@latest add input label button
```

## Screens

**`login.tsx`**
- `Input` fields for email and password (password uses `secureTextEntry`),
  each with a `Label`.
- Local `useState` for `email`, `password`, `error`, `submitting`.
- On submit: call `authContext.authService.loginWithEmailAndPassword(email, password)`.
  - On success: nothing further to do — the guard in `_layout.tsx` reacts to
    the auth state change (via `authService.subscribe`) and automatically
    swaps to the `index` route.
  - On failure: catch the error, set `error` to a short inline message
    (e.g. "Invalid email or password"), re-enable the submit button.
- Submit `Button` is disabled while `submitting` is true.

**`index.tsx`**
- Centered "Hello" text, matching the existing placeholder screen's styling
  (`bg-background` / `text-foreground` classes).
- A `Button` labeled "Log out" that calls `authContext.authService.logout()`.
  No local success handling needed — the same guard/subscribe mechanism
  swaps back to `login` once the auth state clears.

## Error handling

- Login failures are caught in the login screen and shown as inline text;
  no toast/alert library is introduced.
- `logout()` errors are not expected in normal operation and are not
  specially handled (matches the existing service's lack of error handling
  elsewhere, e.g. `loginWithEmailAndPassword`).

## Out of scope (YAGNI)

- No signup/registration screen.
- No Google/Apple login wiring (`loginWithGoogle`/`loginWithApple` remain
  `throw new Error("Not implemented")`).
- No splash-screen gating for the initial auth check. `FirebaseAuthProvider`
  already initializes `user` synchronously from `authService.getCurrentUser()`
  before first render, so no additional loading state is introduced.
- No route groups — two flat routes are enough for this scope.

## Testing

No automated test setup exists in this project yet. Verification is manual:
run the app, confirm an unauthenticated user is routed to `login`, confirm a
valid login navigates to `index` and shows "Hello", confirm logout returns
to `login`, and confirm an invalid login shows the inline error without
navigating.
