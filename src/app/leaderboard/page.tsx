
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
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Building, Trophy, Globe, BookOpen, ArrowRight, Star, ChevronsUpDown, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


type ProblemWithCategory = Problem & { categoryName: string };

const getMedalColor = (rank: number) => {
  if (rank === 1) return 'bg-yellow-400/10 hover:bg-yellow-400/20';
  if (rank === 2) return 'bg-slate-400/10 hover:bg-slate-400/20';
  if (rank === 3) return 'bg-orange-500/10 hover:bg-orange-500/20';
  return '';
};

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const { user: authUser, userData } = useAuth();
  const router = useRouter();

  const [filterType, setFilterType] = useState<"Global" | "Country" | "Company">("Global");
  const [filterValue, setFilterValue] = useState<string | null>(null);

  const [allProblems, setAllProblems] = useState<ProblemWithCategory[]>([]);
  const [suggestedProblem, setSuggestedProblem] = useState<ProblemWithCategory | null>(null);
  
  const [countryPopoverOpen, setCountryPopoverOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  
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
            setSuggestedProblem(unsolvedProblems[0]);
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
  
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countryOptions;
    return countryOptions.filter(country =>
      country.toLowerCase().includes(countrySearch.toLowerCase())
    );
  }, [countryOptions, countrySearch]);

  const filteredCompanies = useMemo(() => {
    if (!companySearch) return companyOptions;
    return companyOptions.filter(company =>
      company.toLowerCase().includes(companySearch.toLowerCase())
    );
  }, [companyOptions, companySearch]);

  const handleFilterTypeChange = (value: "Global" | "Country" | "Company") => {
    setFilterType(value);
    setCurrentPage(1);
    setCountrySearch('');
    setCompanySearch('');
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
                  <div className="flex justify-between items-start flex-grow">
                      <Link href={`/profile/${currentUserEntry.username}`} className="flex items-start gap-4 group">
                          <Avatar className="h-12 w-12 border-2 border-primary">
                              <AvatarImage src={currentUserEntry.avatarUrl} alt={currentUserEntry.name} />
                              <AvatarFallback>{currentUserEntry.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                              <p className="font-semibold text-lg group-hover:underline">{currentUserEntry.name}</p>
                              <p className="text-sm text-muted-foreground">@{currentUserEntry.username}</p>
                               {currentUserEntry.company && (
                                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                                    {currentUserEntry.companyLogoUrl ? (
                                        <Image src={currentUserEntry.companyLogoUrl} alt={`${currentUserEntry.company} logo`} width={14} height={14} className="rounded-sm object-contain"/>
                                    ) : (
                                        <Building className="h-3.5 w-3.5" />
                                    )}
                                    <span>{currentUserEntry.company}</span>
                                </div>
                              )}
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
                   {currentUserEntry.rank > 1 && leaderboardData.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-primary/20 text-center">
                          <p className="text-sm text-muted-foreground">
                              You are <span className="font-bold text-foreground">{(leaderboardData[0].points - currentUserEntry.points).toLocaleString()}</span> points away from rank 1!
                          </p>
                      </div>
                  )}
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
              <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full md:w-[220px] justify-between">
                    {filterValue || "Select a country..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0">
                  <div className="p-2">
                    <Input placeholder="Search country..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} />
                  </div>
                  <ScrollArea className="h-[200px]">
                    {filteredCountries.length === 0 && <p className="p-2 text-center text-sm text-muted-foreground">No country found.</p>}
                    {filteredCountries.map(country => (
                      <Button
                        key={country}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          handleFilterValueChange(country);
                          setCountryPopoverOpen(false);
                          setCountrySearch('');
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", filterValue === country ? "opacity-100" : "opacity-0")} />
                        {country}
                      </Button>
                    ))}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
          )}

          {filterType === "Company" && (
            <Popover open={companyPopoverOpen} onOpenChange={setCompanyPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full md:w-[220px] justify-between">
                  {filterValue || "Select a company..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0">
                <div className="p-2">
                  <Input placeholder="Search company..." value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} />
                </div>
                <ScrollArea className="h-[200px]">
                  {filteredCompanies.length === 0 && <p className="p-2 text-center text-sm text-muted-foreground">No company found.</p>}
                  {filteredCompanies.map(company => (
                    <Button
                      key={company}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        handleFilterValueChange(company);
                        setCompanyPopoverOpen(false);
                        setCompanySearch('');
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", filterValue === company ? "opacity-100" : "opacity-0")} />
                      {company}
                    </Button>
                  ))}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}
      </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] text-center">Rank</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((user) => (
                <TableRow
                  key={user.id}
                  className={cn("cursor-pointer", getMedalColor(user.rank))}
                  onClick={() => router.push(`/profile/${user.username}`)}
                >
                  <TableCell className="text-center">
                    <span className="font-bold text-lg">{user.rank}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.company && (
                          <>
                            {user.companyLogoUrl ? (
                                <Image src={user.companyLogoUrl} alt={user.company} width={16} height={16} className="rounded-sm object-contain"/>
                            ) : ( <Building className="h-4 w-4" /> )}
                            <span>{user.company}</span>
                          </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.country === 'N/A' ? '' : user.country}</TableCell>
                  <TableCell className="text-right font-bold text-lg font-mono">{user.points.toLocaleString()}</TableCell>
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

      {paginatedData.length === 0 && (
         <div className="text-center py-16">
            <h3 className="text-lg font-semibold">No users found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your filters.</p>
        </div>
      )}

    </main>
  );
}
