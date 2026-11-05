import { Link, router } from 'expo-router';
import { useState } from 'react';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { FormMessage } from '@/components/form-message';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { signUp } from '@/lib/auth';
import { isValidEmail, passwordProblem } from '@/lib/validation';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    const eErr = isValidEmail(email) ? null : 'Please enter a valid email address.';
    const pErr = passwordProblem(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) return;
    setBusy(true);
    const r = await signUp(email, password);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    if (r.data.needsCode) {
      router.replace({ pathname: '/auth/verify', params: { mode: 'signup', email } });
    } else {
      router.dismissAll();
    }
  }

  return (
    <Screen>
      <AppText color="textSecondary">
        Create a free account to save your trips. We&apos;ll email you a code to confirm it&apos;s
        you.
      </AppText>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={passwordError}
        password
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
      />
      <AppText variant="caption" color="textSecondary">
        At least 8 characters, with a letter and a number.
      </AppText>
      <FormMessage text={error} />
      <Button label="Create account" onPress={submit} loading={busy} />
      <Link href="/auth/sign-in" replace accessibilityRole="link">
        <AppText color="primary">Already have an account? Sign in</AppText>
      </Link>
    </Screen>
  );
}
