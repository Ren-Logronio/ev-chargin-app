import { useContext, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { getAuthErrorMessage } from '@/lib/firebase-auth-error';
import { authContext } from '@/modules/context/auth-context';

export default function Index() {
  const auth = useContext(authContext);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (!auth) return;
    setError(null);
    try {
      await auth.authService.logout();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background">
      <Text variant="h1">Hello</Text>
      {error ? (
        <Text variant="small" className="text-destructive">
          {error}
        </Text>
      ) : null}
      <Button variant="outline" onPress={handleLogout}>
        <Text>Log out</Text>
      </Button>
      <StatusBar style="auto" />
    </View>
  );
}
