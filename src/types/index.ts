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

export type Problem = {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  // Other fields like statement, solution, etc. can be added here
};

export type Category = {
  id: string;
  name: string;
  problemCount?: number;
};
