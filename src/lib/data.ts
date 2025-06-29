import { Database, Code, Zap, Trophy, Award, BarChart, GitCommit } from 'lucide-react';
import type { LeaderboardUser, User, Course } from '@/types';

export const courses: Course[] = [
  {
    id: 'soql',
    title: 'SOQL Mastery',
    description: 'Practice complex queries with real-time validation and feedback.',
    icon: Database,
    href: '/problems/soql'
  },
  {
    id: 'apex',
    title: 'Apex Development',
    description: 'Write and execute Apex code with instant testing on live Salesforce orgs.',
    icon: Code,
    href: '/problems/apex'
  },
  {
    id: 'lwc',
    title: 'LWC Challenges',
    description: 'Build and test Lightning Web Components in a sandboxed environment.',
    icon: Zap,
    href: '/problems/lwc'
  },
];

export const leaderboardData: LeaderboardUser[] = [
  { rank: 1, id: '1', username: 'apex-master', name: 'Alex Doe', avatarUrl: 'https://placehold.co/40x40.png', points: 15230, country: 'USA' },
  { rank: 2, id: '2', username: 'soql-queen', name: 'Samantha Roe', avatarUrl: 'https://placehold.co/40x40.png', points: 14890, country: 'Canada' },
  { rank: 3, id: '3', username: 'lwc-wizard', name: 'Leo Smith', avatarUrl: 'https://placehold.co/40x40.png', points: 14500, country: 'USA', company: 'Google' },
  { rank: 4, id: '4', username: 'code-ninja', name: 'Nina Chen', avatarUrl: 'https://placehold.co/40x40.png', points: 13980, country: 'Germany' },
  { rank: 5, id: '5', username: 'salesforce-dev', name: 'Kenji Tanaka', avatarUrl: 'https://placehold.co/40x40.png', points: 13500, country: 'Japan', company: 'Salesforce' },
  { rank: 6, id: '6', username: 'trigger-happy', name: 'Maria Garcia', avatarUrl: 'https://placehold.co/40x40.png', points: 12800, country: 'Spain' },
  { rank: 7, id: '7', username: 'visualforce-vet', name: 'David Miller', avatarUrl: 'https://placehold.co/40x40.png', points: 12100, country: 'USA' },
  { rank: 8, id: '8', username: 'current-user', name: 'Charlie Brown', avatarUrl: 'https://placehold.co/40x40.png', points: 11950, country: 'USA', company: 'Firebase' },
  { rank: 9, id: '9', username: 'api-architect', name: 'Priya Patel', avatarUrl: 'https://placehold.co/40x40.png', points: 11500, country: 'India' },
  { rank: 10, id: '10', username: 'flow-fanatic', name: 'Omar Al-Farsi', avatarUrl: 'https://placehold.co/40x40.png', points: 11200, country: 'UAE' },
];

export const mockUser: User = {
    id: '8',
    uid: 'mock-uid-8',
    username: 'current-user',
    name: 'Charlie Brown',
    email: 'charlie@brown.com',
    avatarUrl: 'https://placehold.co/128x128.png',
    country: 'USA',
    company: 'Firebase',
    points: 11950,
    rank: 8,
    trailheadUrl: 'https://trailblazer.me/id/charliebrown',
    githubUrl: 'https://github.com/charliebrown',
    linkedinUrl: 'https://linkedin.com/in/charliebrown',
    twitterUrl: 'https://twitter.com/charliebrown',
    achievements: [
        { id: '1', name: 'Apex Pioneer', description: 'Complete 10 Apex challenges.', icon: 'Trophy', date: '2023-10-15' },
        { id: '2', name: 'SOQL Specialist', description: 'Master advanced SOQL queries.', icon: 'Award', date: '2023-09-20' },
        { id: '3', name: 'Top Contributor', description: 'Reach top 10 on the leaderboard.', icon: 'BarChart', date: '2023-11-01' },
        { id: '4', name: 'Code Committer', description: 'Make your first 50 commits.', icon: 'GitCommit', date: '2023-08-01' },
    ],
    contributions: Array.from({ length: 365 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
            date: date.toISOString().split('T')[0],
            count: Math.floor(Math.random() * 10),
        };
    }),
};
