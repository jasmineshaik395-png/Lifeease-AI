import { Task, DailyPlan, UserPreferences } from '../types';

const TASKS_KEY = 'lifeease_tasks_v1';
const PLAN_KEY = 'lifeease_plan_v1';
const PREFERENCES_KEY = 'lifeease_prefs_v1';

export const INITIAL_SAMPLE_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Prepare Hackathon Pitch & Live Demo',
    description: 'Finalize the 3-minute pitch slide deck and rehearse the live product demonstration.',
    category: 'work',
    priority: 'high',
    estimatedMinutes: 60,
    deadline: 'Today, 2:00 PM',
    preferredTime: 'morning',
    energyLevel: 'high',
    completed: false,
    createdAt: new Date().toISOString(),
    subtasks: [
      { id: 'sub-1', title: 'Outline key problem & solution', completed: true, minutes: 15 },
      { id: 'sub-2', title: 'Polish Gemini AI feature demo', completed: false, minutes: 25 },
      { id: 'sub-3', title: 'Record backup screen recording', completed: false, minutes: 20 },
    ],
  },
  {
    id: 'task-2',
    title: 'Review Machine Learning & Algorithms Notes',
    description: 'Study chapter 4 on prompt optimization and neural network basics.',
    category: 'study',
    priority: 'medium',
    estimatedMinutes: 45,
    deadline: 'Today, 5:00 PM',
    preferredTime: 'afternoon',
    energyLevel: 'high',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'Healthy Lunch & 15-Minute Outdoor Walk',
    description: 'Step away from screens, eat a balanced meal, and get fresh air to reset mental focus.',
    category: 'health',
    priority: 'high',
    estimatedMinutes: 45,
    preferredTime: 'afternoon',
    energyLevel: 'low',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-4',
    title: 'Sort Inbox & Reply to Team Feedback',
    description: 'Clear urgent emails, approve pending pull requests, and acknowledge team updates.',
    category: 'work',
    priority: 'low',
    estimatedMinutes: 30,
    preferredTime: 'afternoon',
    energyLevel: 'medium',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-5',
    title: 'Weekly Grocery & Household Restock',
    description: 'Pick up fresh produce, pantry essentials, and laundry supplies.',
    category: 'chores',
    priority: 'medium',
    estimatedMinutes: 40,
    preferredTime: 'evening',
    energyLevel: 'low',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-6',
    title: 'Review Monthly Budget & Subscriptions',
    description: 'Check bank statement, log hackathon expenses, and cancel unused subscriptions.',
    category: 'finance',
    priority: 'low',
    estimatedMinutes: 25,
    preferredTime: 'evening',
    energyLevel: 'low',
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  userName: 'Explorer',
  workStartTime: '09:00',
  workEndTime: '18:00',
  includeBreaks: true,
  breakDuration: 15,
  focusStyle: 'balanced',
};

// Tasks Storage
export function getStoredTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) {
      saveStoredTasks(INITIAL_SAMPLE_TASKS);
      return INITIAL_SAMPLE_TASKS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SAMPLE_TASKS;
  } catch (e) {
    console.error('Error loading tasks from localStorage:', e);
    return INITIAL_SAMPLE_TASKS;
  }
}

export function saveStoredTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('Error saving tasks to localStorage:', e);
  }
}

// Plan Storage
export function getStoredPlan(): DailyPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading daily plan from localStorage:', e);
    return null;
  }
}

export function saveStoredPlan(plan: DailyPlan | null): void {
  try {
    if (!plan) {
      localStorage.removeItem(PLAN_KEY);
    } else {
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    }
  } catch (e) {
    console.error('Error saving daily plan to localStorage:', e);
  }
}

// Preferences Storage
export function getStoredPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Error loading preferences from localStorage:', e);
    return DEFAULT_PREFERENCES;
  }
}

export function saveStoredPreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Error saving preferences to localStorage:', e);
  }
}

export function resetAllData(): { tasks: Task[]; plan: DailyPlan | null; prefs: UserPreferences } {
  saveStoredTasks(INITIAL_SAMPLE_TASKS);
  saveStoredPlan(null);
  saveStoredPreferences(DEFAULT_PREFERENCES);
  return {
    tasks: INITIAL_SAMPLE_TASKS,
    plan: null,
    prefs: DEFAULT_PREFERENCES,
  };
}
