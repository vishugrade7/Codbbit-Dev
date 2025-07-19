
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCache, setCache } from "@/lib/cache";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Code, BookOpen, ChevronRight, Puzzle, Album, Anchor, AppWindow, Award, Axe, Baby, Badge, BaggageClaim, Binary } from "lucide-react";
import type { ApexProblemsData } from "@/types";

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

type CategoryInfo = {
  name: string;
  problemCount: number;
  imageUrl?: string;
};

const icons = [Puzzle, Album, Anchor, AppWindow, Award, Axe, Baby, Badge, BaggageClaim, Binary];
const bgColors = [
    "bg-blue-200 dark:bg-blue-900/30",
    "bg-orange-200 dark:bg-orange-900/30",
    "bg-green-200 dark:bg-green-900/30",
    "bg-purple-200 dark:bg-purple-900/30",
    "bg-teal-200 dark:bg-teal-900/30",
    "bg-red-200 dark:bg-red-900/30",
    "bg-yellow-200 dark:bg-yellow-900/30",
    "bg-pink-200 dark:bg-pink-900/30",
    "bg-indigo-200 dark:bg-indigo-900/30",
    "bg-gray-200 dark:bg-gray-900/30",
];
const iconColors = [
    "text-blue-800 dark:text-blue-200",
    "text-orange-800 dark:text-orange-200",
    "text-green-800 dark:text-green-200",
    "text-purple-800 dark:text-purple-200",
    "text-teal-800 dark:text-teal-200",
    "text-red-800 dark:text-red-200",
    "text-yellow-800 dark:text-yellow-200",
    "text-pink-800 dark:text-pink-200",
    "text-indigo-800 dark:text-indigo-200",
    "text-gray-800 dark:text-gray-200",
];

export default function ApexProblemsView() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData, user } = useAuth();

  useEffect(() => {
    const fetchCategories = async () => {
        setLoading(true);

        const processData = (data: ApexProblemsData | null) => {
            if (!data) return;
            const categoriesInfo: CategoryInfo[] = Object.entries(data)
                .map(([name, categoryData]) => {
                    const questions = categoryData.Questions || [];
                    const problemCount = questions.length;
                    return { name, problemCount, imageUrl: categoryData.imageUrl };
                })
                .filter(cat => cat.problemCount > 0)
                .sort((a, b) => a.name.localeCompare(b.name));
            setCategories(categoriesInfo);
        };
        
        const cachedData = await getCache<ApexProblemsData>(APEX_PROBLEMS_CACHE_KEY);
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
                await setCache(APEX_PROBLEMS_CACHE_KEY, data);
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
              const Icon = icons[index % icons.length];
              const bgColor = bgColors[index % bgColors.length];
              const iconColor = iconColors[index % iconColors.length];
              return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="overflow-hidden h-full flex flex-col group">
                  <Link href={`/apex-problems/${encodeURIComponent(category.name)}`} className="block">
                      <div className={cn("aspect-video relative flex items-center justify-center", bgColor)}>
                           <Icon className={cn("h-16 w-16 transition-transform duration-300 group-hover:scale-110", iconColor)} />
                           <div className="absolute bottom-2 right-2">
                                <Button size="icon" className="rounded-full h-10 w-10 bg-background/20 backdrop-blur border border-white/20 text-white group-hover:bg-background/40 transition-colors">
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                            </div>
                      </div>
                  </Link>
                  <CardContent className="p-4 flex flex-col flex-grow">
                      <h3 className="font-semibold text-base leading-snug flex-grow">
                          <Link href={`/apex-problems/${encodeURIComponent(category.name)}`} className="hover:underline">
                              {category.name}
                          </Link>
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                          <BookOpen className="h-3.5 w-3.5"/>
                          <span>{category.problemCount} {category.problemCount === 1 ? 'problem' : 'problems'}</span>
                      </div>
                  </CardContent>
                </Card>
              </motion.div>
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
