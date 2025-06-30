
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
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
} from "@/components/ui/sidebar"
import {
  Home,
  LayoutGrid,
  GitFork,
  ShieldCheck,
  Wrench,
  CodeXml,
  ArrowRight,
  Target,
  Filter as FilterIcon,
  ChevronsRight,
  SortAsc,
  Calculator,
  Group,
  Rows,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CodeBlock } from "@/components/code-block"
import Link from "next/link"


const soqlGuideNav = [
    { name: "Home", icon: Home },
    {
        name: "Fundamentals",
        icon: LayoutGrid,
        sub: [ { name: "SELECT & FROM" }, { name: "WHERE" }, { name: "LIMIT & OFFSET" }, { name: "ORDER BY" } ],
    },
    { name: "Relationships", icon: GitFork },
    { name: "Aggregation", icon: Calculator },
    { name: "Performance & Security", icon: ShieldCheck },
    { name: "SOQL Problems", href: "/problems/soql/Basics", icon: Wrench },
];

function SectionHeading({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold font-headline mb-2 text-primary">{title}</h2>
            <p className="text-muted-foreground max-w-4xl">{children}</p>
        </div>
    );
}

function HomeContent({ onSelectTopic }: { onSelectTopic: (topic: string) => void }) {
    return (
        <div>
            <SectionHeading title="Welcome to the SOQL Guide">
                Salesforce Object Query Language (SOQL) is the key to unlocking the
                data stored in your Salesforce organization. This guide is designed to
                take you from the absolute basics to advanced topics, giving you the
                confidence to query your data effectively and efficiently.
            </SectionHeading>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>How to Use This Guide</CardTitle>
                    <CardDescription>
                        Use the navigation on the left to explore topics. We recommend
                        starting with the Fundamentals and working your way down. Each
                        section includes explanations, examples, and diagrams to illustrate
                        key concepts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>
                        Ready to test your skills? Once you're comfortable, head over to the{' '}
                        <Link
                            href="/problems/soql/Basics"
                            className="text-primary font-medium hover:underline"
                        >
                            SOQL Problems
                        </Link>{' '}
                        to solve hands-on challenges.
                    </p>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="font-headline text-xl font-semibold">Get Started</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="hover:border-primary/50 transition-colors">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <LayoutGrid /> Fundamentals
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>
                                Learn the core syntax for building any SOQL query.
                            </CardDescription>
                            <Button
                                variant="link"
                                className="p-0 h-auto mt-2"
                                onClick={() => onSelectTopic('SELECT & FROM')}
                            >
                                Start with SELECT & FROM <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                    <Card className="hover:border-primary/50 transition-colors">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <GitFork /> Relationships
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>
                                Discover how to traverse parent-child relationships.
                            </CardDescription>
                            <Button
                                variant="link"
                                className="p-0 h-auto mt-2"
                                onClick={() => onSelectTopic('Relationships')}
                            >
                                Learn about Relationships{' '}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function SelectFromContent() {
    return (
        <div>
            <SectionHeading title="The Foundation: SELECT & FROM">
                Every SOQL query is built on two fundamental clauses: `SELECT` to
                specify which fields you want to retrieve, and `FROM` to specify which
                object you want to retrieve them from.
            </SectionHeading>
            <Card>
                <CardHeader>
                    <CardTitle>Core Syntax</CardTitle>
                    <CardDescription>
                        `SELECT` is followed by a comma-separated list of field names. `FROM`
                        is followed by the API name of a single Salesforce object.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-center gap-4 rounded-md border bg-background p-4 text-center">
                        <div>
                            <div className="inline-block rounded-md bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                                SELECT
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Choose your fields
                            </div>
                        </div>
                        <div className="text-muted-foreground">+</div>
                        <div>
                            <div className="inline-block rounded-md bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800 dark:bg-orange-900/50 dark:text-orange-200">
                                FROM
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                Pick your object
                            </div>
                        </div>
                    </div>
                    <CodeBlock
                        code={`-- Retrieve the Name and Industry for all Account records
SELECT Name, Industry
FROM Account`}
                    />
                    <p className="text-sm text-muted-foreground">
                        This query asks Salesforce for two specific pieces of information
                        (\`Name\`, \`Industry\`) from every record in the \`Account\` object.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

function WhereContent() {
    return (
        <div>
            <SectionHeading title="Filtering Results: WHERE">
                The `WHERE` clause is used to filter records and retrieve only the ones
                that meet specific criteria. This is essential for getting the exact
                data you need instead of all records from an object.
            </SectionHeading>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Filtering with Operators</CardTitle>
                        <CardDescription>
                            Use comparison operators (`=`, `!=`, `<`, `>`, `LIKE`) and logical
                            operators (`AND`, `OR`, `NOT`) to build your filter conditions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-center gap-4 rounded-md border bg-background p-4 text-center">
                            <div>
                                <div className="inline-block rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                    Field
                                </div>
                            </div>
                            <div className="text-muted-foreground">Operator</div>
                            <div>
                                <div className="inline-block rounded-md bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/50 dark:text-green-200">
                                    Value
                                </div>
                            </div>
                        </div>
                        <CodeBlock
                            code={`-- Find all Contacts with the last name 'Smith'
-- who are located in California
SELECT FirstName, LastName, MailingState
FROM Contact
WHERE LastName = 'Smith' AND MailingState = 'CA'`}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Using IN and LIKE</CardTitle>
                        <CardDescription>
                            `IN` checks if a field value is within a list. `LIKE` performs a
                            wildcard search for text fields using the `%` character.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-center gap-4 rounded-md border bg-background p-4 text-center">
                            <Target className="h-10 w-10 text-primary" />
                            <div className="flex-1 text-left">
                                <p className="font-semibold">Target specific values</p>
                                <p className="text-sm text-muted-foreground">
                                    Efficiently query for multiple possible values at once.
                                </p>
                            </div>
                        </div>
                        <CodeBlock
                            code={`-- Find all Accounts in the Energy or Banking industry
SELECT Name, Industry
FROM Account
WHERE Industry IN ('Energy', 'Banking')`}
                        />
                        <CodeBlock
                            code={`-- Find all Contacts whose first name starts with 'A'
SELECT FirstName
FROM Contact
WHERE FirstName LIKE 'A%'`}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function LimitOffsetContent() {
    return (
        <div>
            <SectionHeading title="Pagination: LIMIT & OFFSET">
                When working with a large number of records, you often need to view
                the data in smaller, manageable chunks or "pages". `LIMIT` controls
                the maximum number of records returned, and `OFFSET` skips a
                specified number of records from the beginning.
            </SectionHeading>
            <Card>
                <CardHeader>
                    <CardTitle>Fetching Pages of Data</CardTitle>
                    <CardDescription>
                        Combining `LIMIT` and `OFFSET` is the standard way to implement
                        pagination. `LIMIT` sets the page size, and `OFFSET` determines
                        which page you are on.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col items-center justify-center gap-4 rounded-md border bg-background p-6 text-center">
                        <div className="flex gap-2 font-mono text-sm">
                            {[...Array(15)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-6 w-4 rounded-sm ${i >= 5 && i < 10 ? 'bg-primary/80' : 'bg-muted'
                                        }`}
                                ></div>
                            ))}
                        </div>
                        <div className="flex items-center gap-4 text-sm mt-4">
                            <div className="flex items-center gap-2">
                                <FilterIcon className="text-red-400" /> <span>OFFSET 5</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Rows className="text-blue-400" /> <span>LIMIT 5</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Skips the first 5 records, then returns the next 5 records
                            (records 6-10).
                        </p>
                    </div>

                    <CodeBlock
                        code={`-- To get the third "page" of 10 accounts
-- (records 21-30) ordered by their creation date
SELECT Name, CreatedDate
FROM Account
ORDER BY CreatedDate DESC
LIMIT 10
OFFSET 20`}
                    />
                    <p className="text-sm text-muted-foreground">
                        Note: \`OFFSET\` has a maximum value of 2,000. For fetching
                        deeper pages, you'll need to use other methods like keyset
                        pagination.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

function OrderByContent() {
    return (
        <div>
            <SectionHeading title="Sorting Results: ORDER BY">
                The `ORDER BY` clause allows you to sort the records returned by your
                query based on the values in one or more fields.
            </SectionHeading>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Sorting Direction</CardTitle>
                        <CardDescription>
                            You can sort in ascending order (`ASC`) or descending order
                            (`DESC`). The default is `ASC` if nothing is specified.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-center gap-4 rounded-md border bg-background p-4 text-center">
                            <SortAsc className="h-10 w-10 text-primary" />
                            <div className="flex-1 text-left">
                                <p className="font-semibold">Control the order</p>
                                <p className="text-sm text-muted-foreground">
                                    Sort by any sortable field to organize your results
                                    logically.
                                </p>
                            </div>
                        </div>
                        <CodeBlock
                            code={`-- Get the 5 most recently created Contacts
SELECT Name, CreatedDate
FROM Contact
ORDER BY CreatedDate DESC
LIMIT 5`}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Handling Null Values</CardTitle>
                        <CardDescription>
                            Use `NULLS FIRST` or `NULLS LAST` to specify whether records
                            with null values in the sorted field should appear at the
                            beginning or end of the results.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-center gap-4 rounded-md border bg-background p-4 text-center">
                            <ChevronsRight className="h-10 w-10 text-primary" />
                            <div className="flex-1 text-left">
                                <p className="font-semibold">Place nulls where you want</p>
                                <p className="text-sm text-muted-foreground">
                                    By default, nulls are sorted first. Explicitly control their
                                    position.
                                </p>
                            </div>
                        </div>
                        <CodeBlock
                            code={`-- Sort accounts by revenue, but put those
-- with no revenue at the very end
SELECT Name, AnnualRevenue
FROM Account
ORDER BY AnnualRevenue DESC NULLS LAST`}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function RelationshipsContent() {
    return (
        <div>
            <SectionHeading title="Querying Across Objects: Relationships">
                SOQL's real power comes from its ability to traverse object
                relationships, allowing you to fetch related data in a single,
                efficient query. This section explores how to query from a child to a
                parent (up) and from a parent to its children (down).
            </SectionHeading>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Child-to-Parent (Dot Notation)</CardTitle>
                        <CardDescription>
                            Use dot notation (`.`) to access fields from a parent object.
                            Think of this as "reaching up" from a child record (like a
                            Contact) to its parent (the Account).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-center gap-4 rounded-md border bg-background p-4">
                            <div className="text-center">
                                <div className="inline-block rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                    Contact
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Child</div>
                            </div>
                            <div className="text-muted-foreground">→</div>
                            <div className="text-center">
                                <div className="inline-block rounded-md bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/50 dark:text-green-200">
                                    Account.Name
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Parent Field
                                </div>
                            </div>
                        </div>
                        <CodeBlock
                            code={`SELECT Id, Name, Account.Name
FROM Contact
WHERE Account.Industry = 'Healthcare'`}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Parent-to-Child (Subquery)</CardTitle>
                        <CardDescription>
                            Use a subquery (a \`SELECT\` statement within parentheses) to fetch
                            records from a child object. This is like "looking down" from a
                            parent (an Account) to all its children (its Contacts).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-center gap-4 rounded-md border bg-background p-4">
                            <div className="text-center">
                                <div className="inline-block rounded-md bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/50 dark:text-green-200">
                                    Account
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">Parent</div>
                            </div>
                            <div className="text-muted-foreground">→</div>
                            <div className="text-center">
                                <div className="inline-block rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                    (SELECT ... FROM Contacts)
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Child Records
                                </div>
                            </div>
                        </div>
                        <CodeBlock
                            code={`SELECT Id, Name, (
    SELECT Id, LastName FROM Contacts
)
FROM Account`}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function AggregationContent() {
    return (
        <div>
            <SectionHeading title="Summarizing Data: Aggregation">
                Aggregate functions perform a calculation on a set of records and
                return a single value. When combined with `GROUP BY`, you can summarize
                and report on your data in powerful ways.
            </SectionHeading>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Aggregate Functions</CardTitle>
                        <CardDescription>
                            Use functions like `COUNT()`, `SUM()`, `AVG()`, `MIN()`, and
                            `MAX()` to calculate values. Note that you can only query
                            aggregate fields and `GROUP BY` fields.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-center gap-4 rounded-md border bg-background p-4 text-center">
                            <Calculator className="h-10 w-10 text-primary" />
                            <div className="flex-1 text-left">
                                <p className="font-semibold">Calculate and Summarize</p>
                                <p className="text-sm text-muted-foreground">
                                    Get total counts, sums, averages, and more directly from your
                                    query.
                                </p>
                            </div>
                        </div>
                        <CodeBlock
                            code={`-- Count the number of accounts
SELECT COUNT(Id)
FROM Account`}
                        />
                        <CodeBlock
                            code={`-- Find the value of the largest Opportunity
SELECT MAX(Amount)
FROM Opportunity`}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Grouping with GROUP BY</CardTitle>
                        <CardDescription>
                            The `GROUP BY` clause groups records that have the same value in
                            a specified field, allowing you to run aggregate functions on
                            each group. Use `HAVING` to filter the grouped results.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-center gap-4 rounded-md border bg-background p-4 text-center">
                            <Group className="h-10 w-10 text-primary" />
                            <div className="flex-1 text-left">
                                <p className="font-semibold">Group by Category</p>
                                <p className="text-sm text-muted-foreground">
                                    Summarize data for each category, such as Lead Source or
                                    Industry.
                                </p>
                            </div>
                        </div>
                        <CodeBlock
                            code={`-- Count the number of contacts for each account
-- but only show accounts with more than 5 contacts
SELECT AccountId, COUNT(Id)
FROM Contact
GROUP BY AccountId
HAVING COUNT(Id) > 5`}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function PerformanceSecurityContent() {
    return (
        <div>
            <SectionHeading title="Best Practices: Performance & Security">
                Writing SOQL is easy, but writing high-quality SOQL takes practice.
                Following these best practices will ensure your queries are fast,
                efficient, and respect Salesforce's security model.
            </SectionHeading>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Write Selective Queries</CardTitle>
                        <CardDescription>
                            A selective query is one that filters on an indexed field. This is
                            the most important factor for query performance. Always try to
                            filter on indexed fields in your `WHERE` clause.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm">
                            Standard indexed fields include \`Id\`, \`Name\`, \`OwnerId\`,
                            \`CreatedDate\`, \`LastModifiedDate\`, and lookup/master-detail
                            fields.
                        </p>
                        <CodeBlock
                            code={`-- This is selective (and fast!)
SELECT Id FROM Account WHERE Id = '001...'

-- This is NON-selective (and slow)
-- because it uses a leading wildcard and a negative operator.
SELECT Id FROM Account WHERE Name LIKE '%Acme' AND StageName != 'Closed'`}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Respect Platform Limits & Security</CardTitle>
                        <CardDescription>
                            Be mindful of governor limits (e.g., max 50,000 rows per
                            transaction). Use \`WITH SECURITY_ENFORCED\` to ensure your query
                            only returns records the running user is allowed to see.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm">
                            Failing to respect sharing rules can expose sensitive data. \`WITH
                            SECURITY_ENFORCED\` is a simple way to make your queries safer.
                        </p>
                        <CodeBlock
                            code={`-- This query will only return Accounts the user
-- has at least read access to, based on their
-- profile and sharing rules.
SELECT Name, AnnualRevenue
FROM Account
WITH SECURITY_ENFORCED`}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


export default function SOQLLearnPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const [activeSection, setActiveSection] = React.useState("Home");

    const handleNavClick = (sectionName: string, href?: string) => {
        if (href) {
            router.push(href);
        } else {
            setActiveSection(sectionName);
        }
    };


    const renderContent = () => {
        switch (activeSection) {
            case "Home":
                return <HomeContent onSelectTopic={setActiveSection} />;
            case "SELECT & FROM":
                return <SelectFromContent />;
            case "WHERE":
                return <WhereContent />;
            case "LIMIT & OFFSET":
                return <LimitOffsetContent />;
            case "ORDER BY":
                return <OrderByContent />;
            case "Relationships":
                return <RelationshipsContent />;
            case "Aggregation":
                return <AggregationContent />;
            case "Performance & Security":
                return <PerformanceSecurityContent />;
            default:
                return <HomeContent onSelectTopic={setActiveSection} />;
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
                                    onClick={() => handleNavClick(item.name, item.href)}
                                    isActive={!item.sub && activeSection === item.name}
                                >
                                    <item.icon />
                                    <span>{item.name}</span>
                                </SidebarMenuButton>
                                {item.sub && (
                                    <SidebarMenuSub>
                                        {item.sub.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.name}>
                                                <SidebarMenuSubButton onClick={() => handleNavClick(subItem.name)} isActive={activeSection === subItem.name}>
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
