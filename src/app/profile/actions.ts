
'use server';

import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';

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
    if (!db || !storage) {
        return { success: false, error: 'Firebase is not configured correctly.' };
    }

    const userDocRef = doc(db, 'users', userId);

    try {
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            return { success: false, error: 'User not found.' };
        }
        
        const oldAvatarUrl = userDoc.data().avatarUrl;

        // Update Firestore with the new URL
        await updateDoc(userDocRef, {
            avatarUrl: newAvatarUrl
        });

        // If there was an old avatar and it was a Firebase Storage URL, delete it.
        // Avoid deleting the default placeholder images.
        if (oldAvatarUrl && oldAvatarUrl.includes('firebasestorage.googleapis.com') && !oldAvatarUrl.includes('placehold.co')) {
            try {
                const oldAvatarRef = ref(storage, oldAvatarUrl);
                await deleteObject(oldAvatarRef);
            } catch (error: any) {
                // Log error but don't fail the whole operation if deletion fails
                // e.g., if the file doesn't exist or permissions are wrong
                if (error.code !== 'storage/object-not-found') {
                   console.error("Error deleting old avatar:", error);
                }
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating avatar:", error);
        return { success: false, error: 'Failed to update avatar.' };
    }
}
