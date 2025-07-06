
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ApexProblemsData, Problem } from "@/types";
import ApexProblemsView from "@/components/apex-problems-view";

export type CategoryInfo = {
  name: string;
  problemCount: number;
  firstProblemId: string | null;
  difficulties: {
    Easy: number;
    Medium: number;
  Hard: number;
  };
  imageUrl?: string;
  questions: Problem[];
};

async function getCategories(): Promise<CategoryInfo[]> {
    if (!db) return [];
    try {
        const apexDocRef = doc(db, "problems", "Apex");
        const docSnap = await getDoc(apexDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data().Category as ApexProblemsData;
            if (data) {
                const categoriesInfo: CategoryInfo[] = Object.entries(data)
                    .map(([name, categoryData]) => {
                        const questions = categoryData.Questions || [];
                        const problemCount = questions.length;
                        const firstProblemId = problemCount > 0 ? questions[0].id : null;
                        
                        const difficulties = questions.reduce(
                            (acc, q) => {
                                if (q.difficulty in acc) {
                                    (acc as any)[q.difficulty]++;
                                }
                                return acc;
                            },
                            { Easy: 0, Medium: 0, Hard: 0 }
                        );

                        const imageUrl = categoryData.imageUrl;
                        return { name, problemCount, firstProblemId, difficulties, imageUrl, questions };
                    })
                    .filter(cat => cat.problemCount > 0)
                    .sort((a, b) => a.name.localeCompare(b.name));
                return categoriesInfo;
            }
        }
    } catch (error) {
        console.error("Error fetching problem categories:", error);
    }
    return [];
}


export default async function ApexProblemsPage() {
    const initialCategories = await getCategories();
    return <ApexProblemsView initialCategories={initialCategories} />;
}
