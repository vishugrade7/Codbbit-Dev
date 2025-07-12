'use client';

import * as idb from './indexedDB';

// The concept of a global cache duration is less critical with IndexedDB
// as it's persistent. We can rely on manual cache clearing or introduce
// a timestamp-based check if needed, but for now, we'll simplify.

export async function setCache<T>(key: string, data: T): Promise<void> {
  await idb.set(key, data);
}

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await idb.get<T>(key);
  return data ?? null;
}

export async function clearCache(key: string): Promise<void> {
  await idb.clear(key);
}
