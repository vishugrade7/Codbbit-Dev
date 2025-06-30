
"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LeaderboardUser } from "@/types";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Building } from "lucide-react";

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
            rank: index + 1,
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

  const totalPages = Math.ceil(leaderboardData.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return leaderboardData.slice(startIndex, endIndex);
  }, [currentPage, leaderboardData]);

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
                        <TableRow key={user.id}>
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
