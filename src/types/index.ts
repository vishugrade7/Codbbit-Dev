export type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string;
  country: string;
  company?: string;
  points: number;
  rank: number;
  achievements: Achievement[];
  contributions: Contribution[];
  sfdcAuth?: {
    accessToken: string;
    instanceUrl: string;
  }
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
