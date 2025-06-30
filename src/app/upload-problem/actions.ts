
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


export async function addProblemToFirestore(data: z.infer<typeof formSchema>) {
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

    const apexDocRef = doc(db, 'problems', 'Apex');

    try {
        const docSnap = await getDoc(apexDocRef);
        if (!docSnap.exists()) {
            // This is a failsafe. In a real scenario, you might want to create the document.
            // For now, we assume the 'problems/Apex' document is pre-existing.
            throw new Error("Critical: Apex problems document not found in Firestore.");
        }

        const currentData = docSnap.data();
        // The 'Category' field is a map.
        const categories = currentData.Category || {};

        const categoryName = data.category;

        // If the category doesn't exist in the map, initialize it.
        if (!categories[categoryName]) {
            categories[categoryName] = { Questions: [] };
        }

        // Add the new problem to the 'Questions' array for that category.
        categories[categoryName].Questions.push(newProblem);

        // Update the document with the modified 'Category' map.
        await updateDoc(apexDocRef, {
            Category: categories
        });

        return { success: true, message: 'Problem uploaded successfully!' };

    } catch (error) {
        console.error("Error adding problem:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}
