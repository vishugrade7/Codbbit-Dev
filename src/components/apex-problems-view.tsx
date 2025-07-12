
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Code, BookOpen } from "lucide-react";
import type { ApexProblemsData } from "@/types";

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

type CategoryInfo = {
  name: string;
  problemCount: number;
  imageUrl?: string;
};

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
                    return { name, problemCount, imageUrl: categoryData.imageUrl };
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
            {categories.map((category) => (
              <Card key={category.name} className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col group">
                <Link href={`/apex-problems/${encodeURIComponent(category.name)}`} className="block">
                    <div className="aspect-video relative">
                        <Image 
                           src={category.imageUrl || 'https://placehold.co/600x400.png'} 
                           alt={category.name}
                           fill
                           sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                           className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
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
                <div className="p-4 pt-0 mt-auto">
                    <Button asChild className="w-full" size="sm">
                        <Link href={`/apex-problems/${encodeURIComponent(category.name)}`}>View Problems</Link>
                    </Button>
                </div>
              </Card>
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
