
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Problem, SOQLProblemsData } from "@/types";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ArrowLeft, ArrowUpDown, Filter, Video } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProblemListPage() {
  const router = useRouter();
  const params = useParams();
  const categoryName = decodeURIComponent(params.categoryName as string);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [solvedProblemIds, setSolvedProblemIds] = useState<Set<string>>(new Set()); // Mock, would fetch from user data
  
  const [difficultyFilter, setDifficultyFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');


  useEffect(() => {
    if (!categoryName) return;

    setLoading(true);
    const soqlDocRef = doc(db, "problems", "SOQL");
    const unsubscribe = onSnapshot(
      soqlDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as { Category: SOQLProblemsData };
          const categoryData = data.Category?.[categoryName];
          if (categoryData) {
            setProblems(categoryData.Questions || []);
          } else {
            setProblems([]);
          }
        } else {
          setProblems([]);
          console.log("SOQL problems document does not exist!");
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

  const processedProblems = problems
    .filter((problem) => {
      // Search term filter
      return problem.title.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .filter((problem) => {
      // Difficulty filter
      if (difficultyFilter.length === 0) return true;
      return difficultyFilter.includes(problem.difficulty);
    })
    .filter((problem) => {
      // Status filter
      if (statusFilter === 'all') return true;
      const isSolved = solvedProblemIds.has(problem.id);
      return statusFilter === 'solved' ? isSolved : !isSolved;
    })
    .sort((a, b) => {
      const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'difficulty-asc':
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'difficulty-desc':
          return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
        default:
          return 0; // Default order from Firestore
      }
    });
  
  const getDifficultyClass = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-500 text-background border-transparent hover:bg-green-500/80';
      case 'medium': return 'bg-blue-500 text-background border-transparent hover:bg-blue-500/80';
      case 'hard': return 'bg-destructive text-destructive-foreground border-transparent hover:bg-destructive/80';
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
            
            <div className="mb-6 bg-card rounded-lg border p-4 flex flex-col sm:flex-row items-center gap-4">
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline"><ArrowUpDown className="mr-2 h-4 w-4" />Sort</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                        <DropdownMenuRadioItem value="default">Default</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="title-asc">Title (A-Z)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="title-desc">Title (Z-A)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="difficulty-asc">Difficulty (Easy first)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="difficulty-desc">Difficulty (Hard first)</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filters</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>Difficulty</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {['Easy', 'Medium', 'Hard'].map(difficulty => (
                         <DropdownMenuCheckboxItem
                            key={difficulty}
                            checked={difficultyFilter.includes(difficulty)}
                            onCheckedChange={(checked) => {
                              setDifficultyFilter(prev => 
                                checked ? [...prev, difficulty] : prev.filter(d => d !== difficulty)
                              );
                            }}
                          >
                           {difficulty}
                         </DropdownMenuCheckboxItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                       <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                        <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="solved">Solved</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="unsolved">Unsolved</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Badge variant="outline" className="px-3 py-2 text-sm">{solvedCount} / {problems.length} Solved</Badge>
              </div>
            </div>
            
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : processedProblems.length > 0 ? (
              <div className="rounded-lg border">
                {processedProblems.map((problem, index) => (
                   <Link 
                      key={problem.id} 
                      href={`/problems/soql/${encodeURIComponent(categoryName)}/${problem.id}`}
                      className="flex items-center p-3 px-4 border-b last:border-b-0 hover:bg-card/5 transition-colors"
                  >
                      <div className="flex-1 flex items-center gap-4">
                          <span className="font-medium">{sortBy === 'default' ? `${index + 1}. ` : ''}{problem.title}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground w-14 text-right">54.4%</span>
                          <Badge className={getDifficultyClass(problem.difficulty)}>
                              {problem.difficulty}
                          </Badge>
                          <Video className="h-5 w-5 text-primary" />
                      </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                 <p className="text-muted-foreground">
                   {problems.length > 0 ? 'No problems found with the selected filters.' : 'No problems found in this category.'}
                 </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
