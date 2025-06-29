
"use client";

import * as React from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Home,
  LayoutGrid,
  GitFork,
  DatabaseZap,
  ShieldCheck,
  Wrench,
  Copy,
  Check,
  CodeXml,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { CodeBlock } from "@/components/code-block";


const soqlGuideNav = [
    {
        name: "Home",
        href: "/",
        icon: Home,
    },
    {
        name: "Fundamentals",
        icon: LayoutGrid,
        sub: [
            { name: "SELECT & FROM" },
            { name: "WHERE" },
            { name: "LIMIT & OFFSET" },
            { name: "ORDER BY" },
        ],
    },
    {
        name: "Relationships",
        icon: GitFork,
    },
    {
        name: "Aggregation",
        icon: DatabaseZap,
    },
    {
        name: "Performance & Security",
        icon: ShieldCheck,
    },
    {
        name: "Query Builder",
        href: "/problems/soql/builder", // Future page
        icon: Wrench,
    },
];

export default function SOQLLearnPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);


    const [activeSection, setActiveSection] = React.useState("Relationships");

    const renderContent = () => {
        switch (activeSection) {
            case "Relationships":
                return <RelationshipsContent />;
            // Add other cases for other sections here
            default:
                return <RelationshipsContent />;
        }
    };
  
    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader>
                    <div className="flex items-center gap-2 p-2">
                         <CodeXml className="h-6 w-6 text-primary" />
                         <span className="font-headline text-lg font-semibold">SOQL Guide</span>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                         {soqlGuideNav.map((item) => (
                            <SidebarMenuItem key={item.name}>
                                <SidebarMenuButton
                                    onClick={() => item.sub ? {} : setActiveSection(item.name)}
                                    isActive={!item.sub && activeSection === item.name}
                                >
                                    <item.icon />
                                    <span>{item.name}</span>
                                </SidebarMenuButton>
                                {item.sub && (
                                     <SidebarMenuSub>
                                        {item.sub.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.name}>
                                                <SidebarMenuSubButton onClick={() => setActiveSection(subItem.name)} isActive={activeSection === subItem.name}>
                                                     {subItem.name}
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                )}
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
            </Sidebar>

            <SidebarInset className="bg-muted/40">
                <main className="p-6 md:p-10">
                    <div className="flex items-center gap-4 mb-8">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="font-headline text-3xl font-bold tracking-tight">{activeSection}</h1>
                    </div>
                    {renderContent()}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}


function RelationshipsContent() {
    return (
        <div>
            <p className="text-muted-foreground max-w-4xl mb-8">
                SOQL's real power comes from its ability to traverse object relationships, allowing you to fetch related data in a single, efficient query. This section explores how to query from a child to a parent (up) and from a parent to its children (down), which is a fundamental concept for building comprehensive data views.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Child-to-Parent (Dot Notation)</CardTitle>
                        <CardDescription>
                            Use dot notation (`.`) to access fields from a parent object. Think of this as "reaching up" from a child record (like a Contact) to its parent (the Account).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-center gap-4 rounded-md border bg-background p-4">
                            <div className="text-center">
                                <div className="inline-block rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">Contact</div>
                                <div className="text-xs text-muted-foreground mt-1">Child</div>
                            </div>
                            <div className="text-muted-foreground">→</div>
                            <div className="text-center">
                                <div className="inline-block rounded-md bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/50 dark:text-green-200">Account.Name</div>
                                <div className="text-xs text-muted-foreground mt-1">Parent Field</div>
                            </div>
                        </div>
                        <CodeBlock code={
`SELECT Id, Name, Account.Name
FROM Contact
WHERE Account.Industry = 'Healthcare'`
                        } />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Parent-to-Child (Subquery)</CardTitle>
                        <CardDescription>
                            Use a subquery (a `SELECT` statement within parentheses) to fetch records from a child object. This is like "looking down" from a parent (an Account) to all its children (its Contacts).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-center gap-4 rounded-md border bg-background p-4">
                            <div className="text-center">
                                <div className="inline-block rounded-md bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/50 dark:text-green-200">Account</div>
                                <div className="text-xs text-muted-foreground mt-1">Parent</div>
                            </div>
                            <div className="text-muted-foreground">→</div>
                             <div className="text-center">
                                <div className="inline-block rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">(SELECT ... FROM Contacts)</div>
                                <div className="text-xs text-muted-foreground mt-1">Child Records</div>
                            </div>
                        </div>
                        <CodeBlock code={
`SELECT Id, Name, (
    SELECT Id, LastName FROM Contacts
)
FROM Account`
                        } />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

