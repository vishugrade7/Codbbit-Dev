
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "./ui/button";

export default function InteractivePlayground() {
    const features = [
        "Execute Apex code snippets and SOQL queries instantly.",
        "Build and deploy Lightning Web Components right from your browser.",
        "Connect directly to your Salesforce org for real-world practice."
    ];

    return (
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
            <div className="container px-4 md:px-6">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="bg-primary/10 p-8 rounded-2xl flex items-center justify-center">
                        <Image
                            src="https://placehold.co/500x400.png"
                            width={500}
                            height={400}
                            alt="Interactive coding illustration"
                            data-ai-hint="developers coding"
                            className="rounded-lg object-contain"
                        />
                    </div>
                    <div className="flex flex-col justify-center space-y-6">
                        <div className="space-y-2">
                            <div className="text-primary font-semibold tracking-wide">LWC & APEX PLAYGROUND</div>
                            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Your Interactive Salesforce Playground</h2>
                        </div>
                        <ul className="grid gap-4">
                            {features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <div className="bg-green-500/10 p-1 rounded-full mt-1">
                                        <Check className="h-4 w-4 text-green-500" />
                                    </div>
                                    <span className="text-muted-foreground">{feature}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="pt-4">
                            <Button asChild size="lg">
                                <Link href="/lwc-playground">Explore Playground</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
