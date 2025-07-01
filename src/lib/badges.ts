
export type BadgeCriteria = {
  description: string;
  type: 'STREAK' | 'POINTS' | 'TOTAL_SOLVED' | 'CATEGORY_SOLVED' | 'ACTIVE_DAYS';
  value: number;
  category?: string; // For CATEGORY_SOLVED
};

export const BADGES: { [badgeName: string]: BadgeCriteria } = {
  // Streak Badges
  'Streak Starter': { description: 'Solve problems 3 days in a row', type: 'STREAK', value: 3 },
  'Consistent Coder': { description: 'Solve problems 7 days in a row', type: 'STREAK', value: 7 },
  'Streak Beast': { description: 'Solve problems 15 days in a row', type: 'STREAK', value: 15 },
  'Unstoppable': { description: 'Solve problems 30 days in a row', type: 'STREAK', value: 30 },
  'Code Machine': { description: 'Solve problems 60 days in a row', type: 'STREAK', value: 60 },
  'Coding God': { description: 'Solve problems 100+ days in a row', type: 'STREAK', value: 100 },

  // Points Badges
  'New Challenger': { description: 'Earn 50 points', type: 'POINTS', value: 50 },
  'Problem Solver': { description: 'Earn 200 points', type: 'POINTS', value: 200 },
  'DSA Warrior': { description: 'Earn 500 points', type: 'POINTS', value: 500 },
  'Legend': { description: 'Earn 1000 points', type: 'POINTS', value: 1000 },
  'Apex Coder': { description: 'Earn 2000 points', type: 'POINTS', value: 2000 },
  'Mastermind': { description: 'Earn 3000+ points', type: 'POINTS', value: 3000 },

  // Category Mastery Badges (Specific) - Note: Category names must match exactly what's in Firestore.
  'Array Ace': { description: 'Solve 20+ Array problems', type: 'CATEGORY_SOLVED', value: 20, category: 'Arrays & Hashing' },
  'Math Magician': { description: 'Solve 20+ Math problems', type: 'CATEGORY_SOLVED', value: 20, category: 'Math & Geometry' },
  'Recursion Ruler': { description: 'Solve 15+ Recursion problems', type: 'CATEGORY_SOLVED', value: 15, category: 'Backtracking' }, // Using Backtracking as a proxy
  'Graph Guru': { description: 'Solve 15+ Graph problems', type: 'CATEGORY_SOLVED', value: 15, category: 'Graphs' },
  'Tree Whisperer': { description: 'Solve 15+ Tree problems', type: 'CATEGORY_SOLVED', value: 15, category: 'Trees' },
  'Dynamic Slayer': { description: 'Solve 15+ DP problems', type: 'CATEGORY_SOLVED', value: 15, category: 'Dynamic Programming' },

  // Total Solved Badges
  'Just Getting Started': { description: 'Solve 10 questions', type: 'TOTAL_SOLVED', value: 10 },
  'Warming Up': { description: 'Solve 25 questions', type: 'TOTAL_SOLVED', value: 25 },
  'In The Zone': { description: 'Solve 50 questions', type: 'TOTAL_SOLVED', value: 50 },
  'Heavy Lifter': { description: 'Solve 100 questions', type: 'TOTAL_SOLVED', value: 100 },
  'Brainiac': { description: 'Solve 250 questions', type: 'TOTAL_SOLVED', value: 250 },
  'Insane Coder': { description: 'Solve 500+ questions', type: 'TOTAL_SOLVED', value: 500 },

  // Daily Participation Badges
  'Hacker Marathoner': { description: '100+ total active days', type: 'ACTIVE_DAYS', value: 100 },
};
