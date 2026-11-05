import { router } from 'expo-router';
import { useState } from 'react';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { FormMessage } from '@/components/form-message';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { updatePassword } from '@/lib/auth';
import { useAuth } from '@/lib/session';
import { passwordProblem } from '@/lib/validation';

export default function NewPasswordScreen() {
  const { setRecovering } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    const problem =
      passwordProblem(password) ?? (password !== confirm ? 'Passwords don’t match.' : null);
    setFieldError(problem);
    if (problem) return;
    setBusy(true);
    const r = await updatePassword(password);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setRecovering(false);
    router.dismissAll();
  }

  return (
    <Screen>
      <AppText color="textSecondary">Choose a new password for your account.</AppText>
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        password
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        error={fieldError}
        password
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
      />
      <FormMessage text={error} />
      <Button label="Save password" onPress={submit} loading={busy} />
    </Screen>
  );
}
