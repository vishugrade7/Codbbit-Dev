
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type { Problem, ApexProblemsData } from "@/types";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, CheckCircle2, ArrowLeft, Circle, Lock, Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useProModal } from "@/components/pro-modal";

export default function CategoryProblemsPage() {
  const params = useParams();
  const router = useRouter();
  const { userData, isPro } = useAuth();
  const proModal = useProModal();
  
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
        const isSolved = !!userData?.solvedProblems?.[p.id];
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
  
  const statusOptions = ['All Statuses', 'Solved', 'Unsolved'];
  const difficultyOptions = ['All Difficulties', 'Easy', 'Medium', 'Hard'];

  const getStatusValue = (option: string) => {
      if (option === 'All Statuses') return 'All';
      return option;
  }
   const getDifficultyValue = (option: string) => {
      if (option === 'All Difficulties') return 'All';
      return option;
  }

  return (
    <main className="flex-1 container py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
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

            <div className="flex w-full md:w-auto items-center gap-2">
                <div className="relative flex-1 md:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                    placeholder="Search problems by title..."
                    className="w-full md:w-80 pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                            <Filter className="h-5 w-5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0" align="end">
                        <div className="py-2">
                            <p className="text-sm font-medium px-4 mb-2">Status</p>
                            {statusOptions.map(option => (
                                <button
                                    key={option}
                                    className="flex items-center w-full px-4 py-1.5 text-sm text-left hover:bg-accent"
                                    onClick={() => setStatusFilter(getStatusValue(option))}
                                >
                                    <span className={cn("h-2 w-2 rounded-full mr-3", getStatusValue(statusFilter) === getStatusValue(option) ? "bg-primary" : "bg-transparent")}></span>
                                    {option}
                                </button>
                            ))}
                        </div>
                        <Separator />
                        <div className="py-2">
                            <p className="text-sm font-medium px-4 mb-2">Difficulty</p>
                            {difficultyOptions.map(option => (
                                <button
                                    key={option}
                                    className="flex items-center w-full px-4 py-1.5 text-sm text-left hover:bg-accent"
                                    onClick={() => setDifficultyFilter(getDifficultyValue(option))}
                                >
                                    <span className={cn("h-2 w-2 rounded-full mr-3", getDifficultyValue(difficultyFilter) === getDifficultyValue(option) ? "bg-primary" : "bg-transparent")}></span>
                                    {option}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : filteredProblems.length > 0 ? (
          <div className="rounded-none md:rounded-lg border-y md:border-x">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right w-[120px]">Difficulty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProblems.map((problem) => {
                  const isLocked = problem.isPremium && !isPro;
                  return (
                  <TableRow 
                    key={problem.id} 
                    className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        isLocked && "cursor-not-allowed opacity-60 hover:bg-transparent"
                    )} 
                    onClick={() => {
                        if (isLocked) {
                            proModal.setIsOpen(true);
                        } else {
                            router.push(`/problems/apex/${encodeURIComponent(categoryName || '')}/${problem.id}`)
                        }
                    }}
                  >
                    <TableCell>
                      <div className="flex justify-center">
                        {userData?.solvedProblems?.[problem.id] ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                           {isLocked && <Lock className="h-4 w-4 text-primary shrink-0" />}
                           <span className={cn("font-medium", isLocked && "filter blur-sm")}>{problem.title}</span>
                        </div>
                    </TableCell>
                     <TableCell className="text-right">
                        <Badge variant="outline" className={cn("w-20 justify-center", getDifficultyBadgeClass(problem.difficulty))}>
                            {problem.difficulty}
                        </Badge>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No problems found for the selected criteria.</p>
          </div>
        )}
      </div>
      </main>
  );
}
