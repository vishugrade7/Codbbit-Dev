
"use server";

import { revalidatePath } from "next/cache";
import {
  doc,
  updateDoc,
  getDoc,
  FieldValue,
  arrayUnion,
  deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Problem } from "@/types";

// In a production app, you would verify admin privileges here.

type ProblemInput = Omit<Problem, "id">;
const apexDocRef = doc(db, "problems", "Apex");

export async function addCategory(name: string) {
  try {
    const docSnap = await getDoc(apexDocRef);
    if (docSnap.exists() && docSnap.data().Category?.[name]) {
      return { success: false, error: "A category with this name already exists." };
    }

    await updateDoc(apexDocRef, {
      [`Category.${name}`]: { Questions: [] },
    }, { merge: true });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to add category: ${errorMessage}` };
  }
}

export async function addProblem(categoryName: string, problemData: ProblemInput) {
  try {
    const newProblem: Problem = {
      ...problemData,
      id: crypto.randomUUID(), // Generate a unique ID for the problem
    };

    await updateDoc(apexDocRef, {
      [`Category.${categoryName}.Questions`]: arrayUnion(newProblem),
    });

    revalidatePath("/admin");
    revalidatePath(`/problems/apex/${categoryName}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to add problem: ${errorMessage}` };
  }
}

export async function updateProblem(problemId: string, categoryName: string, problemData: ProblemInput) {
  try {
    const docSnap = await getDoc(apexDocRef);
    if (!docSnap.exists()) {
      throw new Error("Apex problems document not found.");
    }
    const data = docSnap.data();
    const questions = data.Category?.[categoryName]?.Questions || [];
    
    const problemIndex = questions.findIndex((p: Problem) => p.id === problemId);

    if (problemIndex === -1) {
      return { success: false, error: "Problem not found in the category." };
    }

    const updatedQuestions = [...questions];
    updatedQuestions[problemIndex] = { ...problemData, id: problemId };

    await updateDoc(apexDocRef, {
      [`Category.${categoryName}.Questions`]: updatedQuestions,
    });

    revalidatePath("/admin");
    revalidatePath(`/problems/apex/${categoryName}`);
    revalidatePath(`/problems/apex/${categoryName}/${problemId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to update problem: ${errorMessage}` };
  }
}

export async function deleteProblem(problemId: string, categoryName: string) {
  try {
    const docSnap = await getDoc(apexDocRef);
    if (!docSnap.exists()) {
      throw new Error("Apex problems document not found.");
    }
    const data = docSnap.data();
    const questions = data.Category?.[categoryName]?.Questions || [];
    
    const updatedQuestions = questions.filter((p: Problem) => p.id !== problemId);

    if (questions.length === updatedQuestions.length) {
         return { success: false, error: "Problem not found to delete." };
    }

    await updateDoc(apexDocRef, {
      [`Category.${categoryName}.Questions`]: updatedQuestions,
    });

    revalidatePath("/admin");
    revalidatePath(`/problems/apex/${categoryName}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to delete problem: ${errorMessage}` };
  }
}

export async function deleteCategory(categoryName: string) {
  try {
     const docSnap = await getDoc(apexDocRef);
    if (!docSnap.exists()) {
      throw new Error("Apex problems document not found.");
    }
    const data = docSnap.data();
    const questions = data.Category?.[categoryName]?.Questions || [];

    if (questions.length > 0) {
      return {
        success: false,
        error: "Cannot delete category with existing problems. Please remove all problems first.",
      };
    }

    await updateDoc(apexDocRef, {
      [`Category.${categoryName}`]: deleteField(),
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: `Failed to delete category: ${errorMessage}` };
  }
}

export async function getProblem(problemId: string, categoryName: string): Promise<Problem | null> {
    try {
        const docSnap = await getDoc(apexDocRef);
        if (docSnap.exists()) {
            const problems = docSnap.data().Category?.[categoryName]?.Questions || [];
            const problem = problems.find((p: Problem) => p.id === problemId);
            return (problem as Problem) || null;
        }
        return null;
    } catch (error) {
        console.error("Failed to get problem:", error);
        return null;
    }
}
