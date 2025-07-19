
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import FeatureGrid from '@/components/feature-grid';
import Testimonials from '@/components/testimonials';
import InteractivePlayground from '@/components/interactive-playground';

const SkillCard = ({
  title,
  icon,
  bgColor,
  borderColor,
}: {
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
}) => (
  <div
    className={`flex items-center justify-between p-4 rounded-full border transition-all duration-300 hover:scale-105 hover:border-white/80 ${borderColor}`}
  >
    <span className="text-lg font-medium text-white">{title}</span>
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-full ${bgColor}`}
    >
      {icon}
    </div>
  </div>
);

export default function Home() {
  const skills = [
    {
      title: 'Apex',
      icon: (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
            stroke="black"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M2 7L12 12L22 7"
            stroke="black"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M12 12V22"
            stroke="black"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      ),
      bgColor: 'bg-white',
      borderColor: 'border-white/20',
    },
    {
      title: 'LWC',
      icon: (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17.25 6.75L19.25 12L17.25 17.25"
            stroke="#000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M6.75 6.75L4.75 12L6.75 17.25"
            stroke="#000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
          <path
            d="M14 17.25H10"
            stroke="#000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
        </svg>
      ),
      bgColor: 'bg-[#00A1E0]',
      borderColor: 'border-[#00A1E0]/50',
    },
    {
      title: 'SOQL',
      icon: (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M21 8.5C21 10.7091 16.9706 12.5 12 12.5C7.02944 12.5 3 10.7091 3 8.5C3 6.29086 7.02944 4.5 12 4.5C16.9706 4.5 21 6.29086 21 8.5Z"
            stroke="#000"
            strokeWidth="2"
          ></path>
          <path
            d="M21 12C21 14.2091 16.9706 16 12 16C7.02944 16 3 14.2091 3 12"
            stroke="#000"
            strokeWidth="2"
          ></path>
          <path
            d="M21 15.5C21 17.7091 16.9706 19.5 12 19.5C7.02944 19.5 3 17.7091 3 15.5"
            stroke="#000"
            strokeWidth="2"
          ></path>
        </svg>
      ),
      bgColor: 'bg-[#7F00FF]',
      borderColor: 'border-[#7F00FF]/50',
    },
    {
      title: 'Triggers',
      icon: (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13 3L5 12H11L11 21L19 12H13L13 3Z"
            stroke="#000"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          ></path>
        </svg>
      ),
      bgColor: 'bg-[#666666]',
      borderColor: 'border-[#666666]/50',
    },
  ];

  return (
    <main>
      <div className="w-full flex flex-col items-center justify-center bg-black text-white p-4 py-24 md:py-32">
        <div className="container mx-auto flex flex-col items-center text-center gap-12 max-w-4xl">
          <div className="flex flex-col gap-6">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              <span className="text-primary">{'{Master}'}</span> Salesforce Skills
              for Today's Developer
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto">
              Unlock higher levels of mastery with our interactive courses,
              hands-on practice problems, and AI-powered learning experiences.
            </p>
          </div>

          <div className="flex flex-row items-center gap-4">
            <Button
              asChild
              variant="outline"
              className="bg-white text-black hover:bg-neutral-200 dark:bg-black dark:text-white dark:hover:bg-neutral-800"
            >
              <Link href="/apex-problems">Explore Problems</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Try for Free</Link>
            </Button>
          </div>

          <div className="w-full grid grid-cols-2 gap-6 pt-8">
            {skills.map((skill) => (
              <SkillCard key={skill.title} {...skill} />
            ))}
          </div>
        </div>
      </div>
      <FeatureGrid />
      <Testimonials />
      <InteractivePlayground />
    </main>
  );
}
