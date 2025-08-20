
'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import EditProfileModal from "@/components/edit-profile-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, Globe, Mail, Edit, Award, GitCommit, User as UserIcon, Github, Linkedin, Twitter, Link as LinkIcon, LoaderCircle, Pencil, PieChart as PieChartIcon, Star, Target, History, Trophy, icons, FolderKanban, Camera } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { doc, getDoc, collection, query, where, onSnapshot, limit, getDocs } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import type { Problem, ApexProblemsData, User as AppUser, Achievement as AchievementType, SolvedProblemDetail as SolvedProblemType, Badge as BadgeType } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateAvatar } from "../actions";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import ContributionHeatmap from "@/components/contribution-heatmap";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from 'date-fns';
import { ProgressCard } from "@/components/progress-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type StarredProblemDetail = Problem & { categoryName: string };
type RecentlySolvedProblem = Omit<SolvedProblemType, 'solvedAt'> & {
    id: string;
    title?: string;
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    categoryName?: string;
    solvedAt: string; // Serialized date
};
type Achievement = Omit<AchievementType, 'date'> & { date: string };

const DynamicLucideIcon = ({ name, ...props }: { name: string } & React.ComponentProps<typeof Award>) => {
    const LucideIcon = icons[name as keyof typeof icons] || Award;
    return <LucideIcon {...props} />;
};


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
    const [starredProblems, setStarredProblems] = useState<StarredProblemDetail[]>([]);
    const [loadingStarred, setLoadingStarred] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [allProblems, setAllProblems] = useState<ProblemWithCategory[]>([]);
    const [totalProblemsByDifficulty, setTotalProblemsByDifficulty] = useState<{ Easy: number; Medium: number; Hard: number }>({ Easy: 0, Medium: 0, Hard: number });
    const [allBadges, setAllBadges] = useState<Map<string, BadgeType>>(new Map());
    const [loadingProblems, setLoadingProblems] = useState(true);

    type ProblemWithCategory = Problem & { categoryName: string };

    // Effect to fetch all problem counts and details
    useEffect(() => {
        const fetchAllProblemsAndBadges = async () => {
            if (!db) {
                setLoadingProblems(false);
                return;
            }
            setLoadingProblems(true);
            try {
                const apexDocRef = doc(db, "problems", "Apex");
                const docSnap = await getDoc(apexDocRef);
                if (docSnap.exists()) {
                    const categoriesData = docSnap.data().Category as ApexProblemsData;
                    const allProblemsData = Object.entries(categoriesData).flatMap(([categoryName, categoryData]) =>
                        (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                    );
                    setAllProblems(allProblemsData);

                    const counts = allProblemsData.reduce((acc, problem) => {
                        acc[problem.difficulty as keyof typeof acc] = (acc[problem.difficulty as keyof typeof acc] || 0) + 1;
                        return acc;
                    }, { Easy: 0, Medium: 0, Hard: 0 });
                    setTotalProblemsByDifficulty(counts);
                }

                // Fetch all badges
                const badgesSnapshot = await getDocs(collection(db, 'badges'));
                const badgesMap = new Map<string, BadgeType>();
                badgesSnapshot.forEach(doc => {
                    const badgeData = doc.data() as BadgeType;
                    badgesMap.set(badgeData.name, badgeData);
                });
                setAllBadges(badgesMap);

            } catch (error) {
                console.error("Error fetching problem data:", error);
            } finally {
                setLoadingProblems(false);
            }
        };
        fetchAllProblemsAndBadges();
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

    // Effect to fetch starred problems for the profile being viewed
    useEffect(() => {
        if (!profileUser?.starredProblems || profileUser.starredProblems.length === 0 || allProblems.length === 0) {
            setLoadingStarred(false);
            setStarredProblems([]);
            return;
        }

        setLoadingStarred(true);
        const starredIds = new Set(profileUser.starredProblems);
        const details = allProblems.filter(p => starredIds.has(p.id));
        setStarredProblems(details);
        setLoadingStarred(false);

    }, [profileUser, allProblems]);
    
    const recentlySolvedProblems: RecentlySolvedProblem[] = useMemo(() => {
        if (!profileUser?.solvedProblems || allProblems.length === 0) return [];

        const solvedDetails: (SolvedProblemType & { id: string })[] = Object.entries(profileUser.solvedProblems).map(([id, details]) => ({
            id,
            ...details,
        }));

        solvedDetails.sort((a, b) => {
            const dateA = a.solvedAt?.toDate ? a.solvedAt.toDate() : new Date(0);
            const dateB = b.solvedAt?.toDate ? b.solvedAt.toDate() : new Date(0);
            return dateB.getTime() - new Date(a.date).getTime();
        });
        
        return solvedDetails.slice(0, 5).map(solved => {
            const problemDetail = allProblems.find(p => p.id === solved.id);
            return {
                ...solved,
                title: problemDetail?.title,
                difficulty: problemDetail?.difficulty,
                categoryName: problemDetail?.categoryName,
                solvedAt: solved.solvedAt.toDate().toISOString(), // Serialize the date here
            };
        });
    }, [profileUser?.solvedProblems, allProblems]);

     const achievements: Achievement[] = useMemo(() => {
        if (!profileUser?.achievements) return [];
        return Object.values(profileUser.achievements)
            .map(ach => {
                const masterBadge = allBadges.get(ach.name);
                return {
                    ...ach,
                    // If the achievement doesn't have icon/color, use the master one
                    icon: ach.icon || masterBadge?.icon,
                    color: ach.color || masterBadge?.color,
                    date: ach.date.toDate().toISOString(),
                };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [profileUser?.achievements, allBadges]);

    const solvedProblemsByCategory = useMemo(() => {
        if (!profileUser?.solvedProblems) return [];
        const counts: { [category: string]: number } = {};
        for (const problem of Object.values(profileUser.solvedProblems)) {
            counts[problem.categoryName] = (counts[problem.categoryName] || 0) + 1;
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [profileUser?.solvedProblems]);


    const handleAvatarClick = () => {
        if (!isUploading) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !authUser || !storage) return;
        if (authUser.uid !== profileUser?.uid) return;

        if (!file.type.startsWith('image/')) {
            toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image.' });
            return;
        }

        setIsUploading(true);
        try {
            const avatarStorageRef = storageRef(storage, `profile-pictures/${authUser.uid}`);
            await uploadBytes(avatarStorageRef, file);
            const downloadURL = await getDownloadURL(avatarStorageRef);
            
            const result = await updateAvatar(authUser.uid, downloadURL);

            if (result.success) {
                toast({ title: 'Avatar updated successfully!' });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: error.message || 'An error occurred while uploading your avatar.',
            });
        } finally {
            setIsUploading(false);
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
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
        case 'medium': return 'bg-primary/20 text-primary border-primary/30';
        case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
        default: return 'bg-muted';
        }
    };
    
    const totalSolved = (profileUser.dsaStats?.Easy || 0) + (profileUser.dsaStats?.Medium || 0) + (profileUser.dsaStats?.Hard || 0);

  return (
    <>
    <main className="flex-1 bg-muted/40 dark:bg-black">
        <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-12 lg:col-span-4 space-y-6">
                     <Card>
                        <CardContent className="pt-6 relative">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
                                <div className="relative group shrink-0" onClick={isOwnProfile ? handleAvatarClick : undefined}>
                                    <Avatar className="h-28 w-28 border-4 border-background ring-2 ring-primary/50">
                                        <AvatarImage src={profileUser.avatarUrl} alt={profileUser.name} />
                                        <AvatarFallback className="text-4xl">
                                            {profileUser.name.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                    </Avatar>
                                    {isOwnProfile && (
                                        <div className="absolute bottom-1 right-1 bg-background rounded-full p-1.5 border border-muted-foreground/30 group-hover:bg-muted transition-colors cursor-pointer">
                                            {isUploading ? <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> : <Camera className="h-5 w-5 text-muted-foreground" />}
                                        </div>
                                    )}
                                </div>
                                {isOwnProfile && <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif" disabled={isUploading} />}

                               <div className="flex-1">
                                    <h1 className="text-2xl font-bold font-headline">{profileUser.name}</h1>
                                    <p className="text-muted-foreground">@{profileUser.username}</p>

                                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                        {profileUser.company && (
                                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                                <Building className="h-4 w-4 shrink-0" />
                                                <span>{profileUser.company}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-center sm:justify-start gap-2">
                                            <Globe className="h-4 w-4 shrink-0" />
                                            <span>{profileUser.country}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                                        {profileUser.trailheadUrl && (<a href={profileUser.trailheadUrl} target="_blank" rel="noopener noreferrer" aria-label="Trailhead Profile" className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10"><LinkIcon className="h-4 w-4" /></a>)}
                                        {profileUser.githubUrl && (<a href={profileUser.githubUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub Profile" className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10"><Github className="h-4 w-4" /></a>)}
                                        {profileUser.linkedinUrl && (<a href={profileUser.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Profile" className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10"><Linkedin className="h-4 w-4" /></a>)}
                                        {profileUser.twitterUrl && (<a href={profileUser.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitter Profile" className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10"><Twitter className="h-4 w-4" /></a>)}
                                    </div>
                               </div>
                            </div>
                            {isOwnProfile && <Button variant="outline" size="icon" onClick={() => setIsEditModalOpen(true)} className="absolute top-4 right-4 h-9 w-9"><Edit className="h-4 w-4" /></Button>}
                        </CardContent>
                     </Card>
                     
                     <ProgressCard 
                        totalSolved={totalSolved}
                        totalAvailable={allProblems.length}
                        easySolved={profileUser.dsaStats?.Easy || 0}
                        easyTotal={totalProblemsByDifficulty.Easy}
                        mediumSolved={profileUser.dsaStats?.Medium || 0}
                        mediumTotal={totalProblemsByDifficulty.Medium}
                        hardSolved={profileUser.dsaStats?.Hard || 0}
                        hardTotal={totalProblemsByDifficulty.Hard}
                     />

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FolderKanban className="h-5 w-5" /> Solved Categories</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {solvedProblemsByCategory.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {solvedProblemsByCategory.map(([category, count]) => (
                                        <Badge key={category} variant="secondary" className="text-sm py-1 px-3">
                                            {category} <span className="ml-2 font-mono text-xs bg-primary/20 text-primary rounded-full h-5 w-5 flex items-center justify-center">{count}</span>
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-4 text-sm">No categories solved yet.</p>
                            )}
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" /> Starred Problems</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingStarred ? (
                                <div className="flex justify-center items-center h-48"><LoaderCircle className="h-6 w-6 animate-spin" /></div>
                            ) : starredProblems.length > 0 ? (
                                <ScrollArea className="h-48">
                                    <div className="space-y-2 p-4">
                                        {starredProblems.map(problem => (
                                            <Link key={problem.id} href={`/problems/apex/${encodeURIComponent(problem.categoryName)}/${problem.id}`} className="block">
                                                <div className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors">
                                                    <span className="font-medium text-sm">{problem.title}</span>
                                                    <Badge variant="outline" className={getDifficultyClass(problem.difficulty)}>{problem.difficulty}</Badge>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <p className="text-muted-foreground text-center py-4 text-sm">Star problems in the workspace to see them here.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-12 lg:col-span-8 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <PieChartIcon className="h-5 w-5" />
                                Contribution Graph
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
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

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Achievements</CardTitle>
                            <CardDescription>Badges earned from your activity.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-60 -mx-4">
                                {achievements.length > 0 ? (
                                     <TooltipProvider>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
                                            {achievements.map((achievement: Achievement) => (
                                                <Tooltip key={achievement.name}>
                                                    <TooltipTrigger>
                                                        <Card className="p-4 flex flex-col items-center gap-2 shadow-sm aspect-square justify-center hover:shadow-md hover:-translate-y-1 transition-all">
                                                            <div className="w-16 h-16 flex items-center justify-center">
                                                                <div
                                                                className="hexagon-clip w-full h-full flex items-center justify-center"
                                                                style={{ backgroundColor: achievement.color ? `${achievement.color}20` : '#fbbf2420' }}
                                                                >
                                                                <DynamicLucideIcon name={achievement.icon || 'Award'} className="h-8 w-8" style={{ color: achievement.color || '#fbbf24' }} />
                                                                </div>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="font-bold text-sm truncate">{achievement.name}</p>
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                    {formatDistanceToNow(new Date(achievement.date), { addSuffix: true })}
                                                                </p>
                                                            </div>
                                                        </Card>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{achievement.description}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    </TooltipProvider>
                                ) : (
                                    <div className="flex items-center justify-center h-full py-10">
                                        <p className="text-muted-foreground text-center text-sm">No achievements yet. Keep coding!</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-72">
                                {recentlySolvedProblems.length > 0 ? (
                                    <div className="space-y-2 p-4">
                                        {recentlySolvedProblems.map(problem => (
                                            <Link key={problem.id} href={`/problems/apex/${encodeURIComponent(problem.categoryName || '')}/${problem.id}`} className="block">
                                                <div className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors">
                                                    <div>
                                                        <p className="font-medium">{problem.title}</p>
                                                        <p className="text-sm text-muted-foreground">Solved {formatDistanceToNow(new Date(problem.solvedAt), { addSuffix: true })}</p>
                                                    </div>
                                                    <Badge variant="outline" className={getDifficultyClass(problem.difficulty || '')}>{problem.difficulty}</Badge>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-center py-4 text-sm">No problems solved yet. Get started!</p>
                                )}
                            </ScrollArea>
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

    