
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type { Problem, ApexProblemsData } from "@/types";
import { cn } from "@/lib/utils";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, CheckCircle2, ArrowLeft, Circle, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CategoryProblemsPage() {
  const params = useParams();
  const router = useRouter();
  const { userData } = useAuth();
  
  const categoryName = useMemo(() => params?.categoryName ? decodeURIComponent(params.categoryName as string) : null, [params]);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    if (!categoryName) return;

    const fetchProblems = async () => {
      setLoading(true);
      try {
        const apexDocRef = doc(db, "problems", "Apex");
        const docSnap = await getDoc(apexDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data().Category as ApexProblemsData;
          const categoryData = data[categoryName];
          if (categoryData && categoryData.Questions) {
            setProblems(categoryData.Questions.sort((a,b) => a.title.localeCompare(b.title)));
          }
        }
      } catch (error) {
        console.error("Error fetching problems:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [categoryName]);

  const filteredProblems = useMemo(() => {
    return problems
      .filter((p) => {
        if (statusFilter === "All") return true;
        const isSolved = userData?.solvedProblems?.includes(p.id) ?? false;
        if (statusFilter === "Solved") return isSolved;
        if (statusFilter === "Unsolved") return !isSolved;
        return true;
      })
      .filter((p) => difficultyFilter === "All" || p.difficulty === difficultyFilter)
      .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [problems, searchTerm, difficultyFilter, statusFilter, userData]);
  
   const getDifficultyBadgeClass = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
      case 'medium': return 'bg-primary/20 text-primary border-primary/30';
      case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted';
    }
  };

  const activeFilterCount = (difficultyFilter !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => router.push('/apex-problems')}>
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to categories</span>
            </Button>
            <div>
                 <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight">{categoryName}</h1>
                 <p className="text-muted-foreground mt-1">
                    Select a problem to start solving.
                </p>
            </div>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search problems by title..."
              className="w-full pl-10 pr-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
             <div className="absolute right-1 top-1/2 -translate-y-1/2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Filter className="h-5 w-5" />
                        <span className="sr-only">Filters</span>
                         {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 rounded-full text-xs">{activeFilterCount}</Badge>
                        )}
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                        <DropdownMenuRadioItem value="All">All</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Solved">Solved</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Unsolved">Unsolved</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Filter by Difficulty</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={difficultyFilter} onValueChange={setDifficultyFilter}>
                        <DropdownMenuRadioItem value="All">All</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Easy">Easy</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Medium">Medium</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Hard">Hard</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : filteredProblems.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right w-[120px]">Difficulty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProblems.map((problem) => (
                  <TableRow key={problem.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/problems/apex/${encodeURIComponent(categoryName || '')}/${problem.id}`)}>
                    <TableCell>
                      <div className="flex justify-center">
                        {userData?.solvedProblems?.includes(problem.id) ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{problem.title}</TableCell>
                    <TableCell className="text-right">
                       <Badge variant="outline" className={cn("w-20 justify-center", getDifficultyBadgeClass(problem.difficulty))}>
                         {problem.difficulty}
                       </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No problems found for the selected criteria.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
