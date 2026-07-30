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
