---
name: rnfirebase-functions
description: React Native Firebase Functions (@react-native-firebase/functions) modular API — calling deployed callables from the app, emulator connection, error handling. Client-side only; for authoring the Cloud Functions themselves see firebase-basics/extension-to-functions-codebase.
metadata:
  source: local
  pinned-versions: "@react-native-firebase/functions 26.0.0, modular API only"
---

# React Native Firebase Functions (client)

Full docs: https://rnfirebase.io/functions/usage.

**This skill is about calling functions from the app** (`src/`). Writing/deploying the
Cloud Functions themselves lives in `functions/` and is covered by the
`firebase-basics`/`extension-to-functions-codebase` skills (per `AGENTS.md`'s Firebase
functions section) — don't conflate the two; this module has no knowledge of triggers,
`onCall`/`onRequest` handlers, or the Admin SDK.

## Modular imports

```ts
import {
  getFunctions,
  httpsCallable,
  httpsCallableFromUrl,
  connectFunctionsEmulator,
} from '@react-native-firebase/functions'
```

## Calling a callable function

```ts
const functions = getFunctions()
const listProducts = httpsCallable(functions, 'listProducts')
const response = await listProducts({ category: 'chargers' })
response.data // whatever the Cloud Function returned
```

`httpsCallable(functions, name)` returns a reusable callable — build it once (e.g. as
a module-level const or inside a service class's constructor) rather than re-creating
it on every call.

### Per-call options

`httpsCallable` takes an optional third arg, `HttpsCallableOptions`:

```ts
const listProducts = httpsCallable(functions, 'listProducts', {
  timeout: 10000, // ms; converted internally as needed per platform
  limitedUseAppCheckTokens: false, // set true only if the function has App Check replay protection enabled
})
```

There's also `httpsCallableFromUrl(functions, url, options?)` for calling a callable
by its full URL instead of by registered name (same signature/return shape as
`httpsCallable`) — useful for a callable deployed to a custom domain.

### Streaming callables

The callable returned by `httpsCallable`/`httpsCallableFromUrl` exposes a `.stream()`
method for Cloud Functions that stream partial results (e.g. a Genkit flow):

```ts
const { stream, data } = await listProducts.stream({ category: 'chargers' })
for await (const chunk of stream) {
  // partial results as they arrive
}
const finalResult = await data // resolves once the stream completes
```

## Region / custom domain

Functions default to `us-central1`. If this project's `functions/` codebase deploys
to a different region (check `firebase.json`'s `functions` config or the function's
own `region()` call), match it here or every call 404s:

```ts
const functions = getFunctions(getApp(), 'asia-southeast1') // match firestore's region
  // (this project's firestore.database is "asia-southeast1" per firebase.json —
  //  confirm functions/ actually deploys to the same region before assuming this)
```

## Emulator

```ts
if (__DEV__) {
  connectFunctionsEmulator(getFunctions(), 'localhost', 5001)
}
```

Note: this project's root `firebase.json` has no `"emulators"` block yet — running
`firebase emulators:start` for functions will need one added (or `-p`/port flags) if
local emulation is set up. On a physical device (not a simulator), `'localhost'`
won't resolve to the dev machine — use the machine's LAN IP instead.

## Error handling

Callable errors surface as an `Error`-like object with `.code` (e.g.
`functions/unauthenticated`, `functions/invalid-argument`,
`functions/permission-denied`, `functions/not-found`, `functions/internal`),
`.message`, and `.details` (whatever structured data the function's
`HttpsError` was constructed with server-side):

```ts
try {
  await listProducts({ category: 'chargers' })
} catch (error) {
  const code = (error as { code?: string }).code
  const details = (error as { details?: unknown }).details
}
```

If this project builds out a dedicated functions-backed service (following the
`interfaces/` → `context/` → implementation pattern from `AGENTS.md`), give it its own
error-message mapping like `src/lib/firebase-auth-error.ts` does for auth — don't
reuse the auth error map for unrelated `functions/*` codes.

## Gotchas

- Callable calls always go over HTTPS to Google's infra even against the emulator —
  there's no separate transport-layer concern to configure beyond host/port.
- Passing `undefined` in the data payload is dropped by JSON serialization same as
  any other JSON.stringify — don't rely on the function seeing `undefined` vs a
  missing key.
- A callable's authentication context (`context.auth` on the server) is populated
  automatically from the signed-in Firebase Auth user on this client — no manual
  token attachment needed, unlike calling an `onRequest` HTTP function directly.
