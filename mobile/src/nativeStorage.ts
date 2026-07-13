import AsyncStorage from "@react-native-async-storage/async-storage";

const memoryStore = new Map<string, string>();
const PROBE_KEY = "__quickvoice_storage_probe__";

let storageReady: Promise<boolean> | null = null;

async function nativeStorageWorks(): Promise<boolean> {
  try {
    await AsyncStorage.setItem(PROBE_KEY, "1");
    const value = await AsyncStorage.getItem(PROBE_KEY);
    await AsyncStorage.removeItem(PROBE_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

function canUseNativeStorage(): Promise<boolean> {
  if (!storageReady) {
    storageReady = nativeStorageWorks();
  }
  return storageReady;
}

export const appStorage = {
  async getItem(key: string) {
    if (await canUseNativeStorage()) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value != null) memoryStore.set(key, value);
        return value;
      } catch {
        storageReady = Promise.resolve(false);
      }
    }

    return memoryStore.get(key) ?? null;
  },

  async setItem(key: string, value: string) {
    memoryStore.set(key, value);

    if (await canUseNativeStorage()) {
      try {
        await AsyncStorage.setItem(key, value);
      } catch {
        storageReady = Promise.resolve(false);
      }
    }
  },

  async removeItem(key: string) {
    memoryStore.delete(key);

    if (await canUseNativeStorage()) {
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        storageReady = Promise.resolve(false);
      }
    }
  },
};
