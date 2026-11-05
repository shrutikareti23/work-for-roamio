import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { LargeSecureStore, storageKey } from '@/lib/secure-storage';

const session = JSON.stringify({ access_token: 'secret-token-abc', user: { email: 'a@b.co' } });

describe('LargeSecureStore', () => {
  const store = new LargeSecureStore();
  const KEY = 'sb-abcd-auth-token';

  it('stores and reads back a session', async () => {
    await store.setItem(KEY, session);
    expect(await store.getItem(KEY)).toBe(session);
  });

  it('never stores the session in plain text', async () => {
    await store.setItem(KEY, session);
    const raw = await AsyncStorage.getItem(KEY);
    expect(raw).not.toContain('secret-token-abc');
    expect(raw).toMatch(/^[0-9a-f]+$/);
  });

  it('keeps the encryption key in the secure keychain, a new key each save', async () => {
    await store.setItem(KEY, session);
    const k1 = await SecureStore.getItemAsync(KEY);
    await store.setItem(KEY, session);
    const k2 = await SecureStore.getItemAsync(KEY);
    expect(k1).toMatch(/^[0-9a-f]{64}$/); // 256-bit key
    expect(k2).not.toBe(k1);
  });

  it('cannot read the session without the keychain key', async () => {
    await store.setItem(KEY, session);
    await SecureStore.deleteItemAsync(KEY);
    expect(await store.getItem(KEY)).toBeNull();
  });

  it('removes both parts on sign-out', async () => {
    await store.setItem(KEY, session);
    await store.removeItem(KEY);
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
    expect(await store.getItem(KEY)).toBeNull();
  });

  it('makes keys safe for the keychain', () => {
    expect(storageKey('sb-x:auth/token')).toBe('sb-x_auth_token');
  });
});
