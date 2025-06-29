"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
  query,
  where,
  getDoc,
  updateDoc
} from "firebase/firestore";
import type { Problem } from "@/types";

// In a production app, you would verify admin privileges here,
// likely by decoding a Firebase ID token.

type ProblemInput = Omit<Problem, 'id' | 'examples' | 'hints'> & {
  examples: { input?: string; output: string; explanation?: string }[];
  hints: string[];
};

export async function addCategory(name: string) {
  try {
    // Check if category already exists
    const categoriesRef = collection(db, "categories");
    const q = query(categoriesRef, where("name", "==", name));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return { success: false, error: "A category with this name already exists." };
    }
    
    await addDoc(categoriesRef, { name });
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to add category: ${errorMessage}` };
  }
}

export async function addProblem(categoryId: string, problemData: ProblemInput) {
  try {
    const problemsRef = collection(db, "categories", categoryId, "problems");
    await addDoc(problemsRef, problemData);
    revalidatePath("/admin");
    revalidatePath(`/problems/apex/${categoryId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to add problem: ${errorMessage}` };
  }
}

export async function updateProblem(problemId: string, categoryId: string, problemData: Omit<ProblemInput, 'id'>) {
  try {
    const problemRef = doc(db, "categories", categoryId, "problems", problemId);
    await updateDoc(problemRef, problemData);
    revalidatePath("/admin");
    revalidatePath(`/problems/apex/${categoryId}`);
    revalidatePath(`/problems/apex/${categoryId}/${problemId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to update problem: ${errorMessage}` };
  }
}


export async function deleteProblem(problemId: string, categoryId: string) {
  try {
    const problemRef = doc(db, "categories", categoryId, "problems", problemId);
    await deleteDoc(problemRef);
    revalidatePath("/admin");
    revalidatePath(`/problems/apex/${categoryId}`);
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

export async function getProblem(problemId: string, categoryId: string): Promise<Problem | null> {
    try {
        const problemRef = doc(db, "categories", categoryId, "problems", problemId);
        const docSnap = await getDoc(problemRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Problem;
        }
        return null;
    } catch (error) {
        console.error("Failed to get problem:", error);
        return null;
    }
}