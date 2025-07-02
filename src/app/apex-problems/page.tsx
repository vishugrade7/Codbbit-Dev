
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ApexProblemsData } from "@/types";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type CategoryInfo = {
  name: string;
  problemCount: number;
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
                const imageUrl = categoryData.imageUrl;

                return { name, problemCount, firstProblemId, difficulties, imageUrl };
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
  }, []);

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
                <Link key={category.name} href={`/apex-problems/${encodeURIComponent(category.name)}`} className="block group h-full">
                  <Card className="transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 overflow-hidden border bg-card/50 backdrop-blur-sm h-full flex flex-col">
                    <CardContent className="p-6 flex flex-col items-center text-center flex-grow">
                      <Avatar className="h-28 w-28 mb-4 rounded-xl">
                        <AvatarImage 
                          src={category.imageUrl || 'https://placehold.co/112x112.png'} 
                          alt={category.name} 
                          className="object-cover" 
                          data-ai-hint="abstract code"
                        />
                        <AvatarFallback className="rounded-xl text-2xl bg-muted">
                            {category.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <h3 className="text-xl font-semibold group-hover:text-primary">{category.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{category.problemCount} Problems</p>
                      
                      <Separator className="my-2" />

                      <div className="w-full space-y-2 py-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Easy</span>
                            <Badge variant="outline" className="bg-green-400/10 text-green-400 border-green-400/20">{category.difficulties.Easy}</Badge>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Medium</span>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{category.difficulties.Medium}</Badge>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Hard</span>
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">{category.difficulties.Hard}</Badge>
                          </div>
                      </div>
                    </CardContent>

                    <CardFooter className="justify-center pt-0 pb-6 mt-auto">
                        <div className="text-sm font-semibold text-primary group-hover:text-primary/80 transition-colors flex items-center">
                            <span>View Problems</span>
                            <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
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
