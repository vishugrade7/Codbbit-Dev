import Header from "@/components/header";
import Footer from "@/components/footer";
import { getProblem } from "@/app/admin/actions";
import { EditProblemForm } from "./edit-problem-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditProblemPage({
    params,
    searchParams,
}: {
    params: { problemId: string };
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const { problemId } = params;
    const categoryId = searchParams.categoryId as string;
    const categoryName = searchParams.categoryName as string;

    const problem = await getProblem(problemId, categoryId);

    if (!problem) {
        return (
             <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-destructive">Problem Not Found</h1>
                        <p className="text-muted-foreground">The requested problem could not be found.</p>
                        <Button asChild className="mt-4"><Link href="/admin">Go Back to Admin</Link></Button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }
    
    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
          <Header />
          <main className="flex-1">
            <div className="container px-4 md:px-6 py-12">
                <div className="max-w-3xl mx-auto">
                 <Button variant="ghost" asChild className="mb-4">
                    <Link href="/admin"><ArrowLeft className="mr-2" /> Back to Problem Management</Link>
                 </Button>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Edit Problem</CardTitle>
                        <CardDescription>Editing &quot;{problem.title}&quot; in the &quot;{decodeURIComponent(categoryName)}&quot; category.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <EditProblemForm categoryId={categoryId} problem={problem} />
                    </CardContent>
                </Card>
                </div>
            </div>
          </main>
          <Footer />
        </div>
    );
}
