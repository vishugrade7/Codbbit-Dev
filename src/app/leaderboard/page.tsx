
"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { LeaderboardUser } from "@/types";
import { Trophy, Loader2, Building } from "lucide-react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

// Helper component for displaying company info with logo
const CompanyInfo = ({ user }: { user: LeaderboardUser }) => {
    const [logoError, setLogoError] = useState(false);

    useEffect(() => {
        // Reset error state if user/logo changes
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
  const [filter, setFilter] = useState("Global");
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

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

  const filteredData = useMemo(() => {
    let data: LeaderboardUser[];
    switch (filter) {
      case "Country":
        data = leaderboard.filter((user) => user.country === userData?.country);
        break;
      case "Company":
        data = leaderboard.filter((user) => user.company && user.company === userData?.company);
        break;
      case "Global":
      default:
        data = leaderboard;
        break;
    }

    // Re-rank the data based on the current filter context
    return data.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));
  }, [leaderboard, filter, userData]);


  const currentUser = userData;
  // The rank in the "Your Rank" card should always be the global rank.
  const currentUserGlobalRank = leaderboard.find(u => u.id === currentUser?.uid)?.rank;


  const getUserInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('') || '';
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container px-4 md:px-6 py-12 md:py-24 lg:py-32">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <Trophy className="h-16 w-16 text-primary" />
            <div className="space-y-2">
              <h1 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl text-primary">Leaderboard</h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                See who is at the top of the Codbbit world.
              </p>
            </div>
          </div>
          
          <div className="mx-auto max-w-5xl py-12">
            {currentUser && (
              <Card className="mb-8 bg-card/50">
                  <CardHeader>
                      <CardTitle>Your Global Rank</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
                          <div className="flex items-center gap-4">
                              <div className="text-2xl font-bold w-12 text-center">
                                  {currentUserGlobalRank ? `#${currentUserGlobalRank}` : '-'}
                              </div>
                              <Avatar>
                                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                                  <AvatarFallback>{getUserInitials(currentUser.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <div className="font-semibold">{currentUser.name}</div>
                                  <div className="text-sm text-muted-foreground">{currentUser.country}</div>
                              </div>
                          </div>
                          <div className="text-2xl font-bold text-primary">{currentUser.points.toLocaleString()} pts</div>
                      </div>
                  </CardContent>
              </Card>
            )}

            <div className="flex justify-center gap-2 mb-8">
              <Button variant={filter === "Global" ? "default" : "outline"} onClick={() => setFilter("Global")}>Global</Button>
              <Button variant={filter === "Country" ? "default" : "outline"} onClick={() => setFilter("Country")} disabled={!userData}>Country</Button>
              <Button variant={filter === "Company" ? "default" : "outline"} onClick={() => setFilter("Company")} disabled={!userData || !userData.company}>Company</Button>
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
