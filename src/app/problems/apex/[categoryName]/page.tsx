
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Problem, ApexProblemsData } from "@/types";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, ArrowLeft, ArrowUpDown, Filter, CheckCircle2 } from "lucide-react";

export default function ProblemListPage() {
  const router = useRouter();
  const params = useParams();
  const categoryName = decodeURIComponent(params.categoryName as string);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [solvedProblemIds, setSolvedProblemIds] = useState<Set<string>>(new Set()); // Mock, would fetch from user data


  useEffect(() => {
    if (!categoryName) return;

    setLoading(true);
    const apexDocRef = doc(db, "problems", "Apex");
    const unsubscribe = onSnapshot(
      apexDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as { Category: ApexProblemsData };
          const categoryData = data.Category?.[categoryName];
          if (categoryData) {
            setProblems(categoryData.Questions || []);
          } else {
            setProblems([]);
          }
        } else {
          setProblems([]);
          console.log("Apex problems document does not exist!");
        }
        setLoading(false);
      },
      (error) => {
        console.error(`Error fetching problems for ${categoryName}:`, error);
        setLoading(false);
      }
    );
    
    // In a real app, you would fetch the user's solved problems and update the set.
    setSolvedProblemIds(new Set());

    return () => unsubscribe();
  }, [categoryName]);

  const filteredProblems = problems.filter((problem) =>
    problem.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30 hover:bg-green-400/30';
      case 'medium': return 'bg-blue-400/20 text-blue-400 border-blue-400/30 hover:bg-blue-400/30';
      case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30';
      default: return 'bg-muted hover:bg-muted/80';
    }
  };
  
  const solvedCount = solvedProblemIds.size;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container px-4 md:px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4 pl-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <h1 className="text-xl md:text-2xl font-bold font-headline">
                {categoryName}
              </h1>
            </Button>
            
            <Card className="mb-6">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search questions..."
                    className="w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline"><ArrowUpDown className="mr-2 h-4 w-4" />Sort</Button>
                    <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filters</Button>
                    <Badge variant="outline" className="px-3 py-2 text-sm">{solvedCount} / {problems.length} Solved</Badge>
                </div>
              </CardContent>
            </Card>
            
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredProblems.length > 0 ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">Status</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead className="text-right">Acceptance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProblems.map((problem) => (
                      <TableRow key={problem.id} className="cursor-pointer" onClick={() => router.push(`/problems/apex/${encodeURIComponent(categoryName)}/${problem.id}`)}>
                        <TableCell>
                          <div className="flex justify-center">
                            {solvedProblemIds.has(problem.id) && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{problem.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getDifficultyClass(problem.difficulty)}>
                            {problem.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">59.9%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="text-center py-16">
                 <p className="text-muted-foreground">No problems found in this category.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
