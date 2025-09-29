import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

const MASTER_CONTENT_KEY = 'tool_chest_master_key';

export type Strategy = {
  id: string;
  text: string;
};

const STORAGE_PREFIX = 'strategy:';

export async function saveStrategy(strategy: Strategy): Promise<void> {
  const encrypted = CryptoJS.AES.encrypt(strategy.text, MASTER_CONTENT_KEY).toString();
  await AsyncStorage.setItem(`${STORAGE_PREFIX}${strategy.id}`, encrypted);
}

export async function deleteStrategy(id: string): Promise<void> {
  await AsyncStorage.removeItem(`${STORAGE_PREFIX}${id}`);
}

export async function loadStrategies(): Promise<Strategy[]> {
  const keys = await AsyncStorage.getAllKeys();
  const strategyKeys = keys.filter((k) => k.startsWith(STORAGE_PREFIX));
  const stores = await AsyncStorage.multiGet(strategyKeys);
  return stores.map(([key, value]) => ({
    id: key.replace(STORAGE_PREFIX, ''),
    text: value
      ? CryptoJS.AES.decrypt(value, MASTER_CONTENT_KEY).toString(CryptoJS.enc.Utf8)
      : '',
  }));
}

