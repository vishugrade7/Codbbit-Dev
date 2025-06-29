"use server";

import { revalidatePath } from "next/cache";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "@/types";

export async function updateUserProfile(userId: string, data: Partial<User>) {
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, data);
    
    // Revalidate paths to show the updated data
    revalidatePath("/profile");
    if (data.username) {
        revalidatePath(`/${data.username}`);
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to update profile: ${errorMessage}` };
  }
}
