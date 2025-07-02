
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
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowRight, Cog } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

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
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              category.firstProblemId && (
                <Link key={category.name} href={`/apex-problems/${encodeURIComponent(category.name)}`} className="block group">
                  <Card className="transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 overflow-hidden border flex flex-col h-full bg-card/90 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-11 w-11 shrink-0">
                            <AvatarImage src={category.imageUrl} alt={category.name} className="object-cover" />
                            <AvatarFallback className="bg-yellow-400/20">
                                <Cog className="h-6 w-6 text-yellow-500" />
                            </AvatarFallback>
                        </Avatar>
                        <h3 className="text-xl font-bold">{category.name}</h3>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-grow">
                      <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Problems</span>
                              <span className="font-semibold">{category.problemCount}</span>
                          </div>
                          {userData && category.problemCount > 0 ? (
                              <div className="flex flex-col items-center gap-2 pt-2">
                                <div className="relative h-20 w-20">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { value: category.solvedCount },
                                                    { value: category.problemCount - category.solvedCount }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={24}
                                                outerRadius={30}
                                                dataKey="value"
                                                stroke="none"
                                                startAngle={90}
                                                endAngle={-270}
                                            >
                                                <Cell fill="hsl(var(--primary))" />
                                                <Cell fill="hsl(var(--muted))" />
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-sm font-bold">{Math.round((category.solvedCount / category.problemCount) * 100)}%</span>
                                    </div>
                                </div>
                                <p className="font-semibold">{category.solvedCount} / {category.problemCount} Solved</p>
                              </div>
                          ) : (
                              <p className="text-muted-foreground text-xs pt-2">
                                <Link href="/login" className="underline text-primary hover:text-primary/80" onClick={(e) => e.stopPropagation()}>Log in</Link> to track your progress.
                              </p>
                          )}
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button className="w-full">
                        Solve <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </CardFooter>
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
