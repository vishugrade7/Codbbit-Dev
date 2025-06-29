"use client";

import { useState, useEffect } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { LeaderboardUser } from "@/types";
import { Trophy, Loader2 } from "lucide-react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

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
            points: data.points,
            country: data.country,
            company: data.company,
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

  const filteredData = filter === "Global" 
    ? leaderboard 
    : leaderboard.filter(user => user.country === userData?.country);

  const currentUser = userData;
  const currentUserRank = leaderboard.find(u => u.id === currentUser?.uid)?.rank;

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
          
          <div className="mx-auto max-w-4xl py-12">
            {currentUser && (
              <Card className="mb-8 bg-card/50">
                  <CardHeader>
                      <CardTitle>Your Rank</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
                          <div className="flex items-center gap-4">
                              <div className="text-2xl font-bold w-12 text-center">
                                  {currentUserRank ? `#${currentUserRank}` : '-'}
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
