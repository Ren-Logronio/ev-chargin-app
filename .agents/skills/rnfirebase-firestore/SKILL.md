---
name: rnfirebase-firestore
description: React Native Firebase Firestore (@react-native-firebase/firestore) modular API — CRUD, queries, transactions, batches, real-time listeners, offline persistence. Activate for any client-side Firestore read/write/subscribe code in src/modules or src/app.
metadata:
  source: local
  pinned-versions: "@react-native-firebase/firestore 26.0.0, modular API only"
---

# React Native Firebase Firestore

Full docs: https://rnfirebase.io/firestore/usage. This is the **client SDK** consumed
from app code. For designing collections/security rules/indexes or provisioning the
database itself, use the `firebase-firestore` skill instead (Admin-SDK/CLI-facing) —
this skill is about calling Firestore from `src/`.

Like auth, v26 is modular-API-only: every function takes the `Firestore` instance (or
a reference derived from it) as its first argument.

```ts
import { getFirestore, collection, doc, getDoc } from '@react-native-firebase/firestore'

const db = getFirestore()
```

### Named databases

`getFirestore()` with no args (or just an app) targets the `(default)` database.
This project's Firestore instance is **not** `(default)` — `firebase.json` at the repo
root declares `"database": "electro-project"`. Pass the database ID explicitly:

```ts
const db = getFirestore(getApp(), 'electro-project')
// or, using the default app:
const db = getFirestore('electro-project')
```

Every `Firestore` instance created from app code must use this database ID —
`firebase.json` only controls what the Firebase CLI deploys rules/indexes to, it has
no effect on which database the client SDK connects to at runtime.

## Where this fits this project's module architecture

No Firestore-backed implementation exists yet under `src/modules`. When one is added
(e.g. a `firebase-charging/` implementation of `src/modules/interfaces/charging.ts`),
follow the same pattern already established by `firebase-auth/`: a `services/*Service`
class implementing the interface, constructed with the `Firestore` instance injected
(not calling `getFirestore()` internally), and a `providers/*Provider` that owns the
`onSnapshot` subscription lifecycle and feeds the `context/` provider.

`ChargingSessionEvent.subscribe` in `interfaces/charging.ts` already mirrors
Firestore's own shape — `onSnapshot` returns an unsubscribe function, same as
`onAuthStateChanged` does for auth — so a Firestore-backed `ChargingSession` maps onto
it directly: subscribe to a document, push `documentSnapshot.data()` (mapped into
`ChargingSessionEvent`) through the callback, return the `onSnapshot` unsubscriber.

## References and documents

```ts
const usersCol = collection(db, 'Users')
const userDoc = doc(db, 'Users', uid)        // or: doc(usersCol, uid)
```

## Reading

```ts
// one-shot
const snap = await getDoc(userDoc)
if (snap.exists) snap.data()

const querySnap = await getDocs(usersCol)
querySnap.forEach(d => console.log(d.id, d.data()))

// real-time — always capture and call the returned unsubscribe on cleanup
useEffect(() => {
  const unsubscribe = onSnapshot(userDoc, s => setUser(s.data()))
  return unsubscribe
}, [uid])
```

Nested fields read via dot-notation: `snap.get('info.address.zipcode')`.

## Querying

```ts
import { query, where, orderBy, limit, startAfter, and, or } from '@react-native-firebase/firestore'

const q = query(usersCol, where('age', '>=', 18), orderBy('age', 'desc'), limit(20))
const q2 = query(usersCol, and(where('a', '==', 1), where('b', '==', 2)))
const q3 = query(usersCol, or(where('a', '==', 1), where('b', '==', 2)))
```

Cursor pagination accepts either raw values (`startAt(18)`) or a `DocumentSnapshot`
(`startAfter(lastDocSnapshot)`) — prefer the snapshot form for "load more" UIs so the
cursor tracks the actual last-rendered doc rather than a field value that might repeat.

## Writing

```ts
import { addDoc, setDoc, updateDoc, deleteDoc, deleteField } from '@react-native-firebase/firestore'

await addDoc(usersCol, { name, age })          // auto-id
await setDoc(doc(usersCol, uid), { name, age }) // custom id, full overwrite
await updateDoc(doc(usersCol, uid), { age: 31 }) // partial update, doc must exist
await updateDoc(doc(usersCol, uid), { 'info.address.zipcode': 94040 }) // nested field
await updateDoc(doc(usersCol, uid), { fcmTokens: deleteField() }) // remove one field
await deleteDoc(doc(usersCol, uid))
```

`setDoc` replaces the whole document unless you pass `{ merge: true }` as a third
arg; `updateDoc` always requires the document to already exist and only touches the
fields given.

### FieldValue helpers

```ts
import { serverTimestamp, increment, arrayUnion, arrayRemove, GeoPoint, Bytes } from '@react-native-firebase/firestore'

await updateDoc(ref, {
  updatedAt: serverTimestamp(),   // resolved server-side, not client clock
  score: increment(1),
  tokens: arrayUnion('abc'),      // adds only if not already present
})
```

Prefer `serverTimestamp()` over `new Date()` for anything compared across
clients/devices — client clocks drift and aren't trustworthy for ordering.

## Transactions vs batches

- **Transaction** (`runTransaction`) — reads-then-writes that must be atomic and
  consistent with server state; the callback may re-run if data changes underneath
  it, so keep it pure (no side effects beyond `transaction.get/set/update/delete`).
  Fails outright if offline.
- **Batch** (`writeBatch`) — multiple writes with no read requirement, atomically
  applied; fine offline (queued and applied on reconnect).

```ts
await runTransaction(db, async tx => {
  const snap = await tx.get(postRef)
  if (!snap.exists) throw new Error('missing')
  tx.update(postRef, { likes: snap.data().likes + 1 })
})

const batch = writeBatch(db)
docs.forEach(d => batch.delete(d.ref))
await batch.commit()
```

## Offline persistence — the big React Native difference from web

Persistence is **on by default** on React Native (the opposite of the web SDK's
default). Firestore keeps a local cache that syncs automatically; reads/writes work
offline and queue until reconnect. Don't add a manual caching layer on top of this —
it's already there.

To disable it (rare — most apps want this on), call `initializeFirestore` before any
other Firestore usage, and note it's `async` here (unlike web):

```ts
import { getApp } from '@react-native-firebase/app'
import { initializeFirestore } from '@react-native-firebase/firestore'

await initializeFirestore(getApp(), { persistence: false })
```

`memoryLocalCache`/`persistentLocalCache` config objects are web-SDK-only concepts —
don't port them here.

## Gotchas

- Deleting a document does **not** delete its subcollections — clean those up
  explicitly (client SDKs can't delete whole collections at all; that needs the Admin
  SDK, i.e. a Cloud Function).
- New Architecture is required from v26 (already satisfied in this project).
- Always unsubscribe `onSnapshot` listeners on unmount/dependency change — an
  abandoned listener keeps receiving (and the JS callback keeps firing) until
  explicitly stopped.
