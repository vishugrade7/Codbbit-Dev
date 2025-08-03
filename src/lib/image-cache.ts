
'use client';

import * as idb from './indexedDB';

const IMAGE_STORE = 'imageCache';

async function fetchAndCache(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch image: ${response.statusText}`);
            return null;
        }
        const blob = await response.blob();
        
        // Use a FileReader to convert the Blob to a Base64 string (Data URL)
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                // Use the original URL as the key for caching
                await idb.set(IMAGE_STORE, base64data, url);
                resolve(base64data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`Error fetching and caching image from ${url}:`, error);
        return null;
    }
}

export async function getCachedImage(url: string): Promise<string | null> {
    if (typeof window === 'undefined' || !url) {
        return url; // Return original URL on server or if no URL
    }

    try {
        const cachedData = await idb.get<string>(IMAGE_STORE, url);
        if (cachedData) {
            return cachedData;
        }
        
        // If not in cache, fetch and cache it
        const fetchedDataUrl = await fetchAndCache(url);
        return fetchedDataUrl || url; // Return original URL as fallback

    } catch (error) {
        console.error(`Error getting cached image for ${url}:`, error);
        return url; // Fallback to original URL on error
    }
}

export async function clearImageCache(url: string): Promise<void> {
    if (typeof window === 'undefined' || !url) return;
    try {
        await idb.clear(IMAGE_STORE, url);
    } catch (error) {
        console.error(`Error clearing image cache for ${url}:`, error);
    }
}
