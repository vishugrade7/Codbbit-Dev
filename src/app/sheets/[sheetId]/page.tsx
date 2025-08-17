
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowLeft, Copy, Users, UserPlus, UserCheck, CheckCircle2, Circle, Search, Lock, Filter, ChevronsUp, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Input } from "@/components/ui/input";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';


type ProblemDetailWithCategory = Problem & { categoryName: string };

const SheetDetails = ({ sheet, totalProgress, solvedStats, difficultyStats, uniqueCategories, topicFilter, setTopicFilter }: { sheet: ProblemSheet, totalProgress: number, solvedStats: any, difficultyStats: any, uniqueCategories: string[], topicFilter: string, setTopicFilter: (filter: string) => void }) => {
    const { toast } = useToast();
    const { authUser } = useAuth();
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscribersCount, setSubscribersCount] = useState(sheet.subscribers?.length || 0);

     useEffect(() => {
        const subscribers = sheet.subscribers || [];
        setSubscribersCount(subscribers.length);
        if (authUser) {
            setIsSubscribed(subscribers.includes(authUser.uid));
        } else {
            setIsSubscribed(false);
        }
    }, [sheet.subscribers, authUser]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Link copied to clipboard!' });
    };

    const handleToggleSubscription = async () => {
        if (!authUser) {
            toast({ variant: 'destructive', title: 'Please log in to follow.' });
            return;
        }
        if (isSubscribing || !db) return;
    
        setIsSubscribing(true);
    
        const result = await toggleSheetSubscription(authUser.uid, sheet.id, isSubscribed);

        if (result.success) {
            toast({
                title: isSubscribed ? 'Unfollowed successfully' : 'Followed successfully',
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

    return (
        <aside className="space-y-8">
            <section>
                <h1 className="text-3xl font-bold font-headline mb-2">{sheet.name}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                    <Button size="sm" onClick={handleToggleSubscription} disabled={!authUser || isSubscribing}>
                        {isSubscribing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : isSubscribed ? (
                            <UserCheck className="mr-2 h-4 w-4" />
                        ) : (
                            <UserPlus className="mr-2 h-4 w-4" />
                        )}
                        {isSubscribed ? 'Following' : 'Follow'}
                    </Button>
                    <Button size="sm" onClick={handleCopyLink} variant="outline"><Copy className="mr-2 h-4 w-4" /> Copy Link</Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={sheet.creatorAvatarUrl} alt={sheet.creatorName} />
                        <AvatarFallback>{sheet.creatorName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>Created by {sheet.creatorName} {timeAgo}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{subscribersCount} {subscribersCount === 1 ? 'follower' : 'followers'}</span>
                </div>
            </section>
            
            <Separator />

            <section>
                <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground mb-4">Progress</h2>
                <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{Math.round(totalProgress)}%</span>
                <span className="text-sm text-muted-foreground">{solvedStats.total} / {difficultyStats.total} solved</span>
                </div>
                <Progress value={totalProgress} className="h-2 mb-4" />
                <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                        <span className="w-14 shrink-0 text-muted-foreground">Easy</span>
                        <Progress value={(solvedStats.Easy / (difficultyStats.Easy || 1)) * 100} className="h-1.5 [&>div]:bg-green-500" />
                        <span className="w-8 shrink-0 text-right font-medium">{solvedStats.Easy}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="w-14 shrink-0 text-muted-foreground">Medium</span>
                        <Progress value={(solvedStats.Medium / (difficultyStats.Medium || 1)) * 100} className="h-1.5 [&>div]:bg-amber-500" />
                        <span className="w-8 shrink-0 text-right font-medium">{solvedStats.Medium}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="w-14 shrink-0 text-muted-foreground">Hard</span>
                        <Progress value={(solvedStats.Hard / (difficultyStats.Hard || 1)) * 100} className="h-1.5 [&>div]:bg-red-500" />
                        <span className="w-8 shrink-0 text-right font-medium">{solvedStats.Hard}</span>
                    </div>
                </div>
            </section>
            
            <Separator />

            <section>
                <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground mb-4">Topics Covered</h2>
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={topicFilter === "All Topics" ? 'default' : "outline"} onClick={() => setTopicFilter("All Topics")}>All Topics</Button>
                    {uniqueCategories.map(category => (
                        <Button key={category} size="sm" variant={topicFilter === category ? "default" : "outline"} onClick={() => setTopicFilter(category)}>
                            {category}
                        </Button>
                    ))}
                </div>
            </section>
        </aside>
    );
};


export default function SheetDisplayPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user: authUser, userData, isPro } = useAuth();
    const sheetId = params.sheetId as string;
    
    const [sheet, setSheet] = useState<ProblemSheet | null>(null);
    const [problems, setProblems] = useState<ProblemDetailWithCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [topicFilter, setTopicFilter] = useState("All Topics");
    
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isSearchOpen) {
            searchInputRef.current?.focus();
        }
    }, [isSearchOpen]);

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
    }, [sheetId, toast]);

    const filteredProblems = useMemo(() => {
        return problems
          .filter((p) => {
            if (statusFilter === "All") return true;
            const isSolved = !!userData?.solvedProblems?.[p.id];
            if (statusFilter === "Solved") return isSolved;
            if (statusFilter === "Unsolved") return !isSolved;
            return true;
          })
          .filter((p) => topicFilter === "All Topics" || p.categoryName === topicFilter)
          .filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [problems, searchTerm, statusFilter, topicFilter, userData]);

    const uniqueCategories = useMemo(() => {
        if (!problems || problems.length === 0) return [];
        const categorySet = new Set(problems.map(p => p.categoryName));
        return Array.from(categorySet).sort();
    }, [problems]);
    
    const { solvedStats, totalProgress } = useMemo(() => {
        if (!problems || problems.length === 0 || !userData?.solvedProblems) {
            return {
                solvedStats: { Easy: 0, Medium: 0, Hard: 0, total: 0 },
                totalProgress: 0,
            };
        }
        
        const solvedIds = new Set(Object.keys(userData.solvedProblems));
        const stats = problems.reduce((acc, problem) => {
            if (solvedIds.has(problem.id)) {
                acc[problem.difficulty as keyof typeof acc]++;
            }
            return acc;
        }, { Easy: 0, Medium: 0, Hard: 0 });

        const totalSolved = stats.Easy + stats.Medium + stats.Hard;
        const totalProgressCalc = problems.length > 0 ? (totalSolved / problems.length) * 100 : 0;
        
        return {
            solvedStats: { ...stats, total: totalSolved },
            totalProgress: totalProgressCalc
        };
    }, [problems, userData?.solvedProblems]);

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

    const getDifficultyBadgeClass = (difficulty: string) => {
        switch (difficulty?.toLowerCase()) {
          case 'easy': return 'bg-green-100 text-green-800 border-green-200/80 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/60';
          case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200/80 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/60';
          case 'hard': return 'bg-red-100 text-red-800 border-red-200/80 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700/60';
          default: return 'bg-muted';
        }
    };
    
    const statusOptions = ['All Statuses', 'Solved', 'Unsolved'];
    const getStatusValue = (option: string) => {
        if (option === 'All Statuses') return 'All';
        return option;
    }

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
        <main className="flex-1 container mx-auto px-4 md:px-6 py-8 flex flex-col h-screen">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                {/* --- Left Column (Desktop) --- */}
                <div className="hidden lg:block lg:col-span-1 h-full overflow-hidden">
                    <ScrollArea className="h-full pr-4">
                        <SheetDetails sheet={sheet} totalProgress={totalProgress} solvedStats={solvedStats} difficultyStats={difficultyStats} uniqueCategories={uniqueCategories} topicFilter={topicFilter} setTopicFilter={setTopicFilter} />
                    </ScrollArea>
                </div>

                {/* --- Right Column --- */}
                <div className="lg:col-span-2 flex flex-col overflow-hidden">
                    <header className="flex items-center justify-between gap-4 mb-4">
                        <Button variant="ghost" onClick={() => router.push('/problem-sheets')} className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <div className="flex items-center gap-2">
                            {isSearchOpen ? (
                                <div className="relative w-48">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        ref={searchInputRef}
                                        placeholder="Search..."
                                        className="w-full pl-9 h-9 rounded-full bg-background"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onBlur={() => setIsSearchOpen(false)}
                                    />
                                </div>
                            ) : (
                                <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
                                    <Search className="h-5 w-5" />
                                </Button>
                            )}

                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Filter className="h-5 w-5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-0" align="end">
                                    <div className="py-2">
                                        <p className="text-sm font-medium px-4 mb-2">Status</p>
                                        {statusOptions.map(option => (
                                            <button
                                                key={option}
                                                className="flex items-center w-full px-4 py-1.5 text-sm text-left hover:bg-accent"
                                                onClick={() => setStatusFilter(getStatusValue(option))}
                                            >
                                                <span className={cn("h-2 w-2 rounded-full mr-3", getStatusValue(statusFilter) === getStatusValue(option) ? "bg-primary" : "bg-transparent")}></span>
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </header>

                    <ScrollArea className="flex-1 -mx-4 md:mx-0 pb-24 lg:pb-0">
                        <div className="rounded-none md:rounded-lg border-y md:border-x">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px] pl-4 md:pl-auto">#</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead className="hidden md:table-cell">Category</TableHead>
                                        <TableHead className="hidden md:table-cell">Difficulty</TableHead>
                                        <TableHead className="w-[80px] text-center pr-4 md:pr-auto">Status</TableHead>
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
                                            <TableCell className="font-medium text-muted-foreground pl-4 md:pl-auto">{problems.findIndex(p => p.id === problem.id) + 1}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {isLocked && <Lock className="h-4 w-4 text-primary shrink-0" />}
                                                    <span className={cn("font-medium", isLocked && "filter blur-sm")}>{problem.title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell"><Badge variant="outline">{problem.categoryName}</Badge></TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <Badge variant="outline" className={cn("font-medium", getDifficultyBadgeClass(problem.difficulty))}>
                                                    {problem.difficulty}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-4 md:pr-auto">
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
                         {filteredProblems.length === 0 && (
                             <div className="text-center py-16 text-muted-foreground">
                                <p>No problems match the current filters.</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>
             {/* Mobile "View Details" button */}
             <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t rounded-t-2xl">
                <p className="text-center font-bold mb-2">{sheet.name}</p>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button size="lg" className="w-full font-bold">
                            View Details
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[90vh]">
                        <SheetHeader>
                            <SheetTitle>Sheet Details</SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="h-[calc(90vh-4rem)] mt-4">
                            <SheetDetails sheet={sheet} totalProgress={totalProgress} solvedStats={solvedStats} difficultyStats={difficultyStats} uniqueCategories={uniqueCategories} topicFilter={topicFilter} setTopicFilter={setTopicFilter} />
                        </ScrollArea>
                    </SheetContent>
                </Sheet>
            </div>
        </main>
    );
}
