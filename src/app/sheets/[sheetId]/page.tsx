
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProblemSheet, Problem, ApexProblemsData } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { toggleSheetSubscription } from '../actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Copy, Users, UserPlus, UserCheck, FileText, CheckCircle2, Circle, Search, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProblemDetailWithCategory = Problem & { categoryName: string };

export default function SheetDisplayPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user: authUser, userData, isPro } = useAuth();
    const sheetId = params.sheetId as string;
    
    const [sheet, setSheet] = useState<ProblemSheet | null>(null);
    const [problems, setProblems] = useState<ProblemDetailWithCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscribersCount, setSubscribersCount] = useState(0);
    const [isSubscribing, setIsSubscribing] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [difficultyFilter, setDifficultyFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");

    useEffect(() => {
        if (!sheetId || !db) return;
    
        setLoading(true);
        const sheetDocRef = doc(db, 'problem-sheets', sheetId);
    
        const unsubscribe = onSnapshot(sheetDocRef, async (sheetSnap) => {
            if (!sheetSnap.exists()) {
                toast({ variant: 'destructive', title: 'Sheet not found' });
                setSheet(null);
                setProblems([]);
                setLoading(false);
                return;
            }
            
            const sheetData = { id: sheetSnap.id, ...sheetSnap.data() } as ProblemSheet;
            setSheet(sheetData);

            const subscribers = sheetData.subscribers || [];
            setSubscribersCount(subscribers.length);
            if (authUser) {
                setIsSubscribed(subscribers.includes(authUser.uid));
            } else {
                setIsSubscribed(false);
            }
            
            if (sheetData.problemIds && sheetData.problemIds.length > 0) {
                const apexDocRef = doc(db, "problems", "Apex");
                const apexSnap = await getDoc(apexDocRef);
                
                if (apexSnap.exists()) {
                    const categoriesData = apexSnap.data().Category as ApexProblemsData;
                    const allProblems = Object.entries(categoriesData).flatMap(([categoryName, categoryData]) => 
                        (categoryData.Questions || []).map(problem => ({ ...problem, categoryName }))
                    );

                    const problemIdsSet = new Set(sheetData.problemIds);
                    const sheetProblems = allProblems.filter(p => problemIdsSet.has(p.id));
                    
                    const sortedProblems = sheetData.problemIds.map(id => 
                        sheetProblems.find(p => p.id === id)
                    ).filter((p): p is ProblemDetailWithCategory => p !== undefined);

                    setProblems(sortedProblems);
                }
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching sheet:", error);
            toast({ variant: 'destructive', title: 'Failed to load sheet' });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [sheetId, toast, authUser]);

    const filteredProblems = useMemo(() => {
        return problems
          .filter((p) => {
            if (statusFilter === "All") return true;
            const isSolved = !!userData?.solvedProblems?.[p.id];
            if (statusFilter === "Solved") return isSolved;
            if (statusFilter === "Unsolved") return !isSolved;
            return true;
          })
          .filter((p) => difficultyFilter === "All" || p.difficulty === difficultyFilter)
          .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [problems, searchTerm, difficultyFilter, statusFilter, userData]);

    const uniqueCategories = useMemo(() => {
        if (!problems || problems.length === 0) return [];
        const categorySet = new Set(problems.map(p => p.categoryName));
        return Array.from(categorySet);
    }, [problems]);
    
    const difficultyStats = useMemo(() => {
        if (!problems || problems.length === 0) {
            return { Easy: 0, Medium: 0, Hard: 0, total: 0 };
        }
        const stats = problems.reduce((acc, problem) => {
            const difficulty = problem.difficulty as keyof typeof acc;
            if (difficulty in acc) {
                acc[difficulty]++;
            }
            return acc;
        }, { Easy: 0, Medium: 0, Hard: 0 });

        return { ...stats, total: problems.length };
    }, [problems]);

    const getPercentage = (count: number, total: number) => {
        if (total === 0) return 0;
        return (count / total) * 100;
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied to clipboard!' });
    };

    const handleToggleSubscription = async () => {
        if (!authUser) {
            toast({ variant: 'destructive', title: 'Please log in to subscribe.' });
            return;
        }
        if (isSubscribing || !db) return;
    
        setIsSubscribing(true);
    
        const result = await toggleSheetSubscription(authUser.uid, sheetId, isSubscribed);

        if (result.success) {
            toast({
                title: isSubscribed ? 'Unsubscribed successfully' : 'Subscribed successfully',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'An error occurred',
                description: result.error,
            });
        }
        setIsSubscribing(false);
    };

    const getDifficultyBadgeClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
          case 'easy': return 'bg-green-400/20 text-green-400 border-green-400/30';
          case 'medium': return 'bg-primary/20 text-primary border-primary/30';
          case 'hard': return 'bg-destructive/20 text-destructive border-destructive/30';
          default: return 'bg-muted';
        }
    };
    
    const timeAgo = useMemo(() => {
        if (!sheet?.createdAt) return '';
        try {
            if (sheet.createdAt && typeof sheet.createdAt.toDate === 'function') {
                return formatDistanceToNow(sheet.createdAt.toDate(), { addSuffix: true });
            }
        } catch (e) {
            console.error("Error formatting date:", e);
        }
        return '';
    }, [sheet]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!sheet) {
         return (
            <main className="flex-1 container py-8 flex items-center justify-center text-center">
                <div>
                    <h1 className="text-2xl font-bold text-destructive">Sheet Not Found</h1>
                    <p className="text-muted-foreground">The requested problem sheet could not be found.</p>
                    <Button asChild className="mt-4" variant="outline"><Link href="/problem-sheets">Create a Sheet</Link></Button>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 container py-8">
            <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => router.push('/problem-sheets')}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Back to Problem Sheets</span>
                </Button>
            </div>
            
            <Card className="mb-8">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div className="flex-1">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg mt-1">
                                    <FileText className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-3xl font-headline">{sheet.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-2 mt-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={sheet.creatorAvatarUrl} alt={sheet.creatorName} />
                                            <AvatarFallback>{sheet.creatorName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span>Created by {sheet.creatorName} {timeAgo}</span>
                                    </CardDescription>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0">
                            <div className="flex flex-row items-center gap-4">
                                <Button onClick={handleToggleSubscription} disabled={!authUser || isSubscribing}>
                                    {isSubscribing ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : isSubscribed ? (
                                        <UserCheck className="mr-2 h-4 w-4" />
                                    ) : (
                                        <UserPlus className="mr-2 h-4 w-4" />
                                    )}
                                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                                </Button>
                                <Button onClick={handleCopyLink} variant="outline"><Copy className="mr-2 h-4 w-4" /> Copy Link</Button>
                            </div>
                            <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span>{subscribersCount} {subscribersCount === 1 ? 'Subscriber' : 'Subscribers'}</span>
                            </div>
                        </div>
                    </div>
                    {(uniqueCategories.length > 0 || problems.length > 0) && (
                        <div className="border-t pt-4 mt-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2">
                                {uniqueCategories.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">TOPICS COVERED</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {uniqueCategories.map(category => (
                                                <Badge key={category} variant="secondary">{category}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="md:col-span-1">
                                {problems.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">DIFFICULTY BREAKDOWN</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="w-16 text-muted-foreground">Easy</span>
                                                <div className="flex-1 bg-muted rounded-full h-2">
                                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${getPercentage(difficultyStats.Easy, difficultyStats.total)}%` }}></div>
                                                </div>
                                                <span className="w-8 text-right font-semibold">{difficultyStats.Easy}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-16 text-muted-foreground">Medium</span>
                                                <div className="flex-1 bg-muted rounded-full h-2">
                                                    <div className="bg-primary h-2 rounded-full" style={{ width: `${getPercentage(difficultyStats.Medium, difficultyStats.total)}%` }}></div>
                                                </div>
                                                <span className="w-8 text-right font-semibold">{difficultyStats.Medium}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-16 text-muted-foreground">Hard</span>
                                                <div className="flex-1 bg-muted rounded-full h-2">
                                                    <div className="bg-destructive h-2 rounded-full" style={{ width: `${getPercentage(difficultyStats.Hard, difficultyStats.total)}%` }}></div>
                                                </div>
                                                <span className="w-8 text-right font-semibold">{difficultyStats.Hard}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardHeader>
            </Card>
            
            {problems.length > 0 && (
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                        placeholder="Search problems..."
                        className="w-full pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            <SelectItem value="Solved">Solved</SelectItem>
                            <SelectItem value="Unsolved">Unsolved</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Difficulties</SelectItem>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
            
            {filteredProblems.length > 0 ? (
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Difficulty</TableHead>
                                <TableHead className="w-[80px] text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProblems.map((problem, index) => {
                                const isLocked = problem.isPremium && !isPro;
                                return (
                                <TableRow 
                                    key={problem.id} 
                                    className={cn(
                                        "cursor-pointer hover:bg-muted/50",
                                        isLocked && "cursor-not-allowed opacity-60 hover:bg-transparent"
                                    )}
                                    onClick={() => {
                                        if (isLocked) {
                                            router.push('/pricing');
                                        } else {
                                            router.push(`/problems/apex/${encodeURIComponent(problem.categoryName || '')}/${problem.id}`)
                                        }
                                    }}>
                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {isLocked && <Lock className="h-4 w-4 text-primary shrink-0" />}
                                            <span className={cn(isLocked && "filter blur-sm")}>{problem.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="secondary">{problem.categoryName}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="outline" className={cn("w-20 justify-center", getDifficultyBadgeClass(problem.difficulty))}>
                                            {problem.difficulty}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center">
                                            {userData?.solvedProblems?.[problem.id] ? (
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-muted-foreground/50" />
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{problems.length > 0 ? "No problems found for the selected criteria." : "This sheet has no problems yet."}</p>
                </div>
            )}
        </main>
    );
}
