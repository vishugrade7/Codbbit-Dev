import Image from "next/image";
import { Card, CardContent, CardHeader } from "./ui/card";

export default function AboutSection() {
  return (
    <section id="about" className="w-full py-12 md:py-24 lg:py-32 bg-card">
      <div className="container px-4 md:px-6">
        <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
            <div className="relative mx-auto w-64 h-64 lg:w-80 lg:h-80">
                <div className="absolute inset-0 bg-primary rounded-full blur-2xl opacity-50"></div>
                 <Image
                    src="https://placehold.co/400x400.png"
                    alt="About Me"
                    width={400}
                    height={400}
                    className="relative rounded-full object-cover z-10 border-8 border-card"
                    data-ai-hint="professional portrait"
                />
            </div>
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold font-headline tracking-tighter sm:text-4xl text-primary">About Me</h2>
              <p className="text-muted-foreground md:text-xl/relaxed">
                I am a passionate and results-driven developer and designer with a knack for creating engaging and user-friendly digital solutions. With a background in both front-end and back-end technologies, I thrive on turning complex problems into elegant, interactive experiences.
              </p>
              <p className="text-muted-foreground md:text-xl/relaxed">
                When I'm not coding, you can find me exploring new technologies, contributing to open-source projects, or hiking in the great outdoors. I'm always eager to learn and take on new challenges.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
