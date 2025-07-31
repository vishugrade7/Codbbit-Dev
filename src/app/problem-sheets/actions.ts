'use server';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/types';
import { z } from "zod";

const createSheetSchema = z.object({
  sheetName: z.string().min(1, "Sheet name is required."),
  problemIds: z.array(z.string()).min(1, "At least one problem is required."),
  user: z.object({
    uid: z.string(),
    name: z.string(),
    avatarUrl: z.string(),
    username: z.string(),
  }),
  description: z.string().optional(),
});

export async function createProblemSheet(data: z.infer<typeof createSheetSchema>) {
    const validation = createSheetSchema.safeParse(data);

    if (!validation.success) {
        return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
    }

    const { sheetName, problemIds, user, description } = validation.data;
    
    if (!db) {
      return { success: false, error: "Database not initialized." };
    }

    try {
        const sheetsCollection = collection(db, 'problem-sheets');
        const newSheetDoc = await addDoc(sheetsCollection, {
            name: sheetName,
            description: description || "",
            problemIds: problemIds,
            createdBy: user.uid,
            creatorName: user.name,
            creatorUsername: user.username,
            creatorAvatarUrl: user.avatarUrl,
            createdAt: serverTimestamp(),
            isPublic: true,
            followers: [],
        });

        return { success: true, sheetId: newSheetDoc.id };

    } catch (error) {
        console.error("Error creating problem sheet:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: errorMessage };
    }
}
