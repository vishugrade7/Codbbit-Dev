
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Loader2, BookOpen, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { userData } = useAuth();
  const isPro = userData?.razorpaySubscriptionStatus === 'active' || userData?.isAdmin;

  useEffect(() => {
    const fetchCourses = async () => {
      if (!db) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const coursesRef = collection(db, "courses");
        // Removed orderBy to avoid needing a composite index, sorting will be done on the client.
        const q = query(coursesRef, where("isPublished", "==", true));
        const querySnapshot = await getDocs(q);
        const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
        // Sort client-side to ensure newest courses appear first.
        coursesData.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });

        setCourses(coursesData);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Courses</h1>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                Deepen your Salesforce knowledge with our expert-led courses.
            </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => {
              const isLocked = course.isPremium && !isPro;
              return (
              <Link key={course.id} href={`/courses/${course.id}`} className="block group">
                <Card className="h-full overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1.5 border-transparent hover:border-primary/30">
                  <CardContent className="p-0 flex flex-col h-full">
                    <div className="aspect-video relative">
                       {isLocked && (
                          <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center">
                              <Lock className="h-8 w-8 text-white" />
                          </div>
                       )}
                       <Image 
                         src={course.thumbnailUrl || 'https://placehold.co/600x400.png'} 
                         alt={course.title || 'Course thumbnail'}
                         fill
                         sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                         className={cn(
                           "object-cover transition-transform duration-300 group-hover:scale-105",
                           isLocked && "filter blur-sm"
                         )}
                       />
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                        <Badge variant="secondary" className="w-fit mb-2">{course.category}</Badge>
                        <h3 className="text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
                            {course.title || 'Untitled Course'}
                        </h3>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )})}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No courses yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Check back soon for new content!</p>
            </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
