export type TaskCategory = 'work' | 'personal' | 'study' | 'health' | 'chores' | 'finance';

export type TaskPriority = 'high' | 'medium' | 'low';

export type PreferredTime = 'anytime' | 'morning' | 'afternoon' | 'evening';

export type EnergyLevel = 'high' | 'medium' | 'low';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  minutes?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimatedMinutes: number;
  deadline?: string;
  preferredTime: PreferredTime;
  energyLevel: EnergyLevel;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
  isSample?: boolean;
  subtasks?: Subtask[];
}

export interface ScheduleItem {
  id: string;
  taskId?: string;
  title: string;
  startTime: string; // e.g. "09:00 AM"
  endTime: string;   // e.g. "10:15 AM"
  durationMinutes: number;
  type: 'task' | 'break' | 'buffer' | 'review';
  priority?: 'high' | 'medium' | 'low' | 'none';
  reason?: string;
  productivityTip?: string;
  completed: boolean;
  hasConflict?: boolean;
  conflictReason?: string;
}

export interface DailyPlan {
  id: string;
  date: string;
  generatedAt: string;
  items: ScheduleItem[];
  summary: string;
  focusScore: number;
  peakEnergyWindow: string;
  workloadStatus: 'manageable' | 'optimal' | 'heavy' | 'overloaded';
  recommendations: string[];
  conflicts?: string[];
  isFallbackPlan?: boolean;
  isHistorical?: boolean;
  deferredTasks?: Array<{ taskTitle: string; reason: string }>;
  focusScoreBreakdown?: { capacity: number; priority: number; breaks: number; deadlines: number };
  modelUsed?: string;
}

export interface UserPreferences {
  userName: string;
  workStartTime: string; // e.g. "09:00"
  workEndTime: string;   // e.g. "18:00"
  includeBreaks: boolean;
  breakDuration: number; // e.g. 15 minutes
  focusStyle: 'balanced' | 'deep-work' | 'light-and-steady';
}

export interface RescheduleRequest {
  currentSchedule: ScheduleItem[];
  remainingTasks: Task[];
  disruptionType: 'urgent_task' | 'time_lost' | 'fatigue' | 'meeting' | 'custom';
  disruptionDescription: string;
  urgentTaskTitle?: string;
  urgentTaskMinutes?: number;
  urgentTaskPriority?: TaskPriority;
  timeLostMinutes?: number;
  newAvailableUntil?: string;
  currentTime?: string;
}

export interface RescheduleResult {
  updatedSchedule: ScheduleItem[];
  changesExplanation: string;
  deferredTasks: Array<{
    taskTitle: string;
    reason: string;
  }>;
  reliefTip: string;
  conflictsDetected?: string[];
}
