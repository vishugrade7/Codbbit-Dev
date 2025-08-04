

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ProIconOverlay } from '@/components/pro-icon-overlay';


const VerifiedIcon = () => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500">
                    <path fillRule="evenodd" clipRule="evenodd" d="M20.53 8.34C21.0564 10.4355 20.5186 12.6843 19.0694 14.3917C17.6202 16.099 15.4332 17.0381 13.1947 16.9427C10.9562 16.8473 8.87784 15.7337 7.58153 13.921C6.28522 12.1083 5.92211 9.80371 6.61114 7.69315C7.30016 5.58259 8.94969 3.93144 11.0427 3.42416C13.1357 2.91688 15.4262 3.5986 17.0543 5.22671C18.6824 6.85482 19.8028 8.93187 19.9028 11.1704" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 10.5L12 13.5L10.5 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </TooltipTrigger>
            <TooltipContent>
                <p>Verified</p>
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


const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser, userData } = useAuth();
  const isMobile = useIsMobile();

  const [filterType, setFilterType] = useState<"Global" | "Country" | "Company">("Global");
  
  const [countryPopoverOpen, setCountryPopoverOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("points", "desc"), limit(100));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const users: LeaderboardUser[] = querySnapshot.docs
            .map((doc) => {
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
                    phoneVerified: data.phoneVerified || false,
                    razorpaySubscriptionStatus: data.razorpaySubscriptionStatus,
                    subscriptionEndDate: data.subscriptionEndDate,
                    isAdmin: data.isAdmin || false,
                };
            })
            .filter(user => !user.isAdmin); // Exclude admin users
        
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
  };
  
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
    if (filterType === "Country" && countryOptions.length > 0) {
        const selectedCountry = countryOptions[0]; // Simplified for now
        data = leaderboardData.filter(u => u.country === selectedCountry);
    } else if (filterType === "Company" && companyOptions.length > 0) {
        const selectedCompany = companyOptions[0]; // Simplified for now
        data = leaderboardData.filter(u => u.company === selectedCompany);
    }
    return data.map((user, index) => ({ ...user, rank: index + 1 }));
  }, [leaderboardData, filterType, countryOptions, companyOptions]);

  const loggedInUserRank = useMemo(() => {
      if(!authUser) return null;
      return rankedData.find(u => u.id === authUser.uid);
  }, [rankedData, authUser]);


  if (loading) {
    return (
      <main className="flex-1 container py-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <>
      <title>Leaderboard</title>
      <main className="flex-1 container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-8">
            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Leaderboard</h1>
                <p className="text-muted-foreground max-w-lg">
                    See how you rank against the top developers. Keep solving problems to climb up the ranks!
                </p>
            </div>
            {loggedInUserRank && (
                <div className="flex justify-start lg:justify-end">
                    <div className="bg-muted/50 rounded-2xl p-3 flex items-center gap-4 w-full max-w-sm">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={loggedInUserRank.avatarUrl} alt={loggedInUserRank.name} />
                            <AvatarFallback>{loggedInUserRank.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <p className="font-semibold">{loggedInUserRank.name}</p>
                            <p className="text-sm text-muted-foreground">@{loggedInUserRank.username}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">Rank</p>
                            <p className="text-lg font-bold">{loggedInUserRank.rank}</p>
                        </div>
                         <div className="text-right">
                            <p className="text-xs text-muted-foreground">Points</p>
                            <p className="text-lg font-bold">{loggedInUserRank.points}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        <div className="mb-8 flex justify-start">
            <Tabs value={filterType} onValueChange={(value) => handleFilterTypeChange(value as any)} className="w-auto">
                <TabsList>
                    <TabsTrigger value="Global">All</TabsTrigger>
                    <TabsTrigger value="Country">Country</TabsTrigger>
                    <TabsTrigger value="Company">Company</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>

        <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center">Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Company</TableHead>
                  <TableHead className="hidden sm:table-cell">Country</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedData.map((user) => (
                  <TableRow
                    key={user.id}
                    className={cn(getMedalColor(user.rank), authUser?.uid === user.id && 'bg-primary/10 hover:bg-primary/20')}
                  >
                    <TableCell className="text-center">
                      <span className="font-bold text-lg">{user.rank}</span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/profile/${user.username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                         <div className="relative">
                            <Avatar className={cn(
                                "h-10 w-10 border-2", 
                                isUserPro(user) ? "border-primary" : "border-transparent"
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
                    <TableCell className="hidden md:table-cell">
                       {user.company ? (
                           <Badge variant="secondary" className="border">
                               {user.companyLogoUrl && <Image src={user.companyLogoUrl} alt={user.company} width={16} height={16} className="mr-1.5 rounded-full object-contain"/>}
                               <span className="truncate">{user.company}</span>
                           </Badge>
                       ) : null}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{user.country === 'N/A' ? '' : user.country}</TableCell>
                    <TableCell className="text-right font-bold text-lg font-mono">{user.points.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {rankedData.length === 0 && (
               <div className="text-center py-16">
                  <h3 className="text-lg font-semibold">No users found</h3>
                  <p className="text-muted-foreground mt-1">Try adjusting your filters.</p>
              </div>
            )}
          </Card>
      </main>
    </>
  );
}
