---
name: rnfirebase-storage
description: React Native Firebase Cloud Storage (@react-native-firebase/storage) modular API — refs, file upload/download, progress tracking, metadata, deletion. Activate for any file-upload/media (photos, documents) work.
metadata:
  source: local
  pinned-versions: "@react-native-firebase/storage 26.0.0 (matches the app's other RNFB modules), modular API only"
---

# React Native Firebase Cloud Storage

Full docs: https://rnfirebase.io/storage/usage.

## Not yet a dependency — check before assuming it's usable

`@react-native-firebase/storage` is **not currently in `package.json`**. It *is*
already referenced in `app.config.ts`'s `expo-build-properties` `forceStaticLinking`
list (`"RNFBStorage"`), which only pre-wires the iOS static-linking config — it does
not install the package. Run this before writing any storage code:

```bash
npm install @react-native-firebase/storage
cd ios && pod install
```

Then rebuild the native app (`npx expo run:ios` / `run:android` or a new dev-client
build) — this is a native module, `expo start` alone won't pick it up.

## Modular imports

```ts
import {
  getStorage,
  ref,
  putFile,
  put,
  putString,
  getDownloadURL,
  deleteObject,
  getMetadata,
  updateMetadata,
  list,
  listAll,
} from '@react-native-firebase/storage'
```

## References

```ts
const storage = getStorage()
const fileRef = ref(storage, 'images/t-shirts/black-t-shirt-sm.png')
```

## Uploading

Three upload paths depending on what you have in hand:

```ts
// a local device file path (file://, content://, ph://, assets-library://) —
// the common case for a picked photo/document. Native-only; no web-SDK equivalent.
const task = putFile(fileRef, localUri)

// a Blob/Uint8Array/ArrayBuffer already in memory
await put(fileRef, blob)

// a string — base64/base64url/data_url/raw
await putString(fileRef, base64Data, 'base64')
```

`putFile` (and its download counterpart, downloading straight to a local path) are
the two APIs unique to the native SDKs — the web `firebase-js-sdk` has no equivalent
since browsers don't expose a real filesystem path.

### Progress and control

`putFile`/`put` return a `Task`, not a bare promise — it's thenable but also emits
progress:

```ts
task.on('state_changed', snapshot => {
  const pct = snapshot.bytesTransferred / snapshot.totalBytes
})
task.pause()
task.resume()
await task // resolves like a promise once complete
```

## Downloading

```ts
const url = await getDownloadURL(fileRef) // CDN URL, e.g. for an <Image source={{ uri: url }} />
```

There's no bare "download to memory" call analogous to the web SDK's `getBytes` —
for a local file, use the native-only `writeToFile`-style API if the installed
version exposes one; **verify the exact export name and signature against this
project's installed `node_modules/@react-native-firebase/storage` TypeScript
definitions once added**, since the public docs excerpt for this method was thin at
the time this skill was written.

## Metadata and deletion

```ts
const meta = await getMetadata(fileRef)          // size, contentType, customMetadata, etc.
await updateMetadata(fileRef, { customMetadata: { ownerId: uid } })
await deleteObject(fileRef)
```

## Listing

```ts
const { items, prefixes, nextPageToken } = await list(fileRef, { maxResults: 50 })
// or, to get everything in one call (no pagination):
const { items, prefixes } = await listAll(fileRef)
```

`items` are file refs directly under this ref; `prefixes` are "folder" refs
(Storage paths are virtual — there's no real directory structure, just `/`-delimited
keys).

## Multiple buckets

```ts
const secondary = getStorage(getApp(), 'gs://my-secondary-bucket.appspot.com')
```

## Security

By default only authenticated users can read/write — same `authenticated`-gated rule
model as Firestore. For anything beyond "any signed-in user can access anything,"
write real Storage security rules; that's outside this skill's scope (client usage)
— see the `firebase-security-rules-auditor` skill.

## Gotchas

- `putFile` needs an actual local URI (from `expo-image-picker`,
  `expo-document-picker`, camera roll, etc.) — a remote `https://` URL won't work;
  download it to a local cache path first if that's the source.
- New Architecture required from v26 (already satisfied here once installed).
