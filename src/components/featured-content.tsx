
'use client';

import Image from "next/image";
import { cn } from "@/lib/utils";

const images = [
    { src: "https://placehold.co/800x600.png", alt: "App on Laptop", className: "w-[50rem]"},
    { src: "https://placehold.co/400x600.png", alt: "App on Tablet", className: "w-[25rem]"},
    { src: "https://placehold.co/800x600.png", alt: "App on Desktop", className: "w-[50rem]"},
    { src: "https://placehold.co/400x600.png", alt: "App on Mobile", className: "w-[25rem]"},
];

const StaggeredMarquee = () => {
    return (
        <div className="relative w-full overflow-hidden">
            <div className="flex animate-marquee motion-reduce:animate-none">
                {[...images, ...images].map((img, index) => (
                    <div
                        key={`marquee-item-${index}`}
                        className={cn(
                            "flex-shrink-0 rounded-xl mx-2",
                            index % 2 === 0 ? "mt-4" : "mb-4"
                        )}
                    >
                        <Image
                            src={img.src}
                            alt={img.alt}
                            width={800}
                            height={600}
                            className={cn("h-auto rounded-xl object-cover border border-border/10 shadow-lg", img.className)}
                        />
                    </div>
                ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background"></div>
        </div>
    );
};

export default function FeaturedContent() {
  return (
    <section className="w-full pt-12 pb-24 md:py-32 lg:py-40 bg-background">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center gap-4 mb-12">
            <div className="text-sm font-semibold tracking-wide text-muted-foreground">Featured by our community</div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl">
                Discover the latest and greatest work from our talented community of developers and designers.
            </h2>
        </div>
      </div>
      <StaggeredMarquee />
    </section>
  );
}
