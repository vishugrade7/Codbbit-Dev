
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import EditProfileModal from "@/components/edit-profile-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Globe, Mail, Edit, Trophy, Award, BarChart, GitCommit, User as UserIcon, Github, Linkedin, Twitter, Link as LinkIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import type { Problem, ApexProblemsData, SOQLProblemsData } from "@/types";

type StarredProblemDetail = Problem & { categoryName: string, problemType: 'apex' | 'soql' };

export default function ProfilePage() {
    const { user: authUser, userData, loading } = useAuth();
    const router = useRouter();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [starredProblems, setStarredProblems] = useState<StarredProblemDetail[]>([]);
    const [loadingStarred, setLoadingStarred] = useState(true);

    useEffect(() => {
        if (!loading && !authUser) {
            router.push('/login');
        }
    }, [authUser, loading, router]);
    
    useEffect(() => {
        const fetchStarredProblems = async () => {
            if (!authUser || !userData?.starredProblems || userData.starredProblems.length === 0) {
                setLoadingStarred(false);
                setStarredProblems([]);
                return;
            }

            setLoadingStarred(true);
            try {
                const starredIds = new Set(userData.starredProblems);
                let allDetails: StarredProblemDetail[] = [];

                // Fetch Apex problems
                const apexDocRef = doc(db, "problems", "Apex");
                const apexDocSnap = await getDoc(apexDocRef);
                if (apexDocSnap.exists()) {
                    const categoriesData = apexDocSnap.data().Category as ApexProblemsData;
                    const apexProblems = Object.entries(categoriesData).flatMap(([categoryName, categoryData]) => 
                        (categoryData.Questions || []).map(problem => ({ ...problem, categoryName, problemType: 'apex' as const }))
                    );
                    allDetails.push(...apexProblems.filter(p => starredIds.has(p.id)));
                }

                // Fetch SOQL problems
                const soqlDocRef = doc(db, "problems", "SOQL");
                const soqlDocSnap = await getDoc(soqlDocRef);
                 if (soqlDocSnap.exists()) {
                    const categoriesData = soqlDocSnap.data().Category as SOQLProblemsData;
                    const soqlProblems = Object.entries(categoriesData).flatMap(([categoryName, categoryData]) => 
                        (categoryData.Questions || []).map(problem => ({ ...problem, categoryName, problemType: 'soql' as const }))
                    );
                    allDetails.push(...soqlProblems.filter(p => starredIds.has(p.id)));
                }
                
                // Sort to maintain a consistent order
                allDetails.sort((a,b) => a.title.localeCompare(b.title));
                setStarredProblems(allDetails);

            } catch (error) {
                console.error("Error fetching starred problems:", error);
            } finally {
                setLoadingStarred(false);
            }
        };

        if (userData) {
            fetchStarredProblems();
        }
    }, [authUser, userData]);

    const user = userData;

    if (loading || !authUser || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const stats = [
        { label: "Points", value: user.points.toLocaleString() },
        { label: "Global Rank", value: `#${user.rank}` },
        { label: "Problems Solved", value: user.solvedProblems?.length || 0 }, 
        { label: "Solutions Submitted", value: "342" }, // static for now
    ];

    const iconMap: { [key: string]: React.ElementType } = {
        Trophy,
        Award,
        BarChart,
        GitCommit,
    };
    
    const getDifficultyClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
        case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
        case 'medium': return 'bg-primary/20 text-primary border-primary/30';
        case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
        default: return 'bg-muted';
        }
    };

  return (
    <>
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
                            <span>{user.company || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            <span>{user.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            <span>{authUser.email}</span>
                        </div>
                    </div>
                     <div className="mt-6 flex justify-center md:justify-start gap-2">
                        {user.trailheadUrl && (<Button variant="outline" size="icon" asChild><a href={user.trailheadUrl} target="_blank" rel="noopener noreferrer" aria-label="Trailhead Profile"><LinkIcon className="h-5 w-5" /></a></Button>)}
                        {user.githubUrl && (<Button variant="outline" size="icon" asChild><a href={user.githubUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub Profile"><Github className="h-5 w-5" /></a></Button>)}
                        {user.linkedinUrl && (<Button variant="outline" size="icon" asChild><a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Profile"><Linkedin className="h-5 w-5" /></a></Button>)}
                        {user.twitterUrl && (<Button variant="outline" size="icon" asChild><a href={user.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitter Profile"><Twitter className="h-5 w-5" /></a></Button>)}
                    </div>
                </div>
                <Button variant="outline" onClick={() => setIsEditModalOpen(true)}><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>
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
                          {user.achievements.length > 0 ? user.achievements.map((achievement) => {
                                const Icon = iconMap[achievement.icon] || UserIcon;
                                return (
                                <div key={achievement.id} className="flex flex-col items-center text-center gap-2 p-4 rounded-lg bg-card/50">
                                    <Icon className="h-10 w-10 text-primary" />
                                    <h3 className="font-semibold">{achievement.name}</h3>
                                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                                </div>
                                )
                            }) : (
                                <p className="text-muted-foreground col-span-full text-center">No achievements yet. Keep coding!</p>
                            )}
                      </CardContent>
                  </Card>

                  <Card className="mt-8">
                    <CardHeader>
                        <CardTitle>Starred Problems</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingStarred ? (
                            <div className="flex justify-center items-center h-24">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : starredProblems.length > 0 ? (
                            <div className="space-y-2">
                                {starredProblems.map(problem => (
                                    <Link key={problem.id} href={`/problems/${problem.problemType}/${encodeURIComponent(problem.categoryName)}/${problem.id}`} className="block">
                                        <div className="flex items-center justify-between p-3 rounded-md hover:bg-card/50 transition-colors">
                                           <div className="flex items-center gap-3">
                                                <Badge variant="secondary" className="w-16 justify-center">{problem.problemType.toUpperCase()}</Badge>
                                                <span className="font-medium">{problem.title}</span>
                                           </div>
                                            <Badge variant="outline" className={getDifficultyClass(problem.difficulty)}>
                                                {problem.difficulty}
                                            </Badge>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">
                                Star problems in the workspace to see them here.
                            </p>
                        )}
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
    <EditProfileModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} user={user} />
    </>
  );
}
