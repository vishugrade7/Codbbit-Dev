
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCache, setCache } from "@/lib/cache";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Code, BookOpen, ChevronRight, Puzzle, Album, GitFork, Database, TestTube2, Clock, Replace, Workflow, Binary, Blocks, FunctionSquare, ListTree } from "lucide-react";
import type { ApexProblemsData } from "@/types";

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

type CategoryInfo = {
  name: string;
  problemCount: number;
  imageUrl?: string;
};

const gradientClasses = [
  "from-blue-400 to-blue-600 dark:from-blue-500/70 dark:to-blue-700/70",
  "from-sky-400 to-indigo-500 dark:from-sky-500/70 dark:to-indigo-600/70",
  "from-cyan-400 to-blue-500 dark:from-cyan-500/70 dark:to-blue-600/70",
  "from-indigo-400 to-purple-500 dark:from-indigo-500/70 dark:to-purple-600/70",
  "from-blue-300 to-sky-400 dark:from-blue-400/70 dark:to-sky-500/70",
];

const iconColors = [
    "text-white/90",
    "text-white/90",
    "text-white/90",
    "text-white/90",
    "text-white/90",
];

export default function ApexProblemsView() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData, user } = useAuth();
  
  const [usedIcons, setUsedIcons] = useState<Set<React.ElementType>>(new Set());

  const primaryIcons: { [key: string]: React.ElementType } = {
    'array': Puzzle,
    'collection': Album,
    'trigger': GitFork,
    'soql': Database,
    'test': TestTube2,
    'async': Clock,
    'dynamic': Replace,
  };
  
  const fallbackIcons: React.ElementType[] = [
    ListTree, Workflow, Binary, Blocks, FunctionSquare, Code
  ];

  const getIconForCategory = (categoryName: string, usedIconsSet: Set<React.ElementType>): { Icon: React.ElementType, updatedUsedIcons: Set<React.ElementType> } => {
    const lowerCaseName = categoryName.toLowerCase();
    let IconComponent: React.ElementType | undefined;
    const newUsedIcons = new Set(usedIconsSet);

    // Try to find a specific icon
    for (const key in primaryIcons) {
      if (lowerCaseName.includes(key)) {
        const candidateIcon = primaryIcons[key];
        if (!newUsedIcons.has(candidateIcon)) {
          IconComponent = candidateIcon;
          break;
        }
      }
    }
    
    // If no specific icon was found or it was already used, try a fallback
    if (!IconComponent) {
      for (const fallback of fallbackIcons) {
        if (!newUsedIcons.has(fallback)) {
          IconComponent = fallback;
          break;
        }
      }
    }
    
    // If all else fails (e.g., more categories than unique icons), use the default
    IconComponent = IconComponent || Code;

    newUsedIcons.add(IconComponent);
    return { Icon: IconComponent, updatedUsedIcons: newUsedIcons };
  };
  
  const categoryIcons = useMemo(() => {
    let used = new Set<React.ElementType>();
    const iconsMap = new Map<string, React.ElementType>();
    
    categories.forEach(category => {
      const { Icon, updatedUsedIcons } = getIconForCategory(category.name, used);
      iconsMap.set(category.name, Icon);
      used = updatedUsedIcons;
    });

    return iconsMap;
  }, [categories]);

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
              const Icon = categoryIcons.get(category.name) || Code;
              const gradient = gradientClasses[index % gradientClasses.length];
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
                      <div className={cn("aspect-video relative flex items-center justify-center bg-gradient-to-br animate-background-pan bg-[size:200%_200%]", gradient)}>
                           <Icon className={cn("h-16 w-16 transition-transform duration-300 group-hover:scale-110", iconColor)} />
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
