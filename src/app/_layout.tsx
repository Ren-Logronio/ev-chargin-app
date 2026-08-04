import '@/global.css';

import { useContext } from 'react';
import { Stack } from 'expo-router/stack';
import { ThemeProvider } from 'expo-router/react-navigation';
import { useColorScheme } from 'react-native';
import { PortalHost } from '@rn-primitives/portal';

import { NAV_THEME } from '@/lib/theme';

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
        <PortalHost />
      </ThemeProvider>
    </FirebaseAuthProvider>
  );
}
