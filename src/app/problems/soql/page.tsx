
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SOQLProblemsData } from "@/types";
import { cn } from "@/lib/utils";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardDescription } from "@/components/ui/card";
import { Loader2, ArrowRight, Database, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const soqlConcepts = [
    {
        id: "select-from",
        title: "SELECT ... FROM",
        description: "The SELECT clause specifies the fields you want to retrieve, and the FROM clause specifies the object you are querying. This is the foundation of every SOQL query.",
        longDescription: "In SOQL, you always start by declaring what data (fields) you want to get and from where (which object). For example, to get the name and industry of all accounts, you would write `SELECT Name, Industry FROM Account`. You can query standard objects like Account, Contact, or Lead, as well as any custom objects in your organization.",
        example: "SELECT Name, AnnualRevenue FROM Account",
        videoId: "placeholder_video_id_1"
    },
    {
        id: "where",
        title: "WHERE",
        description: "The WHERE clause is used to filter records and retrieve only those that meet specific criteria. It's how you narrow down your results.",
        longDescription: "Without a WHERE clause, your query would return all records from an object (up to the governor limits). The WHERE clause lets you be specific. You can use comparison operators like `=`, `!=`, `<`, `>`, and logical operators like `AND`, `OR`, and `NOT` to build complex conditions. For instance, to find all 'Hot' rated leads in California, you would use `WHERE Rating = 'Hot' AND State = 'CA'`.",
        example: "SELECT Name, Title FROM Contact WHERE LeadSource = 'Web'",
        videoId: "placeholder_video_id_2"
    },
    {
        id: "order-by",
        title: "ORDER BY",
        description: "The ORDER BY clause allows you to sort your query results. You can sort in ascending (ASC) or descending (DESC) order.",
        longDescription: "By default, the order of query results isn't guaranteed. To ensure a consistent order, use ORDER BY. You can sort by most field types. For example, `ORDER BY CreatedDate DESC` will show you the most recently created records first. You can also sort by multiple fields, e.g., `ORDER BY Industry ASC, AnnualRevenue DESC`.",
        example: "SELECT Name, Amount FROM Opportunity ORDER BY Amount DESC",
        videoId: "placeholder_video_id_3"
    },
    {
        id: "limit",
        title: "LIMIT",
        description: "The LIMIT clause restricts the number of records your query returns. This is crucial for performance and staying within platform limits.",
        longDescription: "It's a best practice to use LIMIT whenever you don't need all possible records. This makes your queries faster and helps you avoid hitting governor limits, which cap the total number of records you can retrieve in a single transaction. `LIMIT 100` will return, at most, the first 100 records that match your criteria.",
        example: "SELECT Name FROM Account ORDER BY AnnualRevenue DESC LIMIT 10",
        videoId: "placeholder_video_id_4"
    },
    {
        id: 'relationships',
        title: 'Relationships',
        description: 'Query related records, both parent-to-child and child-to-parent, to get a complete view of your data.',
        longDescription: 'SOQL allows you to traverse relationships between objects. For child-to-parent queries (many-to-one), you use dot notation (e.g., `SELECT Contact.Account.Name FROM Contact`). For parent-to-child queries (one-to-many), you use a nested sub-query (e.g., `SELECT Name, (SELECT LastName FROM Contacts) FROM Account`).',
        example: 'SELECT Name, (SELECT Subject FROM Tasks) FROM Account',
        videoId: 'placeholder_video_id_5'
    }
];

type CategoryInfo = {
  name: string;
  problemCount: number;
};

export default function SOQLLearnPage() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(soqlConcepts[0].id);

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

  const handleLinkClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="container px-4 md:px-6 py-12">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold font-headline tracking-tighter sm:text-5xl">
                        Learn SOQL: The Salesforce Query Language
                    </h1>
                    <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                        Master the art of fetching data from your Salesforce org. Start with the basics and then test your skills with our challenges.
                    </p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                {/* Left Side: Index */}
                <aside className="md:col-span-1">
                    <div className="sticky top-24">
                        <h3 className="font-semibold text-lg mb-4">SOQL Concepts</h3>
                        <nav className="flex flex-col gap-1">
                            {soqlConcepts.map(concept => (
                                <a 
                                    key={concept.id} 
                                    href={`#${concept.id}`}
                                    onClick={(e) => handleLinkClick(concept.id, e)}
                                    className={cn(
                                        "p-2 rounded-md text-sm font-medium transition-colors",
                                        activeSection === concept.id 
                                            ? 'bg-primary/10 text-primary' 
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    )}
                                >
                                    {concept.title}
                                </a>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Right Side: Detailed Content */}
                <div className="md:col-span-3">
                    <div className="space-y-16">
                    {soqlConcepts.map(concept => (
                        <section key={concept.id} id={concept.id} className="scroll-mt-24">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold font-headline text-primary flex items-center gap-2">
                                    <Database className="h-6 w-6"/>
                                    {concept.title}
                                </h2>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                                    <Video className="h-6 w-6" />
                                    <span className="sr-only">Watch video for {concept.title}</span>
                                </Button>
                            </div>
                            <div className="space-y-4 prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                                <p className="leading-relaxed">{concept.longDescription}</p>
                                <pre className="bg-card/50 p-4 rounded-md text-sm font-code not-prose text-foreground">{concept.example}</pre>
                            </div>
                        </section>
                    ))}
                    </div>
                </div>
            </div>
            
            {/* Practice Section remains at the bottom */}
            <div className="mx-auto max-w-5xl py-16 mt-16 border-t">
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
