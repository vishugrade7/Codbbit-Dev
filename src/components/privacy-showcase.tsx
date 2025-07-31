
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from './ui/button';
import { ArrowRight, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PrivacyShowcase() {
    const [openItem, setOpenItem] = useState('item-1');

    return (
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
            <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center text-center gap-4 mb-12">
                    <div className="text-sm font-semibold tracking-wide text-muted-foreground">Track video completions</div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl">
                        Measure employee productivity without sacrificing user privacy
                    </h2>
                </div>
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="flex flex-col gap-4">
                        <Accordion type="single" value={openItem} onValueChange={setOpenItem} collapsible>
                            <AccordionItem value="item-1" className="border-none">
                                <div className={cn("p-6 rounded-2xl transition-colors", openItem === 'item-1' ? "bg-card" : "hover:bg-blue-50 dark:hover:bg-blue-900/30")}>
                                    <AccordionTrigger className="text-xl font-semibold hover:no-underline [&>svg]:hidden">
                                        <div className="flex items-center justify-between w-full">
                                            <span>Manage privacy settings</span>
                                            {openItem === 'item-1' ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-4">
                                        <p className="text-muted-foreground">
                                            Assign role-based permissions to tailor folder access and ensure you share the right learning content with every department.
                                        </p>
                                        <Button variant="ghost" className="mt-4 p-0 h-auto justify-start text-foreground hover:bg-transparent">
                                            <div className="p-2 border rounded-full mr-3">
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </Button>
                                    </AccordionContent>
                                </div>
                            </AccordionItem>
                             <AccordionItem value="item-2" className="border-none mt-4">
                                <div className={cn("p-6 rounded-2xl transition-colors", openItem === 'item-2' ? "bg-card" : "hover:bg-blue-50 dark:hover:bg-blue-900/30")}>
                                     <AccordionTrigger className="text-xl font-semibold hover:no-underline [&>svg]:hidden">
                                        <div className="flex items-center justify-between w-full">
                                            <span>See user-level insights</span>
                                            {openItem === 'item-2' ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
                                        </div>
                                    </AccordionTrigger>
                                     <AccordionContent className="pt-4">
                                        <p className="text-muted-foreground">
                                           Dive deep into individual performance metrics to understand engagement and identify areas for improvement.
                                        </p>
                                    </AccordionContent>
                                </div>
                            </AccordionItem>
                             <AccordionItem value="item-3" className="border-none mt-4">
                                <div className={cn("p-6 rounded-2xl transition-colors", openItem === 'item-3' ? "bg-card" : "hover:bg-blue-50 dark:hover:bg-blue-900/30")}>
                                    <AccordionTrigger className="text-xl font-semibold hover:no-underline [&>svg]:hidden">
                                         <div className="flex items-center justify-between w-full">
                                            <span>Get graphs for easier understanding</span>
                                            {openItem === 'item-3' ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5 text-muted-foreground" />}
                                        </div>
                                    </AccordionTrigger>
                                     <AccordionContent className="pt-4">
                                        <p className="text-muted-foreground">
                                           Visualize data through intuitive charts and graphs, making complex information easy to digest and act upon.
                                        </p>
                                    </AccordionContent>
                                </div>
                            </AccordionItem>
                        </Accordion>
                    </div>
                    <div className="flex items-center justify-center">
                        <Image
                            src="https://placehold.co/600x500.png"
                            width={600}
                            height={500}
                            alt="Privacy settings dashboard"
                            data-ai-hint="dashboard privacy"
                            className="rounded-lg object-contain"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
