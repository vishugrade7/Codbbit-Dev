'use client';

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'codbbitCache';
const STORE_NAME = 'keyval';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            },
        });
    }
    return dbPromise;
}

export async function set<T>(key: string, value: T): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const db = await getDb();
        await db.put(STORE_NAME, value, key);
    } catch (error) {
        console.error(`IndexedDB set error for key "${key}":`, error);
    }
}

export async function get<T>(key: string): Promise<T | undefined> {
    if (typeof window === 'undefined') return undefined;
    try {
        const db = await getDb();
        return await db.get(STORE_NAME, key);
    } catch (error) {
        console.error(`IndexedDB get error for key "${key}":`, error);
        return undefined;
    }
}

export async function clear(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const db = await getDb();
        await db.delete(STORE_NAME, key);
    } catch (error) {
        console.error(`IndexedDB clear error for key "${key}":`, error);
    }
}
