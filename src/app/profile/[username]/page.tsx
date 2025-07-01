
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import EditProfileModal from "@/components/edit-profile-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, Globe, Mail, Edit, Trophy, Award, BarChart, GitCommit, User as UserIcon, Github, Linkedin, Twitter, Link as LinkIcon, LoaderCircle, Pencil, PieChart as PieChartIcon, Target } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { doc, getDoc, collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import type { Problem, ApexProblemsData, User as AppUser, Achievement } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateAvatar } from "../actions";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ContributionHeatmap from "@/components/contribution-heatmap";
import { ProgressCard } from "@/components/progress-card";

type StarredProblemDetail = Problem & { categoryName: string };

// This is the new public profile page
export default function UserProfilePage() {
    const { user: authUser } = useAuth(); // Logged-in user
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

    const [totalProblemsByDifficulty, setTotalProblemsByDifficulty] = useState<{ Easy: number; Medium: number; Hard: number }>({ Easy: 0, Medium: 0, Hard: 0 });
    const [loadingProblems, setLoadingProblems] = useState(true);

    // Effect to fetch all problem counts
    useEffect(() => {
        const fetchAllProblems = async () => {
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
                    const allProblems = Object.values(categoriesData).flatMap(cat => cat.Questions || []);
                    const counts = allProblems.reduce((acc, problem) => {
                        acc[problem.difficulty as keyof typeof acc] = (acc[problem.difficulty as keyof typeof acc] || 0) + 1;
                        return acc;
                    }, { Easy: 0, Medium: 0, Hard: 0 });
                    setTotalProblemsByDifficulty(counts);
                }
            } catch (error) {
                console.error("Error fetching problem counts:", error);
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

    // Effect to fetch starred problems for the profile being viewed
    useEffect(() => {
        if (!profileUser?.starredProblems || profileUser.starredProblems.length === 0) {
            setLoadingStarred(false);
            setStarredProblems([]);
            return;
        }
        if (!db) {
            setLoadingStarred(false);
            return;
        }

        const fetchStarredProblems = async () => {
            setLoadingStarred(true);
            try {
                const apexDocRef = doc(db, "problems", "Apex");
                const docSnap = await getDoc(apexDocRef);

                if (docSnap.exists()) {
                    const categoriesData = docSnap.data().Category as ApexProblemsData;
                    const allProblemsWithCategory = Object.entries(categoriesData).flatMap(([categoryName, categoryData]) =>
                        (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                    );

                    const starredIds = new Set(profileUser.starredProblems);
                    const details = allProblemsWithCategory.filter(p => starredIds.has(p.id));
                    setStarredProblems(details);
                }
            } catch (error) {
                console.error("Error fetching starred problems:", error);
            } finally {
                setLoadingStarred(false);
            }
        };
        fetchStarredProblems();
    }, [profileUser]);

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
            <div className="flex min-h-screen w-full flex-col bg-background">
              <Header />
              <main className="flex-1 container py-8 flex items-center justify-center text-center">
                <div>
                  <h1 className="text-2xl font-bold text-destructive">{error}</h1>
                  <p className="text-muted-foreground mt-2">The user @{username} could not be found.</p>
                  <Button asChild className="mt-4" onClick={() => router.push('/leaderboard')}>Go to Leaderboard</Button>
                </div>
              </main>
              <Footer />
            </div>
        )
    }

    if (!profileUser) {
        // This case should be covered by error state, but as a fallback
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
        Object.entries(profileUser.categoryPoints).map(([name, value]) => ({ name, value })).filter(d => d.value > 0) 
        : [];
    
    const totalSolved = (profileUser.dsaStats?.Easy || 0) + (profileUser.dsaStats?.Medium || 0) + (profileUser.dsaStats?.Hard || 0);
    const totalAvailable = totalProblemsByDifficulty.Easy + totalProblemsByDifficulty.Medium + totalProblemsByDifficulty.Hard;

  return (
    <>
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative group" onClick={isOwnProfile ? handleAvatarClick : undefined}>
                    <Avatar className="h-24 w-24 border-4 border-primary">
                        <AvatarImage src={profileUser.avatarUrl} alt={profileUser.name} />
                        <AvatarFallback className="text-3xl">
                            {profileUser.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                    </Avatar>
                    {isOwnProfile && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            {isUploading ? (
                                <LoaderCircle className="h-8 w-8 animate-spin text-white" />
                            ) : (
                                <Pencil className="h-8 w-8 text-white" />
                            )}
                        </div>
                    )}
                    {isOwnProfile && (
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg, image/gif"
                        disabled={isUploading}
                    />
                    )}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold font-headline">{profileUser.name}</h1>
                    <p className="text-md text-muted-foreground">@{profileUser.username}</p>
                    <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-4 text-muted-foreground text-sm">
                        <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <span>{profileUser.company || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>{profileUser.country}</span>
                        </div>
                        {profileUser.isEmailPublic && (
                          <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{profileUser.email}</span>
                          </div>
                        )}
                    </div>
                     <div className="mt-4 flex justify-center md:justify-start gap-2">
                        {profileUser.trailheadUrl && (<Button variant="outline" size="icon" asChild><a href={profileUser.trailheadUrl} target="_blank" rel="noopener noreferrer" aria-label="Trailhead Profile"><LinkIcon className="h-5 w-5" /></a></Button>)}
                        {profileUser.githubUrl && (<Button variant="outline" size="icon" asChild><a href={profileUser.githubUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub Profile"><Github className="h-5 w-5" /></a></Button>)}
                        {profileUser.linkedinUrl && (<Button variant="outline" size="icon" asChild><a href={profileUser.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Profile"><Linkedin className="h-5 w-5" /></a></Button>)}
                        {profileUser.twitterUrl && (<Button variant="outline" size="icon" asChild><a href={profileUser.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitter Profile"><Twitter className="h-5 w-5" /></a></Button>)}
                    </div>
                </div>
                {isOwnProfile && <Button variant="outline" onClick={() => setIsEditModalOpen(true)}><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>}
            </div>
          </Card>
          
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                  <Card>
                      <CardContent className="pt-6">
                          {profileUser.submissionHeatmap && Object.keys(profileUser.submissionHeatmap).length > 0 ? (
                                <ContributionHeatmap 
                                    data={profileUser.submissionHeatmap || {}} 
                                    currentStreak={profileUser.currentStreak}
                                    maxStreak={profileUser.maxStreak}
                                />
                          ) : (
                                <div className="w-full h-48 flex flex-col items-start justify-center">
                                    <h3 className="text-xl font-semibold mb-4">
                                        0 submissions in the last year
                                    </h3>
                                    <div className="w-full h-full bg-card-foreground/5 rounded flex items-center justify-center">
                                        <p className="text-muted-foreground">No contribution data yet.</p>
                                    </div>
                                </div>
                          )}
                      </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                        <CardTitle>Starred Problems</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingStarred ? (
                            <div className="flex justify-center items-center h-24">
                                <LoaderCircle className="h-6 w-6 animate-spin" />
                            </div>
                        ) : starredProblems.length > 0 ? (
                            <div className="space-y-2">
                                {starredProblems.map(problem => (
                                    <Link key={problem.id} href={`/problems/apex/${encodeURIComponent(problem.categoryName)}/${problem.id}`} className="block">
                                        <div className="flex items-center justify-between p-3 rounded-md hover:bg-card/50 transition-colors">
                                            <span className="font-medium">{problem.title}</span>
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

              <div className="space-y-8">
                  <ProgressCard 
                    totalSolved={totalSolved}
                    totalAvailable={totalAvailable}
                    easySolved={profileUser.dsaStats?.Easy || 0}
                    easyTotal={totalProblemsByDifficulty.Easy}
                    mediumSolved={profileUser.dsaStats?.Medium || 0}
                    mediumTotal={totalProblemsByDifficulty.Medium}
                    hardSolved={profileUser.dsaStats?.Hard || 0}
                    hardTotal={totalProblemsByDifficulty.Hard}
                  />

                  <Card>
                        <CardHeader>
                           <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Category Points</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {categoryData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No points earned in categories yet.</p>
                            )}
                        </CardContent>
                  </Card>

                   <Card>
                      <CardHeader>
                          <CardTitle>Achievements</CardTitle>
                      </CardHeader>
                      <CardContent>
                          {profileUser.achievements && Object.keys(profileUser.achievements).length > 0 ? (
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.values(profileUser.achievements).sort((a, b) => b.date.seconds - a.date.seconds).map((achievement: Achievement) => {
                                    const Icon = Award; // Use a default icon
                                    return (
                                    <div key={achievement.name} className="flex flex-col items-center text-center gap-2 p-4 rounded-lg bg-card/50">
                                        <Icon className="h-10 w-10 text-primary" />
                                        <h3 className="font-semibold">{achievement.name}</h3>
                                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                                    </div>
                                    )
                                })}
                              </div>
                           ) : (
                                <p className="text-muted-foreground col-span-full text-center">No achievements yet. Keep coding!</p>
                            )}
                      </CardContent>
                  </Card>
              </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    {isOwnProfile && <EditProfileModal isOpen={isEditModalOpen} onOpenChange={setIsEditModalOpen} user={profileUser} />}
    </>
  );
}

    