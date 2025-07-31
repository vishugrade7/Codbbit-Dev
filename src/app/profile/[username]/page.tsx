
'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import EditProfileModal from "@/components/edit-profile-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, Globe, Mail, Edit, Award, GitCommit, User as UserIcon, Github, Linkedin, Twitter, Link as LinkIcon, LoaderCircle, Pencil, PieChart as PieChartIcon, Star, Target, History, Circle, CheckCircle2, Instagram, Mountain } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc, collection, query, where, onSnapshot, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import type { Problem, ApexProblemsData, User as AppUser, Achievement, SolvedProblemDetail as SolvedProblemType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfilePicture } from "@/app/profile/actions";
import { PieChart, Pie, Cell, Legend } from "recharts";
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

            const processData = (data: ApexProblemsData | null) => {
                if (!data) return;
                const problems = Object.entries(data).flatMap(([categoryName, categoryData]) => 
                    (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                );
                setAllProblems(problems);
            };
            
            const cachedData = await getCache<ApexProblemsData>(APEX_PROBLEMS_CACHE_KEY);
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
                    await setCache(APEX_PROBLEMS_CACHE_KEY, data);
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
                const data = userDoc.data();
                
                // Manually convert Timestamps
                if (data.subscriptionEndDate instanceof Timestamp) {
                  data.subscriptionEndDate = data.subscriptionEndDate.toDate();
                }
                if (data.solvedProblems) {
                  for (const key in data.solvedProblems) {
                    if (data.solvedProblems[key].solvedAt instanceof Timestamp) {
                      data.solvedProblems[key].solvedAt = data.solvedProblems[key].solvedAt.toDate();
                    }
                  }
                }
                if (data.achievements) {
                    for (const key in data.achievements) {
                        if (data.achievements[key].date instanceof Timestamp) {
                            data.achievements[key].date = data.achievements[key].date.toDate();
                        }
                    }
                }

                setProfileUser({ id: userDoc.id, ...data } as AppUser);
                setError(null);
            }
        }, (err) => {
            console.error("Error fetching user profile:", err);
            setError("Could not load profile data.");
            setLoadingProfile(false);
        });

        return () => unsubscribe();
    }, [username]);

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
    
    const totalPoints = categoryData.reduce((acc, curr) => acc + curr.value, 0);

    
    const { easySolved, mediumSolved, hardSolved } = {
        easySolved: profileUser.dsaStats?.Easy || 0,
        mediumSolved: profileUser.dsaStats?.Medium || 0,
        hardSolved: profileUser.dsaStats?.Hard || 0,
    };


  return (
    <>
    <main className="flex-1 relative">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1 p-6 relative flex flex-col h-full">
                {isOwnProfile && (
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setIsEditModalOpen(true)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                )}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="relative inline-block group" onClick={isOwnProfile ? handleAvatarClick : undefined}>
                        <Avatar className="h-20 w-20 border-muted">
                            <AvatarImage src={profileUser.avatarUrl} alt={profileUser.name} />
                            <AvatarFallback className="text-3xl">
                                {profileUser.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                        </Avatar>
                        {isOwnProfile && (
                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                {isUploading ? <LoaderCircle className="h-6 w-6 animate-spin text-white" /> : <Pencil className="h-6 w-6 text-white" />}
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
                    </div>
                     <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-2xl font-bold">{profileUser.name}</h1>
                        <p className="text-md text-muted-foreground">@{profileUser.username}</p>
                        
                        <div className="flex items-center justify-center sm:justify-start flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                            {profileUser.company && (
                                <div className="flex items-center gap-2">
                                     {profileUser.companyLogoUrl ? (
                                        <Image src={profileUser.companyLogoUrl} alt={`${profileUser.company} logo`} width={16} height={16} className="rounded-sm object-contain"/>
                                    ) : (
                                        <Building className="h-4 w-4" />
                                    )}
                                    <span>{profileUser.company}</span>
                                </div>
                            )}
                            {profileUser.country && (
                                <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    <span>{profileUser.country}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                 {profileUser.about && (
                    <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">{profileUser.about}</p>
                    </div>
                )}
                 <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    {profileUser.trailheadUrl && <Link href={profileUser.trailheadUrl} target="_blank" className="text-muted-foreground hover:text-primary"><Image src="/trailhead-logo.svg" alt="Trailhead" width={24} height={24}/></Link>}
                    {profileUser.githubUrl && <Link href={profileUser.githubUrl} target="_blank" className="text-muted-foreground hover:text-primary"><Github className="h-6 w-6"/></Link>}
                    {profileUser.linkedinUrl && <Link href={profileUser.linkedinUrl} target="_blank" className="text-muted-foreground hover:text-primary"><Linkedin className="h-6 w-6"/></Link>}
                    {profileUser.twitterUrl && <Link href={profileUser.twitterUrl} target="_blank" className="text-muted-foreground hover:text-primary"><Twitter className="h-6 w-6"/></Link>}
                    {profileUser.isEmailPublic && profileUser.email && (
                        <a href={`mailto:${profileUser.email}`} className="text-muted-foreground hover:text-primary"><Mail className="h-6 w-6"/></a>
                    )}
                </div>
            </Card>

            <Card className="lg:col-span-1 flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><GitCommit className="h-4 w-4" /> Problems Solved</CardTitle>
                    <CardDescription>Breakdown by difficulty</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 text-sm flex-grow flex flex-col justify-center">
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
                </CardContent>
            </Card>

            <Card className="lg:col-span-1 flex flex-col h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4" /> Category Breakdown</CardTitle>
                    <CardDescription>Points earned per problem category.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center p-6">
                    {categoryData.length > 0 ? (
                       <div className="w-full flex items-center gap-6">
                            <div className="relative h-32 w-32 shrink-0">
                                <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full">
                                    <PieChart>
                                        <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={56} paddingAngle={2} strokeWidth={0}>
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <p className="text-2xl font-bold">{totalPoints}</p>
                                    <p className="text-xs text-muted-foreground">Total Points</p>
                                </div>
                            </div>
                             <div className="flex-1 space-y-2 text-sm">
                                {categoryData.map((entry) => (
                                    <div key={entry.name} className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartConfig[entry.name]?.color }} />
                                            <span>{entry.name}</span>
                                        </div>
                                        <span className="font-semibold">{entry.value} pts</span>
                                    </div>
                                ))}
                            </div>
                       </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4 text-sm">No points earned yet.</p>
                    )}
                </CardContent>
            </Card>
            
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Submissions</CardTitle>
                        <CardDescription>User's coding activity over the past year.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                        {profileUser.submissionHeatmap && Object.keys(profileUser.submissionHeatmap).length > 0 ? (
                            <ContributionHeatmap data={profileUser.submissionHeatmap || {}} currentStreak={profileUser.currentStreak} maxStreak={profileUser.maxStreak} />
                        ) : (
                            <div className="text-center py-10">
                                <h3 className="text-md font-semibold">Start your journey!</h3>
                                <p className="text-muted-foreground mt-1 text-sm">Solve a problem to see your contribution graph.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base"><Mountain className="h-4 w-4" /> Achievements</CardTitle>
                        <CardDescription>Badges earned from your activity.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {profileUser.achievements && Object.keys(profileUser.achievements).length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 gap-4">
                                {Object.values(profileUser.achievements).sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 12).map((achievement: Achievement) => (
                                    <div key={achievement.name} className="flex flex-col items-center text-center gap-1.5" title={`${achievement.name}: ${achievement.description}`}>
                                        <div className="p-3 bg-amber-400/10 rounded-full">
                                            <Award className="h-6 w-6 text-amber-500" />
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-tight">{achievement.name}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full min-h-[120px]">
                                <p className="text-muted-foreground text-center text-sm">No achievements yet. Keep coding!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>
      </div>
    </main>
    {isOwnProfile && <EditProfileModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} user={profileUser} />}
    </>
  );
}
