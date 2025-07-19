
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CourseManagementView() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Course Management</CardTitle>
                <CardDescription>
                    Create, edit, and manage your interactive courses.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                    <p>Course management functionality is under construction.</p>
                </div>
            </CardContent>
        </Card>
    );
}
