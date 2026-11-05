import { Link, router } from 'expo-router';
import { useState } from 'react';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { FormMessage } from '@/components/form-message';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { signIn } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsCode, setNeedsCode] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setNeedsCode(false);
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
    if (!password) return setError('Please enter your password.');
    setBusy(true);
    const r = await signIn(email, password);
    setBusy(false);
    if (r.ok) return router.dismissAll();
    setError(r.message);
    setNeedsCode(r.message.startsWith('Please confirm your email'));
  }

  return (
    <Screen>
      <AppText color="textSecondary">
        Sign in to save trips and use them on all your devices.
      </AppText>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        password
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
      />
      <FormMessage text={error} />
      {needsCode && (
        <Button
          label="Enter confirmation code"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: '/auth/verify', params: { mode: 'signup', email } })
          }
        />
      )}
      <Button label="Sign in" onPress={submit} loading={busy} />
      <Link href="/auth/forgot-password" accessibilityRole="link">
        <AppText color="primary">Forgot password?</AppText>
      </Link>
      <Link href="/auth/sign-up" replace accessibilityRole="link">
        <AppText color="primary">New to Roamio? Create an account</AppText>
      </Link>
    </Screen>
  );
}
