
'use server';

import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, runTransaction, collection, where, query, getDocs, getDoc } from 'firebase/firestore';
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
        // Fetch user data before starting the transaction to avoid read/write conflicts.
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            throw new Error("User not found.");
        }
        
        await runTransaction(db, async (transaction) => {
            // 1. Update the user's main document
            transaction.update(userDocRef, { avatarUrl: newAvatarUrl });

            // 2. Query for problem sheets created by this user
            const sheetsQuery = query(collection(db, 'problem-sheets'), where('createdBy', '==', userId));
            // The reads must happen before the writes in a transaction.
            const sheetsSnapshot = await getDocs(sheetsQuery);

            // 3. Update each problem sheet
            sheetsSnapshot.forEach(sheetDoc => {
                const sheetRef = doc(db, 'problem-sheets', sheetDoc.id);
                transaction.update(sheetRef, { creatorAvatarUrl: newAvatarUrl });
            });
        });

        return { success: true };
    } catch (error) {
        console.error("Error updating avatar URL:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: `Failed to update profile picture: ${errorMessage}` };
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

export async function markLessonAsComplete(userId: string, lessonId: string) {
    if (!userId || !lessonId) {
        return { success: false, error: 'User ID and Lesson ID are required.' };
    }
    if (!db) {
        return { success: false, error: 'Firebase is not configured correctly.' };
    }

    const userDocRef = doc(db, 'users', userId);

    try {
        await updateDoc(userDocRef, {
            [`completedLessons.${lessonId}`]: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error("Error marking lesson as complete:", error);
        return { success: false, error: 'Failed to update lesson completion status.' };
    }
}
