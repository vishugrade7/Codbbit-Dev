
'use server';

import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

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


export async function uploadAvatar(userId: string, formData: FormData) {
    if (!userId || !formData) {
        return { success: false, error: 'User ID and form data are required.' };
    }
    const file = formData.get('avatar') as File | null;

    if (!file) {
        return { success: false, error: 'No avatar file provided.' };
    }

    if (!db || !storage) {
        return { success: false, error: 'Firebase is not configured correctly.' };
    }

    const userDocRef = doc(db, 'users', userId);
    const avatarStorageRef = storageRef(storage, `profile-pictures/${userId}`);
    
    try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await uploadBytes(avatarStorageRef, fileBuffer, { contentType: file.type });
        const downloadURL = await getDownloadURL(avatarStorageRef);

        await updateDoc(userDocRef, {
            avatarUrl: downloadURL
        });

        return { success: true, url: downloadURL };
    } catch (error) {
        console.error("Error uploading avatar:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: errorMessage };
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
