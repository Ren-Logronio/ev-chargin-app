import '@/global.css';

import { useContext } from 'react';
import { Stack } from 'expo-router/stack';
import { ThemeProvider } from 'expo-router/react-navigation';
import { colorScheme } from 'nativewind';
import { PortalHost } from '@rn-primitives/portal';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NAV_THEME } from '@/lib/theme';

import { authContext } from '@/modules/context/auth-context';
import { MockAuthProvider } from '@/modules/mock-auth/providers/mock-auth-provider';
import { MockAuthService } from '@/modules/mock-auth/services/mock-auth-service';

import { ExpoLocationProvider } from '@/modules/expo-location/providers/expo-location-provider';
import { ExpoLocationService } from '@/modules/expo-location/services/expo-location-service';

import { MockAccountProvider } from '@/modules/mock-account/providers/mock-account-provider';
import { MockAccountService } from '@/modules/mock-account/services/mock-account-service';

import { MockChargingProvider } from '@/modules/mock-charging/providers/mock-charging-provider';
import { MockChargingService } from '@/modules/mock-charging/services/mock-charging-service';

// How Firebase auth is implemented and then injected
// import { FirebaseAuthProvider } from '@/modules/firebase-auth/providers/firebase-auth-provider';
// import { FirebaseAuthService } from '@/modules/firebase-auth/services/firebase-auth-service';
// import { getAuth } from '@react-native-firebase/auth';
// const authService = new FirebaseAuthService(getAuth());

// App is forced dark-only (see the note above `:root` in src/global.css).
// Set this at module scope, not inside an effect, so the very first render
// already resolves `dark:` classes instead of flashing light for one frame.
colorScheme.set('dark');
// Matches app.config.ts `backgroundColor` — belt-and-suspenders against any
// native-shell white flash (the native root view background is otherwise
// independent of the JS colorScheme above).
void SystemUI.setBackgroundColorAsync('#0a0a06');

const authService = new MockAuthService();
const locationService = new ExpoLocationService();
const accountService = new MockAccountService();
const chargingService = new MockChargingService(accountService);

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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MockAuthProvider authService={authService}>
          <ExpoLocationProvider locationService={locationService}>
            <MockAccountProvider accountService={accountService}>
              <MockChargingProvider chargingService={chargingService}>
                <ThemeProvider value={NAV_THEME.dark}>
                  <GuardedStack />
                  <PortalHost />
                  <StatusBar style="light" />
                </ThemeProvider>
              </MockChargingProvider>
            </MockAccountProvider>
          </ExpoLocationProvider>
        </MockAuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
