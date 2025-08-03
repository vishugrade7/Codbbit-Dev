
"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, ArrowRight, BookOpenCheck, FileQuestion, UserCog, MenuIcon, Award, Palette, CreditCard } from "lucide-react";

import { ProblemList, ProblemForm } from "@/components/admin/ProblemManagement";
import { CourseManagementView, CourseForm } from "@/components/admin/CourseManagement";
import { AllUsersList } from "@/components/admin/UserManagement";
import { NavigationManagementView } from "@/components/admin/NavigationManagement";
import { BadgeManagementView } from "@/components/admin/BadgeManagement";
import { BrandManagementView } from "@/components/admin/BrandManagement";
import { PricingManagementView } from "@/components/admin/PricingManagement";
import type { Problem } from "@/types";

type ProblemWithCategory = Problem & { categoryName: string };

function UploadProblemContent() {
    const { user: authUser, userData, loading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const initialView = searchParams.get('view') || 'dashboard';
    const courseId = searchParams.get('courseId');

    const [viewMode, setViewMode] = useState(initialView);
    const [currentProblem, setCurrentProblem] = useState<ProblemWithCategory | null>(null);

    const isAuthorized = userData?.isAdmin === true;

    useEffect(() => {
        if (!authLoading && !isAuthorized) {
            router.replace('/');
        }
    }, [authLoading, isAuthorized, router]);

    if (authLoading) {
        return (
            <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!isAuthorized) {
        return null;
    }
    
    const handleAddNewProblem = () => {
        setCurrentProblem(null);
        setViewMode('problem-form');
    }
    
    const handleEditProblem = (problem: ProblemWithCategory) => {
        setCurrentProblem(problem);
        setViewMode('problem-form');
    }

    const renderContent = () => {
        switch (viewMode) {
            case 'problem-form':
                return <ProblemForm problem={currentProblem} onClose={() => setViewMode('problem-list')} />;
            case 'problem-list':
                return <ProblemList onEdit={handleEditProblem} onAddNew={handleAddNewProblem} />;
            case 'course-management':
                return <CourseManagementView />;
            case 'course-form':
                return <CourseForm courseId={courseId} onBack={() => setViewMode('course-management')} />;
            case 'user-management':
                return <AllUsersList />;
            case 'navigation-management':
                return <NavigationManagementView />;
            case 'badge-management':
                return <BadgeManagementView />;
            case 'brand-management':
                return <BrandManagementView />;
            case 'pricing-management':
                return <PricingManagementView />;
            default:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card 
                            className="flex flex-col group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
                            onClick={() => setViewMode('problem-list')}
                        >
                            <CardHeader>
                                <CardTitle>Problem Management</CardTitle>
                                <CardDescription>View, edit, or add new Apex coding challenges to the platform.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <div className="text-muted-foreground/20">
                                    <FileQuestion className="h-24 w-24" />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <div className="text-sm text-primary font-semibold flex items-center gap-2">
                                    Manage Problems <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                                </div>
                            </CardFooter>
                        </Card>
                        <Card 
                            className="flex flex-col group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
                            onClick={() => setViewMode('course-management')}
                        >
                            <CardHeader>
                                <CardTitle>Course Management</CardTitle>
                                <CardDescription>Create, structure, and publish interactive learning courses.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <div className="text-muted-foreground/20">
                                   <BookOpenCheck className="h-24 w-24" />
                                </div>
                            </CardContent>
                            <CardFooter>
                               <div className="text-sm text-primary font-semibold flex items-center gap-2">
                                   Manage Courses <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                               </div>
                            </CardFooter>
                        </Card>
                         <Card 
                            className="flex flex-col group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
                            onClick={() => setViewMode('user-management')}
                        >
                            <CardHeader>
                                <CardTitle>User Management</CardTitle>
                                <CardDescription>Grant or revoke admin privileges for users.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <div className="text-muted-foreground/20">
                                   <UserCog className="h-24 w-24" />
                                </div>
                            </CardContent>
                            <CardFooter>
                               <div className="text-sm text-primary font-semibold flex items-center gap-2">
                                   Manage Users <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                               </div>
                            </CardFooter>
                        </Card>
                         <Card 
                            className="flex flex-col group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
                            onClick={() => setViewMode('navigation-management')}
                        >
                            <CardHeader>
                                <CardTitle>Navigation Management</CardTitle>
                                <CardDescription>Control the links displayed in the main app header.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <div className="text-muted-foreground/20">
                                   <MenuIcon className="h-24 w-24" />
                                </div>
                            </CardContent>
                            <CardFooter>
                               <div className="text-sm text-primary font-semibold flex items-center gap-2">
                                   Manage Navigation <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                               </div>
                            </CardFooter>
                        </Card>
                        <Card 
                            className="flex flex-col group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
                            onClick={() => setViewMode('badge-management')}
                        >
                            <CardHeader>
                                <CardTitle>Badge Management</CardTitle>
                                <CardDescription>Define criteria for awarding badges to users.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <div className="text-muted-foreground/20">
                                   <Award className="h-24 w-24" />
                                </div>
                            </CardContent>
                            <CardFooter>
                               <div className="text-sm text-primary font-semibold flex items-center gap-2">
                                   Manage Badges <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                               </div>
                            </CardFooter>
                        </Card>
                         <Card 
                            className="flex flex-col group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
                            onClick={() => setViewMode('brand-management')}
                        >
                            <CardHeader>
                                <CardTitle>Brand Management</CardTitle>
                                <CardDescription>Upload and manage your site logos and favicon.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <div className="text-muted-foreground/20">
                                   <Palette className="h-24 w-24" />
                                </div>
                            </CardContent>
                            <CardFooter>
                               <div className="text-sm text-primary font-semibold flex items-center gap-2">
                                   Manage Branding <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                               </div>
                            </CardFooter>
                        </Card>
                        <Card 
                            className="flex flex-col group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
                            onClick={() => setViewMode('pricing-management')}
                        >
                            <CardHeader>
                                <CardTitle>Pricing & Vouchers</CardTitle>
                                <CardDescription>Manage subscription prices and voucher codes.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex items-center justify-center">
                                <div className="text-muted-foreground/20">
                                   <CreditCard className="h-24 w-24" />
                                </div>
                            </CardContent>
                            <CardFooter>
                               <div className="text-sm text-primary font-semibold flex items-center gap-2">
                                   Manage Pricing <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                               </div>
                            </CardFooter>
                        </Card>
                    </div>
                );
        }
    };
    
    return (
        <div className="container py-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
                {viewMode === 'dashboard' ? (
                     <div>
                        <h1 className="text-4xl font-bold font-headline">Admin Dashboard</h1>
                        <p className="text-muted-foreground mt-2">
                            Manage platform content including problems and courses.
                        </p>
                    </div>
                ) : (
                    <Button variant="outline" onClick={() => setViewMode('dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                )}
            </div>
            {renderContent()}
        </div>
    );
}

export default function UploadProblemPage() {
    return (
        <main className="flex-1 w-full pt-16 md:pt-0">
             <Suspense fallback={
                <div className="flex justify-center items-center flex-1">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            }>
                <UploadProblemContent />
            </Suspense>
        </main>
    );
}
