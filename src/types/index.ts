
export type SolvedProblemDetail = {
  solvedAt: any; // Firestore Timestamp
  points: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
};

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
    refreshToken: string;
    issuedAt: number;
    connected: boolean;
  };
  isAdmin?: boolean;
  trailheadUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  githubUrl?: string;
  starredProblems?: string[];

  // Detailed Progress Tracking
  solvedProblems?: { [problemId: string]: SolvedProblemDetail };
  dsaStats?: { [difficulty: string]: number }; // e.g., { Easy: 5, Medium: 2 }
  categoryPoints?: { [categoryName: string]: number }; // e.g., { "Apex Triggers": 50 }
  submissionHeatmap?: { [date: string]: number }; // e.g., { "2024-07-29": 3 }
  currentStreak?: number;
  maxStreak?: number;
  lastSolvedDate?: string; // YYYY-MM-DD
  subscribedSheetIds?: string[];
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
  id:string;
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
  metadataType: 'Class' | 'Trigger';
  triggerSObject?: string;
  sampleCode: string;
  testcases: string;
  categoryName?: string; // Added for convenience
};

// This represents the structure of the data fetched from the `problems/Apex` document
export type ApexProblemsData = {
    [categoryName: string]: {
        Questions: Problem[];
    }
}

export type ProblemSheet = {
  id: string;
  name: string;
  createdBy: string; // User UID
  creatorName: string;
  creatorAvatarUrl: string;
  createdAt: any; // Firestore Timestamp
  isPublic: boolean;
  problemIds: string[];
  subscribers?: string[];
};
