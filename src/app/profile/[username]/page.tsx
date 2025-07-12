
'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import EditProfileModal from "@/components/edit-profile-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, Globe, Mail, Edit, Award, GitCommit, User as UserIcon, Github, Linkedin, Twitter, Link as LinkIcon, LoaderCircle, Pencil, PieChart as PieChartIcon, Star, Target, History, Circle, CheckCircle2 } from "lucide-react";
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
import { getCache, setCache } from "@/lib/cache";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from "next-themes";

type RecentlySolvedProblem = SolvedProblemType & { id: string };
type ProblemWithCategory = Problem & { categoryName: string };

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

const VerifiedIcon = () => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger>
                 <svg
                    viewBox="0 0 22 22"
                    aria-label="Verified account"
                    role="img"
                    className="w-6 h-6 fill-current text-blue-500"
                    fill="currentColor"
                >
                   <g>
                     <path d="M20.69,8.69,19.28,7.28a1,1,0,0,0-1.42,0l-6.15,6.15L8,9.72a1,1,0,0,0-1.42,0L5.16,11.14a1,1,0,0,0,0,1.42l5.4,5.4a1,1,0,0,0,1.42,0l8.71-8.71A1,1,0,0,0,20.69,8.69Z" stroke="none"></path>
                   </g>
                </svg>
            </TooltipTrigger>
            <TooltipContent>
                <p>Verified</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const ProIconOverlay = () => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 flex items-center justify-center">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" fill="#FDB813"/>
                        <path d="M10.5 9.5L8 12L10.5 14.5" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.5 9.5L17 12L14.5 14.5" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>Pro User</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);


// This is the new public profile page
export default function UserProfilePage() {
    const { user: authUser, userData, isPro: isAuthUserPro, brandingSettings, loadingBranding } = useAuth(); // Logged-in user
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { theme } = useTheme();

    const username = params.username as string;

    const [profileUser, setProfileUser] = useState<AppUser | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [allProblems, setAllProblems] = useState<ProblemWithCategory[]>([]);
    const [loadingProblems, setLoadingProblems] = useState(true);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isProfileUserPro = useMemo(() => {
        if (!profileUser) return false;
        const isAdmin = profileUser.isAdmin || false;
        const status = profileUser.razorpaySubscriptionStatus;
        const endDate = profileUser.subscriptionEndDate?.toDate();
        const hasActiveSub = status === 'active' && endDate && new Date() < endDate;
        return isAdmin || hasActiveSub;
    }, [profileUser]);

    // Fetch all problems data for use in starred/recent sections
    useEffect(() => {
        const fetchAllProblems = async () => {
            setLoadingProblems(true);
            if (!db) {
                setLoadingProblems(false);
                return;
            }

            const processData = (data: ApexProblemsData) => {
                const problems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                    (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                );
                setAllProblems(problems);
            };
            
            const cachedData = getCache<ApexProblemsData>(APEX_PROBLEMS_CACHE_KEY);
            if (cachedData) {
                processData(cachedData);
                setLoadingProblems(false);
                return;
            }

            try {
                const apexDocRef = doc(db, "problems", "Apex");
                const problemsSnap = await getDoc(apexDocRef);
                if (problemsSnap.exists()) {
                    const data = problemsSnap.data().Category as ApexProblemsData;
                    setCache(APEX_PROBLEMS_CACHE_KEY, data);
                    processData(data);
                }
            } catch (error) {
                console.error("Error fetching all problems for suggestion:", error);
            } finally {
                setLoadingProblems(false);
            }
        };
        fetchAllProblems();
    }, []);

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
    
    const recentlySolvedProblemsDetails = useMemo(() => {
        if (!profileUser?.solvedProblems || loadingProblems || allProblems.length === 0) return [];
    
        const solvedProblemIds = Object.keys(profileUser.solvedProblems);
        
        const recentlySolvedMap = new Map(
            allProblems
                .filter(p => solvedProblemIds.includes(p.id))
                .map(p => [p.id, { ...p, solvedAt: profileUser.solvedProblems![p.id].solvedAt, points: profileUser.solvedProblems![p.id].points }])
        );

        return Array.from(recentlySolvedMap.values())
            .sort((a, b) => b.solvedAt.toDate().getTime() - a.solvedAt.toDate().getTime())
            .slice(0, 5);
    
    }, [profileUser?.solvedProblems, allProblems, loadingProblems]);

    const starredProblemsDetails = useMemo(() => {
        if (loadingProblems || !profileUser?.starredProblems || allProblems.length === 0) {
            return [];
        }
        const starredIds = new Set(profileUser.starredProblems);
        return allProblems.filter(p => starredIds.has(p.id));
    }, [profileUser?.starredProblems, allProblems, loadingProblems]);

    const difficultyTotals = useMemo(() => {
        if (loadingProblems || allProblems.length === 0) {
            return { Easy: 0, Medium: 0, Hard: 0, total: 0 };
        }
        return allProblems.reduce((acc, problem) => {
            if (problem.difficulty === 'Easy') acc.Easy++;
            else if (problem.difficulty === 'Medium') acc.Medium++;
            else if (problem.difficulty === 'Hard') acc.Hard++;
            acc.total++;
            return acc;
        }, { Easy: 0, Medium: 0, Hard: 0, total: 0 });
    }, [allProblems, loadingProblems]);


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


    if (loadingProfile || loadingProblems) {
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
        case 'medium': return 'bg-yellow-400/20 text-yellow-500 border-yellow-400/30';
        case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
        default: return 'bg-muted';
        }
    };
    
    const getDifficultyRowClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
          case 'easy': return 'bg-green-500/5 hover:bg-green-500/10';
          case 'medium': return 'bg-yellow-500/5 hover:bg-yellow-500/10';
          case 'hard': return 'bg-destructive/5 hover:bg-destructive/10';
          default: return 'hover:bg-muted/50';
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
    
    const { easySolved, mediumSolved, hardSolved, totalSolved } = {
        easySolved: profileUser.dsaStats?.Easy || 0,
        mediumSolved: profileUser.dsaStats?.Medium || 0,
        hardSolved: profileUser.dsaStats?.Hard || 0,
        totalSolved: (profileUser.dsaStats?.Easy || 0) + (profileUser.dsaStats?.Medium || 0) + (profileUser.dsaStats?.Hard || 0),
    };


  return (
    <>
    <main className="flex-1 relative">
      <div className="container mx-auto px-4 md:px-6 py-8 space-y-8">
          {/* User Info Header */}
          <Card className="p-6 sm:rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row items-center gap-6">
                 <div className="relative group" onClick={isOwnProfile ? handleAvatarClick : undefined}>
                    <Avatar className={cn(
                        "h-28 w-28 border-4", 
                        isProfileUserPro 
                            ? "border-yellow-400 shadow-lg" 
                            : "border-primary/50"
                    )}>
                        <AvatarImage src={profileUser.avatarUrl} alt={profileUser.name} />
                        <AvatarFallback className="text-4xl">
                            {profileUser.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                    </Avatar>
                    {isProfileUserPro && (
                       <ProIconOverlay />
                    )}
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
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                        <h1 className="text-3xl font-bold font-headline">{profileUser.name}</h1>
                        {profileUser.emailVerified && <VerifiedIcon />}
                    </div>
                    <p className="text-lg text-muted-foreground">@{profileUser.username}</p>
                    {profileUser.about && (
                        <p className="mt-2 text-sm text-muted-foreground max-w-xl">{profileUser.about}</p>
                    )}
                    <div className="mt-2 flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {profileUser.company && (
                            <Badge variant="secondary" className="bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-gray-300">
                                {profileUser.companyLogoUrl && <Image src={profileUser.companyLogoUrl} alt={profileUser.company} width={16} height={16} className="mr-1.5 rounded-full object-contain"/>}
                                <span>{profileUser.company}</span>
                            </Badge>
                        )}
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 shrink-0" />
                            <span>{profileUser.country}</span>
                        </div>
                        {profileUser.isEmailPublic && profileUser.email && (
                             <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 shrink-0" />
                                <span>{profileUser.email}</span>
                            </div>
                        )}
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
                      <CardDescription>Breakdown by difficulty</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                      <div className="space-y-4 text-sm">
                          <div>
                              <div className="flex justify-between items-center font-medium mb-1 text-muted-foreground">
                                  <span>Easy</span>
                                  <span className="font-semibold text-foreground">{easySolved} / {difficultyTotals.Easy}</span>
                              </div>
                              <Progress value={difficultyTotals.Easy > 0 ? (easySolved / difficultyTotals.Easy) * 100 : 0} className="h-2" indicatorClassName="bg-green-500" />
                          </div>
                          <div>
                              <div className="flex justify-between items-center font-medium mb-1 text-muted-foreground">
                                  <span>Medium</span>
                                   <span className="font-semibold text-foreground">{mediumSolved} / {difficultyTotals.Medium}</span>
                              </div>
                              <Progress value={difficultyTotals.Medium > 0 ? (mediumSolved / difficultyTotals.Medium) * 100 : 0} className="h-2" indicatorClassName="bg-yellow-500" />
                          </div>
                          <div>
                              <div className="flex justify-between items-center font-medium mb-1 text-muted-foreground">
                                  <span>Hard</span>
                                   <span className="font-semibold text-foreground">{hardSolved} / {difficultyTotals.Hard}</span>
                              </div>
                              <Progress value={difficultyTotals.Hard > 0 ? (hardSolved / difficultyTotals.Hard) * 100 : 0} className="h-2" indicatorClassName="bg-destructive" />
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
                  <CardContent className="flex-grow flex items-center justify-center p-6">
                      {categoryData.length > 0 ? (
                          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                              <div className="relative mx-auto aspect-square h-[150px]">
                                  <ChartContainer
                                      config={chartConfig}
                                      className="w-full h-full"
                                  >
                                      <PieChart>
                                          <ChartTooltip
                                                cursor={false}
                                                content={<ChartTooltipContent hideLabel nameKey="name" />}
                                          />
                                          <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={50} paddingAngle={2} strokeWidth={0}>
                                              {categoryData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color} />
                                              ))}
                                          </Pie>
                                      </PieChart>
                                  </ChartContainer>
                                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                      <span className="text-3xl font-bold text-foreground">{profileUser.points.toLocaleString()}</span>
                                      <span className="text-sm text-muted-foreground">Total Points</span>
                                  </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                  {categoryData.slice(0, 5).map(item => (
                                      <div key={item.name} className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartConfig[item.name]?.color }} />
                                              <span className="text-muted-foreground">{item.name}</span>
                                          </div>
                                          <span className="font-semibold text-right">{item.value.toLocaleString()} pts</span>
                                      </div>
                                  ))}
                                  {categoryData.length > 5 && (
                                      <p className="text-xs text-muted-foreground text-center pt-2">...and {categoryData.length - 5} more categories</p>
                                  )}
                              </div>
                          </div>
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

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Recently Solved</CardTitle></CardHeader>
                    <CardContent>
                        {recentlySolvedProblemsDetails.length > 0 ? (
                            <div className="space-y-2">
                                {recentlySolvedProblemsDetails.map(problem => (
                                    <Link key={problem.id} href={`/problems/apex/${encodeURIComponent(problem.categoryName || '')}/${problem.id}`} className="block">
                                        <div className={cn("flex items-center justify-between gap-4 p-3 rounded-md transition-colors", getDifficultyRowClass(problem.difficulty))}>
                                            <div className="flex-1">
                                                <p className="font-medium">{problem.title}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                    <span>Solved {formatDistanceToNow(problem.solvedAt.toDate(), { addSuffix: true })}</span>
                                                    <span className="text-muted-foreground/50">•</span>
                                                    <Badge variant="secondary">{problem.categoryName}</Badge>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <Badge variant="outline" className={getDifficultyClass(problem.difficulty || '')}>{problem.difficulty}</Badge>
                                                <p className="text-sm font-semibold text-primary mt-1">+{problem.points} pts</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4 text-sm">No problems solved yet. Get started!</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" /> Starred Problems</CardTitle></CardHeader>
                    <CardContent>
                        {loadingProblems ? (
                            <div className="flex justify-center items-center h-full"><LoaderCircle className="h-6 w-6 animate-spin text-primary" /></div>
                        ) : starredProblemsDetails.length > 0 ? (
                            <div className="space-y-2">
                                {starredProblemsDetails.map(problem => {
                                    const isLocked = problem.isPremium && !isAuthUserPro;
                                    const isSolved = userData?.solvedProblems?.[problem.id];
                                    return (
                                        <Link key={problem.id} href={isLocked ? '/pricing' : `/problems/apex/${encodeURIComponent(problem.categoryName || '')}/${problem.id}`} className="block">
                                            <div className={cn("flex items-center justify-between gap-4 p-3 rounded-md transition-colors", getDifficultyRowClass(problem.difficulty))}>
                                                <div className="flex-1">
                                                    <p className="font-medium">{problem.title}</p>
                                                    <Badge variant="secondary" className="mt-1">{problem.categoryName}</Badge>
                                                </div>
                                                <div className="flex items-center gap-4 shrink-0">
                                                    <Badge variant="outline" className={getDifficultyClass(problem.difficulty)}>{problem.difficulty}</Badge>
                                                    {isSolved ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                         <Circle className="h-4 w-4 text-muted-foreground/50" />
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        ) : (
                             <p className="text-muted-foreground text-center py-4 text-sm">No problems starred yet.</p>
                        )}
                    </CardContent>
                </Card>
           </div>
      </div>
    </main>
    {isOwnProfile && <EditProfileModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} user={profileUser} />}
    </>
  );
}
