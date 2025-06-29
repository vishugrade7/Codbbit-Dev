
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Problem, ApexProblemsData } from "@/types";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Loader2, Trash2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteCategory, deleteProblem } from "./actions";
import { AddCategoryDialog } from "./add-category-dialog";
import { BulkAddDialog } from "./bulk-add-dialog";

type CategoryItem = {
    name: string;
    problems: Problem[];
};

type ItemToDelete = {
  type: 'category' | 'problem';
  id: string; // problem id or category name
  name: string; // title or name for display
  categoryName?: string; // only for problems
}

export default function AdminPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const apexDocRef = doc(db, "problems", "Apex");
    const unsubscribe = onSnapshot(apexDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = (docSnap.data().Category || {}) as ApexProblemsData;
            const fetchedCategories = Object.entries(data)
                .map(([name, value]) => ({
                    name,
                    problems: (value.Questions || []).sort((a,b) => a.title.localeCompare(b.title)),
                }))
                .sort((a,b) => a.name.localeCompare(b.name));
            setCategories(fetchedCategories);
        } else {
            // If the doc doesn't exist, you might want to create it or handle this case.
            setCategories([]);
            console.log("Apex problems document does not exist!");
        }
        setLoading(false);
    }, (error) => {
      console.error("Error fetching Apex problems:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteRequest = (item: ItemToDelete) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    let result;
    if (itemToDelete.type === 'category') {
      result = await deleteCategory(itemToDelete.id);
    } else if (itemToDelete.type === 'problem' && itemToDelete.categoryName) {
      result = await deleteProblem(itemToDelete.id, itemToDelete.categoryName);
    }

    if (result?.success) {
      toast({ title: `${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)} deleted successfully!` });
    } else {
      toast({ variant: "destructive", title: `Failed to delete ${itemToDelete.type}`, description: result?.error });
    }
    setItemToDelete(null);
  };

  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-accent/20 text-accent border-accent/30';
      case 'medium': return 'bg-primary/20 text-primary border-primary/30';
      case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted';
    }
  }

  return (
    <>
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
              <div className="flex gap-2">
                <BulkAddDialog categories={categories} />
                <AddCategoryDialog />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                  <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : categories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No categories found. Add one to get started!</p>
              ) : (
              <Accordion type="multiple" className="w-full">
                {categories.map((category) => {
                  const problemCount = category.problems.length;
                  return (
                  <AccordionItem value={category.name} key={category.name}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex justify-between w-full items-center">
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-lg">{category.name}</span>
                          <Badge variant="secondary">{problemCount} problem{problemCount !== 1 ? 's' : ''}</Badge>
                        </div>
                        <div onClick={(e) => e.stopPropagation()} className="pr-2">
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRequest({ type: 'category', id: category.name, name: category.name })}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-4">
                      <div className="space-y-2">
                        {category.problems.length > 0 ? category.problems.map((problem) => (
                          <div key={problem.id} className="flex items-center justify-between p-3 rounded-md bg-card/50">
                            <div className="flex items-center gap-4">
                              <span className="font-medium">{problem.title}</span>
                              <Badge variant="outline" className={getDifficultyClass(problem.difficulty)}>{problem.difficulty}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                               <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                <Link href={`/admin/edit-problem/${problem.id}?categoryName=${encodeURIComponent(category.name)}`}><Edit className="h-4 w-4" /></Link>
                               </Button>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRequest({ type: 'problem', id: problem.id, name: problem.title, categoryName: category.name })}>
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                            </div>
                          </div>
                        )) : (
                            <p className="text-muted-foreground text-center py-4">No problems in this category yet.</p>
                        )}
                         <Button asChild variant="outline" className="w-full mt-2">
                            <Link href={`/admin/add-problem?categoryName=${encodeURIComponent(category.name)}`}>
                                <PlusCircle /> Add Problem to {category.name}
                            </Link>
                        </Button>
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
    <ConfirmationDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${itemToDelete?.type}`}
        description={`Are you sure you want to delete the ${itemToDelete?.type} "${itemToDelete?.name}"? This action cannot be undone.`}
     />
    </>
  );
}
