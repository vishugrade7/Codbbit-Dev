
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LeaderboardUser } from "@/types";
import { Loader2, Building, Flame, ListFilter, Globe } from "lucide-react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

// Helper component for displaying company info with logo
const CompanyInfo = ({ user }: { user: LeaderboardUser }) => {
    const [logoError, setLogoError] = useState(false);

    useEffect(() => {
        setLogoError(false);
    }, [user.companyLogoUrl]);

    if (!user.company) {
        return <span className="text-muted-foreground">-</span>;
    }

    return (
        <div className="flex items-center gap-2">
            {user.companyLogoUrl && !logoError ? (
                 <Image
                    src={user.companyLogoUrl}
                    alt={user.company}
                    width={20}
                    height={20}
                    className="rounded-sm"
                    onError={() => setLogoError(true)}
                />
            ) : (
                <Building className="h-5 w-5 text-muted-foreground" />
            )}
            <span>{user.company}</span>
        </div>
    );
};


export default function LeaderboardPage() {
  const { userData } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState<'company' | 'country'>('company');
  const [selectedValue, setSelectedValue] = useState<string>('All Institutions');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("points", "desc"));
        
        const querySnapshot = await getDocs(q);
        const users: LeaderboardUser[] = [];
        querySnapshot.forEach((doc, index) => {
          const data = doc.data();
          users.push({
            id: doc.id,
            rank: index + 1,
            name: data.name,
            username: data.username,
            avatarUrl: data.avatarUrl,
            points: data.points || 0,
            country: data.country,
            company: data.company,
            companyLogoUrl: data.companyLogoUrl,
          });
        });
        
        setLeaderboard(users);
      } catch (error) {
        console.error("Failed to fetch leaderboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const companies = useMemo(() => {
    const companySet = new Set(leaderboard.map(user => user.company).filter(Boolean) as string[]);
    return ['All Institutions', ...Array.from(companySet).sort()];
  }, [leaderboard]);

  const countries = useMemo(() => {
      const countrySet = new Set(leaderboard.map(user => user.country).filter(Boolean) as string[]);
      return ['All Countries', ...Array.from(countrySet).sort()];
  }, [leaderboard]);
  
  const handleFilterTypeChange = (value: 'company' | 'country') => {
      setFilterType(value);
      setSelectedValue(value === 'company' ? 'All Institutions' : 'All Countries');
  };

  const valueOptions = filterType === 'company' ? companies : countries;


  const filteredData = useMemo(() => {
    let data = leaderboard;
    if (selectedValue !== 'All Institutions' && selectedValue !== 'All Countries') {
        if (filterType === 'company') {
            data = leaderboard.filter(user => user.company === selectedValue);
        } else if (filterType === 'country') {
            data = leaderboard.filter(user => user.country === selectedValue);
        }
    }

    return data.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
  }, [leaderboard, filterType, selectedValue]);

  const currentUser = userData;
  const currentUserInFilteredList = filteredData.find(u => u.id === currentUser?.uid);
  
  const getUserInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('') || '';
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container px-4 md:px-6 py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-2">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl font-headline">Global Coders</h1>
                <p className="text-4xl font-light tracking-widest text-muted-foreground sm:text-5xl">LEADERBOARD</p>
                <p className="text-muted-foreground md:text-lg/relaxed pt-2">
                    Ranking of top coders based on their accumulated points.
                </p>
            </div>
             <div className="lg:col-span-1">
                {currentUser && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Position</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <div className="flex items-center gap-4">
                          <Avatar>
                              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                              <AvatarFallback>{getUserInitials(currentUser.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                              <div className="font-semibold">{currentUser.name}</div>
                              <div className="text-sm text-muted-foreground truncate">@{currentUser.username}</div>
                          </div>
                          <div className="text-right">
                              <div className="font-bold text-primary flex items-center gap-1 justify-end">
                                <Flame className="h-4 w-4 text-amber-400" />
                                <span>{currentUser.points.toLocaleString()}</span>
                              </div>
                              {currentUserInFilteredList ? (
                                  <div className="text-lg font-bold">#{currentUserInFilteredList.rank}</div>
                              ) : (
                                  <div className="text-sm text-muted-foreground">Not in filter</div>
                              )}
                          </div>
                        </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          </div>
          
          <div className="mt-12">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Filters</h2>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Select value={filterType} onValueChange={(v) => handleFilterTypeChange(v as 'company' | 'country')}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <div className="flex items-center gap-2">
                    <ListFilter className="h-4 w-4" />
                    <SelectValue placeholder="Filter by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Institution</SelectItem>
                  <SelectItem value="country">Country</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedValue} onValueChange={setSelectedValue} disabled={valueOptions.length <= 1}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <div className="flex items-center gap-2">
                      {filterType === 'company' ? <Building className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                      <SelectValue placeholder={`Select ${filterType}`} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {valueOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Card>
              {loading ? (
                <div className="flex justify-center items-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((user: LeaderboardUser) => (
                      <TableRow key={user.id} className={user.id === currentUser?.uid ? 'bg-primary/10' : ''}>
                        <TableCell className="font-bold text-lg text-center">#{user.rank}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatarUrl} alt={user.name} />
                              <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">@{user.username}</div>
                            </div>
                          </div>
                        </TableCell>
                         <TableCell>
                           <CompanyInfo user={user} />
                        </TableCell>
                        <TableCell>{user.country}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{user.points.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

