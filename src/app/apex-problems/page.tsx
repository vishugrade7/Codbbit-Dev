
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ApexProblemsData } from "@/types";
import { useAuth } from "@/context/AuthContext";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
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
            {categories.map((category) => (
              category.firstProblemId && (
                <Link key={category.name} href={`/apex-problems/${encodeURIComponent(category.name)}`} className="block group">
                  <Card className="overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1.5 border-transparent hover:border-primary/30 h-full flex flex-col">
                    <CardContent className="p-0 flex flex-col flex-grow">
                      <div className="aspect-video relative">
                         <Image 
                           src={category.imageUrl || 'https://placehold.co/600x400.png'} 
                           alt={category.name}
                           fill
                           sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                           className="object-cover transition-transform duration-300 group-hover:scale-105"
                         />
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                          <div className="flex justify-between items-start">
                              <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors text-sm flex-grow pr-2">
                                  {category.name}
                              </h3>
                              <Badge variant="secondary">{category.problemCount} Problems</Badge>
                          </div>
                          {userData && category.problemCount > 0 ? (
                               <div className="mt-auto pt-2">
                                  <Progress value={(category.solvedCount / category.problemCount) * 100} className="h-2" />
                                  <p className="text-xs text-muted-foreground mt-1 text-right">{category.solvedCount} / {category.problemCount} solved</p>
                              </div>
                          ) : (
                            <div className="mt-auto pt-2">
                                <p className="text-muted-foreground text-xs">
                                <Link href="/login" className="underline text-primary hover:text-primary/80" onClick={(e) => e.stopPropagation()}>Log in</Link> to track your progress.
                                </p>
                            </div>
                          )}
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
      <Footer />
    </div>
  );
}
