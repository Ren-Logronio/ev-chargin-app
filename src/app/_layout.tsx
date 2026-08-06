import '@/global.css';

import { useContext, useEffect } from 'react';
import { Stack } from 'expo-router/stack';
import { ThemeProvider } from 'expo-router/react-navigation';
import { useColorScheme } from 'nativewind';
import { PortalHost } from '@rn-primitives/portal';

import { NAV_THEME } from '@/lib/theme';

import { authContext } from '@/modules/context/auth-context';
import { MockAuthProvider } from '@/modules/mock-auth/providers/mock-auth-provider';
import { MockAuthService } from '@/modules/mock-auth/services/mock-auth-service';

import { ExpoLocationProvider } from '@/modules/expo-location/providers/expo-location-provider';
import { ExpoLocationService } from '@/modules/expo-location/services/expo-location-service';

import { MockAccountProvider } from '@/modules/mock-account/providers/mock-account-provider';
import { MockAccountService } from '@/modules/mock-account/services/mock-account-service';

const authService = new MockAuthService();
const locationService = new ExpoLocationService();
const accountService = new MockAccountService();

// How Firebase auth is implemented and then injected
// import { FirebaseAuthProvider } from '@/modules/firebase-auth/providers/firebase-auth-provider';
// import { FirebaseAuthService } from '@/modules/firebase-auth/services/firebase-auth-service';
// import { getAuth } from '@react-native-firebase/auth';
// const authService = new FirebaseAuthService(getAuth());

function GuardedStack() {
  const auth = useContext(authContext);
  const isLoggedIn = !!auth?.user;

  return (
    <Stack>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="charge" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme('dark');
  }, [setColorScheme]);

  return (
    <MockAuthProvider authService={authService}>
      <ExpoLocationProvider locationService={locationService}>
        <MockAccountProvider accountService={accountService}>
          <ThemeProvider value={NAV_THEME.dark}>
            <GuardedStack />
            <PortalHost />
          </ThemeProvider>
        </MockAccountProvider>
      </ExpoLocationProvider>
    </MockAuthProvider>
  );
}
