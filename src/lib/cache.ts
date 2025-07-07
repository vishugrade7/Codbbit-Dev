'use client';

// Cache duration: 15 minutes
const CACHE_DURATION = 1000 * 60 * 15;

export const setCache = (key: string, data: any) => {
    if (typeof window === 'undefined') return;
    try {
        const item = {
            data,
            timestamp: Date.now(),
        };
        sessionStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
        // Handle potential storage errors, e.g., storage full
        console.error(`Error setting cache for key "${key}":`, error);
    }
};

export const getCache = <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    try {
        const itemStr = sessionStorage.getItem(key);
        if (!itemStr) {
            return null;
        }
        const item = JSON.parse(itemStr);
        const isExpired = Date.now() - item.timestamp > CACHE_DURATION;
        if (isExpired) {
            sessionStorage.removeItem(key);
            return null;
        }
        return item.data as T;
    } catch (error) {
        console.error(`Error getting cache for key "${key}":`, error);
        return null;
    }
};

export const clearCache = (key: string) => {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(key);
    } catch (error) {
        console.error(`Error clearing cache for key "${key}":`, error);
    }
};
