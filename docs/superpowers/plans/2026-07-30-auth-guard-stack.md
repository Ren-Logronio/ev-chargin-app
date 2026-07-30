# Auth Guard Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an authentication guard to the app: unauthenticated users are routed to an email/password login screen; authenticated users see a "Hello" home screen with a logout button.

**Architecture:** Expo Router v57's `Stack.Protected` guard, driven by the existing `authContext` (already populated by `FirebaseAuthProvider` in `src/app/_layout.tsx`). Two flat routes (`login`, `index`) are wrapped in mutually exclusive `Stack.Protected` blocks inside a small component nested below the provider.

**Tech Stack:** Expo Router v57 (`expo-router/stack`), `@react-native-firebase/auth`, reactnativereusables UI components (`Input`, `Label`, `Button`, `Text`), NativeWind.

## Global Constraints

- No automated test framework exists in this project (no jest config, no test script). Verification for every task is `npx tsc --noEmit`, which currently passes with zero errors — treat any new error as a regression to fix before moving on.
- Follow the `src/modules` interfaces/context/implementation architecture documented in `AGENTS.md` — do not add auth logic to screens directly; screens call through `authContext.authService`.
- Use path alias `@/*` → `src/*` (already configured in `tsconfig.json`) for all new imports.
- Use kebab-case file names for anything under `src/app` (per the expo-router skill conventions already followed by this repo).

---

### Task 1: Add `logout` to the auth service

**Files:**
- Modify: `src/modules/interfaces/auth.ts`
- Modify: `src/modules/firebase-auth/services/firebase-auth-service.ts`

**Interfaces:**
- Produces: `AuthService.logout(): Promise<void>` — consumed by Task 4 (home screen).

- [ ] **Step 1: Add `logout` to the `AuthService` interface**

In `src/modules/interfaces/auth.ts`, replace:

```ts
export interface AuthService {
  getCurrentUser: () => AuthUser | null;
  loginWithEmailAndPassword: (email: string, password: string) => Promise<AuthUser | null>,
  loginWithGoogle: () => Promise<AuthUser | null>;
  loginWithApple: () => Promise<AuthUser | null>;
  subscribe: (callback: (user: AuthUser | null) => void) => () => void;
}
```

with:

```ts
export interface AuthService {
  getCurrentUser: () => AuthUser | null;
  loginWithEmailAndPassword: (email: string, password: string) => Promise<AuthUser | null>,
  loginWithGoogle: () => Promise<AuthUser | null>;
  loginWithApple: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  subscribe: (callback: (user: AuthUser | null) => void) => () => void;
}
```

- [ ] **Step 2: Implement `logout` in `FirebaseAuthService`**

In `src/modules/firebase-auth/services/firebase-auth-service.ts`, change the import line:

```ts
import { onAuthStateChanged, signInWithEmailAndPassword } from "@react-native-firebase/auth"
```

to:

```ts
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "@react-native-firebase/auth"
```

Then add a `logout` method to the class, immediately after `loginWithApple`:

```ts
  async loginWithApple(): Promise<AuthUser | null> {
    throw new Error("Not implemented")
  }

  async logout(): Promise<void> {
    await signOut(this.#authModule)
  }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (same as baseline — `AuthService` and its only implementation, `FirebaseAuthService`, now agree on the new method).

- [ ] **Step 4: Commit**

```bash
git add src/modules/interfaces/auth.ts src/modules/firebase-auth/services/firebase-auth-service.ts
git commit -m "feat: add logout to AuthService and FirebaseAuthService"
```

---

### Task 2: Install reactnativereusables UI components

**Files:**
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/text.tsx`
- Create: `src/components/ui/button.tsx`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces (exact exports Tasks 3 and 4 will import):
  - `Input` from `@/components/ui/input` — thin wrapper around React Native's `TextInput`, accepts all `TextInput` props (`value`, `onChangeText`, `placeholder`, `secureTextEntry`, `autoCapitalize`, `keyboardType`, `editable`, etc.) plus `className`.
  - `Label` from `@/components/ui/label` — accepts `nativeID` and children text; pair with an `Input` via `aria-labelledby={nativeID}` on the `Input` for accessible association.
  - `Button` from `@/components/ui/button` — wraps `Pressable`. Props: `onPress`, `disabled`, `variant` (`'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'`), `size` (`'default' | 'sm' | 'lg' | 'icon'`), `className`. Renders children — wrap button label text in `<Text>` from `@/components/ui/text`, not a raw string.
  - `Text` from `@/components/ui/text` — styled `Text` wrapper, accepts `variant` (`'default' | 'h1' | 'h2' | ... | 'muted'`, etc.) and `className`.

- [ ] **Step 1: Run the install command**

```bash
npx @react-native-reusables/cli@latest add input label button --yes
```

This also adds `text.tsx` automatically since `button.tsx` depends on it (`TextClassContext`). If the CLI reports the files already exist, that's fine — skip to Step 2.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/input.tsx src/components/ui/label.tsx src/components/ui/text.tsx src/components/ui/button.tsx package.json package-lock.json
git commit -m "feat: install reactnativereusables input, label, button, text components"
```

---

### Task 3: Login screen

**Files:**
- Create: `src/app/login.tsx`

**Interfaces:**
- Consumes:
  - `authContext` from `@/modules/context/auth-context` — `React.Context<AuthContext | null>` where `AuthContext = { user: AuthUser | null; authService: AuthService }`.
  - `AuthService.loginWithEmailAndPassword(email: string, password: string): Promise<AuthUser | null>` (throws on invalid credentials — matches current `FirebaseAuthService` behavior of letting the underlying Firebase error propagate).
  - `Input`, `Label`, `Button`, `Text` from Task 2.

- [ ] **Step 1: Write the login screen**

Create `src/app/login.tsx`:

```tsx
import { useContext, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { authContext } from '@/modules/context/auth-context';

export default function Login() {
  const auth = useContext(authContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!auth) return;
    setError(null);
    setSubmitting(true);
    try {
      await auth.authService.loginWithEmailAndPassword(email, password);
    } catch {
      setError('Invalid email or password');
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-background p-6">
      <Text variant="h2">Log in</Text>

      <View className="gap-1.5">
        <Label nativeID="loginEmailLabel">Email</Label>
        <Input
          aria-labelledby="loginEmailLabel"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="you@example.com"
        />
      </View>

      <View className="gap-1.5">
        <Label nativeID="loginPasswordLabel">Password</Label>
        <Input
          aria-labelledby="loginPasswordLabel"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          placeholder="Password"
        />
      </View>

      {error ? (
        <Text variant="small" className="text-destructive">
          {error}
        </Text>
      ) : null}

      <Button onPress={handleSubmit} disabled={submitting}>
        <Text>{submitting ? 'Logging in…' : 'Log in'}</Text>
      </Button>
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/login.tsx
git commit -m "feat: add login screen"
```

---

### Task 4: Home screen

**Files:**
- Modify: `src/app/index.tsx`

**Interfaces:**
- Consumes:
  - `authContext` from `@/modules/context/auth-context`.
  - `AuthService.logout(): Promise<void>` (from Task 1).
  - `Button`, `Text` from Task 2.

- [ ] **Step 1: Replace the placeholder home screen**

Replace the full contents of `src/app/index.tsx`:

```tsx
import { useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { authContext } from '@/modules/context/auth-context';

export default function Index() {
  const auth = useContext(authContext);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background">
      <Text variant="h1">Hello</Text>
      <Button variant="outline" onPress={() => auth?.authService.logout()}>
        <Text>Log out</Text>
      </Button>
      <StatusBar style="auto" />
    </View>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/index.tsx
git commit -m "feat: add hello home screen with logout"
```

---

### Task 5: Wire the auth guard into the root layout

**Files:**
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: `authContext` (`AuthContext = { user: AuthUser | null; authService: AuthService }`), `Stack`/`Stack.Protected`/`Stack.Screen` from `expo-router/stack`, `login.tsx` and `index.tsx` routes from Tasks 3–4.
- Produces: final app behavior — this task is the integration point; verified manually, not just by type-check.

- [ ] **Step 1: Add the guard**

Replace the full contents of `src/app/_layout.tsx`:

```tsx
import { useContext } from 'react';
import { Stack } from 'expo-router/stack';
import { ThemeProvider } from 'expo-router/react-navigation';
import { useColorScheme } from 'react-native';

import { NAV_THEME } from '@/lib/theme';

import '@/global.css';
import { authContext } from '@/modules/context/auth-context';
import { FirebaseAuthProvider } from '@/modules/firebase-auth/providers/firebase-auth-provider';
import { FirebaseAuthService } from '@/modules/firebase-auth/services/firebase-auth-service';
import { getAuth } from '@react-native-firebase/auth';

const authService = new FirebaseAuthService(getAuth());

function GuardedStack() {
  const auth = useContext(authContext);
  const isLoggedIn = !!auth?.user;

  return (
    <Stack>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <FirebaseAuthProvider authService={authService}>
      <ThemeProvider value={colorScheme === 'dark' ? NAV_THEME.dark : NAV_THEME.light}>
        <GuardedStack />
      </ThemeProvider>
    </FirebaseAuthProvider>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run start` (or `npm run android` / `npm run ios` for a device/simulator), then in the running app:

1. With no active Firebase session, confirm the app opens on the login screen (not "Hello").
2. Enter an invalid email/password and submit — confirm the inline "Invalid email or password" message appears and the app stays on the login screen.
3. Enter valid credentials for a real Firebase Auth user in this project and submit — confirm the app navigates to the home screen and shows "Hello".
4. Tap "Log out" — confirm the app navigates back to the login screen.
5. Force-quit and relaunch the app after step 3's login (before logging out) — confirm it opens directly on the home screen (session persisted via Firebase).

- [ ] **Step 4: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "feat: guard routes with Stack.Protected based on auth state"
```
