import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { FormMessage } from '@/components/form-message';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { resendSignUpCode, sendPasswordReset, verifyResetCode, verifySignUpCode } from '@/lib/auth';
import { useAuth } from '@/lib/session';
import { isValidCode } from '@/lib/validation';

/** Enter the code we emailed: confirms a new account, or starts a password reset. */
export default function VerifyScreen() {
  const params = useLocalSearchParams<{ mode?: string; email?: string }>();
  const mode = params.mode === 'recovery' ? 'recovery' : 'signup';
  const email = params.email ?? '';
  const { setRecovering } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setInfo(null);
    if (!isValidCode(code)) return setError('Enter the code from the email (numbers only).');
    setBusy(true);
    const r =
      mode === 'signup' ? await verifySignUpCode(email, code) : await verifyResetCode(email, code);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    if (mode === 'recovery') {
      setRecovering(true);
      router.replace('/auth/new-password');
    } else {
      router.dismissAll();
    }
  }

  async function resend() {
    setError(null);
    setInfo(null);
    const r = mode === 'signup' ? await resendSignUpCode(email) : await sendPasswordReset(email);
    if (r.ok) setInfo('We sent a new code. Check your inbox and spam folder.');
    else setError(r.message);
  }

  return (
    <Screen>
      <AppText>
        We sent a code to <AppText variant="label">{email || 'your email'}</AppText>. Enter it
        below.
      </AppText>
      <TextField
        label="Code"
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={10}
        onSubmitEditing={submit}
      />
      <FormMessage text={error} />
      <FormMessage text={info} kind="info" />
      <Button
        label={mode === 'signup' ? 'Confirm account' : 'Continue'}
        onPress={submit}
        loading={busy}
      />
      <Button label="Send a new code" variant="secondary" onPress={resend} />
    </Screen>
  );
}
