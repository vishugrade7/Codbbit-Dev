
"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProblemSheet } from "@/types";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2, PlusCircle, Users, Search, ClipboardList, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const cardColorClasses = [
  "bg-green-100 text-green-800 border-green-200/80 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/60",
  "bg-amber-100 text-amber-800 border-amber-200/80 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/60",
  "bg-violet-100 text-violet-800 border-violet-200/80 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700/60",
  "bg-sky-100 text-sky-800 border-sky-200/80 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700/60",
  "bg-rose-100 text-rose-800 border-rose-200/80 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700/60",
  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200/80 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 dark:border-fuchsia-700/60",
];

const FilterSidebar = ({ filterMode, setFilterMode, searchTerm, setSearchTerm, authUser }: { filterMode: string; setFilterMode: (mode: 'all' | 'my-sheets' | 'following') => void; searchTerm: string; setSearchTerm: (term: string) => void; authUser: any; }) => {
    
    const filterOptions = [
        { label: 'All Sheets', value: 'all', disabled: false },
        { label: 'My Sheets', value: 'my-sheets', disabled: !authUser },
        { label: 'Following', value: 'following', disabled: !authUser },
    ];

    return (
        <aside className="md:col-span-3 lg:col-span-3 space-y-6">
            <div className="p-4 rounded-lg border bg-card">
                 <h3 className="text-lg font-semibold mb-4">Filters</h3>
                 <div className="relative w-full mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search sheets..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="space-y-2">
                    {filterOptions.map(option => (
                        <button 
                            key={option.value}
                            onClick={() => !option.disabled && setFilterMode(option.value as any)}
                            disabled={option.disabled}
                            className={cn(
                                "w-full flex items-center justify-between p-3 rounded-md text-sm font-medium transition-colors",
                                "disabled:cursor-not-allowed disabled:opacity-50",
                                filterMode === option.value 
                                    ? "bg-primary text-primary-foreground" 
                                    : "hover:bg-muted"
                            )}
                        >
                            <span>{option.label}</span>
                            {filterMode === option.value && <Check className="h-5 w-5"/>}
                        </button>
                    ))}
                </div>
            </div>
             <div className="p-4 rounded-lg border bg-card text-center">
                 <h3 className="text-lg font-semibold mb-2">Create Your Own!</h3>
                 <p className="text-sm text-muted-foreground mb-4">Have a specific set of problems in mind? Create a custom sheet to share.</p>
                 <Button asChild className="w-full">
                    <Link href="/problem-sheets/create">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Sheet
                    </Link>
                </Button>
            </div>
        </aside>
    )
}

export default function ProblemSheetsListPage() {
  const [sheets, setSheets] = useState<ProblemSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser, userData } = useAuth();
  const [filterMode, setFilterMode] = useState<'all' | 'my-sheets' | 'following'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredSheets = useMemo(() => {
    let filtered = sheets;
    
    if (filterMode === 'following') {
      if (!userData?.subscribedSheetIds) filtered = [];
      else {
        const subscribedIds = new Set(userData.subscribedSheetIds);
        filtered = sheets.filter(sheet => subscribedIds.has(sheet.id));
      }
    } else if (filterMode === 'my-sheets') {
        if (!authUser) filtered = [];
        else {
          filtered = sheets.filter(sheet => sheet.createdBy === authUser.uid);
        }
    }
    
    if (searchTerm) {
        filtered = filtered.filter(sheet => sheet.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    return filtered;
  }, [sheets, filterMode, userData, authUser, searchTerm]);

  return (
    <main className="flex-1 container py-8">
      <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Problem Sheets</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
              Browse community-created problem sheets or create your own for targeted practice.
          </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <FilterSidebar filterMode={filterMode} setFilterMode={setFilterMode} searchTerm={searchTerm} setSearchTerm={setSearchTerm} authUser={authUser} />

          <div className="md:col-span-9 lg:col-span-9">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              ) : filteredSheets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredSheets.map((sheet, index) => {
                    const subscribersCount = sheet.subscribers?.length || 0;
                    const colorClass = cardColorClasses[index % cardColorClasses.length];

                    return (
                      <Link key={sheet.id} href={`/sheets/${sheet.id}`} className="block group">
                        <Card className={cn("transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 h-full", colorClass)}>
                            <CardContent className="p-5 flex flex-col h-full">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-2 rounded-lg bg-foreground/10">
                                      <ClipboardList className="h-6 w-6" />
                                    </div>
                                    <h3 className="font-semibold text-xl flex-1">{sheet.name}</h3>
                                </div>

                                <div className="flex-grow grid grid-cols-2 gap-4 my-4">
                                    <div>
                                        <p className="text-sm opacity-80">Questions</p>
                                        <p className="text-2xl font-bold">{sheet.problemIds.length}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm opacity-80">Followers</p>
                                        <p className="text-2xl font-bold">{subscribersCount}</p>
                                    </div>
                                </div>

                                <Separator className="bg-foreground/10 my-2" />

                                <div className="flex justify-between items-center text-sm">
                                    <span className="opacity-80">Created by @{sheet.creatorUsername}</span>
                                    <div className="px-4 py-1.5 rounded-full bg-foreground/10 font-semibold hover:bg-foreground/20 transition-colors">
                                        View
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                  <div className="text-center py-16 border-2 border-dashed rounded-lg col-span-full">
                      <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">
                          {searchTerm ? 'No sheets found' : 'No sheets to display'}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                          {searchTerm ? `Your search for "${searchTerm}" did not return any results.` : 'Try a different filter or create a new sheet.'}
                      </p>
                  </div>
              )}
          </div>
      </div>
    </main>
  );
}
