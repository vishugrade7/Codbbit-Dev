"use client";

import { useParams } from 'next/navigation';
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockUser } from "@/lib/data";
import { Building, Globe, Mail, Trophy, Award, BarChart, GitCommit, User as UserIcon } from "lucide-react";

// Mock data fetching
const getUserData = (username: string) => {
  console.log("Fetching data for:", username);
  // In a real app, you would fetch this data from your backend
  return mockUser;
};

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const user = getUserData(username);

  const stats = [
    { label: "Points", value: user.points.toLocaleString() },
    { label: "Rank", value: `#${user.rank}` },
    { label: "Problems Solved", value: "128" }, // static
    { label: "Solutions Submitted", value: "342" }, // static
  ];
  
  const iconMap: { [key: string]: React.ElementType } = {
    Trophy,
    Award,
    BarChart,
    GitCommit,
  };


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
          <Card className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <Avatar className="h-32 w-32 border-4 border-primary">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="text-4xl">
                    {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-4xl font-bold font-headline">{user.name}</h1>
                    <p className="text-lg text-muted-foreground">@{user.username}</p>
                    <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            <span>{user.company}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            <span>{user.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            <span>{user.email}</span>
                        </div>
                    </div>
                </div>
                <Button>Follow</Button>
            </div>
          </Card>
          
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                  <Card>
                      <CardHeader>
                          <CardTitle>Contribution Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                          {/* Placeholder for contribution graph */}
                          <div className="w-full h-40 bg-card-foreground/5 rounded flex items-center justify-center">
                              <p className="text-muted-foreground">Contribution graph coming soon</p>
                          </div>
                      </CardContent>
                  </Card>
                  
                  <Card className="mt-8">
                      <CardHeader>
                          <CardTitle>Achievements</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {user.achievements.map((achievement) => {
                            const Icon = iconMap[achievement.icon] || UserIcon;
                            return (
                               <div key={achievement.id} className="flex flex-col items-center text-center gap-2 p-4 rounded-lg bg-card/50">
                                  <Icon className="h-10 w-10 text-primary" />
                                  <h3 className="font-semibold">{achievement.name}</h3>
                                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                              </div>
                            )
                          })}
                      </CardContent>
                  </Card>
              </div>

              <div>
                  <Card>
                      <CardHeader>
                          <CardTitle>Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          {stats.map(stat => (
                              <div key={stat.label} className="flex justify-between items-center p-3 rounded-md bg-card/50">
                                  <span className="text-muted-foreground">{stat.label}</span>
                                  <span className="font-bold text-lg">{stat.value}</span>
                              </div>
                          ))}
                      </CardContent>
                  </Card>
              </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
