
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Course } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

import { Loader2, BookOpen, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { isPro, userData } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      if (!db) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const coursesRef = collection(db, "courses");
        const q = query(coursesRef, where("isPublished", "==", true));
        const querySnapshot = await getDocs(q);
        const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {courses.map((course) => {
            const isLocked = course.isPremium && !isPro;

            return (
            <Card key={course.id} className="overflow-hidden transition-shadow duration-300 hover:shadow-xl flex flex-col group">
                <Link href={`/courses/${course.id}`} className="block">
                    <div className="aspect-video relative">
                        <Image 
                           src={course.thumbnailUrl || 'https://placehold.co/600x400.png'} 
                           alt={course.title || 'Course thumbnail'}
                           fill
                           sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                           className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                </Link>
                <CardContent className="p-4 flex flex-col flex-grow">
                    <Badge variant="secondary" className="w-fit mb-2 flex items-center gap-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200 border-yellow-200 dark:border-yellow-500/30">
                        <Star className="h-3.5 w-3.5" />
                        <span className="font-semibold">4.6 (103.4k+)</span>
                    </Badge>
                    <h3 className="font-semibold text-base leading-snug flex-grow">
                        <Link href={`/courses/${course.id}`} className="hover:underline">
                            {course.title || 'Untitled Course'}
                        </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {course.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5"/>
                            <span>{course.modules.length} {course.modules.length === 1 ? 'module' : 'modules'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5"/>
                            <span>451k+ learners</span>
                        </div>
                    </div>
                </CardContent>
                <div className="p-4 pt-0 mt-auto">
                    <Button asChild className="w-full" size="sm">
                        <Link href={`/courses/${course.id}`}>Enroll Now</Link>
                    </Button>
                </div>
            </Card>
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
  );
}
