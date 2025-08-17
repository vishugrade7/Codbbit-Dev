

'use server';

import { doc, getDoc, setDoc, updateDoc, collection, getDocs, writeBatch, arrayUnion, arrayRemove, deleteField, runTransaction, DocumentData, WithFieldValue, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Problem, Course, NavLink, Badge, ApexProblemsData, PricingPlan } from '@/types';
import { z } from 'zod';
import { problemFormSchema, courseFormSchema, navLinksSchema, badgeFormSchema, brandingSchema, pricingPlanSchema } from '@/lib/admin-schemas';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

// Helper function to get current user and check for admin privileges
async function getAdminUser(userId: string) {
    if (!userId || !db) {
        throw new Error('Authentication required.');
    }
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists() || !userDoc.data()?.isAdmin) {
        throw new Error('Permission Denied: You must be an administrator.');
    }
    return userDoc.data();
}

// #region Problem Actions
export async function upsertProblemToFirestore(userId: string, categoryName: string, problem: z.infer<typeof problemFormSchema>) {
    await getAdminUser(userId);
    if (!db) return { success: false, error: 'DB not available' };

    const validation = problemFormSchema.safeParse(problem);
    if (!validation.success) {
        return { success: false, error: validation.error.message };
    }
    
    const { id, ...problemData } = validation.data;
    const problemId = id || doc(collection(db, 'problems')).id;

    try {
        const apexDocRef = doc(db, 'problems', 'Apex');
        
        await runTransaction(db, async (transaction) => {
            const apexDoc = await transaction.get(apexDocRef);
            if (!apexDoc.exists()) {
                throw new Error("Apex document does not exist!");
            }

            const currentData = apexDoc.data() as { Category: ApexProblemsData };
            const category = currentData.Category[categoryName];
            
            if (!category) {
                throw new Error(`Category "${categoryName}" does not exist.`);
            }

            const problemIndex = category.Questions.findIndex(p => p.id === problemId);

            if (problemIndex > -1) {
                // Update existing problem
                const newQuestions = [...category.Questions];
                newQuestions[problemIndex] = { ...newQuestions[problemIndex], ...problemData, id: problemId };
                transaction.update(apexDocRef, { [`Category.${categoryName}.Questions`]: newQuestions });
            } else {
                // Add new problem
                const newProblem = { ...problemData, id: problemId };
                transaction.update(apexDocRef, { [`Category.${categoryName}.Questions`]: arrayUnion(newProblem) });
            }
        });

        revalidatePath('/admin');
        revalidatePath('/apex-problems');
        revalidatePath(`/apex-problems/${encodeURIComponent(categoryName)}`);
        return { success: true, problemId: problemId };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function bulkUpsertProblemsFromJSON(userId: string, categoryName: string, problems: Problem[]) {
    await getAdminUser(userId);
    if (!db) return { success: false, error: 'DB not available' };

    try {
        const apexDocRef = doc(db, "problems", "Apex");
        
        await runTransaction(db, async (transaction) => {
            const apexDoc = await transaction.get(apexDocRef);
            if (!apexDoc.exists()) {
                throw new Error("Apex document does not exist!");
            }
            const currentData = apexDoc.data() as { Category: ApexProblemsData };
            const category = currentData.Category[categoryName];
            
            if (!category) {
                throw new Error(`Category "${categoryName}" does not exist.`);
            }
            
            const existingProblems = new Map(category.Questions.map(p => [p.id, p]));

            problems.forEach(problem => {
                 const problemId = problem.id || doc(collection(db, 'problems')).id;
                 existingProblems.set(problemId, { ...problem, id: problemId });
            });
            
            const updatedQuestions = Array.from(existingProblems.values());
            transaction.update(apexDocRef, { [`Category.${categoryName}.Questions`]: updatedQuestions });
        });

        revalidatePath('/admin');
        revalidatePath('/apex-problems');
        return { success: true, message: `${problems.length} problems processed for category ${categoryName}.` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteProblemFromFirestore(userId: string, categoryName: string, problemId: string) {
    await getAdminUser(userId);
    if (!db) return { success: false, error: 'DB not available' };
    
    try {
        const apexDocRef = doc(db, 'problems', 'Apex');
        
        await runTransaction(db, async (transaction) => {
            const apexDoc = await transaction.get(apexDocRef);
            if (!apexDoc.exists()) {
                throw new Error("Apex document does not exist!");
            }

            const currentData = apexDoc.data() as { Category: ApexProblemsData };
            const category = currentData.Category[categoryName];
            
            if (!category) {
                throw new Error(`Category "${categoryName}" does not exist.`);
            }

            const problemToRemove = category.Questions.find(p => p.id === problemId);
            if (!problemToRemove) {
                console.warn(`Problem with ID ${problemId} not found in category ${categoryName}. Nothing to delete.`);
                return;
            }
            
            transaction.update(apexDocRef, { [`Category.${categoryName}.Questions`]: arrayRemove(problemToRemove) });
        });
        
        revalidatePath('/admin');
        revalidatePath('/apex-problems');
        revalidatePath(`/apex-problems/${encodeURIComponent(categoryName)}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getProblemCategories() {
    if (!db) {
        console.error("DB not available");
        return [];
    }
    try {
        const apexDocRef = doc(db, "problems", "Apex");
        const docSnap = await getDoc(apexDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data().Category as ApexProblemsData;
            return Object.entries(data).map(([name, details]) => ({
                name,
                imageUrl: details.imageUrl || '',
                problemCount: details.Questions?.length || 0
            })).sort((a, b) => a.name.localeCompare(b.name));
        }
        return [];
    } catch (error) {
        console.error("Error fetching problem categories:", error);
        return [];
    }
}

export async function addCategory(userId: string, categoryName: string, imageUrl: string) {
    await getAdminUser(userId);
    if (!db) return { success: false, error: "DB not available" };
    try {
        const apexDocRef = doc(db, 'problems', 'Apex');
        await updateDoc(apexDocRef, {
            [`Category.${categoryName}`]: {
                Questions: [],
                imageUrl: imageUrl
            }
        });
        revalidatePath('/admin');
        revalidatePath('/apex-problems');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateCategoryDetails(userId: string, oldName: string, newName: string, newImageUrl: string) {
    await getAdminUser(userId);
    if (!db) return { success: false, error: "DB not available" };

    try {
        await runTransaction(db, async (transaction) => {
            const apexDocRef = doc(db, 'problems', 'Apex');
            const apexDoc = await transaction.get(apexDocRef);
            if (!apexDoc.exists()) {
                throw new Error("Apex document does not exist!");
            }
            const currentData = apexDoc.data().Category as ApexProblemsData;

            if (!currentData[oldName]) {
                throw new Error(`Category "${oldName}" not found.`);
            }
            if (oldName !== newName && currentData[newName]) {
                throw new Error(`Category "${newName}" already exists.`);
            }

            const categoryData = currentData[oldName];
            const updatedData = { ...categoryData, imageUrl: newImageUrl };
            
            let updatePayload: Record<string, WithFieldValue<DocumentData> | undefined> = {};
            if (oldName !== newName) {
                updatePayload[`Category.${oldName}`] = deleteField();
                updatePayload[`Category.${newName}`] = updatedData;
            } else {
                updatePayload[`Category.${newName}.imageUrl`] = newImageUrl;
            }

            transaction.update(apexDocRef, updatePayload);
        });

        revalidatePath('/admin');
        revalidatePath('/apex-problems');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteCategory(userId: string, categoryName: string) {
    await getAdminUser(userId);
    if (!db) return { success: false, error: "DB not available" };
    try {
        const apexDocRef = doc(db, 'problems', 'Apex');
        await updateDoc(apexDocRef, {
            [`Category.${categoryName}`]: deleteField()
        });
        revalidatePath('/admin');
        revalidatePath('/apex-problems');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
// #endregion

// #region Course Actions
export async function upsertCourseToFirestore(userId: string, course: z.infer<typeof courseFormSchema>) {
    await getAdminUser(userId);
    const validation = courseFormSchema.safeParse(course);
    if (!validation.success) {
        return { success: false, error: validation.error.message };
    }

    const { id, ...courseData } = validation.data;
    const courseId = id || doc(collection(db, 'courses')).id;

    try {
        await setDoc(doc(db, 'courses', courseId), { ...courseData, createdAt: serverTimestamp() }, { merge: true });
        revalidatePath('/courses');
        return { success: true, courseId };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
// #endregion

// #region User Actions
export async function getAllUsers(userId: string) {
    await getAdminUser(userId);
    try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function setAdminStatus(adminUserId: string, targetUserId: string, isAdmin: boolean) {
    await getAdminUser(adminUserId);
    try {
        const userDocRef = doc(db, 'users', targetUserId);
        await updateDoc(userDocRef, { isAdmin });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
// #endregion

// #region Settings Actions
export async function getNavigationSettings() {
    try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'navigation'));
        if (settingsDoc.exists()) {
            return settingsDoc.data().links as NavLink[];
        }
        return [];
    } catch (error: any) {
        console.error("Error fetching navigation settings:", error);
        return [];
    }
}

export async function updateNavigationSettings(userId: string, links: z.infer<typeof navLinksSchema>) {
    await getAdminUser(userId);
    const validation = navLinksSchema.safeParse(links);
    if (!validation.success) {
        return { success: false, error: validation.error.message };
    }
    try {
        const settingsDocRef = doc(db, 'settings', 'navigation');
        await setDoc(settingsDocRef, { links: validation.data });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getBadges() {
    if (!db) return [];
    try {
        const snapshot = await getDocs(collection(db, 'badges'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Badge[];
    } catch (error) {
        console.error("Error fetching badges:", error);
        return [];
    }
}

export async function upsertBadge(userId: string, badge: z.infer<typeof badgeFormSchema>) {
    await getAdminUser(userId);
    const validation = badgeFormSchema.safeParse(badge);
    if (!validation.success) {
        return { success: false, error: validation.error.message };
    }
    
    const { id, ...badgeData } = validation.data;
    const badgeId = id || doc(collection(db, 'badges')).id;

    try {
        await setDoc(doc(db, 'badges', badgeId), badgeData, { merge: true });
        return { success: true, badgeId };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteBadge(userId: string, badgeId: string) {
    await getAdminUser(userId);
    try {
        const badgeDocRef = doc(db, 'badges', badgeId);
        await deleteDoc(badgeDocRef);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateBrandingSettings(userId: string, data: z.infer<typeof brandingSchema>) {
    await getAdminUser(userId);
    
    const validation = brandingSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.message };
    }
    
    const { colors, fonts } = validation.data;

    try {
        // --- Update CSS file ---
        const cssPath = path.join(process.cwd(), 'src', 'app', 'globals.css');
        let cssContent = await fs.readFile(cssPath, 'utf-8');

        // Replace color variables
        cssContent = cssContent.replace(/--primary:\s*[^;]+;/g, `--primary: ${colors.primary};`);
        cssContent = cssContent.replace(/--accent:\s*[^;]+;/g, `--accent: ${colors.accent};`);
        cssContent = cssContent.replace(/--background:\s*[^;]+;/g, `--background: ${colors.background};`);

        await fs.writeFile(cssPath, cssContent);

        // --- Update layout file for fonts ---
        const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
        let layoutContent = await fs.readFile(layoutPath, 'utf-8');
        
        // This is a simplified replacement. A more robust solution might use ASTs.
        const fontImportRegex = /const\s+\w+\s*=\s*\w+\({[\s\S]*?}\)/g;
        layoutContent = layoutContent.replace(fontImportRegex, ''); // Remove old font imports

        const newHeadlineFontName = fonts.headline.replace(' ', '_');
        const newBodyFontName = fonts.body.replace(' ', '_');

        const newFontImports = `import { ${newHeadlineFontName}, ${newBodyFontName} } from 'next/font/google'
        
const ${newHeadlineFontName.toLowerCase()} = ${newHeadlineFontName}({ 
  subsets: ['latin'],
  variable: '--font-headline',
  display: 'swap',
  weight: ['400', '500', '600', '700']
})

const ${newBodyFontName.toLowerCase()} = ${newBodyFontName}({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '700']
})
`;
        // Add new imports at the top
        layoutContent = layoutContent.replace(/import type {Metadata} from 'next';/, `import type {Metadata} from 'next';\n${newFontImports}`);
        
        // Update className in body
        const bodyClassRegex = /className=\{cn\([^,]+, [^,]+,/;
        layoutContent = layoutContent.replace(bodyClassRegex, `className={cn(${newHeadlineFontName.toLowerCase()}.variable, ${newBodyFontName.toLowerCase()}.variable,`);
        
        await fs.writeFile(layoutPath, layoutContent);

        // --- Update tailwind.config.ts ---
        const tailwindPath = path.join(process.cwd(), 'tailwind.config.ts');
        let tailwindContent = await fs.readFile(tailwindPath, 'utf-8');
        
        const fontFamilyRegex = /fontFamily: {[\s\S]*?},/;
        const newFontFamily = `fontFamily: {
        sans: ["var(--font-body)"],
        mono: ["var(--font-source-code-pro)"],
        headline: ["var(--font-headline)"],
        body: ["var(--font-body)"],
        code: ["var(--font-source-code-pro)"],
      },`;
        tailwindContent = tailwindContent.replace(fontFamilyRegex, newFontFamily);

        await fs.writeFile(tailwindPath, tailwindContent);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
// #endregion

// #region Pricing Actions
export async function getPricingPlans(userId: string): Promise<{ success: boolean; plans?: PricingPlan[]; error?: string }> {
    await getAdminUser(userId);
    if (!db) return { success: false, error: 'DB not available' };
    
    try {
        const plansRef = collection(db, 'pricing');
        const q = query(plansRef);
        const querySnapshot = await getDocs(q);
        const plans = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingPlan));
        return { success: true, plans };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function upsertPricingPlan(userId: string, plan: z.infer<typeof pricingPlanSchema>): Promise<{ success: boolean; error?: string }> {
    await getAdminUser(userId);
    if (!db) return { success: false, error: 'DB not available' };

    const validation = pricingPlanSchema.safeParse(plan);
    if (!validation.success) {
        return { success: false, error: validation.error.message };
    }

    const { id, ...planData } = validation.data;
    if (!id) {
        return { success: false, error: 'Plan ID is required.' };
    }
    
    try {
        await setDoc(doc(db, 'pricing', id), planData, { merge: true });
        revalidatePath('/admin?tab=pricing');
        revalidatePath('/pricing');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// #endregion
