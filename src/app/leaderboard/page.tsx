"use client";

import { useState } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { leaderboardData, mockUser } from "@/lib/data";
import type { LeaderboardUser } from "@/types";
import { Trophy } from "lucide-react";

export default function LeaderboardPage() {
  const [filter, setFilter] = useState("Global");

  // TODO: Replace with actual data fetching and filtering logic
  const filteredData = leaderboardData;
  const currentUser = mockUser;

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
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
            <Card className="mb-8 bg-card/50">
                <CardHeader>
                    <CardTitle>Your Rank</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
                        <div className="flex items-center gap-4">
                            <div className="text-2xl font-bold w-12 text-center">#{currentUser.rank}</div>
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

            <div className="flex justify-center gap-2 mb-8">
              <Button variant={filter === "Global" ? "default" : "outline"} onClick={() => setFilter("Global")}>Global</Button>
              <Button variant={filter === "Country" ? "default" : "outline"} onClick={() => setFilter("Country")}>Country</Button>
            </div>

            <Card>
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
                    <TableRow key={user.id}>
                      <TableCell className="font-bold text-lg text-center">#{user.rank}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">{user.company || 'N/A'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.country}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{user.points.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
