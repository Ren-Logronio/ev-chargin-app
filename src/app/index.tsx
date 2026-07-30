import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-foreground">Open up app/index.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}
