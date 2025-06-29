"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore";

// In a production app, you would verify admin privileges here,
// likely by decoding a Firebase ID token.

export async function deleteProblem(problemId: string, categoryId: string) {
  try {
    const problemRef = doc(db, "categories", categoryId, "problems", problemId);
    await deleteDoc(problemRef);
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to delete problem: ${errorMessage}` };
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    const problemsRef = collection(db, "categories", categoryId, "problems");
    const problemsSnapshot = await getDocs(problemsRef);

    if (!problemsSnapshot.empty) {
      return {
        success: false,
        error: "Cannot delete category with existing problems. Please remove all problems first.",
      };
    }

    const categoryRef = doc(db, "categories", categoryId);
    await deleteDoc(categoryRef);

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to delete category: ${errorMessage}` };
  }
}
