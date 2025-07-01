
'use server';

import { doc, getDoc, updateDoc, collection, setDoc, serverTimestamp, addDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Problem, Course } from '@/types';
import { z } from "zod";

// #region Problem Schemas
const exampleSchema = z.object({
  input: z.string().optional(),
  output: z.string().min(1, "Output is required."),
  explanation: z.string().optional(),
});

// Base schema for a problem, without refinement.
const problemObjectSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required."),
  description: z.string().min(1, "Description is required."),
  category: z.string().min(1, "Category is required."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  metadataType: z.enum(["Class", "Trigger"]),
  triggerSObject: z.string().optional(),
  sampleCode: z.string().min(1, "Sample code is required."),
  testcases: z.string().min(1, "Test cases is required."),
  examples: z.array(exampleSchema).min(1, "At least one example is required."),
  hints: z.array(z.object({ value: z.string().min(1, "Hint cannot be empty.") })).optional(),
});

// Schema for form validation, with refinement.
const formSchema = problemObjectSchema.refine(data => {
    if (data.metadataType === 'Trigger') {
        return !!data.triggerSObject && data.triggerSObject.length > 0;
    }
    return true;
}, {
    message: "Trigger SObject is required when Metadata Type is Trigger.",
    path: ["triggerSObject"],
});

const bulkProblemSchema = problemObjectSchema.omit({ id: true });
const bulkUploadSchema = z.array(bulkProblemSchema);
// #endregion

// #region Course Schemas
const lessonSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Lesson title is required'),
    contentType: z.enum(['video', 'pdf', 'text', 'problem']),
    content: z.string().min(1, 'Lesson content is required'),
    isFree: z.boolean().optional(),
});

const moduleSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Module title is required'),
    lessons: z.array(lessonSchema),
});

const courseSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Course title is required'),
    description: z.string().min(1, 'Course description is required'),
    category: z.string().min(1, 'Course category is required'),
    thumbnailUrl: z.string().url('Must be a valid URL').min(1, 'Thumbnail URL is required'),
    modules: z.array(moduleSchema).min(1, 'At least one module is required'),
    isPublished: z.boolean(),
    createdBy: z.string(),
});
// #endregion


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
        
        const cleanExamples = data.examples.map(({ input, output, explanation }) => ({ input, output, explanation }));

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
                    triggerSObject: data.triggerSObject,
                    sampleCode: data.sampleCode,
                    testcases: data.testcases,
                    examples: cleanExamples,
                    hints: data.hints ? data.hints.map(h => h.value) : [],
                };

                if (oldCategoryName === newCategoryName) {
                     categories[oldCategoryName].Questions[problemIndex] = updatedProblem;
                } else {
                    categories[oldCategoryName].Questions.splice(problemIndex, 1);
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
                triggerSObject: data.triggerSObject,
                sampleCode: data.sampleCode,
                testcases: data.testcases,
                examples: cleanExamples,
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

export async function bulkUpsertProblemsFromJSON(jsonString: string) {
    let problemsToUpload: z.infer<typeof bulkUploadSchema>;

    try {
        const jsonData = JSON.parse(jsonString);
        problemsToUpload = bulkUploadSchema.parse(jsonData);
    } catch (error) {
        const errorMessage = error instanceof z.ZodError 
            ? error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
            : (error instanceof Error ? error.message : "Invalid JSON format.");
        return { success: false, error: `Invalid file content: ${errorMessage}` };
    }
    
    if (problemsToUpload.length === 0) {
        return { success: false, error: "JSON file is empty or contains no problems." };
    }

    const apexDocRef = doc(db, 'problems', 'Apex');
    try {
        const docSnap = await getDoc(apexDocRef);
        if (!docSnap.exists()) {
            throw new Error("Critical: Apex problems document not found in Firestore.");
        }

        const currentData = docSnap.data();
        const categories = currentData.Category || {};

        problemsToUpload.forEach(data => {
            const problemId = doc(collection(db, 'dummy')).id;
            const newProblem: Problem = {
                id: problemId,
                title: data.title,
                description: data.description,
                difficulty: data.difficulty,
                metadataType: data.metadataType,
                triggerSObject: data.triggerSObject,
                sampleCode: data.sampleCode,
                testcases: data.testcases,
                examples: data.examples,
                hints: data.hints ? data.hints.map(h => h.value) : [],
            };
            
            const categoryName = data.category;
            if (!categories[categoryName]) {
                categories[categoryName] = { Questions: [] };
            }
            categories[categoryName].Questions.push(newProblem);
        });

        await updateDoc(apexDocRef, { Category: categories });

        return { success: true, message: `${problemsToUpload.length} problem(s) uploaded successfully!` };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during database update.';
        return { success: false, error: errorMessage };
    }
}

export async function addCategory(categoryName: string) {
    if (!categoryName || categoryName.trim().length === 0) {
        return { success: false, error: 'Category name cannot be empty.' };
    }

    const apexDocRef = doc(db, 'problems', 'Apex');

    try {
        const docSnap = await getDoc(apexDocRef);
        if (!docSnap.exists()) {
            await setDoc(apexDocRef, { 
                Category: {
                    [categoryName.trim()]: { Questions: [] }
                } 
            });
            return { success: true, message: `Category '${categoryName.trim()}' added successfully!` };
        }

        const currentData = docSnap.data();
        const categories = currentData.Category || {};
        const sanitizedCategoryName = categoryName.trim();

        if (categories[sanitizedCategoryName]) {
            return { success: false, error: `Category '${sanitizedCategoryName}' already exists.` };
        }

        categories[sanitizedCategoryName] = { Questions: [] };
        await updateDoc(apexDocRef, { Category: categories });
        return { success: true, message: `Category '${sanitizedCategoryName}' added successfully!` };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function upsertCourseToFirestore(data: z.infer<typeof courseSchema>) {
    const coursesCollection = collection(db, 'courses');

    try {
        if (data.id) {
            // Edit mode
            const courseDocRef = doc(db, 'courses', data.id);
            await updateDoc(courseDocRef, { ...data });
            return { success: true, message: `Course updated successfully!` };
        } else {
            // Add mode
            const newCourseData = {
                ...data,
                createdAt: serverTimestamp(),
            };
            const newDocRef = await addDoc(coursesCollection, newCourseData);
            return { success: true, message: `Course created successfully!`, courseId: newDocRef.id };
        }
    } catch (error) {
        console.error("Error upserting course:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}
