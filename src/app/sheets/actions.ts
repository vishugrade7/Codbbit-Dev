'use server';

import { doc, updateDoc, arrayUnion, arrayRemove, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function toggleSheetSubscription(userId: string, sheetId: string, isSubscribed: boolean) {
    if (!userId || !sheetId) {
        return { success: false, error: 'User and Sheet IDs are required.' };
    }
    if (!db) {
        return { success: false, error: 'Database not initialized.' };
    }

    const sheetDocRef = doc(db, 'problem-sheets', sheetId);
    const userDocRef = doc(db, 'users', userId);

    try {
        await runTransaction(db, async (transaction) => {
            if (isSubscribed) {
                // Unsubscribe
                transaction.update(sheetDocRef, { subscribers: arrayRemove(userId) });
                transaction.update(userDocRef, { subscribedSheetIds: arrayRemove(sheetId) });
            } else {
                // Subscribe
                transaction.update(sheetDocRef, { subscribers: arrayUnion(userId) });
                transaction.update(userDocRef, { subscribedSheetIds: arrayUnion(sheetId) });
            }
        });
        
        return { success: true, message: isSubscribed ? 'Unsubscribed successfully.' : 'Subscribed successfully.' };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error("Error toggling sheet subscription:", error);
        return { success: false, error: errorMessage };
    }
}
