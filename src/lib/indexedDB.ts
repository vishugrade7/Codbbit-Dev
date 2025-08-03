
'use client';

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'codbbitCache';
const STORE_NAME = 'keyval';
const IMAGE_STORE_NAME = 'imageCache';
const DB_VERSION = 2; // Increment version to trigger upgrade

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
                // Add the new image store if it doesn't exist
                if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
                    db.createObjectStore(IMAGE_STORE_NAME);
                }
            },
        });
    }
    return dbPromise;
}

export async function set<T>(storeName: string, value: T, key: IDBValidKey): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const db = await getDb();
        await db.put(storeName, value, key);
    } catch (error) {
        console.error(`IndexedDB set error for key "${key}" in store "${storeName}":`, error);
    }
}

export async function get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    if (typeof window === 'undefined') return undefined;
    try {
        const db = await getDb();
        return await db.get(storeName, key);
    } catch (error) {
        console.error(`IndexedDB get error for key "${key}" in store "${storeName}":`, error);
        return undefined;
    }
}

export async function clear(storeName: string, key: IDBValidKey): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const db = await getDb();
        await db.delete(storeName, key);
    } catch (error) {
        console.error(`IndexedDB clear error for key "${key}" in store "${storeName}":`, error);
    }
}
