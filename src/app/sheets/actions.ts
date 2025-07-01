'use server';

import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function toggleSheetSubscription(sheetId: string, userId: string, currentlySubscribed: boolean) {
    if (!userId || !sheetId) {
        return { success: false, error: 'User ID and Sheet ID are required.' };
    }
    if (!db) {
        return { success: false, error: "Database not initialized." };
    }

    const sheetDocRef = doc(db, 'problem-sheets', sheetId);
    const userDocRef = doc(db, 'users', userId);

    try {
        if (currentlySubscribed) {
            // Unsubscribe
            await updateDoc(sheetDocRef, {
                subscribers: arrayRemove(userId)
            });
            await updateDoc(userDocRef, {
                subscribedSheetIds: arrayRemove(sheetId)
            });
        } else {
            // Subscribe
            await updateDoc(sheetDocRef, {
                subscribers: arrayUnion(userId)
            });
            await updateDoc(userDocRef, {
                subscribedSheetIds: arrayUnion(sheetId)
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Error toggling sheet subscription:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}
