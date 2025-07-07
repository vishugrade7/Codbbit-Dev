
"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { collection, query, orderBy, onSnapshot, doc, getDoc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LeaderboardUser, Problem, ApexProblemsData } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { getCache, setCache } from "@/lib/cache";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Building, Trophy, Globe, BookOpen, ArrowRight, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProblemWithCategory = Problem & { categoryName: string };

const getMedalColor = (rank: number) => {
  if (rank === 1) return 'border-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20';
  if (rank === 2) return 'border-slate-400 bg-slate-400/10 hover:bg-slate-400/20';
  if (rank === 3) return 'border-orange-500 bg-orange-500/10 hover:bg-orange-500/20';
  return 'border-border';
};

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const { user: authUser, userData } = useAuth();

  const [filterType, setFilterType] = useState<"Global" | "Country" | "Company">("Global");
  const [filterValue, setFilterValue] = useState<string | null>(null);

  const [allProblems, setAllProblems] = useState<ProblemWithCategory[]>([]);
  const [suggestedProblem, setSuggestedProblem] = useState<ProblemWithCategory | null>(null);
  
  // Fetch all problems for suggestion
  useEffect(() => {
    const fetchAllProblems = async () => {
        if (!db) return;

        const processData = (data: ApexProblemsData) => {
            const problems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
            );
            setAllProblems(problems);
        };
        
        const cachedData = getCache<ApexProblemsData>(APEX_PROBLEMS_CACHE_KEY);
        if (cachedData) {
            processData(cachedData);
            return;
        }

        try {
            const apexDocRef = doc(db, "problems", "Apex");
            const problemsSnap = await getDoc(apexDocRef);
            if (problemsSnap.exists()) {
                const data = problemsSnap.data().Category as ApexProblemsData;
                setCache(APEX_PROBLEMS_CACHE_KEY, data);
                processData(data);
            }
        } catch (error) {
            console.error("Error fetching all problems for suggestion:", error);
        }
    };
    fetchAllProblems();
  }, []);

  // Determine suggested problem
  useEffect(() => {
    if (allProblems.length > 0 && userData?.solvedProblems) {
        const solvedIds = new Set(Object.keys(userData.solvedProblems));
        const unsolvedProblems = allProblems.filter(p => !p.isPremium && !solvedIds.has(p.id));

        if (unsolvedProblems.length > 0) {
            const randomIndex = Math.floor(Math.random() * unsolvedProblems.length);
            setSuggestedProblem(unsolvedProblems[randomIndex]);
        } else {
            setSuggestedProblem(null);
        }
    }
  }, [allProblems, userData]);

  // Real-time listener for leaderboard data
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("points", "desc"), limit(100));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const users: LeaderboardUser[] = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                rank: 0, // Rank will be calculated on the client
                id: doc.id,
                name: data.name || 'N/A',
                username: data.username || `user${doc.id.substring(0,5)}`,
                avatarUrl: data.avatarUrl || '',
                points: data.points || 0,
                country: data.country || 'N/A',
                company: data.company || '',
                companyLogoUrl: data.companyLogoUrl || ''
            };
        });
        setLeaderboardData(users);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching real-time leaderboard data:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const countryOptions = useMemo(() => {
    const countries = new Set(leaderboardData.map(u => u.country).filter(c => c && c !== 'N/A'));
    return Array.from(countries).sort();
  }, [leaderboardData]);

  const companyOptions = useMemo(() => {
    const companies = new Set(leaderboardData.map(u => u.company).filter(Boolean));
    return Array.from(companies).sort();
  }, [leaderboardData]);
  
  const handleFilterTypeChange = (value: "Global" | "Country" | "Company") => {
    setFilterType(value);
    setCurrentPage(1);
    if (value === 'Country') {
      setFilterValue(countryOptions[0] || null);
    } else if (value === 'Company') {
      setFilterValue(companyOptions[0] || null);
    } else {
      setFilterValue(null);
    }
  };

  const handleFilterValueChange = (value: string) => {
    setCurrentPage(1);
    setFilterValue(value);
  }

  const filteredData = useMemo(() => {
    let data = leaderboardData;
    if (filterType === "Country" && filterValue) {
        data = leaderboardData.filter(u => u.country === filterValue);
    } else if (filterType === "Company" && filterValue) {
        data = leaderboardData.filter(u => u.company === filterValue);
    }
    return data.map((user, index) => ({ ...user, rank: index + 1 }));
  }, [leaderboardData, filterType, filterValue]);

  const currentUserEntry = useMemo(() => {
    if (!authUser) return null;
    const globalRankedData = leaderboardData.map((user, index) => ({ ...user, rank: index + 1 }));
    return globalRankedData.find(entry => entry.id === authUser.uid);
  }, [authUser, leaderboardData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [currentPage, filteredData]);


  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const getDifficultyBadgeClass = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
      case 'medium': return 'bg-primary/20 text-primary border-primary/30';
      case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <main className="flex-1 container py-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1 container py-8">
      <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              See how you rank against the top developers. Keep solving problems to climb up the ranks!
          </p>
      </div>

       {currentUserEntry && (
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
             <Card className="bg-primary/10 border-primary/20 shadow-lg h-full flex flex-col">
              <CardContent className="p-6 flex flex-col flex-grow">
                  <div className="flex justify-between items-start">
                      <Link href={`/profile/${currentUserEntry.username}`} className="flex items-center gap-4 group">
                          <Avatar className="h-12 w-12 border-2 border-primary">
                              <AvatarImage src={currentUserEntry.avatarUrl} alt={currentUserEntry.name} />
                              <AvatarFallback>{currentUserEntry.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                              <p className="font-semibold text-lg group-hover:underline">{currentUserEntry.name}</p>
                              <p className="text-sm text-muted-foreground">@{currentUserEntry.username}</p>
                          </div>
                      </Link>
                      <div className="text-right">
                          <div className="flex items-center gap-2 font-bold text-2xl">
                              <Trophy className="h-7 w-7 text-yellow-400" />
                              <span>{currentUserEntry.rank}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">Global Rank</p>
                      </div>
                  </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            {suggestedProblem ? (
                <Card className="bg-gradient-to-br from-card to-muted/50 h-full">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6 h-full">
                      <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-2">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                  <BookOpen className="h-5 w-5 text-primary" />
                              </div>
                              <h3 className="text-lg font-semibold">Challenge Yourself!</h3>
                          </div>
                          <p className="text-muted-foreground text-sm mb-3">
                              Solve <span className="font-semibold text-foreground">{suggestedProblem.title}</span> to climb the leaderboard.
                          </p>
                          <div className="flex items-center gap-2">
                              <Badge variant="secondary">{suggestedProblem.categoryName}</Badge>
                              <Badge variant="outline" className={cn("justify-center", getDifficultyBadgeClass(suggestedProblem.difficulty))}>
                              {suggestedProblem.difficulty}
                              </Badge>
                          </div>
                      </div>
                      <div className="flex-shrink-0">
                          <Button asChild size="sm">
                            <Link href={`/problems/apex/${encodeURIComponent(suggestedProblem.categoryName)}/${suggestedProblem.id}`}>
                              Start Challenge <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                      </div>
                  </CardContent>
                </Card>
            ) : (
              <Card className="flex items-center justify-center text-center p-6 bg-card/80 border-dashed h-full">
                  <CardContent className="p-0">
                      <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold">You're a Champion!</h3>
                      <p className="text-muted-foreground mt-2">You've solved all available problems. Great work!</p>
                  </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      
      <div className="mb-8 flex flex-col md:flex-row justify-center items-center gap-4">
          <Tabs value={filterType} onValueChange={(value) => handleFilterTypeChange(value as any)} className="w-auto">
              <TabsList>
                  <TabsTrigger value="Global">Global</TabsTrigger>
                  <TabsTrigger value="Country">By Country</TabsTrigger>
                  <TabsTrigger value="Company">By Company</TabsTrigger>
              </TabsList>
          </Tabs>

          {filterType === "Country" && (
              <Select
                  value={filterValue ?? ''}
                  onValueChange={handleFilterValueChange}
                  disabled={countryOptions.length === 0}
              >
                  <SelectTrigger className="w-full md:w-[220px]">
                      <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                      {countryOptions.map(country => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          )}

          {filterType === "Company" && (
              <Select
                  value={filterValue ?? ''}
                  onValueChange={handleFilterValueChange}
                  disabled={companyOptions.length === 0}
              >
                  <SelectTrigger className="w-full md:w-[220px]">
                      <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                      {companyOptions.map(company => (
                          <SelectItem key={company} value={company}>{company}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          )}
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedData.map((user) => (
            <Link key={user.id} href={`/profile/${user.username}`} className="block">
              <Card className={cn("hover:-translate-y-1 transition-transform duration-300 h-full", getMedalColor(user.rank))}>
                <CardContent className="p-4 flex flex-col text-center items-center">
                    <div className="relative mb-2">
                        <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-0.5">
                            <div className={cn("h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs", getMedalColor(user.rank))}>
                                {user.rank}
                            </div>
                        </div>
                    </div>
                  
                    <h3 className="font-semibold text-sm truncate">{user.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    
                    <div className="my-3 w-full">
                       <p className="text-xl font-bold font-mono">{user.points.toLocaleString()}</p>
                       <p className="text-xs text-muted-foreground uppercase">Points</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {user.company && (
                            <div className="flex items-center gap-1.5">
                            {user.companyLogoUrl ? (
                                <Image src={user.companyLogoUrl} alt={user.company} width={14} height={14} className="rounded-sm object-contain"/>
                            ) : ( <Building className="h-3.5 w-3.5" /> )}
                            <span className="truncate">{user.company}</span>
                            </div>
                        )}
                         {user.country && user.company && (<span className="text-muted-foreground/50">|</span>)}
                        {user.country && (
                            <div className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /><span>{user.country}</span></div>
                        )}
                    </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

      {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-4 mt-8">
              <Button onClick={handlePrevPage} disabled={currentPage === 1} variant="outline">
                  Previous
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                  Page {currentPage} of {totalPages}
              </span>
              <Button onClick={handleNextPage} disabled={currentPage === totalPages} variant="outline">
                  Next
              </Button>
          </div>
      )}

      {paginatedData.length === 0 && (
         <div className="text-center py-16">
            <h3 className="text-lg font-semibold">No users found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your filters.</p>
        </div>
      )}

    </main>
  );
}
