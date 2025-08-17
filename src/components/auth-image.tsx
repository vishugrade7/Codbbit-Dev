"use client";

import Image from "next/image";

export default function AuthImage() {
  return (
    <div className="relative hidden lg:flex flex-col items-center justify-center h-full bg-primary/5 p-8 text-center border-l">
      <Image
        src="https://placehold.co/400x400.png"
        alt="Make your work easier and organized"
        width={400}
        height={400}
        className="mb-8"
        data-ai-hint="woman meditating illustration"
      />
      <h2 className="text-2xl font-bold text-foreground">
        Make your work easier and organized
      </h2>
      <p className="text-muted-foreground mt-2">
        Simplify your workflow and boost your productivity.
      </p>
    </div>
  );
}
