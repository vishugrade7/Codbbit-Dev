
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
import { Loader2 } from "lucide-react";

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
  "from-sky-500",
  "from-amber-500",
  "from-emerald-500",
  "from-violet-500",
  "from-rose-500",
  "from-fuchsia-500",
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
            {categories.map((category, index) => (
              category.firstProblemId && (
                <Link key={category.name} href={`/apex-problems/${encodeURIComponent(category.name)}`} className="block group">
                  <Card className="overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1.5 h-full flex flex-col border-0">
                    <CardContent className="p-0 flex flex-col flex-grow relative">
                      <div className="aspect-video relative">
                         <Image 
                           src={category.imageUrl || 'https://placehold.co/600x400.png'} 
                           alt={category.name}
                           fill
                           sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                           className="object-cover transition-transform duration-300 group-hover:scale-105"
                         />
                      </div>
                      <div className={cn(
                        "absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t to-transparent opacity-80 group-hover:opacity-100 transition-opacity", 
                        cardColorClasses[index % cardColorClasses.length]
                      )}></div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
                          <h3 className="font-semibold text-white text-lg drop-shadow-md">
                              {category.name}
                          </h3>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            ))}
          </div>
        ) : (
            <div className="text-center py-12">
                <p className="text-muted-foreground">No problems found. Please check back later.</p>
            </div>
        )}
      </main>
  );
}
