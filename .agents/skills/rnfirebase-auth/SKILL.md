---
name: rnfirebase-auth
description: React Native Firebase Auth (@react-native-firebase/auth) modular API — sign-in methods, auth state subscriptions, user object, error codes. Activate for any task touching src/modules/firebase-auth/ or Firebase-backed sign-in/sign-up/sign-out screens.
metadata:
  source: local
  pinned-versions: "@react-native-firebase/auth 26.0.0, modular API only (no namespaced firebase.auth())"
---

# React Native Firebase Auth

Full docs: https://rnfirebase.io/auth/usage. This project is on v26, which is
**modular-API-only** — the old namespaced `firebase.auth().signInWithEmailAndPassword(...)`
form does not exist here. Every call takes the `Auth` module instance as its first
argument, imported as a standalone function:

```ts
import { getAuth, signInWithEmailAndPassword } from '@react-native-firebase/auth'

await signInWithEmailAndPassword(getAuth(), email, password)
```

## Where this lives in this project

Per `AGENTS.md`'s module architecture, auth is already wired end-to-end:

- `src/modules/interfaces/auth.ts` — `AuthService`/`AuthUser`/`AuthContext` contract.
- `src/modules/context/auth-context.ts` — the `authContext` React context.
- `src/modules/firebase-auth/services/firebase-auth-service.ts` — `FirebaseAuthService`,
  the concrete `AuthService` wrapping this module. Takes an `Auth` instance via
  constructor injection (never calls `getAuth()` itself).
- `src/modules/firebase-auth/providers/firebase-auth-provider.tsx` — subscribes via
  `onAuthStateChanged` and renders `AuthContextProvider`.
- `src/app/_layout.tsx` — composition root: `new FirebaseAuthService(getAuth())`.
- `src/lib/firebase-auth-error.ts` — maps `error.code` (e.g. `auth/invalid-credential`,
  `auth/user-not-found`) to user-facing copy. **Extend this switch**, don't build a
  parallel error-mapping mechanism, whenever a new auth flow surfaces a new error code.

Extending auth (e.g. adding Google/Apple sign-in) means filling in the `throw new
Error("Not implemented")` stubs already in `FirebaseAuthService` — not adding a second
implementation, since Firebase is the only auth vendor here.

## Imports you'll actually use

```ts
import {
  getAuth,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  reload,
} from '@react-native-firebase/auth'
import type { Auth, User } from '@react-native-firebase/auth'
```

## Auth state

```ts
const unsubscribe = onAuthStateChanged(authModule, (user: User | null) => {
  // null => signed out
})
// call unsubscribe() on cleanup — this is exactly what
// firebase-auth-provider.tsx does inside a useEffect
```

`onIdTokenChanged` fires additionally whenever the ID token is refreshed (not just on
sign-in/out) — use it instead of `onAuthStateChanged` only if something needs to react
to token refresh itself (e.g. re-sending a token to a backend).

Native SDKs persist the signed-in session across app restarts automatically; there is
no `setPersistence` call on React Native (that's a web-SDK-only API and throws here).

## Sign-in methods

```ts
await createUserWithEmailAndPassword(authModule, email, password) // sign-up
await signInWithEmailAndPassword(authModule, email, password)
await signInAnonymously(authModule)                                // needs
  // "Anonymous" provider enabled in Firebase Console
await signOut(authModule)
```

Social sign-in (Google/Apple/Facebook/etc.) is not a single call — you obtain a
credential from the native provider SDK first, then exchange it via a
`*AuthProvider.credential(...)` + `signInWithCredential(authModule, credential)` call.
Check the current rnfirebase.io provider-specific page before implementing; the exact
credential shape differs per provider and changes across major versions.

## User object

`authModule.currentUser` (a getter, not a function) gives the current `User | null`
synchronously — this is what `FirebaseAuthService.getCurrentUser()` reads. Useful
`User` fields/methods: `uid`, `email`, `displayName`, `photoURL`,
`getIdToken(forceRefresh?)`, `updateProfile({ displayName, photoURL })`,
`sendEmailVerification()`, `reload()`.

**Never use `uid` as a bearer credential against a backend.** Always send
`getIdToken()`'s JWT and verify it server-side (Admin SDK/Cloud Functions) — `uid` is
public-ish and unauthenticated callers can supply any string.

## Error codes

Errors thrown by these calls carry a `.code` like `auth/invalid-email`,
`auth/email-already-in-use`, `auth/wrong-password`, `auth/invalid-credential`,
`auth/user-not-found`, `auth/user-disabled`, `auth/too-many-requests`,
`auth/network-request-failed`, `auth/operation-not-allowed` (provider not enabled in
console). This project already has a home for these —
`src/lib/firebase-auth-error.ts` — add new cases there rather than inline
`switch`/`if` blocks in screens.

## React Native-specific gotchas

- `setPersistence`, `getRedirectResult`, `revokeAccessToken`, `useDeviceLanguage` are
  web-SDK helpers that **throw on React Native** — don't reach for them.
- `useUserAccessGroup` is iOS-only (Keychain access groups for sharing auth state
  between an app and its extensions).
- New Architecture is required from v26 onward (already the case in this project —
  don't add any legacy-arch workaround).
- Provider must be enabled in the Firebase Console (Authentication → Sign-in method)
  before its corresponding client call will succeed — `auth/operation-not-allowed` is
  the tell.
