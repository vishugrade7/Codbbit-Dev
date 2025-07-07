
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CategoryInfo as ServerCategoryInfo } from "@/app/apex-problems/page";

const cardColorThemes = [
    { // Blue
        card: "bg-blue-100 dark:bg-blue-900/30",
        progressBg: "bg-blue-200 dark:bg-blue-800/30",
        progressFg: "bg-blue-500",
        progressText: "text-blue-900 dark:text-blue-200",
    },
    { // Orange
        card: "bg-orange-100 dark:bg-orange-900/30",
        progressBg: "bg-orange-200 dark:bg-orange-800/30",
        progressFg: "bg-orange-500",
        progressText: "text-orange-900 dark:text-orange-200",
    },
    { // Green
        card: "bg-green-100 dark:bg-green-900/30",
        progressBg: "bg-green-200 dark:bg-green-800/30",
        progressFg: "bg-green-500",
        progressText: "text-green-900 dark:text-green-200",
    },
    { // Purple
        card: "bg-purple-100 dark:bg-purple-900/30",
        progressBg: "bg-purple-200 dark:bg-purple-800/30",
        progressFg: "bg-purple-500",
        progressText: "text-purple-900 dark:text-purple-200",
    },
    { // Teal
        card: "bg-teal-100 dark:bg-teal-900/30",
        progressBg: "bg-teal-200 dark:bg-teal-800/30",
        progressFg: "bg-teal-500",
        progressText: "text-teal-900 dark:text-teal-200",
    }
];

type CategoryInfo = ServerCategoryInfo & {
    solvedCount: number;
};

export default function ApexProblemsView({ initialCategories }: { initialCategories: ServerCategoryInfo[] }) {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();

  useEffect(() => {
    setLoading(true);
    if (initialCategories) {
        const categoriesWithSolvedCount = initialCategories.map(cat => {
            const solvedCount = userData 
                ? cat.questions.filter(q => userData.solvedProblems?.[q.id]).length 
                : 0;
            return { ...cat, solvedCount };
        });
        setCategories(categoriesWithSolvedCount);
    }
    setLoading(false);
  }, [initialCategories, userData]);

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
              const theme = cardColorThemes[index % cardColorThemes.length];
              const progressPercentage = category.problemCount > 0 ? (category.solvedCount / category.problemCount) * 100 : 0;
              return (
              category.firstProblemId && (
                <Link key={category.name} href={`/apex-problems/${encodeURIComponent(category.name)}`} className="block group">
                  <Card className={cn("overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1.5 border h-full flex flex-col", theme.card)}>
                    {userData && category.problemCount > 0 && (
                       <div className={cn("h-[30px] relative flex items-center justify-center", theme.progressBg)}>
                          <div 
                              className={cn("absolute top-0 left-0 h-full transition-all duration-500", theme.progressFg)}
                              style={{ width: `${progressPercentage}%` }}
                          />
                          <span className={cn("relative text-xs font-bold", theme.progressText)}>
                              {Math.round(progressPercentage)}%
                          </span>
                      </div>
                    )}
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
                                  <p className="text-xs text-muted-foreground text-right">{category.solvedCount} / {category.problemCount} solved</p>
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
