// Chunked expo-secure-store adapter for Supabase's auth `storage` option.
//
// Why this exists: the previous setup used @react-native-async-storage
// AsyncStorage directly, which on iOS is an unencrypted plist/SQLite store —
// readable by anyone with filesystem or backup access to the device, no
// passcode required. That's the wrong place for a Supabase session, since it
// contains the access + refresh tokens that grant full API access to the
// user's account (wardrobe, profile, subscription status, everything behind
// the Bearer-token auth the /api/* routes enforce).
//
// expo-secure-store wraps the iOS Keychain (hardware-backed encryption,
// gated by the device passcode/biometrics) — the correct place for this.
// Its one limitation is a ~2048-byte per-item size cap on iOS, and a full
// Supabase session (access_token + refresh_token + user metadata) can exceed
// that. This adapter transparently chunks values across multiple SecureStore
// keys and reassembles them on read, so it's a drop-in replacement for the
// `storage` option with no size assumptions leaking into the auth code.
import * as SecureStore from "expo-secure-store";

const CHUNK_SIZE = 1800; // stay under the ~2048-byte iOS Keychain item limit
const CHUNK_COUNT_SUFFIX = "_chunks";

export const secureChunkedStorage = {
  async getItem(key: string): Promise<string | null> {
    const countStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX);
    if (!countStr) {
      // Not chunked (or never written) — fall back to a plain single read,
      // which also covers values written before this chunking existed.
      return SecureStore.getItemAsync(key);
    }
    const count = parseInt(countStr, 10);
    if (!Number.isFinite(count) || count <= 0) return null;

    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}_${i}`);
      if (part == null) return null; // corrupted/partial write — treat as missing
      parts.push(part);
    }
    return parts.join("");
  },

  async setItem(key: string, value: string): Promise<void> {
    // Clear any previous chunks first so a shrinking value doesn't leave
    // stale trailing chunks behind.
    await secureChunkedStorage.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const count = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < count; i++) {
      const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}_${i}`, chunk);
    }
    await SecureStore.setItemAsync(key + CHUNK_COUNT_SUFFIX, String(count));
  },

  async removeItem(key: string): Promise<void> {
    const countStr = await SecureStore.getItemAsync(key + CHUNK_COUNT_SUFFIX);
    if (countStr) {
      const count = parseInt(countStr, 10);
      if (Number.isFinite(count)) {
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_${i}`);
        }
      }
      await SecureStore.deleteItemAsync(key + CHUNK_COUNT_SUFFIX);
    }
    // Also clear a possible unchunked value under the bare key.
    await SecureStore.deleteItemAsync(key);
  },
};
