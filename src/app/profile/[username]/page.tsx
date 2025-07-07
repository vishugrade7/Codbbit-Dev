

"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import EditProfileModal from "@/components/edit-profile-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, Globe, Mail, Edit, Award, GitCommit, User as UserIcon, Github, Linkedin, Twitter, Link as LinkIcon, LoaderCircle, Pencil, PieChart as PieChartIcon, Star, Target, History } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc, collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import type { Problem, ApexProblemsData, User as AppUser, Achievement, SolvedProblemDetail as SolvedProblemType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfilePicture } from "@/app/profile/actions";
import { PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import ContributionHeatmap from "@/components/contribution-heatmap";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from 'date-fns';


type RecentlySolvedProblem = SolvedProblemType & { id: string };


// This is the new public profile page
export default function UserProfilePage() {
    const { user: authUser, userData } = useAuth(); // Logged-in user
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const username = params.username as string;

    const [profileUser, setProfileUser] = useState<AppUser | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect to fetch the profile data based on username from URL using a real-time listener
    useEffect(() => {
        if (!username || !db) return;

        setLoadingProfile(true);
        setError(null);
        
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username), limit(1));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setLoadingProfile(false);
            if (querySnapshot.empty) {
                setError("Profile not found.");
                setProfileUser(null);
            } else {
                const userDoc = querySnapshot.docs[0];
                setProfileUser({ id: userDoc.id, ...userDoc.data() } as AppUser);
                setError(null);
            }
        }, (err) => {
            console.error("Error fetching user profile:", err);
            setError("Could not load profile data.");
            setLoadingProfile(false);
        });

        return () => unsubscribe();
    }, [username]);
    
    const recentlySolvedProblems = useMemo(() => {
        if (!profileUser?.solvedProblems) return [];

        const solvedDetails: RecentlySolvedProblem[] = Object.entries(profileUser.solvedProblems).map(([id, details]) => ({
            id,
            ...details,
        }));

        solvedDetails.sort((a, b) => {
            const dateA = a.solvedAt?.toDate ? a.solvedAt.toDate() : new Date(0);
            const dateB = b.solvedAt?.toDate ? b.solvedAt.toDate() : new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
        
        return solvedDetails.slice(0, 5);
    }, [profileUser?.solvedProblems]);


    const handleAvatarClick = () => {
        if (!isUploading) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !authUser || !profileUser) return;
        if (authUser.uid !== profileUser.uid) return;

        if (!file.type.startsWith('image/')) {
            toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image.' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ variant: 'destructive', title: 'File Too Large', description: 'Please select an image smaller than 5MB.' });
            return;
        }

        setIsUploading(true);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                const dataUrl = reader.result as string;
                const result = await updateUserProfilePicture(authUser.uid, dataUrl);
                
                if (result.success) {
                    toast({ title: 'Avatar updated successfully!' });
                } else {
                    throw new Error(result.error || 'An unknown server error occurred.');
                }
            } catch (error: any) {
                toast({
                    variant: 'destructive',
                    title: 'Upload Failed',
                    description: error.message,
                });
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
        reader.onerror = () => {
            setIsUploading(false);
            toast({
                variant: 'destructive',
                title: 'File Read Error',
                description: 'Could not read the selected file.',
            });
        }
    };


    if (loadingProfile) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error) {
        return (
            <main className="flex-1 container py-8 flex items-center justify-center text-center">
              <div>
                <h1 className="text-2xl font-bold text-destructive">{error}</h1>
                <p className="text-muted-foreground mt-2">The user @{username} could not be found.</p>
                <Button asChild className="mt-4" onClick={() => router.push('/leaderboard')}>Go to Leaderboard</Button>
              </div>
            </main>
        )
    }

    if (!profileUser) {
        return <div>User not found.</div>
    }
    
    const isOwnProfile = authUser?.uid === profileUser.uid;

    const getDifficultyClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
        case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
        case 'medium': return 'bg-primary/20 text-primary border-primary/30';
        case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
        default: return 'bg-muted';
        }
    };
    
    const CATEGORY_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
    
    const categoryData = profileUser.categoryPoints ? 
        Object.entries(profileUser.categoryPoints).map(([name, value]) => ({ name, value })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)
        : [];
        
    const chartConfig = {
        points: {
            label: "Points",
        },
        ...Object.fromEntries(
            categoryData.map((item, index) => [
                item.name,
                {
                    label: item.name,
                    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                },
            ])
        ),
    } satisfies ChartConfig;
    
    const totalSolved = (profileUser.dsaStats?.Easy || 0) + (profileUser.dsaStats?.Medium || 0) + (profileUser.dsaStats?.Hard || 0);

  return (
    <>
    <main className="flex-1 relative">
      <div className="container mx-auto px-4 md:px-6 py-8 space-y-8">
          {/* User Info Header */}
          <Card className="bg-gradient-to-br from-card to-muted/30 p-6 sm:rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row items-center gap-6">
                 <div className="relative group" onClick={isOwnProfile ? handleAvatarClick : undefined}>
                    <Avatar className="h-28 w-28 border-4 border-primary/50">
                        <AvatarImage src={profileUser.avatarUrl} alt={profileUser.name} />
                        <AvatarFallback className="text-4xl">
                            {profileUser.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                    </Avatar>
                    {isOwnProfile && (
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            {isUploading ? <LoaderCircle className="h-8 w-8 animate-spin text-white" /> : <Pencil className="h-8 w-8 text-white" />}
                        </div>
                    )}
                </div>
                {isOwnProfile && (
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif" disabled={isUploading} />
                )}
                <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-3xl font-bold font-headline">{profileUser.name}</h1>
                    <p className="text-lg text-muted-foreground">@{profileUser.username}</p>
                    <div className="mt-2 flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {profileUser.company && (
                            <div className="flex items-center gap-2">
                                {profileUser.companyLogoUrl ? (
                                    <Image
                                        src={profileUser.companyLogoUrl}
                                        alt={`${profileUser.company} logo`}
                                        width={16}
                                        height={16}
                                        className="rounded-sm object-contain"
                                    />
                                ) : (
                                    <Building className="h-4 w-4 shrink-0" />
                                )}
                                <span>{profileUser.company}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 shrink-0" />
                            <span>{profileUser.country}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {profileUser.trailheadUrl && (<Button variant="outline" size="icon" asChild><a href={profileUser.trailheadUrl} target="_blank" rel="noopener noreferrer" aria-label="Trailhead Profile"><LinkIcon className="h-4 w-4" /></a></Button>)}
                    {profileUser.githubUrl && (<Button variant="outline" size="icon" asChild><a href={profileUser.githubUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub Profile"><Github className="h-4 w-4" /></a></Button>)}
                    {profileUser.linkedinUrl && (<Button variant="outline" size="icon" asChild><a href={profileUser.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Profile"><Linkedin className="h-4 w-4" /></a></Button>)}
                    {profileUser.twitterUrl && (<Button variant="outline" size="icon" asChild><a href={profileUser.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitter Profile"><Twitter className="h-4 w-4" /></a></Button>)}
                    {isOwnProfile && <Button variant="outline" onClick={() => setIsEditModalOpen(true)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
                </div>
            </div>
          </Card>


          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Problems Solved */}
              <Card className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><GitCommit className="h-5 w-5" /> Problems Solved</CardTitle>
                      <CardDescription>Number of problems solved by difficulty.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm font-medium">
                              <span className="text-green-500">Easy</span>
                              <span>{profileUser.dsaStats?.Easy || 0} solved</span>
                          </div>
                           <div className="flex justify-between items-center text-sm font-medium">
                              <span className="text-primary">Medium</span>
                              <span>{profileUser.dsaStats?.Medium || 0} solved</span>
                          </div>
                           <div className="flex justify-between items-center text-sm font-medium">
                              <span className="text-destructive">Hard</span>
                              <span>{profileUser.dsaStats?.Hard || 0} solved</span>
                          </div>
                      </div>
                  </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card className="flex flex-col animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Category Breakdown</CardTitle>
                      <CardDescription>Points earned per problem category.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow flex items-center justify-center relative">
                      {categoryData.length > 0 ? (
                          <>
                            <ChartContainer
                                config={chartConfig}
                                className="mx-auto aspect-square h-[180px]"
                            >
                                <PieChart>
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel nameKey="name" />}
                                    />
                                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={60} paddingAngle={2}>
                                        {categoryData.map((entry) => (
                                            <Cell key={entry.name} fill={`var(--color-${entry.name})`} className="stroke-background hover:opacity-80" />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-foreground">{profileUser.points.toLocaleString()}</span>
                                <span className="text-sm text-muted-foreground">Total Points</span>
                            </div>
                          </>
                      ) : (
                          <p className="text-muted-foreground text-center py-4 text-sm">No points earned yet.</p>
                      )}
                  </CardContent>
              </Card>
              
              {/* Achievements */}
              <Card className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Achievements</CardTitle>
                      <CardDescription>Badges earned from your activity.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {profileUser.achievements && Object.keys(profileUser.achievements).length > 0 ? (
                          <div className="grid grid-cols-3 gap-4">
                              {Object.values(profileUser.achievements).sort((a, b) => b.date.seconds - a.date.seconds).slice(0, 9).map((achievement: Achievement) => (
                                  <div key={achievement.name} className="flex flex-col items-center text-center gap-1.5" title={`${achievement.name}: ${achievement.description}`}>
                                      <div className="p-3 bg-amber-400/10 rounded-full">
                                          <Award className="h-6 w-6 text-amber-500" />
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-tight">{achievement.name}</p>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="flex items-center justify-center h-full">
                              <p className="text-muted-foreground text-center py-4 text-sm">No achievements yet. Keep coding!</p>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>

          {/* Contribution Heatmap */}
          <Card>
              <CardContent className="pt-6">
                  {profileUser.submissionHeatmap && Object.keys(profileUser.submissionHeatmap).length > 0 ? (
                      <ContributionHeatmap data={profileUser.submissionHeatmap || {}} currentStreak={profileUser.currentStreak} maxStreak={profileUser.maxStreak} />
                  ) : (
                      <div className="text-center py-10">
                          <h3 className="text-lg font-semibold">Start your journey!</h3>
                          <p className="text-muted-foreground mt-2">Solve a problem to see your contribution graph here.</p>
                      </div>
                  )}
              </CardContent>
          </Card>

          {/* Recently Solved */}
          <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Recently Solved</CardTitle></CardHeader>
              <CardContent>
                  {recentlySolvedProblems.length > 0 ? (
                      <div className="space-y-2">
                          {recentlySolvedProblems.map(problem => (
                              <Link key={problem.id} href={`/problems/apex/${encodeURIComponent(problem.categoryName || '')}/${problem.id}`} className="block">
                                  <div className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors">
                                      <div>
                                          <p className="font-medium">{problem.title}</p>
                                          <p className="text-sm text-muted-foreground">Solved {formatDistanceToNow(problem.solvedAt.toDate(), { addSuffix: true })}</p>
                                      </div>
                                      <Badge variant="outline" className={getDifficultyClass(problem.difficulty || '')}>{problem.difficulty}</Badge>
                                  </div>
                              </Link>
                          ))}
                      </div>
                  ) : (
                      <p className="text-muted-foreground text-center py-4 text-sm">No problems solved yet. Get started!</p>
                  )}
              </CardContent>
          </Card>

      </div>
    </main>
    {isOwnProfile && <EditProfileModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} user={profileUser} />}
    </>
  );
}
