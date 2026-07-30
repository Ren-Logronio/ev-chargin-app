---
name: rnfirebase-messaging
description: React Native Firebase Cloud Messaging (@react-native-firebase/messaging) modular API — permissions, device tokens, foreground/background/quit message handlers, topics, firebase.json react-native config. Activate for any push-notification work.
metadata:
  source: local
  pinned-versions: "@react-native-firebase/messaging 26.0.0, modular API only"
---

# React Native Firebase Cloud Messaging (FCM)

Full docs: https://rnfirebase.io/messaging/usage.

## Project state check before implementing

`@react-native-firebase/messaging` is a dependency (`package.json`) but is **not**
listed in `app.config.ts`'s `plugins` array (only `@react-native-firebase/app` and
`@react-native-firebase/analytics` are configured there), and there's no root
`firebase.json` `"react-native"` config block yet (the existing root `firebase.json`
only has `firestore`/`functions` keys for the Firebase CLI — see below). There's also
no iOS push entitlement (`aps-environment`) configured and no `expo-notifications`
dependency. Before writing message-handling code, confirm with whoever's driving the
feature whether push entitlements/APNs setup has been done in the Apple Developer
portal — FCM on iOS is a no-op without it, and it'll silently look like a client bug.

## Modular imports

```ts
import {
  getMessaging,
  requestPermission,
  AuthorizationStatus,
  getToken,
  onTokenRefresh,
  onMessage,
  setBackgroundMessageHandler,
  onNotificationOpenedApp,
  getInitialNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
} from '@react-native-firebase/messaging'
```

## Permissions

```ts
const messaging = getMessaging()
const status = await requestPermission(messaging)
const enabled =
  status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL
```

`requestPermission` is deprecated as of v26 in favor of `react-native-permissions` or
`expo-notifications` for the actual OS permission prompt — this project has neither
installed yet, so that's a decision to raise rather than assume. On Android 13+
(API 33+), the OS permission is a separate `POST_NOTIFICATIONS` runtime permission via
`PermissionsAndroid`, not anything FCM-specific; below API 33 no prompt is needed.

## Device token

```ts
const token = await getToken(messaging)
const unsubscribe = onTokenRefresh(messaging, newToken => { /* persist */ })
```

Send this token to your backend (e.g. store on the user's Firestore doc, per the
`arrayUnion`/`arrayRemove` pattern in the `rnfirebase-firestore` skill) so server-side
code can target the device.

## Foreground messages

```ts
useEffect(() => {
  const messaging = getMessaging()
  return onMessage(messaging, async remoteMessage => {
    // has React context; safe to update UI/state here
  })
}, [])
```

## Background / quit-state messages

Must be registered **outside the React component tree**, in the app's entry file
(this project's Expo Router entry — check `index.js`/`expo-router/entry` — not inside
`_layout.tsx`), because the JS engine may not be running an active React tree when a
background push arrives:

```ts
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging'

setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  // no UI access; must return a promise; keep this fast
})
```

For a data-only message to actually reach this handler while backgrounded/killed:
Android needs `priority: 'high'` on the send; iOS needs `contentAvailable: true` plus
APNs headers (`apns-push-type: background`, `apns-priority: 5`) on the send side —
this is send-side (Admin SDK/Cloud Function) configuration, not client code.

## Notification-tap handling

```ts
onNotificationOpenedApp(getMessaging(), remoteMessage => {
  // app was backgrounded, user tapped a notification to open it
})

getInitialNotification(getMessaging()).then(remoteMessage => {
  // app was launched (cold start) by tapping a notification
})
```

## Topics

```ts
await subscribeToTopic(messaging, 'weather')
await unsubscribeFromTopic(messaging, 'weather')
```

Limits: a device can be subscribed to at most 2,000 topics; a single send can target
at most 5 topics via a compound condition.

## firebase.json react-native config block

rnfirebase reads a `"react-native"` key from a root `firebase.json`. **This project
already has a root `firebase.json`** used by the Firebase CLI for
Firestore/Functions config — add a `"react-native"` key to that same file rather than
creating a second config file:

```json
{
  "firestore": { "...": "..." },
  "functions": ["..."],
  "react-native": {
    "messaging_ios_auto_register_for_remote_messages": false,
    "messaging_android_notification_channel_id": "high-priority",
    "messaging_auto_init_enabled": false
  }
}
```

## Gotchas

- Apple Silicon iOS Simulators can time out (~10s) on `registerDeviceForRemoteMessages`
  — always test push flows on a physical device before concluding something's broken.
- iOS users can toggle Background App Refresh off, which silently prevents the
  background handler from ever running — this isn't a bug to chase.
- No config plugin entry for messaging currently exists in `app.config.ts`; check
  whether `@react-native-firebase/app`'s autolinking is sufficient or whether an
  explicit plugin entry (mirroring the `analytics` one) is needed once
  iOS-side push config (entitlements) is added.
