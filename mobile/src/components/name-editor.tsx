import { useEffect, useState } from 'react';

import { getProfile, updateDisplayName } from '@/lib/profile';
import { nameProblem } from '@/lib/validation';

import { Button } from './button';
import { FormMessage } from './form-message';
import { TextField } from './text-field';

type Props = {
  userId: string;
  /** Called when the name is loaded or saved, so the screen can greet the user. */
  onName?: (name: string | null) => void;
};

/** Shows the user's name in a field with a Save button. */
export function NameEditor({ userId, onName }: Props) {
  const [saved, setSaved] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getProfile(userId).then((r) => {
      if (!active || !r.ok) return;
      setSaved(r.data.displayName);
      setValue(r.data.displayName ?? '');
      onName?.(r.data.displayName);
    });
    return () => {
      active = false;
    };
  }, [userId, onName]);

  async function save() {
    setError(null);
    setInfo(null);
    const problem = nameProblem(value);
    if (problem) return setError(problem);
    setBusy(true);
    const r = await updateDisplayName(userId, value);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setSaved(r.data.displayName);
    setValue(r.data.displayName ?? '');
    onName?.(r.data.displayName);
    setInfo('Name saved.');
  }

  const changed = value.trim() !== (saved ?? '');
  return (
    <>
      <TextField
        label="Your name"
        value={value}
        onChangeText={(t) => {
          setValue(t);
          setInfo(null);
        }}
        error={error}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        maxLength={80}
        placeholder="Add your name"
        onSubmitEditing={save}
      />
      <FormMessage text={info} kind="info" />
      {changed && <Button label="Save name" variant="secondary" onPress={save} loading={busy} />}
    </>
  );
}
