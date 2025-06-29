"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, collectionGroup } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Category, Problem } from "@/types";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Loader2 } from "lucide-react";

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [problems, setProblems] = useState<{ [categoryId: string]: Problem[] }>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    setLoading(true);
    const categoriesQuery = query(collection(db, "categories"));
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const fetchedCategories: Category[] = [];
      snapshot.forEach((doc) => {
        fetchedCategories.push({ id: doc.id, ...doc.data() } as Category);
      });
      setCategories(fetchedCategories);
      // We set loading to false here, but if problems load slower it's fine
      setLoading(false); 
    }, (error) => {
      console.error("Error fetching categories:", error);
      setLoading(false);
    });

    const problemsQuery = query(collectionGroup(db, 'problems'));
    const unsubscribeProblems = onSnapshot(problemsQuery, (snapshot) => {
        const fetchedProblems: { [categoryId: string]: Problem[] } = {};
        snapshot.forEach((doc) => {
            const problem = { id: doc.id, ...doc.data() } as Problem;
            const categoryId = doc.ref.parent.parent?.id;
            if (categoryId) {
                if (!fetchedProblems[categoryId]) {
                    fetchedProblems[categoryId] = [];
                }
                fetchedProblems[categoryId].push(problem);
            }
        });
        setProblems(fetchedProblems);
    });

    return () => {
        unsubscribeCategories();
        unsubscribeProblems();
    };
  }, []);

  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-600/20 text-green-400 border-green-600/30';
      case 'medium': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'hard': return 'bg-red-600/20 text-red-400 border-red-600/30';
      default: return 'bg-muted';
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container px-4 md:px-6 py-12 md:py-16">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline text-2xl">Problem Management</CardTitle>
                <CardDescription>Add, edit, or manage problems for Codbbit challenges.</CardDescription>
              </div>
              <Button disabled><PlusCircle /> Add Category</Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                  <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : categories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No categories found. Add one to get started!</p>
              ) : (
              <Accordion type="multiple" className="w-full">
                {categories.map((category) => {
                  const categoryProblems = problems[category.id] || [];
                  const problemCount = categoryProblems.length;
                  return (
                  <AccordionItem value={category.id} key={category.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg">{category.name}</span>
                        <Badge variant="secondary">{problemCount} problem{problemCount !== 1 ? 's' : ''}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-4">
                      <div className="space-y-2">
                        {categoryProblems.length > 0 ? categoryProblems.map((problem) => (
                          <div key={problem.id} className="flex items-center justify-between p-3 rounded-md bg-card/50">
                            <div className="flex items-center gap-4">
                              <span className="font-medium">{problem.title}</span>
                              <Badge variant="outline" className={getDifficultyClass(problem.difficulty)}>{problem.difficulty}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled><Edit className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        )) : (
                            <p className="text-muted-foreground text-center py-4">No problems in this category yet.</p>
                        )}
                        <Button variant="outline" className="w-full mt-2" disabled><PlusCircle /> Add Problem to {category.name}</Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  )
                })}
              </Accordion>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}