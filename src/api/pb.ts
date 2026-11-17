// src/api/pb.ts
// PocketBase client instance with expo-secure-store backed AsyncAuthStore.
// Conforms to docs/CURSOR_CONTEXT.MD Rule 3 & 7.

import PocketBase, { AsyncAuthStore } from 'pocketbase';
import * as SecureStore from 'expo-secure-store';

const SECURE_STORE_KEY = 'pennywick_pb_auth';

export const PB_URL =
  process.env.EXPO_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

// Provide `initial` so the store restores the saved session on startup.
export const authStore = new AsyncAuthStore({
  save: async (serialized: string) => {
    try {
      await SecureStore.setItemAsync(SECURE_STORE_KEY, serialized);
    } catch (e) {
      console.warn('[pb] Failed to save auth to SecureStore', e);
    }
  },
  clear: async () => {
    try {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    } catch (e) {
      console.warn('[pb] Failed to clear auth from SecureStore', e);
    }
  },
  initial: SecureStore.getItemAsync(SECURE_STORE_KEY).catch(() => null),
});

export const pb = new PocketBase(PB_URL, authStore);

// Fail-fast timeout (7 seconds) so unreachable IPs don't hang local usage
const originalSend = pb.send.bind(pb);
pb.send = async function (path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 7000);

  try {
    const signal = options.signal || controller.signal;
    return await originalSend(path, { ...options, signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}
