
'use client';

import * as idb from './indexedDB';

const DATA_STORE = 'keyval';

export async function setCache<T>(key: string, data: T): Promise<void> {
  await idb.set(DATA_STORE, data, key);
}

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await idb.get<T>(DATA_STORE, key);
  return data ?? null;
}

export async function clearCache(key: string): Promise<void> {
  await idb.clear(DATA_STORE, key);
}
