
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
  "bg-[#15803d] text-white border-green-400/30 hover:border-green-400", // Dark Green
  "bg-[#b45309] text-white border-amber-400/30 hover:border-amber-400", // Amber
  "bg-[#6d28d9] text-white border-violet-400/30 hover:border-violet-400", // Violet
  "bg-[#0369a1] text-white border-sky-400/30 hover:border-sky-400", // Sky
  "bg-[#be185d] text-white border-rose-400/30 hover:border-rose-400", // Rose
  "bg-[#86198f] text-white border-fuchsia-400/30 hover:border-fuchsia-400", // Fuchsia
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
                    <CardContent className="p-5 flex flex-col flex-grow text-white/90">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2 rounded-lg bg-white/20">
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

                        <Separator className="bg-white/20 my-2" />

                        <div className="flex justify-between items-center text-sm">
                            <span className="opacity-80">Progress</span>
                             <div className="px-4 py-1.5 rounded-full bg-white/20 font-semibold hover:bg-white/30 transition-colors">
                                View
                            </div>
                        </div>
                         <Progress value={progress} className="h-2 mt-2 bg-white/20 [&>div]:bg-white" />
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
