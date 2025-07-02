






export type SolvedProblemDetail = {
  solvedAt: any; // Firestore Timestamp
  points: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  categoryName: string;
};

export type Achievement = {
  name: string;
  description: string;
  date: any; // Firestore Timestamp
};

export type User = {
  id: string;
  uid: string;
  username: string;
  name: string;
  email: string;
  isEmailPublic?: boolean;
  avatarUrl: string;
  country: string;
  company?: string;
  companyLogoUrl?: string;
  points: number;
  rank: number;
  achievements?: { [badgeName: string]: Achievement };
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

  // Razorpay Payment Fields
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  razorpaySubscriptionStatus?: string;
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

export type Contribution = {
  date: string;
  count: number;
};

export type Lesson = {
  id: string;
  title: string;
  contentType: 'video' | 'pdf' | 'text' | 'problem' | 'interactive';
  content: string; // URL for video/pdf, markdown for text, problemId for problem
  isFree?: boolean;
};

export type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

export type Course = {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  modules: Module[];
  isPublished: boolean;
  createdAt: any; // Firestore Timestamp
  createdBy: string; // user UID
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
  company?: string;
  isPremium?: boolean;
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

export type NavLink = {
  id: string;
  label: string;
  href: string;
  isEnabled: boolean;
  isProtected: boolean; // To prevent deletion of core links
};

export type Badge = {
  id: string;
  name: string;
  description: string;
  type: 'STREAK' | 'POINTS' | 'TOTAL_SOLVED' | 'CATEGORY_SOLVED' | 'ACTIVE_DAYS';
  value: number;
  category?: string;
};
