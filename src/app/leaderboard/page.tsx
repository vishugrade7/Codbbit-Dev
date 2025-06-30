
"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LeaderboardUser } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building, Trophy, Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";


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
  const { user: authUser } = useAuth();

  const [filterType, setFilterType] = useState<"Global" | "Country" | "Company">("Global");
  const [filterValue, setFilterValue] = useState<string | null>(null);

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
            username: data.username || 'N/A',
            avatarUrl: data.avatarUrl || '',
            points: data.points || 0,
            country: data.country || 'N/A',
            company: data.company || 'N/A',
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
    const companies = new Set(leaderboardData.map(u => u.company).filter(c => c && c !== 'N/A'));
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

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <main className="flex-1 container py-8 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Leaderboard</h1>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                See how you rank against the best Salesforce developers in the world. Keep solving problems to climb up the ranks!
            </p>
        </div>

        {currentUserEntry && (
          <Card className="mb-8 bg-primary/10 border-primary/20 shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-[250px]">
                  <div className="font-bold text-center text-xl w-12 flex items-center justify-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-400" />
                    <span>{currentUserEntry.rank}</span>
                  </div>
                  <Avatar className="h-12 w-12 border-2 border-primary">
                    <AvatarImage src={currentUserEntry.avatarUrl} alt={currentUserEntry.name} />
                    <AvatarFallback>{currentUserEntry.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">{currentUserEntry.name}</p>
                    <p className="text-sm text-muted-foreground">@{currentUserEntry.username}</p>
                     <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {currentUserEntry.company && currentUserEntry.company !== 'N/A' && (
                            <div className="flex items-center gap-1.5">
                                <Building className="h-4 w-4" />
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
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-xl">{currentUserEntry.points.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1">
                <Label htmlFor="filter-type" className="text-xs text-muted-foreground">SCOPE</Label>
                <Select
                    value={filterType}
                    onValueChange={(value: "Global" | "Country" | "Company") => setFilterType(value)}
                >
                    <SelectTrigger id="filter-type" className="mt-1">
                        <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Global">Global</SelectItem>
                        <SelectItem value="Country">By Country</SelectItem>
                        <SelectItem value="Company">By Company</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {filterType === "Country" && (
                <div className="flex-1">
                    <Label htmlFor="country-filter" className="text-xs text-muted-foreground">COUNTRY</Label>
                    <Select
                        value={filterValue ?? ''}
                        onValueChange={(value) => setFilterValue(value)}
                        disabled={countryOptions.length === 0}
                    >
                        <SelectTrigger id="country-filter" className="mt-1">
                            <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                        <SelectContent>
                            {countryOptions.map(country => (
                                <SelectItem key={country} value={country}>{country}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {filterType === "Company" && (
                <div className="flex-1">
                    <Label htmlFor="company-filter" className="text-xs text-muted-foreground">COMPANY</Label>
                    <Select
                        value={filterValue ?? ''}
                        onValueChange={(value) => setFilterValue(value)}
                        disabled={companyOptions.length === 0}
                    >
                        <SelectTrigger id="company-filter" className="mt-1">
                            <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                        <SelectContent>
                            {companyOptions.map(company => (
                                <SelectItem key={company} value={company}>{company}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
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
                            <TableCell className="font-bold text-center text-lg">{getMedal(user.rank)}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                                <div className="flex items-center gap-2">
                                    {user.companyLogoUrl ? (
                                        <Image
                                            src={user.companyLogoUrl}
                                            alt={user.company || 'Company logo'}
                                            width={20}
                                            height={20}
                                            className="rounded-sm object-contain"
                                        />
                                    ) : (user.company && user.company !== 'N/A') ? (
                                        <Building className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    ) : null}
                                    <span>{user.company}</span>
                                </div>
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
      <Footer />
    </div>
  );
}
