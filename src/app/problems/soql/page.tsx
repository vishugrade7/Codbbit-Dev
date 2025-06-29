
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SOQLProblemsData } from "@/types";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowRight, Database } from "lucide-react";

type CategoryInfo = {
  name: string;
  problemCount: number;
};

export default function SOQLLearnPage() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const soqlDocRef = doc(db, "problems", "SOQL");
    const unsubscribe = onSnapshot(
      soqlDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = (docSnap.data().Category || {}) as SOQLProblemsData;
          const fetchedCategories: CategoryInfo[] = Object.entries(data)
            .map(([name, value]) => ({
              name,
              problemCount: value.Questions?.length || 0,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
          setCategories(fetchedCategories);
        } else {
          setCategories([]);
          console.log("SOQL problems document does not exist!");
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching SOQL problems:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const soqlConcepts = [
      {
          title: "SELECT ... FROM",
          description: "The foundation of every SOQL query. Specify the fields you want to retrieve from a specific Salesforce object.",
          example: "SELECT Name, AnnualRevenue FROM Account"
      },
      {
          title: "WHERE",
          description: "Filter your records based on specific criteria. Use logical operators like AND, OR, and NOT to create complex conditions.",
          example: "WHERE AnnualRevenue > 500000 AND Industry = 'Technology'"
      },
      {
          title: "ORDER BY",
          description: "Sort your results. You can sort by any field in ascending (ASC) or descending (DESC) order.",
          example: "ORDER BY Name ASC"
      },
      {
          title: "LIMIT",
          description: "Restrict the number of records returned by your query. Essential for performance and managing large data sets.",
          example: "LIMIT 10"
      }
  ]

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container px-4 md:px-6 py-12 md:py-24 lg:py-32">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">
                Learn SOQL: The Salesforce Query Language
              </h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Master the art of fetching data from your Salesforce org. Start with the basics and then test your skills with our challenges.
              </p>
            </div>
          </div>
          
          <div className="mx-auto grid max-w-5xl gap-6 py-12 md:grid-cols-2">
            {soqlConcepts.map((concept) => (
                <Card key={concept.title}>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><Database className="h-5 w-5 text-primary"/>{concept.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">{concept.description}</p>
                        <pre className="bg-card/50 p-4 rounded-md text-sm font-code">{concept.example}</pre>
                    </CardContent>
                </Card>
            ))}
          </div>
          
          <div className="mx-auto max-w-5xl py-12">
            <div className="space-y-2 text-center">
                 <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-4xl">
                    Practice Your Skills
                </h2>
                <p className="max-w-[900px] mx-auto text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Put your knowledge to the test with our hands-on SOQL challenges.
                </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                 {loading ? (
                    <div className="col-span-full flex h-40 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                    ) : categories.length > 0 ? (
                    categories.map((category) => (
                        <Link
                        key={category.name}
                        href={`/problems/soql/${encodeURIComponent(category.name)}`}
                        passHref
                        >
                        <Card className="flex flex-col justify-between p-4 transform transition-all duration-300 hover:scale-105 hover:shadow-primary/20 hover:shadow-lg">
                            <div>
                                <h3 className="text-lg font-bold">{category.name}</h3>
                                <CardDescription className="mt-1">
                                    {category.problemCount} Problem{category.problemCount !== 1 ? "s" : ""}
                                </CardDescription>
                            </div>
                           
                            <div className="flex items-center justify-end font-semibold text-primary mt-4">
                                Start Challenges <ArrowRight className="h-4 w-4 ml-2" />
                            </div>
                        </Card>
                        </Link>
                    ))
                    ) : (
                    <p className="col-span-full text-center text-muted-foreground">
                        No SOQL problem categories found.
                    </p>
                    )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
