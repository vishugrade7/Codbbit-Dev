
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import type { Problem, ApexProblemsData } from "@/types";
import { cn } from "@/lib/utils";
import { getCache, setCache } from "@/lib/cache";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, CheckCircle2, ArrowLeft, Circle, Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

export default function CategoryProblemsPage() {
  const params = useParams();
  const router = useRouter();
  const { userData, isPro } = useAuth();
  
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

      const processData = (data: ApexProblemsData) => {
          const categoryData = data[categoryName];
          if (categoryData && categoryData.Questions) {
            setProblems(categoryData.Questions.sort((a,b) => a.title.localeCompare(b.title)));
          }
      };

      const cachedData = getCache<ApexProblemsData>(APEX_PROBLEMS_CACHE_KEY);
      if (cachedData) {
          processData(cachedData);
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

  const getDifficultyRowClass = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-500/5 hover:bg-green-500/10';
      case 'medium': return 'bg-primary/5 hover:bg-primary/10';
      case 'hard': return 'bg-destructive/5 hover:bg-destructive/10';
      default: return 'hover:bg-muted/50';
    }
  };


  return (
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

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search problems by title..."
            className="w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Solved">Solved</SelectItem>
                  <SelectItem value="Unsolved">Unsolved</SelectItem>
              </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="All">All Difficulties</SelectItem>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
          </Select>
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
              {filteredProblems.map((problem) => {
                const isLocked = problem.isPremium && !isPro;
                return (
                <TableRow 
                  key={problem.id} 
                  className={cn(
                      "cursor-pointer",
                      getDifficultyRowClass(problem.difficulty),
                      isLocked && "cursor-not-allowed opacity-60 hover:bg-transparent"
                  )} 
                  onClick={() => {
                      if (isLocked) {
                          router.push('/pricing');
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
                  <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                         {isLocked && <Lock className="h-4 w-4 text-primary shrink-0" />}
                         <span className={cn(isLocked && "filter blur-sm")}>{problem.title}</span>
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
    </main>
  );
}
