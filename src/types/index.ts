

export type User = {
  id: string;
  uid: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string;
  country: string;
  company?: string;
  companyLogoUrl?: string;
  points: number;
  rank: number;
  achievements: Achievement[];
  contributions: Contribution[];
  sfdcAuth?: {
    accessToken: string;
    instanceUrl: string;
  };
  isAdmin?: boolean;
  trailheadUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  githubUrl?: string;
};

export type LeaderboardUser = {
  rank: number;
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  points: number;
  country: string;
  company?: string;
  companyLogoUrl?: string;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  date: string;
};

export type Contribution = {
  date: string;
  count: number;
};

export type Course = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
};

export type Example = {
    id?: string; // for react keys
    input?: string;
    output: string;
    explanation?: string;
}

export type Problem = {
  id: string; // This will be a unique ID for the problem within the array
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  examples: Example[];
  hints: string[];
  metadataType: string;
  sampleCode: string;
  testcases: string;
};

// This represents the structure of the data fetched from the `problems/Apex` document
export type ApexProblemsData = {
    [categoryName: string]: {
        Questions: Problem[];
    }
}
