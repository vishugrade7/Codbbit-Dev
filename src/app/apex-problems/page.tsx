
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ApexProblemsData } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ClipboardList } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

type CategoryInfo = {
  name: string;
  problemCount: number;
  solvedCount: number;
  firstProblemId: string | null;
  difficulties: {
    Easy: number;
    Medium: number;
    Hard: number;
  };
  imageUrl?: string;
};

const cardColorClasses = [
  "bg-green-100 text-green-800 border-green-200/80 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/60",
  "bg-amber-100 text-amber-800 border-amber-200/80 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/60",
  "bg-violet-100 text-violet-800 border-violet-200/80 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700/60",
  "bg-sky-100 text-sky-800 border-sky-200/80 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700/60",
  "bg-rose-100 text-rose-800 border-rose-200/80 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700/60",
  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200/80 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 dark:border-fuchsia-700/60",
];

export default function ApexProblems() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const apexDocRef = doc(db, "problems", "Apex");
        const docSnap = await getDoc(apexDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data().Category as ApexProblemsData;
          if (data) {
            const categoriesInfo = Object.entries(data)
              .map(([name, categoryData]) => {
                const questions = categoryData.Questions || [];
                const problemCount = questions.length;
                const firstProblemId = problemCount > 0 ? questions[0].id : null;
                const difficulties = questions.reduce(
                  (acc, q) => {
                    if (q.difficulty in acc) {
                      acc[q.difficulty]++;
                    }
                    return acc;
                  },
                  { Easy: 0, Medium: 0, Hard: 0 }
                );
                
                const solvedCount = userData 
                    ? questions.filter(q => userData.solvedProblems?.[q.id]).length 
                    : 0;

                const imageUrl = categoryData.imageUrl;

                return { name, problemCount, solvedCount, firstProblemId, difficulties, imageUrl };
              })
              .filter(cat => cat.problemCount > 0)
              .sort((a, b) => a.name.localeCompare(b.name));
            
            setCategories(categoriesInfo);
          }
        }
      } catch (error) {
        console.error("Error fetching problem categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [userData]);

  return (
    <main className="flex-1 container py-8">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Practice Problems</h1>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                Hone your skills by solving a curated list of problems. Select a category to get started.
            </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : categories.length > 0 ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category, index) => {
              const colorClass = cardColorClasses[index % cardColorClasses.length];
              const progress = category.problemCount > 0 ? (category.solvedCount / category.problemCount) * 100 : 0;
              return (
              category.firstProblemId && (
                <Link key={category.name} href={`/apex-problems/${encodeURIComponent(category.name)}`} className="block group">
                  <Card className={cn("transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 h-full flex flex-col", colorClass)}>
                    <CardContent className="p-5 flex flex-col flex-grow">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2 rounded-lg bg-foreground/10">
                               <ClipboardList className="h-6 w-6" />
                            </div>
                            <h3 className="font-semibold text-xl flex-1">{category.name}</h3>
                        </div>

                        <div className="flex-grow grid grid-cols-2 gap-4 my-4">
                            <div>
                                <p className="text-sm opacity-80">Questions</p>
                                <p className="text-2xl font-bold">{category.problemCount}</p>
                            </div>
                             <div>
                                <p className="text-sm opacity-80">Solved</p>
                                <p className="text-2xl font-bold">{category.solvedCount}</p>
                            </div>
                        </div>

                        <Separator className="bg-foreground/10 my-2" />

                        <div className="flex justify-between items-center text-sm">
                            <span className="opacity-80">Progress</span>
                             <div className="px-4 py-1.5 rounded-full bg-foreground/10 font-semibold hover:bg-foreground/20 transition-colors">
                                View
                            </div>
                        </div>
                         <Progress value={progress} className="h-2 mt-2 bg-white/20 [&>div]:bg-foreground/80" />
                    </CardContent>
                  </Card>
                </Link>
              )
            )})}
          </div>
        ) : (
            <div className="text-center py-12">
                <p className="text-muted-foreground">No problems found. Please check back later.</p>
            </div>
        )}
      </main>
  );
}
