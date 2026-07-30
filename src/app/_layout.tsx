import { Stack } from 'expo-router/stack';
import { ThemeProvider } from 'expo-router/react-navigation';
import { useColorScheme } from 'react-native';

import { NAV_THEME } from '@/lib/theme';

import '@/global.css';
import { FirebaseAuthProvider } from '@/modules/firebase-auth/providers/firebase-auth-provider';
import { FirebaseAuthService } from '@/modules/firebase-auth/services/firebase-auth-service';
import { getAuth } from '@react-native-firebase/auth';

const authService = new FirebaseAuthService(getAuth());

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <FirebaseAuthProvider authService={authService}>
      <ThemeProvider value={colorScheme === 'dark' ? NAV_THEME.dark : NAV_THEME.light}>
        <Stack />
      </ThemeProvider>
    </FirebaseAuthProvider>
  );
}
