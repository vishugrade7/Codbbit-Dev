
'use client';

import { CheckCircle2, ChevronRight, Eye, Mail, Star, ExternalLink, GitMerge, ListChecks, CalendarDays } from 'lucide-react';
import Image from 'next/image';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';

const chartData = [
  { name: 'Jan', value: 1600 },
  { name: 'Feb', value: 1550 },
  { name: 'Mar', value: 1650 },
  { name: 'Apr', value: 1700 },
  { name: 'May', value: 1680 },
  { name: 'Jun', value: 1750 },
  { name: 'Jul', value: 1720 },
  { name: 'Aug', value: 1800 },
  { name: 'Sep', value: 1718 },
];

const ContributionDay = ({ count, isToday }: { count?: number; isToday?: boolean }) => {
  const getColor = () => {
    if (!count || count === 0) return 'bg-muted/50';
    if (count <= 2) return 'bg-green-200 dark:bg-green-800/50';
    if (count <= 5) return 'bg-green-400 dark:bg-green-600/70';
    return 'bg-green-600 dark:bg-green-400/90';
  };
  return <div className={`h-2.5 w-2.5 rounded-sm ${getColor()} ${isToday ? 'outline outline-1 outline-blue-500' : ''}`}></div>;
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-2 text-xs">
          <p className="font-bold">{`${label}`}</p>
          <p className="text-muted-foreground">{`Rating: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
};

export default function ProfileTrackerShowcase() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center gap-4 mb-12">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Track, analyze & share
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            Codbbit helps you navigate and track your coding journey to success
          </p>
          <div className="flex gap-4 mt-4">
              <Button variant="outline" size="lg">Question Tracker</Button>
              <Button size="lg">Profile Tracker <ChevronRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </div>

        <div className="relative">
          <Card className="p-4 md:p-6 bg-background rounded-2xl shadow-2xl">
            <div className="grid grid-cols-12 gap-4 md:gap-6">
              {/* Left Panel */}
              <div className="col-span-12 lg:col-span-3">
                <div className="p-4 border rounded-xl h-full space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src="https://placehold.co/150x150.png" data-ai-hint="man portrait" />
                      <AvatarFallback>SS</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-1.5">Siddharth Singh <CheckCircle2 className="h-4 w-4 text-blue-500" /></h3>
                      <p className="text-sm text-primary">@siddharthsingh</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Software Engineer @Wells Fargo | DTU '22 | Ex Vice-President @D_CODER
                  </p>
                  <div className="text-xs space-y-2 text-muted-foreground">
                    <p>India</p>
                    <p>Delhi Technological University</p>
                  </div>
                   <div className="text-xs space-y-1 pt-2">
                    <div className="flex justify-between"><span className="text-muted-foreground">Last Refresh:</span> <span>07 Jan 2025</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Profile Views:</span> <span>439</span></div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h4 className="font-semibold text-sm">Problem Solving Stats</h4>
                    <div className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50">
                        <span>LeetCode</span>
                        <CheckCircle2 className="h-4 w-4 text-green-500"/>
                    </div>
                     <div className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-muted/50">
                        <span>CodeStudio</span>
                        <CheckCircle2 className="h-4 w-4 text-green-500"/>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div className="col-span-12 lg:col-span-9 space-y-4 md:space-y-6">
                {/* Top Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <Card className="p-3"><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Total Questions</p><p className="text-2xl font-bold">1010</p></CardContent></Card>
                    <Card className="p-3"><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Total Active Days</p><p className="text-2xl font-bold">348</p></CardContent></Card>
                    <Card className="col-span-2 p-3">
                        <CardContent className="pt-3">
                            <div className="flex justify-between items-start">
                                <p className="text-xs text-muted-foreground">152 submissions in past 6 months</p>
                                <div className="text-xs text-muted-foreground">
                                    <p>Max Streak: 72</p>
                                    <p>Current Streak: 13</p>
                                </div>
                            </div>
                            <div className="flex gap-0.5 mt-2 justify-end">
                               {Array.from({ length: 26*7 }).map((_, i) => <ContributionDay key={i} count={Math.random() > 0.3 ? Math.floor(Math.random() * 10) : 0} />)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Middle Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <Card className="md:col-span-1 p-3"><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Total Contests</p><p className="text-2xl font-bold">16</p><div className="text-sm mt-2 space-y-1"><p>CodeChef: 6</p><p>CodeForces: 10</p></div></CardContent></Card>
                    <Card className="md:col-span-2 p-3">
                        <CardContent className="pt-3">
                            <p className="text-xs text-muted-foreground">Rating</p>
                            <p className="text-2xl font-bold">1718</p>
                             <div className="h-24 mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorUv)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                {/* Bottom Row */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                     <Card className="md:col-span-2 p-3">
                         <CardContent className="pt-3">
                            <p className="text-xs text-muted-foreground">Problems Solved</p>
                             <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <p className="font-semibold">Fundamentals</p>
                                    <p className="text-2xl font-bold text-yellow-500">127</p>
                                </div>
                                <div>
                                    <p className="font-semibold">DSA</p>
                                    <p className="text-2xl font-bold text-green-500">765</p>
                                </div>
                             </div>
                         </CardContent>
                     </Card>
                    <Card className="md:col-span-1 p-3"><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Competitive Programming</p><div className="flex flex-wrap gap-2 mt-2"><Badge>#JAVA</Badge><Badge>#C++</Badge><Badge>#DSA</Badge><Badge>#C</Badge><Badge>#SPECIALIST</Badge></div></CardContent></Card>
                </div>
              </div>
            </div>
          </Card>
           <div className="absolute -right-32 -bottom-24 -z-10 opacity-30 dark:opacity-20 hidden lg:block">
                <Image src="https://placehold.co/400x400.png" data-ai-hint="owl mascot" width={400} height={400} alt="Codbbit Owl Mascot" />
            </div>
        </div>
      </div>
    </section>
  );
}
