
"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Users } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

const testimonials = [
    {
        quote: "Accidentally got addicted to Codbbit, oops. The problems are the perfect mix of challenging and fun for any Salesforce developer.",
        name: "Alex Johnson",
        role: "Salesforce Developer",
        avatar: "https://placehold.co/48x48.png",
        avatarHint: "woman face",
    },
    {
        quote: "The best platform for practicing Apex. My coding speed and quality have improved dramatically. Highly recommended for interview prep!",
        name: "Samantha Lee",
        role: "Senior Salesforce Consultant",
        avatar: "https://placehold.co/48x48.png",
        avatarHint: "woman portrait",
    },
    {
        quote: "Codbbit's interactive courses are a game-changer. I finally understood complex LWC concepts that I struggled with for months.",
        name: "Michael Chen",
        role: "Technical Architect",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxtZW58ZW58MHx8fHwxNzUyMzE2MTEzfDA&ixlib=rb-4.1.0&q=80&w=1080",
        avatarHint: "man professional",
    }
];

const features = [
    {
        icon: Target,
        title: "Build Self-Confidence",
        description: "Not sure if you are progressing well as a programmer? Push yourself to your limits and show what you are really made of with our targeted Apex and LWC challenges."
    },
    {
        icon: Users,
        title: "Become a Mentor",
        description: "Lend your expertise to others by contributing great solutions, or directly by creating your own problem sets and reviewing code."
    }
];

export default function Testimonials() {
  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:gap-8">
          {/* Testimonial Card */}
           <Carousel
              plugins={[plugin.current]}
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
              onMouseEnter={plugin.current.stop}
              onMouseLeave={plugin.current.reset}
            >
              <CarouselContent>
                {testimonials.map((testimonial, index) => (
                  <CarouselItem key={index}>
                    <Card className="p-6 md:p-8 lg:p-12">
                      <CardContent className="flex flex-col items-center text-center gap-6 p-0">
                        <h2 className="text-2xl md:text-3xl font-semibold max-w-sm md:max-w-3xl">
                          {testimonial.quote}
                        </h2>
                        <div className="flex flex-col items-center gap-2">
                          <Avatar>
                            <AvatarImage src={testimonial.avatar} alt={testimonial.name} data-ai-hint={testimonial.avatarHint} />
                            <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{testimonial.name}</p>
                            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden lg:flex" />
              <CarouselNext className="hidden lg:flex" />
            </Carousel>


          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {features.map((feature, index) => (
                 <Card key={index}>
                    <CardContent className="p-6 md:p-8 lg:p-12">
                        <div className="inline-block rounded-lg bg-primary/10 p-3 text-primary mb-4 w-fit">
                            <feature.icon className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-semibold">{feature.title}</h3>
                        <p className="mt-4 text-muted-foreground">{feature.description}</p>
                    </CardContent>
                 </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
