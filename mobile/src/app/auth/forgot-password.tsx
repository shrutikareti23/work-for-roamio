import { router } from 'expo-router';
import { useState } from 'react';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { FormMessage } from '@/components/form-message';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { sendPasswordReset } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
    setBusy(true);
    const r = await sendPasswordReset(email);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    router.replace({ pathname: '/auth/verify', params: { mode: 'recovery', email } });
  }

  return (
    <Screen>
      <AppText color="textSecondary">
        Enter your account email. If it&apos;s registered, we&apos;ll send you a code to set a new
        password.
      </AppText>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        onSubmitEditing={submit}
      />
      <FormMessage text={error} />
      <Button label="Send code" onPress={submit} loading={busy} />
    </Screen>
  );
}
