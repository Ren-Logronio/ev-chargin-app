---
name: rnfirebase-analytics
description: React Native Firebase Analytics (@react-native-firebase/analytics) modular API — logging events, user properties, consent, screen tracking, debug view. Activate for any event-tracking/analytics instrumentation work.
metadata:
  source: local
  pinned-versions: "@react-native-firebase/analytics 26.0.0, modular API only"
---

# React Native Firebase Analytics

Full docs: https://rnfirebase.io/analytics/usage.

## Already configured in this project

`app.config.ts` already has the Expo config plugin wired:

```ts
[
  "@react-native-firebase/analytics",
  {
    "ios": {
      "withoutAdIdSupport": true,
      "googleAppMeasurementOnDeviceConversion": true
    }
  }
]
```

`withoutAdIdSupport: true` means no IDFA/advertising-ID linkage on iOS — don't assume
ad-attribution features are available. No `firebase.json` `"react-native"` analytics
keys (e.g. `analytics_auto_collection_enabled`,
`google_analytics_automatic_screen_reporting_enabled`) are set yet, so both default
to enabled/on.

## Modular imports

```ts
import {
  getAnalytics,
  logEvent,
  logLogin,
  logScreenView,
  logSelectContent,
  setUserId,
  setUserProperty,
  setUserProperties,
  setAnalyticsCollectionEnabled,
  setConsent,
  setDefaultEventParameters,
  getAppInstanceId,
} from '@react-native-firebase/analytics'
```

## Logging events

Prefer the named helper (`logLogin`, `logScreenView`, `logSelectContent`, etc.) over
raw `logEvent` whenever the event maps to one of Firebase's own predefined events —
these get richer treatment in the Analytics console (funnels, audiences) than an
equivalent custom event does.

```ts
const analytics = getAnalytics()
await logScreenView(analytics, { screen_name: 'ChargingSession', screen_class: 'ChargingSession' })
await logLogin(analytics, { method: 'password' })

// custom event — only when no predefined event fits
await logEvent(analytics, 'charging_started', { station: 'ABC', unit: 'kWh' })
```

**Parameters are not validated client-side.** A typo'd param name or wrong param
type is accepted silently and simply never shows up in the console — there's no
exception to catch. Double-check param names/shapes against what you query for in
the Analytics console/BigQuery export, since a mismatch fails silently rather than
loudly.

Reserved event names (e.g. `first_open`, `session_start`, `in_app_purchase`, and
~30 others) **throw** if you try to `logEvent` them yourself — those are emitted
automatically by the SDK.

## User identity/properties

```ts
await setUserId(analytics, user.userId)       // ties events to a stable user
await setUserProperty(analytics, 'plan_tier', 'pro')
await setUserProperties(analytics, { plan_tier: 'pro', region: 'PH' })
```

Call `setUserId(analytics, null)` on sign-out so subsequent (pre-next-login) events
aren't misattributed to the previous user — wire this into
`FirebaseAuthService`/`FirebaseAuthProvider`'s sign-out path rather than scattering it
across screens.

## Default event parameters

`setDefaultEventParameters` attaches a fixed set of params to every subsequent event
(including the predefined `log*` helpers) without having to thread them through each
call site — useful for things like `app_version`/`build_env` that should tag
everything:

```ts
await setDefaultEventParameters(analytics, { build_env: 'production' })

// clear defaults by passing no params / undefined
await setDefaultEventParameters(analytics)
```

## Screen tracking

Automatic screen-view logging is on by default (driven by native
navigation-controller detection, which doesn't understand Expo Router screens well).
For accurate screen names with Expo Router, call `logScreenView` explicitly from a
navigation-state listener rather than relying on automatic detection, or disable
automatic tracking via `firebase.json`:

```json
{ "react-native": { "google_analytics_automatic_screen_reporting_enabled": false } }
```

## Consent and collection toggles

```ts
await setConsent(analytics, {
  analytics_storage: true,
  ad_storage: true,
  ad_user_data: true,
  ad_personalization: true,
})

await setAnalyticsCollectionEnabled(analytics, false) // e.g. user opts out in settings
```

If collection should start disabled until consent is granted (common for GDPR/EEA
flows), set `analytics_auto_collection_enabled: false` in `firebase.json`'s
`"react-native"` block, then flip it on via `setAnalyticsCollectionEnabled` once
consent is captured — don't try to "undo" already-collected events after the fact.

## Debug view

- iOS: launch with the `-FIRAnalyticsDebugEnabled` flag (Xcode scheme → Arguments
  Passed On Launch).
- Android: `adb shell setprop debug.firebase.analytics.app com.innoendo.eca`
  (this project's Android package, from `app.config.ts`).
- Otherwise: set `globalThis.RNFBDebug = true` before the first analytics call
  (e.g. top of `index.js`/entry), guarded by `if (__DEV__)`.

## Gotchas

- `getAppInstanceId` resolves to `null` if analytics-storage consent has been denied
  — don't treat a `null` instance id as an error.
- Events logged offline are queued and sent on reconnect; don't build a custom
  retry/queue layer on top.
