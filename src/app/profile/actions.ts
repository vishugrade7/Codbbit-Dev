
'use server';

import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminStorage } from '@/lib/firebaseAdmin';

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

export async function updateUserProfilePicture(userId: string, dataUrl: string) {
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  if (!dataUrl) {
    return { success: false, error: 'No image data provided.' };
  }

  try {
    // Explicitly specify the bucket name to avoid configuration issues.
    const bucket = adminStorage.bucket('showcase-canvas-rx61p.appspot.com');
    const filePath = `profile-pictures/${userId}`;
    const file = bucket.file(filePath);

    // Extract content type and data from data URL
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid data URL format.');
    }
    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload the file
    await file.save(buffer, {
      metadata: {
        contentType: contentType,
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });

    // Make the file public to get a predictable URL
    await file.makePublic();
    const downloadURL = file.publicUrl();

    // Now update firestore with the new URL
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
        avatarUrl: downloadURL
    });

    return { success: true, downloadURL };
  } catch (error: any) {
    console.error("Error uploading profile picture via server action:", error);
    return { success: false, error: error.message || 'An unknown server error occurred.' };
  }
}
