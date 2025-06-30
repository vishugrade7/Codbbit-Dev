
'use server';

import { doc, getDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Problem } from '@/types';
import { z } from "zod";

const exampleSchema = z.object({
  input: z.string().optional(),
  output: z.string().min(1, "Output is required."),
  explanation: z.string().optional(),
});

const formSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  category: z.string().min(1, "Category is required."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  metadataType: z.enum(["Class", "Trigger"]),
  sampleCode: z.string().min(1, "Sample code is required."),
  testcases: z.string().min(1, "Test cases are required."),
  examples: z.array(exampleSchema).min(1, "At least one example is required."),
  hints: z.array(z.object({ value: z.string().min(1, "Hint cannot be empty.") })).optional(),
});


export async function upsertProblemToFirestore(data: z.infer<typeof formSchema>) {
    const apexDocRef = doc(db, 'problems', 'Apex');

    try {
        const docSnap = await getDoc(apexDocRef);
        if (!docSnap.exists()) {
            throw new Error("Critical: Apex problems document not found in Firestore.");
        }

        const currentData = docSnap.data();
        const categories = currentData.Category || {};
        const newCategoryName = data.category;
        
        if (data.id) {
            // EDIT MODE
            let oldCategoryName: string | null = null;
            let problemIndex = -1;

            // Find the existing problem
            for (const catName in categories) {
                const index = categories[catName].Questions.findIndex((p: Problem) => p.id === data.id);
                if (index !== -1) {
                    oldCategoryName = catName;
                    problemIndex = index;
                    break;
                }
            }

            if (oldCategoryName && problemIndex !== -1) {
                const updatedProblem: Problem = {
                    id: data.id,
                    title: data.title,
                    description: data.description,
                    difficulty: data.difficulty,
                    metadataType: data.metadataType,
                    sampleCode: data.sampleCode,
                    testcases: data.testcases,
                    examples: data.examples.map(({...e}) => e), // Remove react-hook-form id
                    hints: data.hints ? data.hints.map(h => h.value) : [],
                };

                // If category is unchanged, just update the problem in place
                if (oldCategoryName === newCategoryName) {
                     categories[oldCategoryName].Questions[problemIndex] = updatedProblem;
                } else {
                    // Remove from old category
                    categories[oldCategoryName].Questions.splice(problemIndex, 1);

                    // Add to new category
                    if (!categories[newCategoryName]) {
                        categories[newCategoryName] = { Questions: [] };
                    }
                    categories[newCategoryName].Questions.push(updatedProblem);
                }
            } else {
                throw new Error(`Problem with ID ${data.id} not found.`);
            }

        } else {
            // ADD MODE
            const problemId = doc(collection(db, 'dummy')).id;
            const newProblem: Problem = {
                id: problemId,
                title: data.title,
                description: data.description,
                difficulty: data.difficulty,
                metadataType: data.metadataType,
                sampleCode: data.sampleCode,
                testcases: data.testcases,
                examples: data.examples,
                hints: data.hints ? data.hints.map(h => h.value) : [],
            };
            
            if (!categories[newCategoryName]) {
                categories[newCategoryName] = { Questions: [] };
            }
            categories[newCategoryName].Questions.push(newProblem);
        }

        await updateDoc(apexDocRef, { Category: categories });

        return { success: true, message: `Problem ${data.id ? 'updated' : 'uploaded'} successfully!` };

    } catch (error) {
        console.error("Error upserting problem:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}
