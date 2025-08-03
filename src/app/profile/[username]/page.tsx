

'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import EditProfileModal from "@/components/edit-profile-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, Globe, Mail, Edit, Award, GitCommit, User as UserIcon, Github, Linkedin, Twitter, Link as LinkIcon, LoaderCircle, Pencil, PieChart as PieChartIcon, Star, Target, History, Circle, CheckCircle2, Instagram, Mountain, Share2 } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";
import { getCache, setCache } from "@/lib/cache";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from "next-themes";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProIconOverlay } from '@/components/pro-icon-overlay';

type RecentlySolvedProblem = SolvedProblemType & { id: string; categoryName?: string };
type ProblemWithCategory = Problem & { categoryName: string };

const APEX_PROBLEMS_CACHE_KEY = 'apexProblemsData';

const VerifiedIcon = () => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM16.7071 9.70711C17.0976 9.31658 17.0976 8.68342 16.7071 8.29289C16.3166 7.90237 15.6834 7.90237 15.2929 8.29289L11 12.5858L9.70711 11.2929C9.31658 10.9024 8.68342 10.9024 8.29289 11.2929C7.90237 11.6834 7.90237 12.3166 8.29289 12.7071L10.2929 14.7071C10.6834 15.0976 11.3166 15.0976 11.7071 14.7071L16.7071 9.70711Z" fill="rgb(29 161 242)"/>
                 </svg>
            </TooltipTrigger>
            <TooltipContent>
                <p>Verified</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const AnimatedCard = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
    >
        {children}
    </motion.div>
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

        let endDate: Date | undefined;
        if (profileUser.subscriptionEndDate) {
            if (profileUser.subscriptionEndDate instanceof Timestamp) {
                endDate = profileUser.subscriptionEndDate.toDate();
            } else if (typeof profileUser.subscriptionEndDate === 'string' || typeof profileUser.subscriptionEndDate === 'number' || profileUser.subscriptionEndDate instanceof Date) {
                endDate = new Date(profileUser.subscriptionEndDate);
            }
        }
        
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
        const q = query(usersRef, where("username", "==", username.toLowerCase()), limit(1));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setLoadingProfile(false);
            if (querySnapshot.empty) {
                setError("Profile not found.");
                setProfileUser(null);
            } else {
                const userDoc = querySnapshot.docs[0];
                const data = userDoc.data();
                
                // Manually convert Timestamps to Dates to prevent serialization errors
                const convertTimestamps = (obj: any): any => {
                    if (obj instanceof Timestamp) {
                        return obj.toDate();
                    }
                    if (Array.isArray(obj)) {
                        return obj.map(convertTimestamps);
                    }
                    if (obj !== null && typeof obj === 'object') {
                        const newObj: { [key: string]: any } = {};
                        for (const key in obj) {
                            newObj[key] = convertTimestamps(obj[key]);
                        }
                        return newObj;
                    }
                    return obj;
                };

                const serializableData = convertTimestamps(data);

                setProfileUser({ id: userDoc.id, ...serializableData } as AppUser);
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

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Profile link copied to clipboard!' });
    };

    const recentlySolvedProblems: RecentlySolvedProblem[] = useMemo(() => {
        if (!profileUser?.solvedProblems || allProblems.length === 0) return [];
        
        return Object.entries(profileUser.solvedProblems)
            .map(([id, details]) => {
                const problemData = allProblems.find(p => p.id === id);
                return {
                    id,
                    ...details,
                    solvedAt: details.solvedAt instanceof Date ? details.solvedAt : new Date(details.solvedAt),
                    categoryName: problemData?.categoryName || 'Unknown',
                };
            })
            .sort((a, b) => b.solvedAt.getTime() - a.solvedAt.getTime())
            .slice(0, 15); // Get top 15 most recent for scrolling
    }, [profileUser, allProblems]);

    const starredProblems: ProblemWithCategory[] = useMemo(() => {
        if (!profileUser?.starredProblems || allProblems.length === 0) return [];
        const starredIds = new Set(profileUser.starredProblems);
        return allProblems.filter(p => starredIds.has(p.id));
    }, [profileUser, allProblems]);


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

    
    const { easySolved, mediumSolved, hardSolved, totalSolved } = {
        easySolved: profileUser.dsaStats?.Easy || 0,
        mediumSolved: profileUser.dsaStats?.Medium || 0,
        hardSolved: profileUser.dsaStats?.Hard || 0,
        totalSolved: Object.keys(profileUser.solvedProblems || {}).length,
    };

    const getDifficultyBadgeClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
          case 'easy': return 'bg-[#1ca350]/20 text-[#1ca350] border border-[#1ca350]/30';
          case 'medium': return 'bg-yellow-400/20 text-yellow-500 border border-yellow-400/30';
          case 'hard': return 'bg-destructive/20 text-destructive border border-destructive/30';
          default: return 'bg-muted';
        }
    };

    const getDifficultyRowClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
          case 'easy': return 'bg-[#1ca350]/5 hover:bg-[#1ca350]/10';
          case 'medium': return 'bg-yellow-500/5 hover:bg-yellow-500/10';
          case 'hard': return 'bg-destructive/5 hover:bg-destructive/10';
          default: return 'hover:bg-muted/50';
        }
    };

  return (
    <main className="flex-1 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Sticky Column */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <div className="sticky top-20 space-y-8">
                        <AnimatedCard>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="relative inline-block group" onClick={isOwnProfile ? handleAvatarClick : undefined}>
                                            <Avatar className={cn("h-24 w-24 border-4", isProfileUserPro ? "border-blue-500" : "border-border")}>
                                                <AvatarImage src={profileUser.avatarUrl} alt={profileUser.name} />
                                                <AvatarFallback className="text-3xl">{profileUser.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                            </Avatar>
                                            {isOwnProfile && (
                                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                    {isUploading ? <LoaderCircle className="h-6 w-6 animate-spin text-white" /> : <Pencil className="h-6 w-6 text-white" />}
                                                </div>
                                            )}
                                            {isProfileUserPro && <ProIconOverlay />}
                                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
                                        </div>
                                        <div className="flex items-center gap-2 mt-4">
                                            <h1 className="text-xl font-bold">{profileUser.name}</h1>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                          <span>@{profileUser.username}</span>
                                          {profileUser.emailVerified && <VerifiedIcon />}
                                        </div>
                                        <p className="text-sm mt-2 max-w-xs">{profileUser.about}</p>
                                    </div>
                                    <div className="mt-6 flex justify-center gap-2">
                                        {isOwnProfile && (
                                            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                                                <Pencil className="mr-2 h-4 w-4" /> Edit Profile
                                            </Button>
                                        )}
                                        <Button variant="secondary" size="sm" onClick={handleShare}>
                                            <Share2 className="mr-2 h-4 w-4" /> Share
                                        </Button>
                                    </div>
                                </CardContent>
                                <CardContent className="border-t pt-4">
                                     <div className="space-y-4 text-sm">
                                         <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                                            {profileUser.company && (
                                                <div className="flex items-center gap-2">
                                                    {profileUser.companyLogoUrl ? (
                                                        <Image src={profileUser.companyLogoUrl} alt={profileUser.company} width={16} height={16} className="rounded-full object-contain" />
                                                    ) : (
                                                        <Building className="h-4 w-4" />
                                                    )}
                                                    <span className="text-foreground">{profileUser.company}</span>
                                                </div>
                                            )}
                                            {profileUser.country && (
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4" />
                                                    <span className="text-foreground">{profileUser.country}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-center gap-4 pt-4">
                                            <TooltipProvider>
                                                {profileUser.trailheadUrl && (<Tooltip><TooltipTrigger asChild><Link href={profileUser.trailheadUrl} target="_blank" className="text-muted-foreground hover:text-primary"><Mountain className="h-5 w-5"/></Link></TooltipTrigger><TooltipContent><p>Trailhead</p></TooltipContent></Tooltip>)}
                                                {profileUser.githubUrl && (<Tooltip><TooltipTrigger asChild><Link href={profileUser.githubUrl} target="_blank" className="text-muted-foreground hover:text-primary"><Github className="h-5 w-5"/></Link></TooltipTrigger><TooltipContent><p>GitHub</p></TooltipContent></Tooltip>)}
                                                {profileUser.linkedinUrl && (<Tooltip><TooltipTrigger asChild><Link href={profileUser.linkedinUrl} target="_blank" className="text-muted-foreground hover:text-primary"><Linkedin className="h-5 w-5"/></Link></TooltipTrigger><TooltipContent><p>LinkedIn</p></TooltipContent></Tooltip>)}
                                                {profileUser.twitterUrl && (<Tooltip><TooltipTrigger asChild><Link href={profileUser.twitterUrl} target="_blank" className="text-muted-foreground hover:text-primary"><Twitter className="h-5 w-5"/></Link></TooltipTrigger><TooltipContent><p>Twitter / X</p></TooltipContent></Tooltip>)}
                                                {profileUser.isEmailPublic && profileUser.email && (<Tooltip><TooltipTrigger asChild><a href={`mailto:${profileUser.email}`} className="text-muted-foreground hover:text-primary"><Mail className="h-5 w-5"/></a></TooltipTrigger><TooltipContent><p>Email</p></TooltipContent></Tooltip>)}
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </AnimatedCard>

                         <AnimatedCard delay={0.1}>
                           <Card>
                                <CardHeader><CardTitle>Achievements</CardTitle></CardHeader>
                                <CardContent>
                                    {profileUser.achievements && Object.keys(profileUser.achievements).length > 0 ? (
                                        <div className="grid grid-cols-4 gap-4">
                                            {Object.values(profileUser.achievements).sort((a,b) => (b.date.getTime() - a.date.getTime())).slice(0, 8).map((achievement: Achievement) => (
                                                <TooltipProvider key={achievement.name}>
                                                <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex flex-col items-center text-center gap-1.5">
                                                        <div className="p-3 bg-amber-400/10 rounded-full">
                                                            <Award className="h-6 w-6 text-amber-500" />
                                                        </div>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="font-bold">{achievement.name}</p>
                                                    <p className="text-xs">{achievement.description}</p>
                                                </TooltipContent>
                                                </Tooltip>
                                                </TooltipProvider>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground text-sm">No achievements yet. Keep coding!</div>
                                    )}
                                </CardContent>
                            </Card>
                        </AnimatedCard>
                    </div>
                </div>

                {/* Right Scrollable Column */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-8">
                     <AnimatedCard delay={0.2}>
                         <Card>
                            <CardHeader><CardTitle>Contribution Graph</CardTitle></CardHeader>
                            <CardContent>
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
                    </AnimatedCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <AnimatedCard delay={0.3}>
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><GitCommit className="h-4 w-4" /> Problems Solved</CardTitle></CardHeader>
                                <CardContent className="space-y-4 pt-4 text-sm">
                                    <div>
                                        <div className="flex justify-between items-center font-medium mb-1 text-muted-foreground">
                                            <span>Easy</span>
                                            <span className="font-semibold text-foreground">{easySolved} / {difficultyTotals.Easy}</span>
                                        </div>
                                        <Progress value={difficultyTotals.Easy > 0 ? (easySolved / difficultyTotals.Easy) * 100 : 0} className="h-2" indicatorClassName="bg-[#1ca350]" />
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
                        </AnimatedCard>
                        <AnimatedCard delay={0.4}>
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4" /> Category Breakdown</CardTitle></CardHeader>
                                <CardContent className="flex-grow flex items-center justify-center p-6 min-h-[160px]">
                                    {categoryData.length > 0 ? (
                                    <div className="w-full h-full flex flex-row items-center gap-6">
                                            <div className="relative h-28 w-28 shrink-0">
                                                <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full">
                                                    <PieChart><Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={48} paddingAngle={2} strokeWidth={0}>{categoryData.map((_, index) => (<Cell key={`cell-${index}`} fill={chartConfig[_.name]?.color} />))}</Pie></PieChart>
                                                </ChartContainer>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                    <p className="text-2xl font-bold">{totalPoints}</p>
                                                    <p className="text-xs text-muted-foreground">Points</p>
                                                </div>
                                            </div>
                                            <ScrollArea className="h-28 flex-1">
                                                <div className="flex-1 space-y-2 text-sm pr-4">
                                                    {categoryData.map((entry) => (
                                                        <div key={entry.name} className="flex justify-between items-center">
                                                            <div className="flex items-center gap-2">
                                                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartConfig[entry.name]?.color }} />
                                                                <span className="truncate">{entry.name}</span>
                                                            </div>
                                                            <span className="font-semibold">{entry.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                    </div>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-4 text-sm">No points earned yet.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </AnimatedCard>
                    </div>

                    <AnimatedCard delay={0.5}>
                        <Tabs defaultValue="recent" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="recent">Recently Solved</TabsTrigger>
                                <TabsTrigger value="starred">Starred Problems</TabsTrigger>
                            </TabsList>
                            <TabsContent value="recent">
                                <Card>
                                    <CardContent className="pt-6">
                                        {recentlySolvedProblems.length > 0 ? (
                                            <ScrollArea className="h-72">
                                                <div className="space-y-2 pr-4">
                                                    {recentlySolvedProblems.map(problem => (
                                                        <Link key={problem.id} href={`/problems/apex/${encodeURIComponent(problem.categoryName || '')}/${problem.id}`} className="block">
                                                            <div className={cn("p-2 rounded-md transition-colors", getDifficultyRowClass(problem.difficulty))}>
                                                                <div className="flex justify-between items-center gap-4">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-semibold truncate text-sm">{problem.title}</p>
                                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                                            <span>Solved {formatDistanceToNow(new Date(problem.solvedAt), { addSuffix: true })}</span>
                                                                            <span className="text-muted-foreground/50">&middot;</span>
                                                                            <Badge variant="secondary" className="truncate">{problem.categoryName}</Badge>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-shrink-0 text-right space-y-1">
                                                                        <Badge variant="outline" className={cn("w-20 justify-center", getDifficultyBadgeClass(problem.difficulty))}>
                                                                            {problem.difficulty}
                                                                        </Badge>
                                                                        <p className="text-xs font-semibold text-primary">+{problem.points} pts</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">No problems solved yet.</div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="starred">
                                <Card>
                                    <CardContent className="pt-6">
                                        {starredProblems.length > 0 ? (
                                            <ScrollArea className="h-72">
                                                <div className="space-y-2 pr-4">
                                                    {starredProblems.map(problem => (
                                                        <Link key={problem.id} href={`/problems/apex/${encodeURIComponent(problem.categoryName || '')}/${problem.id}`} className="block">
                                                            <div className={cn("p-2 rounded-md transition-colors", getDifficultyRowClass(problem.difficulty))}>
                                                                <div className="flex justify-between items-center gap-4">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-semibold truncate text-sm">{problem.title}</p>
                                                                        <Badge variant="secondary" className="mt-1">{problem.categoryName}</Badge>
                                                                    </div>
                                                                    <Badge variant="outline" className={cn("w-20 justify-center", getDifficultyBadgeClass(problem.difficulty))}>
                                                                        {problem.difficulty}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">No starred problems yet.</div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </AnimatedCard>
                </div>
            </div>
        </div>
        {isOwnProfile && <EditProfileModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} user={profileUser} />}
    </main>
  );
}
