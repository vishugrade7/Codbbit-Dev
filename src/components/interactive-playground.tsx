
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
                    <div className="flex items-center justify-center">
                        <Image
                            src="https://images.unsplash.com/photo-1515879218367-8466d910aaa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxjb2Rpbmd8ZW58MHx8fHwxNzU0MjIyMDcxfDA&ixlib=rb-4.1.0&q=80&w=1080"
                            width={500}
                            height={400}
                            alt="Interactive coding illustration"
                            data-ai-hint="developers coding"
                            className="rounded-lg object-contain"
                        />
                    </div>
                    <div className="flex flex-col justify-center space-y-6">
                        <div className="space-y-2">
                            <div className="text-primary font-semibold tracking-wide">APEX PLAYGROUND</div>
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
                                <Link href="/apex-problems">Explore Playground</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
