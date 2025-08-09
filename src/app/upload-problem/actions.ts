

'use server';

import { doc, getDoc, updateDoc, collection, setDoc, serverTimestamp, addDoc, query, where, getDocs, writeBatch, orderBy, deleteDoc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Problem, Course, User, NavLink, Badge, ApexProblemsData } from '@/types';
import { z } from "zod";
import { problemFormSchema, courseFormSchema, bulkUploadSchema } from '@/lib/admin-schemas';

const setAdminStatusSchema = z.object({
    userId: z.string().min(1, "User ID is required."),
    status: z.boolean(),
});

const badgeSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Badge name is required."),
    description: z.string().min(1, "Description is required."),
    type: z.enum(['STREAK', 'POINTS', 'TOTAL_SOLVED', 'CATEGORY_SOLVED', 'ACTIVE_DAYS']),
    value: z.coerce.number().min(1, "Value must be at least 1."),
    category: z.string().optional(),
}).refine(data => {
    if (data.type === 'CATEGORY_SOLVED') {
        return !!data.category && data.category.length > 0;
    }
    return true;
}, {
    message: "Category is required for CATEGORY_SOLVED type badges.",
    path: ["category"],
});


export async function getAllUsers(): Promise<{ success: boolean; users: User[]; error?: string }> {
    if (!db) {
        return { success: false, error: "Database not initialized.", users: [] };
    }

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("name"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: true, users: [] };
        }
        
        const allUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        return { success: true, users: allUsers };

    } catch (error) {
        console.error("Error fetching all users:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage, users: [] };
    }
}

export async function setAdminStatus(userId: string, status: boolean) {
    const validation = setAdminStatusSchema.safeParse({ userId, status });
    if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message };
    }

    if (!db) {
        return { success: false, error: "Database not initialized." };
    }

    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, { isAdmin: status });
        const action = status ? "promoted to" : "revoked from";
        return { success: true, message: `User successfully ${action} admin.` };
    } catch (error: any) {
        console.error("Error setting admin status:", error);
        if (error.code === 'permission-denied') {
            return { success: false, error: "Permission Denied: You must be an administrator to perform this action." };
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function upsertProblemToFirestore(data: z.infer<typeof problemFormSchema>) {
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
                    company: data.company,
                    companyLogoUrl: data.companyLogoUrl,
                    isPremium: data.isPremium,
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
                company: data.company,
                companyLogoUrl: data.companyLogoUrl,
                isPremium: data.isPremium || false,
            };
            
            if (!categories[newCategoryName]) {
                categories[newCategoryName] = { Questions: [] };
            }
            categories[newCategoryName].Questions.push(newProblem);
        }

        await updateDoc(apexDocRef, { Category: categories });

        return { success: true, message: `Problem ${data.id ? 'updated' : 'uploaded'} successfully!` };

    } catch (error: any) {
        console.error("Error upserting problem:", error);
        if (error.code === 'permission-denied') {
            return { success: false, error: "Permission Denied: You must be an administrator to manage problems." };
        }
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
                company: data.company,
                companyLogoUrl: data.companyLogoUrl,
                isPremium: data.isPremium || false,
            };
            
            const categoryName = data.category;
            if (!categories[categoryName]) {
                categories[categoryName] = { Questions: [] };
            }
            categories[categoryName].Questions.push(newProblem);
        });

        await updateDoc(apexDocRef, { Category: categories });

        return { success: true, message: `${problemsToUpload.length} problem(s) uploaded successfully!` };

    } catch (error: any) {
        if (error.code === 'permission-denied') {
            return { success: false, error: "Permission Denied: You must be an administrator to upload problems." };
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during database update.';
        return { success: false, error: errorMessage };
    }
}

export async function addCategory(categoryName: string, imageUrl: string) {
    if (!categoryName || categoryName.trim().length === 0) {
        return { success: false, error: 'Category name cannot be empty.' };
    }

    const apexDocRef = doc(db, 'problems', 'Apex');

    try {
        const docSnap = await getDoc(apexDocRef);
        if (!docSnap.exists()) {
            await setDoc(apexDocRef, { 
                Category: {
                    [categoryName.trim()]: { Questions: [], imageUrl: imageUrl.trim() }
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

        categories[sanitizedCategoryName] = { Questions: [], imageUrl: imageUrl.trim() };
        await updateDoc(apexDocRef, { Category: categories });
        return { success: true, message: `Category '${sanitizedCategoryName}' added successfully!` };

    } catch (error: any) {
        if (error.code === 'permission-denied') {
            return { success: false, error: "Permission Denied: You must be an administrator to add categories." };
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function upsertCourseToFirestore(data: z.infer<typeof courseFormSchema>) {
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
    } catch (error: any) {
        console.error("Error upserting course:", error);
        if (error.code === 'permission-denied') {
            return { success: false, error: "Permission Denied: You must be an administrator to manage courses." };
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

// #region Navigation Settings
const defaultNavLinks: NavLink[] = [
    { id: 'apex-problems', label: 'Practice Problems', href: '/apex-problems', isEnabled: true, isProtected: true },
    { id: 'courses', label: 'Courses', href: '/courses', isEnabled: true, isProtected: true },
    { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', isEnabled: true, isProtected: true },
    { id: 'problem-sheets', label: 'Problem Sheets', href: '/problem-sheets', isEnabled: true, isProtected: true },
    { id: 'lwc-playground', label: 'LWC Playground', href: '/lwc-playground', isEnabled: true, isProtected: false },
];

export async function getNavigationSettings(): Promise<NavLink[]> {
    if (!db) throw new Error("Database not initialized.");
    const settingsDocRef = doc(db, 'settings', 'navigation');
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
        const savedLinks = (docSnap.data().links || []) as NavLink[];
        const savedLinkIds = new Set(savedLinks.map(link => link.id));
        
        // Find default links that are not in the saved links
        const missingLinks = defaultNavLinks.filter(defaultLink => !savedLinkIds.has(defaultLink.id));

        if (missingLinks.length > 0) {
            // If there are new links to add, merge them and update Firestore
            const updatedLinks = [...savedLinks, ...missingLinks];
            await setDoc(settingsDocRef, { links: updatedLinks });
            return updatedLinks;
        }

        return savedLinks;
    } else {
        // If the document doesn't exist, create it with the defaults
        await setDoc(settingsDocRef, { links: defaultNavLinks });
        return defaultNavLinks;
    }
}

export async function updateNavigationSettings(links: NavLink[]) {
    if (!db) return { success: false, error: "Database not initialized." };
    
    const linksSchema = z.array(z.object({
        id: z.string(),
        label: z.string().min(1, 'Label is required'),
        href: z.string().min(1, 'Href is required').refine(val => val.startsWith('/'), { message: 'Href must start with /' }),
        isEnabled: z.boolean(),
        isProtected: z.boolean(),
    }));

    const validation = linksSchema.safeParse(links);
    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') };
    }

    const settingsDocRef = doc(db, 'settings', 'navigation');
    try {
        await setDoc(settingsDocRef, { links: validation.data });
        return { success: true, message: "Navigation settings updated successfully." };
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            return { success: false, error: "Permission Denied: You must be an administrator to update navigation." };
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function getPublicNavigationLinks(): Promise<NavLink[]> {
    try {
        if (!db) return defaultNavLinks.filter(link => link.isEnabled);
        const allLinks = await getNavigationSettings();
        return allLinks.filter(link => link.isEnabled);
    } catch (error) {
        console.error("Failed to fetch nav links, returning defaults:", error);
        return defaultNavLinks.filter(link => link.isEnabled);
    }
}
// #endregion

// #region Badge Management
export async function getBadges(): Promise<{ success: boolean; badges: Badge[]; error?: string }> {
    if (!db) {
        return { success: false, error: "Database not initialized.", badges: [] };
    }

    try {
        const badgesRef = collection(db, "badges");
        const q = query(badgesRef, orderBy("name"));
        const querySnapshot = await getDocs(q);
        
        const badges = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Badge));
        return { success: true, badges };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage, badges: [] };
    }
}

export async function upsertBadge(data: z.infer<typeof badgeSchema>) {
    const validation = badgeSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.errors[0].message };
    }
    if (!db) {
        return { success: false, error: "Database not initialized." };
    }

    const { id, ...badgeData } = validation.data;
    
    try {
        let docRef;
        if (id) {
            docRef = doc(db, 'badges', id);
            await updateDoc(docRef, badgeData);
        } else {
            docRef = doc(collection(db, 'badges'));
            await setDoc(docRef, badgeData);
        }
        return { success: true, message: `Badge ${id ? 'updated' : 'created'} successfully!` };
    } catch (error: any) {
         if (error.code === 'permission-denied') {
            return { success: false, error: "Permission Denied: You must be an administrator to manage badges." };
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function deleteBadge(badgeId: string) {
    if (!badgeId) {
        return { success: false, error: "Badge ID is required." };
    }
    if (!db) {
        return { success: false, error: "Database not initialized." };
    }
    
    try {
        await deleteDoc(doc(db, 'badges', badgeId));
        return { success: true, message: "Badge deleted successfully." };
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            return { success: false, error: "Permission Denied: You must be an administrator to delete badges." };
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}
// #endregion

// #region Category Management
export async function getProblemCategories(): Promise<{ name: string; imageUrl?: string; problemCount: number }[]> {
    if (!db) {
        throw new Error("Database not initialized.");
    }
    const apexDocRef = doc(db, "problems", "Apex");
    const docSnap = await getDoc(apexDocRef);
    if (!docSnap.exists()) {
        return [];
    }

    const data = docSnap.data().Category as ApexProblemsData;
    if (!data) return [];
    
    return Object.entries(data).map(([name, categoryData]) => ({
        name,
        imageUrl: categoryData.imageUrl || '',
        problemCount: categoryData.Questions?.length || 0
    })).sort((a,b) => a.name.localeCompare(b.name));
}

export async function updateCategoryDetails(oldName: string, newName: string, newImageUrl: string) {
    if (!oldName || !newName) {
        return { success: false, error: 'Category names are required.' };
    }

    const apexDocRef = doc(db, 'problems', 'Apex');
    const docSnap = await getDoc(apexDocRef);
    if (!docSnap.exists()) {
        return { success: false, error: "Apex problems document not found." };
    }

    const categories = docSnap.data().Category as ApexProblemsData;

    if (!categories[oldName]) {
        return { success: false, error: `Category '${oldName}' not found.` };
    }

    // If renaming, check if new name already exists
    if (oldName !== newName && categories[newName]) {
        return { success: false, error: `Category '${newName}' already exists.` };
    }

    try {
        if (oldName === newName) {
            // Just update image URL
            await updateDoc(apexDocRef, {
                [`Category.${newName}.imageUrl`]: newImageUrl || ''
            });
        } else {
            // Rename and update image URL.
            // This is a complex operation if we consider migrating user data.
            // For now, we just rename the category key.
            // WARNING: This will lead to data inconsistencies for user stats.
            const categoryData = categories[oldName];
            categoryData.imageUrl = newImageUrl || '';

            const batch = writeBatch(db);
            
            // Set new category data
            batch.update(apexDocRef, { [`Category.${newName}`]: categoryData });
            
            // Delete old category
            batch.update(apexDocRef, { [`Category.${oldName}`]: deleteField() });

            await batch.commit();
        }
        return { success: true, message: "Category updated successfully." };

    } catch (error: any) {
        if (error.code === 'permission-denied') {
            return { success: false, error: "Permission Denied: You must be an administrator to manage categories." };
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}

export async function deleteCategory(categoryName: string) {
    if (!categoryName) {
        return { success: false, error: 'Category name is required.' };
    }

    const apexDocRef = doc(db, 'problems', 'Apex');
    try {
        const docSnap = await getDoc(apexDocRef);
        if (!docSnap.exists()) {
            throw new Error("Apex document not found.");
        }
        const categories = docSnap.data().Category as ApexProblemsData;
        
        if (!categories[categoryName]) {
             return { success: false, error: 'Category not found.' };
        }

        if (categories[categoryName].Questions && categories[categoryName].Questions.length > 0) {
            return { success: false, error: 'Cannot delete a category that contains problems.' };
        }
        
        delete categories[categoryName];

        await updateDoc(apexDocRef, {
            Category: categories
        });

        return { success: true, message: `Category '${categoryName}' deleted successfully.` };
    } catch (error: any) {
         if (error.code === 'permission-denied') {
            return { success: false, error: "Permission Denied: You must be an administrator to delete categories." };
        }
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}
// #endregion
