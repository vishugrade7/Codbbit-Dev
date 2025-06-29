"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, getDocs, collectionGroup } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Category } from "@/types";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Search, ArrowRight } from "lucide-react";

export default function ApexProblemsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        const categoriesQuery = query(collection(db, "categories"));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const fetchedCategories: Category[] = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

        const problemsQuery = query(collectionGroup(db, 'problems'));
        const problemsSnapshot = await getDocs(problemsQuery);
        const problemCounts: { [categoryId: string]: number } = {};

        problemsSnapshot.forEach((doc) => {
          const categoryId = doc.ref.parent.parent?.id;
          if (categoryId) {
            if (!problemCounts[categoryId]) {
              problemCounts[categoryId] = 0;
            }
            problemCounts[categoryId]++;
          }
        });
        
        const categoriesWithCounts = fetchedCategories.map(category => ({
          ...category,
          problemCount: problemCounts[category.id] || 0,
        }));
        
        setCategories(categoriesWithCounts);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container px-4 md:px-6 py-12 md:py-24 lg:py-32">
          <div className="flex flex-col items-center justify-center space-y-8 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">Apex Problems</h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Hone your skills by solving a curated list of problems.
              </p>
            </div>
            <div className="w-full max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search categories..."
                  className="w-full pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 py-12 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {loading ? (
              <div className="col-span-full flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <Link key={category.id} href={`/problems/apex/${category.id}`} passHref>
                  <Card className="bg-primary text-primary-foreground h-40 flex flex-col justify-between p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-primary/20 hover:shadow-lg">
                      <h3 className="text-xl font-bold text-left">{category.name}</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-sm opacity-80">{category.problemCount} Problem{category.problemCount !== 1 ? 's' : ''}</span>
                        <ArrowRight className="h-5 w-5" />
                      </div>
                  </Card>
                </Link>
              ))
            ) : (
              <p className="col-span-full text-center text-muted-foreground">No categories found.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
