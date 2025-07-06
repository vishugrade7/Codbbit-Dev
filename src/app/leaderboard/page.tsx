
"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LeaderboardUser, Problem, ApexProblemsData } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Building, Trophy, Globe, BookOpen, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProblemWithCategory = Problem & { categoryName: string };

const getMedal = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { user: authUser, userData } = useAuth();

  const [filterType, setFilterType] = useState<"Global" | "Country" | "Company">("Global");
  const [filterValue, setFilterValue] = useState<string | null>(null);

  const [allProblems, setAllProblems] = useState<ProblemWithCategory[]>([]);
  const [suggestedProblem, setSuggestedProblem] = useState<ProblemWithCategory | null>(null);
  
  // Fetch all problems for suggestion
  useEffect(() => {
    const fetchAllProblems = async () => {
        if (!db) return;
        try {
            const apexDocRef = doc(db, "problems", "Apex");
            const problemsSnap = await getDoc(apexDocRef);
            if (problemsSnap.exists()) {
                const data = problemsSnap.data().Category as ApexProblemsData;
                const problems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                    (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                );
                setAllProblems(problems);
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
        const unsolvedProblems = allProblems.filter(p => !solvedIds.has(p.id));

        if (unsolvedProblems.length > 0) {
            const randomIndex = Math.floor(Math.random() * unsolvedProblems.length);
            setSuggestedProblem(unsolvedProblems[randomIndex]);
        } else {
            setSuggestedProblem(null);
        }
    }
  }, [allProblems, userData]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("points", "desc"));
        const querySnapshot = await getDocs(q);
        const users: LeaderboardUser[] = querySnapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            rank: index + 1, // This is the global rank
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
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const countryOptions = useMemo(() => {
    const countries = new Set(leaderboardData.map(u => u.country).filter(Boolean));
    return Array.from(countries).sort();
  }, [leaderboardData]);

  const companyOptions = useMemo(() => {
    const companies = new Set(leaderboardData.map(u => u.company).filter(Boolean));
    return Array.from(companies).sort();
  }, [leaderboardData]);

  useEffect(() => {
    setCurrentPage(1);
    setFilterValue(null);
  }, [filterType]);
  
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
    return filteredData.find(entry => entry.id === authUser.uid);
  }, [authUser, filteredData]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [currentPage, filteredData]);


  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

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
              See how you rank against the best Salesforce developers in the world. Keep solving problems to climb up the ranks!
          </p>
      </div>

      {currentUserEntry && (
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="bg-primary/10 border-primary/20 shadow-lg h-full flex flex-col">
              <CardContent className="p-6 flex flex-col flex-grow">
                <Link href={`/profile/${currentUserEntry.username}`} className="block">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-primary">
                                <AvatarImage src={currentUserEntry.avatarUrl} alt={currentUserEntry.name} />
                                <AvatarFallback>{currentUserEntry.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-lg">{currentUserEntry.name}</p>
                                <p className="text-sm text-muted-foreground">@{currentUserEntry.username}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-2 font-bold text-2xl">
                                <Trophy className="h-7 w-7 text-yellow-400" />
                                <span>{currentUserEntry.rank}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">Rank</p>
                        </div>
                    </div>
                </Link>
                <div className="mt-auto pt-4 flex justify-between items-end">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          {currentUserEntry.company && (
                              <div className="flex items-center gap-1.5">
                                  {currentUserEntry.companyLogoUrl ? (
                                      <Image
                                          src={currentUserEntry.companyLogoUrl}
                                          alt={currentUserEntry.company || 'Company logo'}
                                          width={16}
                                          height={16}
                                          className="rounded-sm object-contain"
                                      />
                                  ) : (
                                      <Building className="h-4 w-4" />
                                  )}
                                  <span>{currentUserEntry.company}</span>
                              </div>
                          )}
                          {currentUserEntry.country && (
                              <div className="flex items-center gap-1.5">
                                  <Globe className="h-4 w-4" />
                                  <span>{currentUserEntry.country}</span>
                              </div>
                          )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold text-2xl">{currentUserEntry.points.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Points</p>
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            {suggestedProblem ? (
                <Card className="bg-gradient-to-br from-card to-muted/50 h-full">
                  <CardContent className="p-6 flex flex-col h-full">
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
                      <Button asChild className="w-full mt-4 flex-shrink-0">
                        <Link href={`/problems/apex/${encodeURIComponent(suggestedProblem.categoryName)}/${suggestedProblem.id}`}>
                          Start Challenge <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                  </CardContent>
                </Card>
            ) : (
              <Card className="flex items-center justify-center text-center p-6 bg-card/80 border-dashed min-h-[160px]">
                  <CardContent className="p-0">
                      {allProblems.length > 0 && userData && userData.solvedProblems && Object.keys(userData.solvedProblems).length >= allProblems.length ? (
                      <>
                          <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                          <h3 className="text-xl font-bold">You're a Champion!</h3>
                          <p className="text-muted-foreground mt-2">You've solved all available problems. Great work!</p>
                      </>
                      ) : (
                      <>
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                          <p className="text-muted-foreground">Finding a great challenge for you...</p>
                      </>
                      )}
                  </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      
      <div className="mb-8 flex flex-col md:flex-row justify-center items-center gap-4">
          <Tabs value={filterType} onValueChange={(value) => setFilterType(value as any)} className="w-auto">
              <TabsList>
                  <TabsTrigger value="Global">Global</TabsTrigger>
                  <TabsTrigger value="Country">By Country</TabsTrigger>
                  <TabsTrigger value="Company">By Company</TabsTrigger>
              </TabsList>
          </Tabs>

          {filterType === "Country" && (
              <Select
                  value={filterValue ?? ''}
                  onValueChange={(value) => setFilterValue(value)}
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
                  onValueChange={(value) => setFilterValue(value)}
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


      <div className="rounded-lg border">
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead className="w-[80px] text-center">Rank</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden md:table-cell">Company</TableHead>
                      <TableHead className="hidden md:table-cell text-center">Country</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {paginatedData.map((user) => (
                      <TableRow 
                        key={user.id} 
                        className={cn(user.id === authUser?.uid && "bg-primary/10 hover:bg-primary/20")}
                      >
                          <TableCell className="font-bold text-center text-xl">{getMedal(user.rank)}</TableCell>
                          <TableCell>
                              <Link href={`/profile/${user.username}`} className="flex items-center gap-4 group">
                                  <Avatar>
                                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                      <p className="font-medium group-hover:underline">{user.name}</p>
                                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                                  </div>
                              </Link>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                              {user.company ? (
                                  <div className="flex items-center gap-2">
                                      {user.companyLogoUrl ? (
                                          <Image
                                              src={user.companyLogoUrl}
                                              alt={user.company}
                                              width={20}
                                              height={20}
                                              className="rounded-sm object-contain"
                                          />
                                      ) : (
                                          <Building className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                      )}
                                      <span>{user.company}</span>
                                  </div>
                              ) : null}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-center">{user.country}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">{user.points.toLocaleString()}</TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
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

    </main>
  );
}
