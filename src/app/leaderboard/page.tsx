
"use client";

import type { Metadata } from 'next';
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
import { useIsMobile } from "@/hooks/use-mobile";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Building, Trophy, Globe, BookOpen, ArrowRight, Star, ChevronsUpDown, Check, Code, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


const VerifiedIcon = () => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger>
                 <svg
                    viewBox="0 0 22 22"
                    aria-label="Verified account"
                    role="img"
                    className="w-5 h-5 fill-current text-blue-500"
                    fill="currentColor"
                >
                   <g>
                     <path d="M20.69,8.69,19.28,7.28a1,1,0,0,0-1.42,0l-6.15,6.15L8,9.72a1,1,0,0,0-1.42,0L5.16,11.14a1,1,0,0,0,0,1.42l5.4,5.4a1,1,0,0,0,1.42,0l8.71-8.71A1,1,0,0,0,20.69,8.69Z" stroke="none"></path>
                   </g>
                </svg>
            </TooltipTrigger>
            <TooltipContent>
                <p>Verified</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const ProIconOverlay = () => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 flex items-center justify-center">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="#FDB813"/>
                        <path d="M10.5 9.5L8 12L10.5 14.5" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.5 9.5L17 12L14.5 14.5" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>Pro User</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);


type ProblemWithCategory = Problem & { categoryName: string };

const getMedalColor = (rank: number) => {
  if (rank === 1) return 'bg-yellow-400/10 hover:bg-yellow-400/20 border-yellow-400/20';
  if (rank === 2) return 'bg-slate-400/10 hover:bg-slate-400/20 border-slate-400/20';
  if (rank === 3) return 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-400/20';
  return 'hover:bg-muted/50';
};

const getPodiumClass = (rank: number) => {
    if (rank === 1) return 'border-yellow-400/50 bg-yellow-400/10';
    if (rank === 2) return 'border-slate-400/50 bg-slate-400/10';
    if (rank === 3) return 'border-orange-500/50 bg-orange-400/10';
    return 'border-border';
}

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser, userData } = useAuth();
  const isMobile = useIsMobile();

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

        const processData = (data: ApexProblemsData | null) => {
            if (!data) return;
            const problems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
            );
            setAllProblems(problems);
        };
        
        const cachedData = await getCache<ApexProblemsData>(APEX_PROBLEMS_CACHE_KEY);
        if (cachedData) {
            processData(cachedData);
            return;
        }

        try {
            const apexDocRef = doc(db, "problems", "Apex");
            const problemsSnap = await getDoc(apexDocRef);
            if (problemsSnap.exists()) {
                const data = problemsSnap.data().Category as ApexProblemsData;
                await setCache(APEX_PROBLEMS_CACHE_KEY, data);
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
                companyLogoUrl: data.companyLogoUrl || '',
                emailVerified: data.emailVerified || false,
                razorpaySubscriptionStatus: data.razorpaySubscriptionStatus,
                subscriptionEndDate: data.subscriptionEndDate,
                isAdmin: data.isAdmin || false,
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
    setFilterValue(value);
  }

  const isUserPro = (user: LeaderboardUser) => {
    if (!user) return false;
    const isAdmin = user.isAdmin || false;
    const status = user.razorpaySubscriptionStatus;
    const endDate = user.subscriptionEndDate?.toDate();
    const hasActiveSub = status === 'active' && endDate && new Date() < endDate;
    return isAdmin || hasActiveSub;
  };

  const rankedData = useMemo(() => {
    let data = leaderboardData;
    if (filterType === "Country" && filterValue) {
        data = leaderboardData.filter(u => u.country === filterValue);
    } else if (filterType === "Company" && filterValue) {
        data = leaderboardData.filter(u => u.company === filterValue);
    }
    return data.map((user, index) => ({ ...user, rank: index + 1 }));
  }, [leaderboardData, filterType, filterValue]);

  const podiumData = useMemo(() => rankedData.slice(0, 3), [rankedData]);
  const tableData = useMemo(() => rankedData.slice(3), [rankedData]);

  if (loading) {
    return (
      <main className="flex-1 container py-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }

  const PodiumCard = ({ user, rank }: { user: LeaderboardUser, rank: number }) => {
     const heightClass = rank === 1 ? 'h-full' : rank === 2 ? 'h-[90%]' : 'h-[80%]';
     const rankColors = {
        1: { border: 'border-yellow-400', bg: 'bg-yellow-400/10', text: 'text-yellow-400', crown: 'text-yellow-400' },
        2: { border: 'border-slate-400', bg: 'bg-slate-400/10', text: 'text-slate-400', crown: 'text-slate-400' },
        3: { border: 'border-orange-500', bg: 'bg-orange-400/10', text: 'text-orange-500', crown: 'text-orange-500' }
     }[rank] || { border: 'border-border', bg: 'bg-muted/50', text: 'text-muted-foreground', crown: 'text-muted-foreground' };

     return (
        <div className={cn('relative w-full flex flex-col items-center justify-end', heightClass)}>
            <Card className={cn("w-full text-center p-4 border-2 relative overflow-visible", rankColors.border, rankColors.bg)}>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                    <div className="relative">
                        <Link href={`/profile/${user.username}`} target="_blank" rel="noopener noreferrer">
                            <Avatar className={cn("h-16 w-16 border-4", rankColors.border)}>
                                <AvatarImage src={user.avatarUrl} alt={user.name} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </Link>
                        {isUserPro(user) && <ProIconOverlay />}
                         <div className="absolute -top-3 -right-3">
                           <Crown className={cn("h-6 w-6 rotate-12", rankColors.crown)} />
                         </div>
                    </div>
                </div>
                 <div className="absolute top-2 left-2">
                    <div className={cn('h-8 w-8 rounded-full flex items-center justify-center font-bold text-lg', rankColors.bg, rankColors.text, 'border-2', rankColors.border)}>
                        {rank}
                    </div>
                 </div>
                <div className="pt-10">
                    <Link href={`/profile/${user.username}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline text-lg">{user.name}</Link>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                    <p className="font-bold text-2xl mt-2">{user.points.toLocaleString()} pts</p>
                </div>
            </Card>
        </div>
     );
  };

  return (
    <>
      <title>Leaderboard</title>
      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Leaderboard</h1>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                See how you rank against the top developers. Keep solving problems to climb up the ranks!
            </p>
        </div>
        
        <div className="mb-12 grid grid-cols-1 md:grid-cols-3 items-end gap-4 h-64 md:h-72">
            <div className="h-full w-full">{podiumData[1] && <PodiumCard user={podiumData[1]} rank={2}/>}</div>
            <div className="h-full w-full">{podiumData[0] && <PodiumCard user={podiumData[0]} rank={1}/>}</div>
            <div className="h-full w-full">{podiumData[2] && <PodiumCard user={podiumData[2]} rank={3}/>}</div>
        </div>

        <div className="mb-8 flex flex-col md:flex-row justify-center items-center gap-4">
            <Tabs value={filterType} onValueChange={(value) => handleFilterTypeChange(value as any)} className="w-auto">
                <TabsList>
                    <TabsTrigger value="Global" layoutId="leaderboard-filter-tabs">Global</TabsTrigger>
                    <TabsTrigger value="Country" layoutId="leaderboard-filter-tabs">By Country</TabsTrigger>
                    <TabsTrigger value="Company" layoutId="leaderboard-filter-tabs">By Company</TabsTrigger>
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
                    <ScrollArea className="h-auto max-h-[200px]">
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
                  <ScrollArea className="h-auto max-h-[200px]">
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

          <div className={cn("rounded-lg border", isMobile && "border-x-0 -mx-8 px-[2px]")}>
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
                {tableData.map((user) => (
                  <TableRow
                    key={user.id}
                    className={cn(getMedalColor(user.rank))}
                  >
                    <TableCell className="text-center">
                      <span className="font-bold text-lg">{user.rank}</span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/profile/${user.username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                         <div className="relative">
                            <Avatar className={cn(
                                "h-10 w-10 border-2", 
                                isUserPro(user) ? "border-yellow-400" : "border-transparent"
                            )}>
                              <AvatarImage src={user.avatarUrl} alt={user.name} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {isUserPro(user) && <ProIconOverlay />}
                         </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                              <p className="font-semibold group-hover:underline">{user.name}</p>
                               {user.emailVerified && <VerifiedIcon />}
                          </div>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                       {user.company ? (
                           <Badge variant="secondary">
                               {user.companyLogoUrl && <Image src={user.companyLogoUrl} alt={user.company} width={16} height={16} className="mr-1.5 rounded-full object-contain"/>}
                               <span className="truncate">{user.company}</span>
                           </Badge>
                       ) : null}
                    </TableCell>
                    <TableCell>{user.country === 'N/A' ? '' : user.country}</TableCell>
                    <TableCell className="text-right font-bold text-lg font-mono">{user.points.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

        {rankedData.length === 0 && (
           <div className="text-center py-16">
              <h3 className="text-lg font-semibold">No users found</h3>
              <p className="text-muted-foreground mt-1">Try adjusting your filters.</p>
          </div>
        )}

      </main>
    </>
  );
}
