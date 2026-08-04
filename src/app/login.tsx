import { useContext, useState } from 'react';
import { View, Text as TextC } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { getAuthErrorMessage } from '@/lib/firebase-auth-error';
import { authContext } from '@/modules/context/auth-context';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export default function Login() {
  const auth = useContext(authContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!auth) return;
    setError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      await auth.authService.loginWithEmailAndPassword(result.data.email, result.data.password);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-background p-6">
      <Text variant="h2">Log in</Text>
      <TextC className="text-red-500">test red</TextC>

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
