import AsyncStorage from '@react-native-async-storage/async-storage';
import aesjs from 'aes-js';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Where the login session lives on the phone (Supabase's recommended "LargeSecureStore").
 *
 * The phone's secure keychain (SecureStore) only holds ~2 KB per item, and a session is
 * bigger. So: a random 256-bit key goes in SecureStore, the session is encrypted with
 * AES using that key, and the encrypted text goes in ordinary app storage (AsyncStorage).
 * Without the keychain key, the stored session is unreadable.
 */
export class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = getRandomBytes(256 / 8);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(storageKey(key), aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encrypted);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const keyHex = await SecureStore.getItemAsync(storageKey(key));
    if (!keyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(keyHex),
      new aesjs.Counter(1),
    );
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    return this.decrypt(key, encrypted);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(storageKey(key));
  }
}

/** SecureStore keys may only contain letters, numbers, ".", "-" and "_". */
export function storageKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}
