
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCache, setCache } from "@/lib/cache";
import Image from "next/image";
import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Code } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ApexProblemsData } from "@/types";

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

type CategoryInfo = {
  name: string;
  problemCount: number;
  difficulties: { Easy: number; Medium: number; Hard: number; };
  solvedCount: number;
  imageUrl?: string;
};

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

export default function ApexProblemsView() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData, user } = useAuth();

  useEffect(() => {
    const fetchCategories = async () => {
        setLoading(true);

        const processData = (data: ApexProblemsData) => {
            const categoriesInfo: CategoryInfo[] = Object.entries(data)
                .map(([name, categoryData]) => {
                    const questions = categoryData.Questions || [];
                    const problemCount = questions.length;
                    const solvedCount = user && userData ? questions.filter(q => userData.solvedProblems?.[q.id]).length : 0;
                    
                    const difficulties = questions.reduce(
                        (acc, q) => {
                            if (q.difficulty in acc) {
                                (acc as any)[q.difficulty]++;
                            }
                            return acc;
                        },
                        { Easy: 0, Medium: 0, Hard: 0 }
                    );

                    return { name, problemCount, difficulties, solvedCount, imageUrl: categoryData.imageUrl };
                })
                .filter(cat => cat.problemCount > 0)
                .sort((a, b) => a.name.localeCompare(b.name));
            setCategories(categoriesInfo);
        };
        
        const cachedData = getCache<ApexProblemsData>(APEX_PROBLEMS_CACHE_KEY);
        if (cachedData) {
            processData(cachedData);
            setLoading(false);
            return;
        }

        if (!db) {
            setLoading(false);
            return;
        }

        try {
            const apexDocRef = doc(db, "problems", "Apex");
            const docSnap = await getDoc(apexDocRef);

            if (docSnap.exists()) {
                const data = docSnap.data().Category as ApexProblemsData;
                setCache(APEX_PROBLEMS_CACHE_KEY, data);
                processData(data);
            }
        } catch (error) {
            console.error("Error fetching problem categories:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchCategories();
  }, [userData, user]);

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
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => {
                const theme = cardColorThemes[index % cardColorThemes.length];
                const progressPercentage = category.problemCount > 0 ? (category.solvedCount / category.problemCount) * 100 : 0;
                const chartData = [
                    { name: 'Easy', value: category.difficulties.Easy, fill: 'hsl(142.1 76.2% 41%)' },
                    { name: 'Medium', value: category.difficulties.Medium, fill: 'hsl(var(--primary))' },
                    { name: 'Hard', value: category.difficulties.Hard, fill: 'hsl(var(--destructive))' },
                ].filter(d => d.value > 0);

              return (
                <Link key={category.name} href={`/apex-problems/${encodeURIComponent(category.name)}`} className="block group">
                  <Card className={cn("overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1.5 h-full flex flex-col", theme.card)}>
                     <CardHeader className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className={cn("group-hover:underline", theme.progressText)}>{category.name}</CardTitle>
                                <CardDescription className={cn("opacity-80", theme.progressText)}>{category.problemCount} Problems</CardDescription>
                            </div>
                            <div className="relative h-12 w-12 bg-black/5 dark:bg-white/10 p-2 rounded-lg flex-shrink-0">
                                {category.imageUrl ? (
                                    <Image src={category.imageUrl} alt={category.name} fill className="object-contain" />
                                ) : (
                                    <Code className={cn("h-full w-full opacity-50", theme.progressText)} />
                                )}
                            </div>
                        </div>
                     </CardHeader>

                    <CardContent className="p-4 pt-0 flex flex-col flex-grow justify-end">
                        {user && (
                            <div className="mb-4">
                                <div className="flex justify-between items-center text-xs mb-1">
                                    <span className={cn("font-medium", theme.progressText)}>Progress</span>
                                    <span className={cn("font-semibold opacity-80", theme.progressText)}>{category.solvedCount} / {category.problemCount}</span>
                                </div>
                                <Progress value={progressPercentage} className={cn("h-2", theme.progressBg)} indicatorClassName={theme.progressFg} />
                            </div>
                        )}

                        {category.problemCount > 0 ? (
                            <>
                                <div className="flex-grow flex items-center justify-center -my-4">
                                    <ChartContainer
                                        config={{}} // No config needed as we are not using tooltips/legends from it
                                        className="mx-auto aspect-square h-full max-h-[120px]"
                                    >
                                        <PieChart>
                                            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} strokeWidth={2} stroke={cn('bg-card', theme.card)}>
                                                {chartData.map((entry) => (
                                                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ChartContainer>
                                </div>
                                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs mt-4">
                                    {chartData.map((entry) => (
                                    <div key={entry.name} className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                                        <span className={cn("font-medium", theme.progressText)}>{entry.name} ({entry.value})</span>
                                    </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex-grow flex items-center justify-center text-muted-foreground text-sm">
                                No problems in this category yet.
                            </div>
                        )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
            <div className="text-center py-12">
                <p className="text-muted-foreground">No problems found. Please check back later.</p>
            </div>
        )}
      </main>
  );
}
