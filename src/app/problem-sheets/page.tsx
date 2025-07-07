
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProblemSheet } from "@/types";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlusCircle, Users, Pencil, Bookmark, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toggleSheetFollow } from "../sheets/actions";

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
          {filteredSheets.map((sheet) => {
            const isCreator = authUser?.uid === sheet.createdBy;
            const followersCount = sheet.followers?.length || 0;
            const totalProblems = sheet.problemIds.length;
            const solvedCount = authUser && userData ? sheet.problemIds.filter(id => userData.solvedProblems?.[id]).length : 0;
            const progressPercentage = totalProblems > 0 ? (solvedCount / totalProblems) * 100 : 0;
            const isFollowed = !!(authUser && userData?.followingSheetIds?.includes(sheet.id));
            const isTogglingThisFollow = isTogglingFollow === sheet.id;

            return (
              <Card key={sheet.id} className="flex flex-col h-full overflow-hidden bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 border">
                  {isCreator && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-10 right-3 h-8 w-8 z-10 bg-card/80 hover:bg-card"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/problem-sheets/create?id=${sheet.id}`);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit Sheet</span>
                    </Button>
                  )}
                  {/* Top progress bar */}
                  {authUser && (
                      <div className="h-[30px] px-3 bg-orange-100 dark:bg-orange-900/30 relative flex items-center">
                          <div 
                              className="h-1.5 bg-orange-400 rounded-full transition-all duration-500"
                              style={{ width: `${progressPercentage}%` }}
                          />
                          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-orange-900 dark:text-orange-200">
                              {Math.round(progressPercentage)}%
                          </span>
                      </div>
                  )}

                  <div className="p-4 flex-grow flex flex-col">
                      <div className="flex justify-between items-start">
                          <Link href={`/sheets/${sheet.id}`} className="block flex-1 pr-4">
                              <CardTitle className="text-base font-bold hover:underline">{sheet.name}</CardTitle>
                          </Link>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                              <Users className="h-4 w-4" />
                              <span>{followersCount.toLocaleString()} Followers</span>
                          </div>
                      </div>

                      {sheet.description && (
                          <Link href={`/sheets/${sheet.id}`} className="block mt-2">
                              <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                                  {sheet.description}
                              </CardDescription>
                          </Link>
                      )}

                      <div className="mt-auto pt-4 flex justify-between items-center">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <ClipboardList className="h-4 w-4" />
                              <span>{sheet.problemIds.length} questions</span>
                          </div>

                          {!isCreator && authUser && (
                              <Button
                                  size="sm"
                                  onClick={(e) => {
                                      e.preventDefault();
                                      handleFollow(sheet.id);
                                  }}
                                  disabled={isTogglingThisFollow}
                                  className={cn(
                                      "w-[110px]",
                                      isFollowed
                                          ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                          : "bg-orange-500 text-white hover:bg-orange-600"
                                  )}
                              >
                                  {isTogglingThisFollow ? <Loader2 className="h-4 w-4 animate-spin"/> : <Bookmark className="h-4 w-4"/>}
                                  <span>{isFollowed ? "Following" : "Follow"}</span>
                              </Button>
                          )}
                      </div>
                  </div>
              </Card>
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
