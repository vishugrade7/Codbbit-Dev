
'use server';

import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function toggleStarProblem(userId: string, problemId: string, isCurrentlyStarred: boolean) {
    if (!userId || !problemId) {
        return { success: false, error: 'User ID and Problem ID are required.' };
    }

    const userDocRef = doc(db, 'users', userId);

    try {
        if (isCurrentlyStarred) {
            // Unstar the problem
            await updateDoc(userDocRef, {
                starredProblems: arrayRemove(problemId)
            });
        } else {
            // Star the problem
            await updateDoc(userDocRef, {
                starredProblems: arrayUnion(problemId)
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Error toggling star status:", error);
        return { success: false, error: 'Failed to update star status.' };
    }
}


export async function updateAvatar(userId: string, newAvatarUrl: string) {
    if (!userId || !newAvatarUrl) {
        return { success: false, error: 'User ID and new avatar URL are required.' };
    }
    if (!db) {
        return { success: false, error: 'Firebase is not configured correctly.' };
    }

    const userDocRef = doc(db, 'users', userId);

    try {
        // Just update Firestore with the new URL.
        // The file in Storage is overwritten by the client-side upload.
        await updateDoc(userDocRef, {
            avatarUrl: newAvatarUrl
        });

        return { success: true };
    } catch (error) {
        console.error("Error updating avatar URL in Firestore:", error);
        return { success: false, error: 'Failed to update profile picture URL.' };
    }
}

export async function updateActiveSession(userId: string, sessionId: string) {
    if (!userId || !sessionId) {
        return { success: false, error: 'User ID and Session ID are required.' };
    }
    if (!db) {
        return { success: false, error: 'Firebase is not configured correctly.' };
    }

    const userDocRef = doc(db, 'users', userId);

    try {
        await updateDoc(userDocRef, {
            activeSessionId: sessionId
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating active session:", error);
        return { success: false, error: 'Failed to update user session.' };
    }
}
