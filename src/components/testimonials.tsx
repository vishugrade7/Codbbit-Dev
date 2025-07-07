
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin } from 'lucide-react';

const testimonials = [
  {
    quote: "The creative standard for hosting video. There is no alternative, and there doesn't need to be.",
    name: "Meg Volk",
    role: "Sr. Producer",
    location: "New York, NY",
    avatar: { src: "https://placehold.co/40x40.png", hint: "woman face" },
    rating: 5,
  },
  {
    quote: "Saved us so many times over the last several years!",
    name: "Eric Pokorny",
    role: "Developer",
    location: "Seattle, WA",
    avatar: { src: "https://placehold.co/40x40.png", hint: "man face" },
    rating: 5,
  },
  {
    quote: "This is the best streaming platform for creators who care about quality.",
    name: "Jane Doe",
    role: "Videographer",
    location: "New York, NY",
    avatar: { src: "https://placehold.co/40x40.png", hint: "woman portrait" },
    rating: 5,
  },
  {
    quote: "One tool to rule them all. The integrations are seamless and powerful.",
    name: "Rainer L.",
    role: "Product Manager",
    location: "Berlin, Germany",
    avatar: { src: "https://placehold.co/40x40.png", hint: "man portrait" },
    rating: 5,
  },
  {
    quote: "My team's productivity has skyrocketed since we adopted this platform.",
    name: "Kenji Tanaka",
    role: "Engineering Lead",
    location: "Tokyo, Japan",
    avatar: { src: "https://placehold.co/40x40.png", hint: "asian man" },
    rating: 5,
  },
    {
    quote: "Incredibly intuitive and easy to use. I was up and running in minutes.",
    name: "Maria Garcia",
    role: "Solo Creator",
    location: "Madrid, Spain",
    avatar: { src: "https://placehold.co/40x40.png", hint: "woman smiling" },
    rating: 5,
  },
];

const TestimonialCard = ({ testimonial }: { testimonial: typeof testimonials[0] }) => {
  return (
    <Card className="w-[350px] shrink-0 bg-background shadow-md">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="relative mb-4 flex-grow">
          <span className="absolute top-0 left-0 text-6xl font-serif text-muted opacity-20 select-none">“</span>
          <p className="pt-6 text-base text-foreground font-medium">{testimonial.quote}</p>
        </div>
        <div className="flex mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`h-5 w-5 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={testimonial.avatar.src} alt={testimonial.name} data-ai-hint={testimonial.avatar.hint} />
            <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{testimonial.name}</p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>{testimonial.role}</span>
              <span className="text-muted-foreground/30">•</span>
              <MapPin className="h-3.5 w-3.5" />
              <span>{testimonial.location}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const MarqueeContent = ({ 'aria-hidden': ariaHidden }: { 'aria-hidden'?: boolean }) => (
    <div className="flex shrink-0 gap-6 py-4" aria-hidden={ariaHidden}>
        {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
        ))}
    </div>
)

export default function Testimonials() {
  return (
    <section className="w-full py-20 md:py-32 bg-muted/20 overflow-x-hidden">
      <div className="container px-4 md:px-6 mb-8">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center">
          What customers are saying
        </h2>
      </div>
      <div className="relative w-full [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
        <div className="flex animate-marquee hover:[animation-play-state:paused]">
          <MarqueeContent />
          <MarqueeContent aria-hidden />
        </div>
      </div>
    </section>
  )
}
