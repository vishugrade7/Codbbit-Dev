
"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Image from "next/image";

const testimonials = [
    {
        quote: "Accidentally got addicted to Codbbit, oops. The problems are the perfect mix of challenging and fun for any Salesforce developer.",
        name: "Alex Johnson",
        role: "Salesforce Developer",
        image: "https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMHx8bWFufGVufDB8fHx8MTc1NDE0NjQ5MHww&ixlib=rb-4.1.0&q=80&w=1080",
        "data-ai-hint": "smiling developer"
    },
    {
        quote: "The best platform for practicing Apex. My coding speed and quality have improved dramatically. Highly recommended for interview prep!",
        name: "Samantha Lee",
        role: "Senior Salesforce Consultant",
        image: "https://images.unsplash.com/photo-1615109398623-88346a601842?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxtYW58ZW58MHx8fHwxNzU0MTQ2NDkwfDA&ixlib=rb-4.1.0&q=80&w=1080",
        "data-ai-hint": "woman architect"
    },
    {
        quote: "Codbbit's interactive courses are a game-changer. I finally understood complex LWC concepts that I struggled with for months.",
        name: "Michael Chen",
        role: "Technical Architect",
        image: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxNXx8bWFufGVufDB8fHx8MTc1NDE0NjQ5MHww&ixlib=rb-4.1.0&q=80&w=1080",
        "data-ai-hint": "man at computer"
    },
    {
        quote: "A must-have tool for any developer in the Salesforce ecosystem. The leaderboard adds a fun, competitive edge to learning.",
        name: "Emily Rodriguez",
        role: "Salesforce Admin",
        image: "https://images.unsplash.com/photo-1488716820095-cbe80883c496?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxNXx8d29tYW58ZW58MHx8fHwxNzU0MjIxOTg4fDA&ixlib=rb-4.1.0&q=80&w=1080",
        "data-ai-hint": "woman professional"
    },
    {
        quote: "The 'Test Class' problems are unique and incredibly helpful for mastering test-driven development in Apex. I haven't seen this anywhere else.",
        name: "David Kim",
        role: "Lead Developer",
        image: "https://images.unsplash.com/photo-1600486913747-55e5470d6f40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxOHx8bWFufGVufDB8fHx8MTc1NDE0NjQ5MHww&ixlib=rb-4.1.0&q=80&w=1080",
        "data-ai-hint": "man coding"
    }
];

export default function Testimonials() {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background text-foreground">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center gap-4 mb-12">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">Why developers love <span className="text-primary">{'{'}</span>Codbbit<span className="text-primary">{'}'}</span>?</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl">
              See why developers choose to level up their Salesforce skills with our platform.
            </p>
        </div>
        <Carousel
          plugins={[plugin.current]}
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
        >
          <CarouselContent className="-ml-8">
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index} className="pl-8 md:basis-1/2 lg:basis-1/3">
                <div className="h-full bg-[rgb(var(--testimonial-background-light))] dark:bg-[rgb(var(--testimonial-background-dark))] border rounded-2xl p-8 flex flex-col justify-center">
                    <blockquote className="text-lg font-medium text-card-foreground">
                      “{testimonial.quote}”
                    </blockquote>
                    <div className="flex items-center gap-4 mt-6">
                        <Image
                            src={testimonial.image}
                            alt={testimonial.name}
                            width={48}
                            height={48}
                            data-ai-hint={testimonial['data-ai-hint']}
                            className="rounded-full border-2 border-primary/50 object-cover aspect-square"
                        />
                        <div>
                            <p className="font-semibold text-card-foreground">{testimonial.name}</p>
                            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                        </div>
                    </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden lg:flex" />
          <CarouselNext className="hidden lg:flex" />
        </Carousel>
      </div>
    </section>
  )
}
