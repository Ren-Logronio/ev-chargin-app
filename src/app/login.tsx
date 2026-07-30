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
