
'use server';

import { doc, updateDoc, arrayUnion, arrayRemove, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function toggleSheetFollow(userId: string, sheetId: string, isFollowing: boolean) {
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
            if (isFollowing) {
                // Unfollow
                transaction.update(sheetDocRef, { followers: arrayRemove(userId) });
                transaction.update(userDocRef, { followingSheetIds: arrayRemove(sheetId) });
            } else {
                // Follow
                transaction.update(sheetDocRef, { followers: arrayUnion(userId) });
                transaction.update(userDocRef, { followingSheetIds: arrayUnion(sheetId) });
            }
        });
        
        return { success: true, message: isFollowing ? 'Unfollowed successfully.' : 'Followed successfully.' };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error("Error toggling sheet follow:", error);
        return { success: false, error: errorMessage };
    }
}
