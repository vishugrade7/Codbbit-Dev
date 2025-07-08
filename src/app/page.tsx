
'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import FeatureGrid from "@/components/feature-grid";

const TSIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4H20V6H12V20H10V6H4V4ZM20 8V18H18V10H14V8H20Z" fill="currentColor"/>
  </svg>
);

const CIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.75 7C13.75 6.25 12.5 5.75 11.25 5.75C8.75 5.75 7 7.75 7 10.25V13.75C7 16.25 8.75 18.25 11.25 18.25C12.5 18.25 13.75 17.75 14.75 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const PythonIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 6.5C15 5.5 14.5 4 12.5 4S10 5.5 10 6.5V11H14V12.5C14 14.5 12.5 16 10.5 16H10V20H12.5C16.5 20 18 17.5 18 15.5V11C18 7.5 15.5 6.5 15 6.5Z" fill="currentColor"/>
    <path d="M9 17.5C9 18.5 9.5 20 11.5 20S14 18.5 14 17.5V13H10V11.5C10 9.5 11.5 8 13.5 8H14V4H11.5C7.5 4 6 6.5 6 8.5V13C6 16.5 8.5 17.5 9 17.5Z" fill="currentColor"/>
  </svg>
);

const GoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12L12 6H6V12H12ZM12 12L12 18H18V12H12Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 12L6 18" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M18 6L12 12" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const FSharpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4L6 7V13L12 16L18 13V7L12 4Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M18 7L12 10L6 7" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 10V16" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);


const JavaIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 8C8 5 10 3 14 3C18 3 20 5 20 8V11C20 14 18 16 14 16H13L13 12" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M4 21L8 21C12 21 13.5 19 13.5 16V3" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);


const icons = [
  { icon: <PythonIcon />, className: "top-[15%] left-[20%] w-12 h-12", duration: "12s" },
  { icon: <CIcon />, className: "top-[25%] left-[70%] w-16 h-16", duration: "10s" },
  { icon: <TSIcon />, className: "top-[10%] left-[50%] w-10 h-10", duration: "14s" },
  { icon: <GoIcon />, className: "bottom-[15%] left-[10%] w-14 h-14", duration: "11s" },
  { icon: <FSharpIcon />, className: "bottom-[20%] right-[15%] w-12 h-12", duration: "13s" },
  { icon: <JavaIcon />, className: "top-[55%] right-[22%] w-16 h-16", duration: "15s" },
  // Empty blurred squares
  { icon: null, className: "top-[40%] left-[5%] w-20 h-20", duration: "18s" },
  { icon: null, className: "top-[65%] left-[30%] w-10 h-10", duration: "9s" },
  { icon: null, className: "bottom-[5%] right-[50%] w-12 h-12", duration: "16s" },
  { icon: null, className: "top-[5%] right-[10%] w-24 h-24", duration: "20s" },
];


export default function Home() {
  return (
    <main className="w-full flex flex-col items-center justify-center overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden">
        {/* Floating Icons Background */}
        <div className="absolute inset-0 z-0">
            {icons.map((item, index) => (
            <div 
                key={index} 
                className={cn(
                "absolute rounded-lg bg-card/10 backdrop-blur-[2px] border border-border/10 flex items-center justify-center text-muted-foreground/50", 
                item.className
                )}
                style={{ animation: `float ${item.duration} ease-in-out infinite` }}
            >
                {item.icon}
            </div>
            ))}
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
            Achieve <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">mastery</span>
            <br />
            through challenge
            </h1>
            <p className="mx-auto mt-6 max-w-[700px] text-lg text-muted-foreground md:text-xl">
            Improve your development skills by training with your peers on code kata that continuously challenge and push your coding practice.
            </p>
            <div className="mt-8 flex justify-center gap-4">
                <Button asChild size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 text-primary-foreground hover:opacity-90 transition-opacity">
                <Link href="/apex-problems">
                    Get Started
                </Link>
                </Button>
            </div>
        </div>

        {/* Bottom Decorative Card */}
        <aside className="absolute bottom-0 z-0 h-1/3 w-full max-w-7xl rounded-t-3xl bg-card/5 [mask-image:linear-gradient(to_top,white,transparent)]" />
      </section>

      {/* Feature Grid Section */}
      <FeatureGrid />
    </main>
  );
}
