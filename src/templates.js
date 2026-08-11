// Project Templates Configuration
export const PROJECT_TEMPLATES = {
  'web-development': {
    name: 'Web Development Project',
    category: 'development',
    defaultDeadline: 30, // days
    milestones: [
      { name: 'Planning & Design', estimatedDays: 7 },
      { name: 'Frontend Development', estimatedDays: 10 },
      { name: 'Backend Development', estimatedDays: 8 },
      { name: 'Testing & Deployment', estimatedDays: 5 },
    ],
    tags: ['web', 'frontend', 'backend', 'development'],
    description:
      'Complete web development project with frontend and backend components',
  },
  'mobile-app': {
    name: 'Mobile App Development',
    category: 'development',
    defaultDeadline: 45,
    milestones: [
      { name: 'UI/UX Design', estimatedDays: 10 },
      { name: 'Core Features', estimatedDays: 15 },
      { name: 'Platform Integration', estimatedDays: 10 },
      { name: 'Testing & Launch', estimatedDays: 10 },
    ],
    tags: ['mobile', 'app', 'ios', 'android'],
    description: 'Mobile application development for iOS and Android',
  },
  research: {
    name: 'Research Project',
    category: 'research',
    defaultDeadline: 60,
    milestones: [
      { name: 'Literature Review', estimatedDays: 15 },
      { name: 'Data Collection', estimatedDays: 20 },
      { name: 'Analysis', estimatedDays: 15 },
      { name: 'Writing & Publication', estimatedDays: 10 },
    ],
    tags: ['research', 'academic', 'analysis'],
    description: 'Academic or professional research project',
  },
  'content-creation': {
    name: 'Content Creation',
    category: 'creative',
    defaultDeadline: 21,
    milestones: [
      { name: 'Content Planning', estimatedDays: 5 },
      { name: 'Creation Phase', estimatedDays: 10 },
      { name: 'Editing & Review', estimatedDays: 3 },
      { name: 'Publication', estimatedDays: 3 },
    ],
    tags: ['content', 'creative', 'writing'],
    description:
      'Content creation project including writing, video, or multimedia',
  },
  learning: {
    name: 'Learning & Skill Development',
    category: 'education',
    defaultDeadline: 90,
    milestones: [
      { name: 'Foundation Learning', estimatedDays: 30 },
      { name: 'Practice Projects', estimatedDays: 30 },
      { name: 'Advanced Topics', estimatedDays: 20 },
      { name: 'Skill Assessment', estimatedDays: 10 },
    ],
    tags: ['learning', 'education', 'skill', 'development'],
    description: 'Structured learning project for new skills or technologies',
  },
};

// Project Categories
export const PROJECT_CATEGORIES = {
  development: { name: 'Development', icon: '💻', color: '#3498db' },
  research: { name: 'Research', icon: '🔬', color: '#9b59b6' },
  creative: { name: 'Creative', icon: '🎨', color: '#e74c3c' },
  education: { name: 'Education', icon: '📚', color: '#f39c12' },
  business: { name: 'Business', icon: '💼', color: '#2ecc71' },
  personal: { name: 'Personal', icon: '👤', color: '#1abc9c' },
};

// Common Tags
export const COMMON_TAGS = [
  'urgent',
  'important',
  'long-term',
  'short-term',
  'team',
  'solo',
  'frontend',
  'backend',
  'fullstack',
  'mobile',
  'web',
  'desktop',
  'research',
  'academic',
  'creative',
  'business',
  'personal',
  'learning',
  'skill-development',
  'prototype',
  'production',
  'client',
  'internal',
  'open-source',
  'commercial',
];
