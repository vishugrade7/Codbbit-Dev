

"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AdminProvider, AdminDashboard } from "@/components/admin/ProblemManagement";


export default function UploadProblemPage() {
    return (
        <main className="flex-1 w-full pt-16 md:pt-0">
             <Suspense fallback={
                <div className="flex justify-center items-center flex-1">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            }>
                <AdminProvider>
                    <AdminDashboard />
                </AdminProvider>
            </Suspense>
        </main>
    );
}
