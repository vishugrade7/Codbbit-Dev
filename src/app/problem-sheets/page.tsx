
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProblemSheet } from "@/types";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Users, Pencil, Bookmark, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toggleSheetFollow } from "../sheets/actions";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


const cardColorClasses = [
  "bg-sky-100/50 dark:bg-sky-900/30 hover:border-sky-500/50",
  "bg-amber-100/50 dark:bg-amber-900/30 hover:border-amber-500/50",
  "bg-emerald-100/50 dark:bg-emerald-900/30 hover:border-emerald-500/50",
  "bg-violet-100/50 dark:bg-violet-900/30 hover:border-violet-500/50",
  "bg-rose-100/50 dark:bg-rose-900/30 hover:border-rose-500/50",
  "bg-fuchsia-100/50 dark:bg-fuchsia-900/30 hover:border-fuchsia-500/50",
];

export default function ProblemSheetsListPage() {
  const [sheets, setSheets] = useState<ProblemSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser, userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [filterMode, setFilterMode] = useState<'all' | 'my-sheets' | 'following'>('all');
  const [isTogglingFollow, setIsTogglingFollow] = useState<string | null>(null);

  useEffect(() => {
    const fetchSheets = async () => {
      if (!db) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const sheetsRef = collection(db, "problem-sheets");
        const q = query(sheetsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const sheetsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProblemSheet));
        setSheets(sheetsData);
      } catch (error) {
        console.error("Error fetching problem sheets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSheets();
  }, []);

  const handleFollow = async (sheetId: string) => {
    if (!authUser) {
        toast({ variant: 'destructive', title: 'Please log in to follow sheets.' });
        return;
    }
    setIsTogglingFollow(sheetId);
    const isCurrentlyFollowing = userData?.followingSheetIds?.includes(sheetId) ?? false;
    const result = await toggleSheetFollow(authUser.uid, sheetId, isCurrentlyFollowing);

    if (result.success) {
        toast({
            title: result.message,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'An error occurred',
            description: result.error,
        });
    }
    setIsTogglingFollow(null);
  };

  const filteredSheets = useMemo(() => {
    if (filterMode === 'following') {
      if (!userData?.followingSheetIds) return [];
      const followingIds = new Set(userData.followingSheetIds);
      return sheets.filter(sheet => followingIds.has(sheet.id));
    }
    if (filterMode === 'my-sheets') {
        if (!authUser) return [];
        return sheets.filter(sheet => sheet.createdBy === authUser.uid);
    }
    return sheets;
  }, [sheets, filterMode, userData, authUser]);

  const getRelativeDate = (date: any) => {
    if (!date) return 'Just now';
    try {
      return formatDistanceToNow(date.toDate(), { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  return (
    <main className="flex-1 container py-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
          <div>
              <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Problem Sheets</h1>
              <p className="text-muted-foreground mt-4 max-w-2xl">
                  Browse community-created problem sheets or create your own.
              </p>
          </div>
           <Button asChild>
              <Link href="/problem-sheets/create">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Sheet
              </Link>
          </Button>
      </div>

      <div className="flex justify-between items-center mb-8">
          <Tabs value={filterMode} onValueChange={(value) => setFilterMode(value as any)} className="w-auto">
              <TabsList>
                  <TabsTrigger value="all">All Sheets</TabsTrigger>
                  <TabsTrigger value="my-sheets" disabled={!authUser}>My Sheets</TabsTrigger>
                  <TabsTrigger value="following" disabled={!authUser}>Following</TabsTrigger>
              </TabsList>
          </Tabs>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : filteredSheets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSheets.map((sheet, index) => {
            const isCreator = authUser?.uid === sheet.createdBy;
            const followersCount = sheet.followers?.length || 0;
            const colorClass = cardColorClasses[index % cardColorClasses.length];
            const totalProblems = sheet.problemIds.length;
            const solvedCount = authUser && userData ? sheet.problemIds.filter(id => userData.solvedProblems?.[id]).length : 0;
            const progressPercentage = totalProblems > 0 ? (solvedCount / totalProblems) * 100 : 0;
            const isFollowed = !!(authUser && userData?.followingSheetIds?.includes(sheet.id));
            const isTogglingThisFollow = isTogglingFollow === sheet.id;

            return (
              <div key={sheet.id} className="relative group">
                {isCreator && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-3 right-3 h-8 w-8 z-10 bg-card/80 hover:bg-card"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/problem-sheets/create?id=${sheet.id}`);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit Sheet</span>
                  </Button>
                )}
                {!isCreator && authUser && (
                  <div className="absolute top-3 right-3 z-10">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-card/80 hover:bg-card"
                            onClick={(e) => {
                              e.preventDefault();
                              handleFollow(sheet.id);
                            }}
                            disabled={isTogglingThisFollow}
                           >
                            {isTogglingThisFollow ? <Loader2 className="h-4 w-4 animate-spin"/> : <Bookmark className={cn("h-4 w-4", isFollowed && "fill-current")}/>}
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isFollowed ? "Unfollow" : "Follow"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                  <Card className={cn(
                      "flex flex-col transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1.5 border-transparent backdrop-blur-sm h-full",
                      colorClass
                  )}>
                    <Link href={`/sheets/${sheet.id}`} className="block flex-grow">
                      <CardHeader>
                          <CardTitle className="pr-10">{sheet.name}</CardTitle>
                          <CardDescription>
                            {sheet.problemIds.length} {sheet.problemIds.length === 1 ? "Problem" : "Problems"}
                          </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow flex flex-col justify-end">
                        {authUser && totalProblems > 0 && (
                            <div className="mb-4">
                                <Progress value={progressPercentage} className="h-2" />
                                <p className="text-xs text-muted-foreground mt-1 text-right">{solvedCount} / {totalProblems} solved</p>
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={sheet.creatorAvatarUrl} alt={sheet.creatorName} />
                                    <AvatarFallback>{sheet.creatorName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>
                                    By {sheet.creatorName}
                                </span>
                            </div>
                        </div>
                      </CardContent>
                    </Link>
                     <CardFooter className="flex-col items-stretch gap-3 !pt-4">
                        <div className="flex justify-between w-full items-center text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                               <Users className="h-4 w-4" />
                               <span>{followersCount} {followersCount === 1 ? 'follower' : 'followers'}</span>
                            </div>
                            <span>
                              {getRelativeDate(sheet.createdAt)}
                            </span>
                        </div>
                      </CardFooter>
                  </Card>
              </div>
            );
          })}
        </div>
      ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                  {filterMode === 'all' && 'No Problem Sheets Yet'}
                  {filterMode === 'my-sheets' && 'You haven\'t created any sheets'}
                  {filterMode === 'following' && 'No Followed Sheets'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                  {filterMode === 'all' && 'Get started by creating a new sheet.'}
                  {filterMode === 'my-sheets' && 'Create a sheet to see it here.'}
                  {filterMode === 'following' && 'Follow sheets to see them here.'}
              </p>
          </div>
      )}
    </main>
  );
}
