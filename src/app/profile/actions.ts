
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
    const bucket = adminStorage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
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
        // Set a short cache time for the object itself; the browser cache is what we're busting with the query param.
        cacheControl: 'public, max-age=60',
      },
    });

    // Make the file public to get a predictable URL
    await file.makePublic();
    let downloadURL = file.publicUrl();

    // Add a cache-busting query parameter to the URL.
    // This ensures the browser fetches the new image instead of using a cached version.
    downloadURL = `${downloadURL}?updated=${Date.now()}`;

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

export async function verifyPhoneNumber(userId: string) {
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }
    if (!db) {
        return { success: false, error: 'Firebase is not configured.' };
    }
    // In a real app, this would involve sending an SMS via a service like Twilio.
    // For this simulation, we will just update the user's status directly.
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { phoneVerified: true });
        return { success: true };
    } catch (error: any) {
        console.error("Error verifying phone number:", error);
        return { success: false, error: error.message || 'An unknown error occurred.' };
    }
}
