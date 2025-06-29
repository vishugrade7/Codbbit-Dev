
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Loader2, Search, ArrowLeft, ArrowUpDown, Filter, Signal, Play } from "lucide-react";

export default function ProblemListPage() {
  const router = useRouter();
  const params = useParams();
  const categoryName = decodeURIComponent(params.categoryName as string);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

    return () => unsubscribe();
  }, [categoryName]);

  const filteredProblems = problems.filter((problem) =>
    problem.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30';
      case 'medium': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30 hover:bg-yellow-600/30';
      case 'hard': return 'bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30';
      default: return 'bg-muted hover:bg-muted/80';
    }
  };
  
  // Static data for now
  const solvedCount = 0;

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
              <div className="space-y-3">
                {filteredProblems.map((problem, index) => (
                  <Link key={problem.id} href={`/problems/apex/${encodeURIComponent(categoryName)}/${problem.id}`} passHref>
                    <Card className="hover:bg-card/50 transition-colors">
                      <CardContent className="p-3 pr-2 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground text-sm w-6 text-center">{index + 1}.</span>
                          <p className="font-medium">{problem.title}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">59.9%</span>
                          <Badge variant="outline" className={getDifficultyClass(problem.difficulty)}>
                            {problem.difficulty}
                          </Badge>
                          <Signal className="text-primary h-5 w-5" />
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400 hover:text-green-400 hover:bg-green-400/10 rounded-full">
                             <Play className="h-5 w-5 fill-current"/>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
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
