
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import EditProfileModal from "@/components/edit-profile-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, Globe, Mail, Edit, Trophy, Award, BarChart, GitCommit, User as UserIcon, Github, Linkedin, Twitter, Link as LinkIcon, Loader2, Pencil, PieChart as PieChartIcon, Target } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { doc, getDoc, collection, query, where, onSnapshot, limit } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge";
import type { Problem, ApexProblemsData, User as AppUser } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateAvatar } from "../actions";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ContributionHeatmap from "@/components/contribution-heatmap";

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
        if (authUser.uid !== profileUser?.uid) return; // Can only change own avatar

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
                // The onSnapshot listener will update the state automatically
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


    if (loadingProfile) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

    const stats = [
        { label: "Points", value: profileUser.points.toLocaleString(), icon: Trophy },
        { label: "Global Rank", value: `#${profileUser.rank || 'N/A'}`, icon: Award },
        { label: "Problems Solved", value: Object.keys(profileUser.solvedProblems || {}).length, icon: BarChart },
        { label: "Current Streak", value: `${profileUser.currentStreak || 0} days`, icon: GitCommit },
    ];

    const getDifficultyClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
        case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
        case 'medium': return 'bg-primary/20 text-primary border-primary/30';
        case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
        default: return 'bg-muted';
        }
    };
    
    const DIFFICULTY_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--destructive))'];
    const CATEGORY_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

    const dsaData = [
        { name: 'Easy', value: profileUser.dsaStats?.Easy || 0 },
        { name: 'Medium', value: profileUser.dsaStats?.Medium || 0 },
        { name: 'Hard', value: profileUser.dsaStats?.Hard || 0 },
    ].filter(d => d.value > 0);
    
    const categoryData = profileUser.categoryPoints ? 
        Object.entries(profileUser.categoryPoints).map(([name, value]) => ({ name, value })).filter(d => d.value > 0) 
        : [];

  return (
    <>
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
          <Card className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <div className="relative group" onClick={isOwnProfile ? handleAvatarClick : undefined}>
                    <Avatar className="h-32 w-32 border-4 border-primary">
                        <AvatarImage src={profileUser.avatarUrl} alt={profileUser.name} />
                        <AvatarFallback className="text-4xl">
                            {profileUser.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                    </Avatar>
                    {isOwnProfile && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            {isUploading ? (
                                <Loader2 className="h-8 w-8 animate-spin text-white" />
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
                    <h1 className="text-4xl font-bold font-headline">{profileUser.name}</h1>
                    <p className="text-lg text-muted-foreground">@{profileUser.username}</p>
                    <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            <span>{profileUser.company || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            <span>{profileUser.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            <span>{profileUser.email}</span>
                        </div>
                    </div>
                     <div className="mt-6 flex justify-center md:justify-start gap-2">
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
                      <CardHeader>
                          <CardTitle>Contribution Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                          {profileUser.submissionHeatmap && Object.keys(profileUser.submissionHeatmap).length > 0 ? (
                                <ContributionHeatmap data={profileUser.submissionHeatmap} />
                          ) : (
                                <div className="w-full h-40 bg-card-foreground/5 rounded flex items-center justify-center">
                                    <p className="text-muted-foreground">No contribution data yet.</p>
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
                                <Loader2 className="h-6 w-6 animate-spin" />
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
                  <Card>
                      <CardHeader>
                          <CardTitle>Stats</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                          {stats.map(stat => (
                              <div key={stat.label} className="flex justify-between items-center p-3 rounded-md bg-card/50">
                                  <div className="flex items-center gap-3">
                                      <stat.icon className="h-5 w-5 text-muted-foreground" />
                                      <span className="text-muted-foreground">{stat.label}</span>
                                  </div>
                                  <span className="font-bold text-lg">{stat.value}</span>
                              </div>
                          ))}
                      </CardContent>
                  </Card>

                  <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5" /> Difficulty Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {dsaData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={dsaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                            {dsaData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={DIFFICULTY_COLORS[index % DIFFICULTY_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No problems solved yet.</p>
                            )}
                        </CardContent>
                  </Card>

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
                          {profileUser.achievements && profileUser.achievements.length > 0 ? (
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {profileUser.achievements.map((achievement) => {
                                    const Icon = UserIcon; // Replace with a dynamic icon map if available
                                    return (
                                    <div key={achievement.id} className="flex flex-col items-center text-center gap-2 p-4 rounded-lg bg-card/50">
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
