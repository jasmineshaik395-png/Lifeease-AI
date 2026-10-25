import { Task, DailyPlan, ScheduleItem, UserPreferences, RescheduleResult } from '../types';

/**
 * Parses time string like "09:00 AM", "9:00", "14:30", "Today, 2:00 PM" into total minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 9 * 60; // 09:00 default
  const match = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?/);
  if (!match) return 9 * 60;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight into 12-hour formatted string e.g. "09:15 AM"
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, totalMinutes % (24 * 60));
  let hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const paddedHours = displayHours < 10 ? `0${displayHours}` : `${displayHours}`;
  const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${paddedHours}:${paddedMinutes} ${period}`;
}

export interface ValidationOptions {
  startMinutes?: number;
  endMinutes?: number;
  includeBreaks?: boolean;
  breakDuration?: number;
  tasks?: Task[];
  preserveItemTimes?: boolean;
  allowPastScheduling?: boolean;
  deferOverflowTasks?: boolean;
}

export interface ValidationResult {
  items: ScheduleItem[];
  conflicts: string[];
  deferredTasks: Array<{ taskTitle: string; reason: string }>;
}

/**
 * Validates schedule items to ensure strictly non-overlapping chronological blocks,
 * respects boundary limits, inserts breaks if missing, and detects deadline conflicts.
 * In normal mode, unfinished tasks are never placed in the past relative to startMinutes.
 * Completed items are preserved at their historical completed times.
 * Tasks exceeding the available workday boundary are deferred with explicit reasons.
 */
export function validateAndAlignSchedule(
  items: ScheduleItem[],
  options: number | ValidationOptions = 9 * 60
): ValidationResult {
  const opts: ValidationOptions = typeof options === 'number' ? { startMinutes: options } : options;
  const startMinutes = opts.startMinutes ?? 9 * 60;
  const endMinutes = opts.endMinutes ?? 18 * 60;
  const includeBreaks = opts.includeBreaks ?? true;
  const breakDuration = Math.max(5, opts.breakDuration ?? 15);
  const tasks = opts.tasks ?? [];
  const deferOverflow = opts.deferOverflowTasks ?? true;

  if (!items || items.length === 0) return { items: [], conflicts: [], deferredTasks: [] };

  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  const aligned: ScheduleItem[] = [];
  const conflicts: string[] = [];
  const deferredTasks: Array<{ taskTitle: string; reason: string }> = [];

  // Separate completed items from pending items to preserve historical completed times
  const completedItems = items.filter((it) => it.completed);
  const pendingItems = items.filter((it) => !it.completed);

  // 1. Add completed items in chronological order
  let lastCompletedEndMin = startMinutes;
  for (const item of completedItems) {
    const itemEnd = timeToMinutes(item.endTime);
    if (itemEnd > lastCompletedEndMin) {
      lastCompletedEndMin = itemEnd;
    }
    aligned.push({ ...item, completed: true });
  }

  // 2. Cursor for pending items starts at Math.max(startMinutes, lastCompletedEndMin)
  let currentCursor = Math.max(startMinutes, lastCompletedEndMin);
  let continuousWorkMinutes = 0;

  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i];
    const duration = Math.max(5, item.durationMinutes || 15);
    const isTask = item.type === 'task';

    // If continuous work exceeds 105 mins without a break and breaks are enabled, insert restorative pause
    if (includeBreaks && isTask && continuousWorkMinutes + duration > 105 && currentCursor + breakDuration < endMinutes) {
      const breakStart = currentCursor;
      const breakEnd = currentCursor + breakDuration;
      aligned.push({
        id: `auto-break-${currentCursor}`,
        title: 'Restorative Refresh Break',
        startTime: minutesToTime(breakStart),
        endTime: minutesToTime(breakEnd),
        durationMinutes: breakDuration,
        type: 'break',
        priority: 'none',
        reason: 'Essential restorative pause to prevent mental fatigue and maintain high focus.',
        productivityTip: 'Drink water, stretch, or step away from screens.',
        completed: false,
      });
      currentCursor = breakEnd;
      continuousWorkMinutes = 0;
    }

    // Determine start time: if item has an explicit future start time >= currentCursor, respect it if within workday;
    // otherwise start immediately at currentCursor to eliminate past scheduling and overlaps.
    const explicitStartMin = item.startTime ? timeToMinutes(item.startTime) : currentCursor;
    const itemStartMin = explicitStartMin >= currentCursor && explicitStartMin < endMinutes ? explicitStartMin : currentCursor;
    const itemEndMin = itemStartMin + duration;

    // Check workday end boundary: defer overflow tasks if requested effort exceeds available hours
    if (deferOverflow && isTask && itemEndMin > endMinutes) {
      deferredTasks.push({
        taskTitle: item.title,
        reason: `Exceeds available workday window (ends at ${minutesToTime(endMinutes)}). Postponed to tomorrow so you finish on time.`,
      });
      continue;
    }

    const formattedStart = minutesToTime(itemStartMin);
    const formattedEnd = minutesToTime(itemEndMin);

    let hasConflict = false;
    let conflictReason: string | undefined;

    // Check workday end boundary (if not deferred)
    if (itemEndMin > endMinutes) {
      hasConflict = true;
      const bMsg = `Finishes at ${formattedEnd}, exceeding your workday end (${minutesToTime(endMinutes)}).`;
      conflicts.push(`"${item.title}" ${bMsg}`);
      conflictReason = bMsg;
    }

    // Check deadline conflict against matching task (by taskId or case-insensitive title match)
    const matchingTask =
      (item.taskId ? taskMap.get(item.taskId) : undefined) ||
      Array.from(taskMap.values()).find(
        (t) => t.title.toLowerCase().trim() === item.title.toLowerCase().trim()
      );

    if (matchingTask && matchingTask.deadline) {
      const deadlineMin = timeToMinutes(matchingTask.deadline);
      if (deadlineMin < startMinutes) {
        hasConflict = true;
        const dMsg = `Deadline (${matchingTask.deadline}) is already past or impossible for current planning window (starts at ${minutesToTime(startMinutes)}).`;
        conflicts.push(`"${item.title}" ${dMsg}`);
        conflictReason = dMsg;
      } else if (itemEndMin > deadlineMin) {
        hasConflict = true;
        const overrun = itemEndMin - deadlineMin;
        const dMsg = `Deadline is ${matchingTask.deadline}, but scheduled finish is ${formattedEnd} (${overrun}m past deadline).`;
        conflicts.push(`"${item.title}" ${dMsg}`);
        conflictReason = `Scheduled finish is ${formattedEnd} (${overrun}m past deadline ${matchingTask.deadline})`;
      }
    }

    aligned.push({
      ...item,
      startTime: formattedStart,
      endTime: formattedEnd,
      durationMinutes: duration,
      hasConflict,
      conflictReason,
      completed: false,
    });

    currentCursor = itemEndMin;
    if (isTask) {
      continuousWorkMinutes += duration;
    } else {
      continuousWorkMinutes = 0;
    }
  }

  if (deferredTasks.length > 0) {
    conflicts.push(`${deferredTasks.length} task(s) exceeded available workday window and were safely deferred to tomorrow.`);
  }

  return { items: aligned, conflicts, deferredTasks };
}

/**
 * Calculates a transparent, mathematically documented, continuous Focus Score (0 - 100):
 * - Workload Capacity (35 pts): Scheduled task duration vs available window.
 * - Peak Focus Allocation (25 pts): High priority items placed early in schedule.
 * - Restorative Break Health (20 pts): Work intervals paired with adequate rest.
 * - Deadline Safety (20 pts): All commitments ending before target deadlines.
 */
export function calculateMeaningfulFocusScore(
  items: ScheduleItem[],
  availableWindowMinutes: number,
  tasks: Task[] = []
): {
  score: number;
  workloadStatus: 'optimal' | 'manageable' | 'heavy' | 'overloaded';
  breakdown: { capacity: number; priority: number; breaks: number; deadlines: number };
} {
  const taskItems = items.filter((it) => it.type === 'task');
  const totalTaskMins = taskItems.reduce((acc, it) => acc + (it.durationMinutes || 0), 0);
  const safeWindow = Math.max(60, availableWindowMinutes);

  // 1. Capacity evaluation (35 pts max) - calibrated dynamically
  const loadFactor = totalTaskMins / safeWindow;
  let capacity = 32;
  if (loadFactor > 1.0) {
    // Overloaded schedule
    const overloadPercent = (loadFactor - 1.0) * 100;
    capacity = Math.max(5, Math.round(28 - overloadPercent * 0.45));
  } else if (loadFactor >= 0.70 && loadFactor <= 0.85) {
    // Ideal balance: ~80% work, leaves 20% healthy buffer
    capacity = Math.round(33 + (0.85 - loadFactor) * 13);
  } else if (loadFactor > 0.85) {
    // Slightly packed
    capacity = Math.round(34 - (loadFactor - 0.85) * 20);
  } else if (loadFactor >= 0.40) {
    // Moderate
    capacity = Math.round(28 + (loadFactor - 0.40) * 15);
  } else {
    // Very light day
    capacity = Math.round(22 + loadFactor * 15);
  }

  // 2. Priority placement (25 pts max)
  // Evaluates actual schedule positions of high and medium priority items
  let priority = 20;
  if (taskItems.length > 0) {
    let placementScoreSum = 0;
    let weightSum = 0;
    taskItems.forEach((item, idx) => {
      const positionRatio = taskItems.length > 1 ? idx / (taskItems.length - 1) : 0;
      if (item.priority === 'high') {
        // High priority scheduled early is best
        placementScoreSum += (1.0 - positionRatio * 0.7) * 3;
        weightSum += 3;
      } else if (item.priority === 'medium') {
        placementScoreSum += 0.8 * 2;
        weightSum += 2;
      } else {
        // Low priority is fine later
        placementScoreSum += (0.6 + positionRatio * 0.4) * 1;
        weightSum += 1;
      }
    });
    const avgRatio = weightSum > 0 ? placementScoreSum / weightSum : 0.8;
    priority = Math.max(10, Math.min(25, Math.round(avgRatio * 25)));
  }

  // 3. Restorative breaks health (20 pts max)
  const breakItems = items.filter((it) => it.type === 'break' || it.type === 'buffer');
  const totalBreakMins = breakItems.reduce((acc, it) => acc + (it.durationMinutes || 0), 0);
  let breaks = 18;
  if (totalTaskMins > 0) {
    const breakRatio = totalBreakMins / totalTaskMins;
    if (breakRatio >= 0.10 && breakRatio <= 0.25) {
      breaks = 20; // Perfect pacing
    } else if (breakRatio > 0.25) {
      breaks = 17; // Excessive pauses
    } else if (breakRatio >= 0.05) {
      breaks = Math.round(12 + (breakRatio / 0.10) * 6);
    } else {
      breaks = totalTaskMins >= 120 ? 8 : 15;
    }
  }

  // 4. Deadline compliance (20 pts max)
  const taskMap = new Map<string, Task>();
  tasks.forEach((t) => taskMap.set(t.id, t));

  let deadlines = 20;
  let deadlineMisses = 0;
  let tightDeadlines = 0;
  for (const item of taskItems) {
    if (item.taskId) {
      const t = taskMap.get(item.taskId);
      if (t && t.deadline) {
        const itemEnd = timeToMinutes(item.endTime);
        const deadline = timeToMinutes(t.deadline);
        if (itemEnd > deadline) {
          deadlineMisses++;
        } else if (deadline - itemEnd < 15) {
          tightDeadlines++;
        }
      }
    }
  }
  deadlines = Math.max(0, 20 - deadlineMisses * 8 - tightDeadlines * 2);

  const rawScore = capacity + priority + breaks + deadlines;
  const score = Math.max(20, Math.min(99, rawScore));

  let workloadStatus: 'optimal' | 'manageable' | 'heavy' | 'overloaded' = 'optimal';
  if (totalTaskMins > safeWindow * 1.15) {
    workloadStatus = 'overloaded';
  } else if (totalTaskMins > safeWindow) {
    workloadStatus = 'heavy';
  } else if (score >= 82) {
    workloadStatus = 'optimal';
  } else {
    workloadStatus = 'manageable';
  }

  return {
    score,
    workloadStatus,
    breakdown: { capacity, priority, breaks, deadlines },
  };
}

/**
 * Deterministic Non-AI Fallback Scheduler:
 * If the Gemini API is unreachable, this algorithm deterministically packs
 * tasks according to priority, preferred time of day, and duration,
 * inserting breaks after intense cognitive blocks.
 */
export function generateDeterministicFallbackSchedule(
  tasks: Task[],
  prefs: UserPreferences,
  options?: { startMinutes?: number; allowHistorical?: boolean }
): DailyPlan {
  const workStartMins = timeToMinutes(prefs.workStartTime || '09:00');
  const startMins = options?.startMinutes ?? workStartMins;
  const endMins = timeToMinutes(prefs.workEndTime || '18:00');
  const availableWindow = Math.max(60, endMins - startMins);

  // Filter pending tasks
  const pending = tasks.filter((t) => !t.completed);

  // Sort by Priority (High -> Medium -> Low), then Deadline proximity, then Duration
  const sorted = [...pending].sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    if (priorityWeight[b.priority] !== priorityWeight[a.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    if (a.deadline && b.deadline) {
      return timeToMinutes(a.deadline) - timeToMinutes(b.deadline);
    }
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    return b.estimatedMinutes - a.estimatedMinutes;
  });

  const rawItems: ScheduleItem[] = [];
  let currentCursor = startMins;
  let workBlockCounter = 0;

  const deferredTasksList: Array<{ taskTitle: string; reason: string }> = [];

  for (const task of sorted) {
    const duration = Math.min(task.estimatedMinutes || 30, 180);

    if (currentCursor + duration > endMins) {
      deferredTasksList.push({
        taskTitle: task.title,
        reason: `Exceeds available workday window (ends at ${minutesToTime(endMins)}). Postponed to tomorrow so you finish on time.`,
      });
      continue;
    }

    rawItems.push({
      id: `sched-task-${task.id}`,
      taskId: task.id,
      title: task.title,
      startTime: minutesToTime(currentCursor),
      endTime: minutesToTime(currentCursor + duration),
      durationMinutes: duration,
      type: 'task',
      priority: task.priority,
      reason: task.priority === 'high' ? 'High priority task scheduled during optimal focus hours.' : 'Scheduled based on duration and availability.',
      productivityTip: 'Eliminate notifications and focus solely on this block until completed.',
      completed: false,
    });

    currentCursor += duration;
    workBlockCounter++;

    if (prefs.includeBreaks && workBlockCounter % 2 === 0 && currentCursor + (prefs.breakDuration || 15) <= endMins) {
      const breakMins = prefs.breakDuration || 15;
      rawItems.push({
        id: `sched-break-${currentCursor}`,
        title: 'Restorative Refresh Break',
        startTime: minutesToTime(currentCursor),
        endTime: minutesToTime(currentCursor + breakMins),
        durationMinutes: breakMins,
        type: 'break',
        priority: 'none',
        reason: 'Essential mental reset to prevent fatigue and sustain focus.',
        productivityTip: 'Drink water, stretch, or look out a window away from screens.',
        completed: false,
      });
      currentCursor += breakMins;
    }
  }

  // End of day buffer review
  if (currentCursor < endMins) {
    const buffer = endMins - currentCursor;
    if (buffer >= 15) {
      rawItems.push({
        id: `sched-review-${currentCursor}`,
        title: 'Daily Wrap-Up & Tomorrow Planning',
        startTime: minutesToTime(currentCursor),
        endTime: minutesToTime(endMins),
        durationMinutes: buffer,
        type: 'review',
        priority: 'none',
        reason: 'Review accomplishments and organize priorities for tomorrow.',
        productivityTip: 'Celebrate your wins and clear your workspace.',
        completed: false,
      });
    }
  }

  const { items, conflicts, deferredTasks: validationDeferred } = validateAndAlignSchedule(rawItems, {
    startMinutes: startMins,
    endMinutes: endMins,
    includeBreaks: prefs.includeBreaks,
    breakDuration: prefs.breakDuration,
    tasks: pending,
    allowPastScheduling: Boolean(options?.allowHistorical),
  });

  const allDeferred = [...deferredTasksList, ...(validationDeferred || [])];
  const uniqueDeferred = Array.from(new Map(allDeferred.map((d) => [d.taskTitle, d])).values());

  const scoreAnalysis = calculateMeaningfulFocusScore(items, availableWindow, pending);

  const highPri = items.find((it) => it.type === 'task' && it.priority === 'high') || items.find((it) => it.type === 'task');
  const peakEnergyWindow = highPri ? `${highPri.startTime} - ${highPri.endTime}` : `${minutesToTime(startMins)} - ${minutesToTime(startMins + 120)}`;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  return {
    id: `plan-fallback-${Date.now()}`,
    date: now.toISOString(),
    generatedAt: `${dateStr} at ${timeStr} (Deterministic Fallback)`,
    items,
    summary: 'Organized using LifeEase deterministic priority scheduling. High-priority items are placed first with anti-burnout pauses.',
    focusScore: scoreAnalysis.score,
    focusScoreBreakdown: scoreAnalysis.breakdown,
    peakEnergyWindow,
    workloadStatus: scoreAnalysis.workloadStatus,
    recommendations: [
      highPri ? `Dedicate full focus to "${highPri.title}" early in the day (${highPri.startTime}–${highPri.endTime}).` : 'Focus strictly on your top priority task first.',
      prefs.includeBreaks ? 'Protect your break intervals to avoid afternoon slumps.' : 'Consider enabling breaks for improved focus.',
      uniqueDeferred.length > 0 ? `${uniqueDeferred.length} tasks safely deferred to tomorrow so you finish by ${minutesToTime(endMins)}.` : 'Your day is balanced within your requested hours.',
    ],
    conflicts,
    deferredTasks: uniqueDeferred,
    isFallbackPlan: true,
    isHistorical: Boolean(options?.allowHistorical),
  };
}

/**
 * Deterministic Non-AI Fallback Rescheduler:
 * Recalculates remainder of day when API is offline or disconnected,
 * while accurately preserving completed morning tasks.
 */
export interface RescheduleDisruptionInput {
  type: 'urgent_task' | 'time_lost' | 'fatigue' | 'meeting' | 'task_overrun' | 'custom' | string;
  description: string;
  urgentTitle?: string;
  urgentMins?: number;
  minsLost?: number;
  currentTime?: string;
  newAvailableUntil?: string;
}

/**
 * Deterministic Non-AI Fallback Rescheduler:
 * Recalculates remainder of day when API is offline or disconnected,
 * while accurately preserving completed morning tasks and handling all 6 disruption modes.
 */
export function generateDeterministicFallbackReschedule(
  currentSchedule: ScheduleItem[],
  remainingTasks: Task[],
  disruption: RescheduleDisruptionInput
): RescheduleResult {
  const currentMin = timeToMinutes(disruption.currentTime || '11:30 AM');
  const boundaryMin = timeToMinutes(disruption.newAvailableUntil || '18:00');
  const updatedSchedule: ScheduleItem[] = [];
  const deferredTasks: Array<{ taskTitle: string; reason: string }> = [];

  // 1. PRESERVE COMPLETED TASKS:
  // Only tasks genuinely completed by the user are preserved as completed!
  // Unfinished tasks are NEVER automatically marked complete.
  const completedItems = currentSchedule.filter((item) => item.completed);
  completedItems.forEach((item) => {
    updatedSchedule.push({
      ...item,
      completed: true,
    });
  });

  // Calculate new starting cursor
  let cursor = currentMin;

  // Handle Delay or Overrun Disruption (time_lost or task_overrun)
  const minsLost = disruption.minsLost && disruption.minsLost > 0 ? disruption.minsLost : 0;
  if ((disruption.type === 'time_lost' || disruption.type === 'task_overrun' || minsLost > 0) && minsLost > 0) {
    const delayEnd = cursor + minsLost;
    updatedSchedule.push({
      id: `delay-buffer-${Date.now()}`,
      title: disruption.type === 'task_overrun' ? 'Task Overrun Buffer' : 'Unexpected Delay Buffer',
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(delayEnd),
      durationMinutes: minsLost,
      type: 'buffer',
      priority: 'none',
      reason: `Accounted for ${minsLost}-minute delay (${disruption.description.slice(0, 40)}...) without schedule breakdown.`,
      productivityTip: 'The schedule has absorbed the delay. Focus on what is next without looking back.',
      completed: true,
    });
    cursor = delayEnd;
  }

  // Handle Fatigue / Energy Slump Disruption
  if (disruption.type === 'fatigue') {
    const rechargeBreakMins = 25;
    updatedSchedule.push({
      id: `fatigue-recharge-${Date.now()}`,
      title: 'Mindful Energy Recharge Pause',
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(cursor + rechargeBreakMins),
      durationMinutes: rechargeBreakMins,
      type: 'break',
      priority: 'none',
      reason: 'Mandatory energy recovery pause: step away from screens, rehydrate, and reset autonomic nervous system.',
      productivityTip: 'Rest your eyes, do gentle stretches, or sit quietly for a few minutes.',
      completed: false,
    });
    cursor += rechargeBreakMins;
  }

  // Handle Emergency Task or Meeting Disruption (urgent_task, meeting, or custom with urgentTitle)
  if (disruption.urgentTitle) {
    const urgentDur = disruption.urgentMins || (disruption.type === 'meeting' ? 60 : 45);
    updatedSchedule.push({
      id: `urgent-${Date.now()}`,
      title: disruption.urgentTitle,
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(cursor + urgentDur),
      durationMinutes: urgentDur,
      type: disruption.type === 'meeting' ? 'review' : 'task',
      priority: 'high',
      reason: disruption.type === 'meeting' ? 'Unscheduled high-priority meeting accommodation.' : 'Immediate priority inserted to address surprise deadline.',
      productivityTip: 'Focus entirely on this commitment before moving to other tasks.',
      completed: false,
    });
    cursor += urgentDur;

    // Post-incident recovery pause
    const bufferMins = 15;
    if (cursor + bufferMins <= boundaryMin) {
      updatedSchedule.push({
        id: `post-incident-break-${Date.now()}`,
        title: 'Decompression & Transition Break',
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(cursor + bufferMins),
        durationMinutes: bufferMins,
        type: 'break',
        priority: 'none',
        reason: 'Reset cognitive bandwidth before resuming standard task queue.',
        completed: false,
      });
      cursor += bufferMins;
    }
  }

  // 3. FIT REMAINING TASKS IN AVAILABLE WINDOW (respecting priorities & fatigue)
  const pending = remainingTasks.filter((t) => !t.completed);

  // If fatigue mode is active, defer low priority tasks immediately to protect energy
  const tasksToSchedule = disruption.type === 'fatigue'
    ? pending.filter((t) => {
        if (t.priority === 'low') {
          deferredTasks.push({
            taskTitle: t.title,
            reason: 'Postponed to tomorrow to reduce cognitive load during your energy slump.',
          });
          return false;
        }
        return true;
      })
    : pending;

  // Sort remaining tasks: high priority first
  const sortedPending = [...tasksToSchedule].sort((a, b) => {
    const weight = { high: 3, medium: 2, low: 1 };
    return weight[b.priority] - weight[a.priority];
  });

  for (const t of sortedPending) {
    const dur = Math.min(t.estimatedMinutes || 30, 180);

    // If remaining time cannot accommodate task before workday boundary
    if (cursor + dur > boundaryMin) {
      deferredTasks.push({
        taskTitle: t.title,
        reason: `Exceeds your available workday window (${minutesToTime(boundaryMin)}). Safely postponed to tomorrow.`,
      });
    } else {
      updatedSchedule.push({
        id: `resched-${t.id}`,
        taskId: t.id,
        title: t.title,
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(cursor + dur),
        durationMinutes: dur,
        type: 'task',
        priority: t.priority,
        reason: 'Recalculated into available afternoon focus window.',
        completed: false,
      });
      cursor += dur;

      // In fatigue mode, insert 15-minute breathers between every task
      if (disruption.type === 'fatigue' && cursor + 15 <= boundaryMin) {
        updatedSchedule.push({
          id: `fatigue-pause-${cursor}`,
          title: 'Gentle Energy Recovery Pause',
          startTime: minutesToTime(cursor),
          endTime: minutesToTime(cursor + 15),
          durationMinutes: 15,
          type: 'break',
          priority: 'none',
          reason: 'Paced rest interval to sustain stamina without burnout.',
          completed: false,
        });
        cursor += 15;
      }
    }
  }

  let changesExplanation = '';
  let reliefTip = 'Take a deep breath. Rescheduling is dynamic resilience in action.';

  switch (disruption.type) {
    case 'urgent_task':
      changesExplanation = `Slotted "${disruption.urgentTitle || 'Emergency Task'}" immediately at ${disruption.currentTime || '11:30 AM'}. Preserved ${completedItems.length} completed achievements and re-sequenced remaining tasks.`;
      reliefTip = 'You tackled the unexpected request calmly. Your remaining essential tasks are safely structured.';
      break;
    case 'time_lost':
      changesExplanation = `Absorbed a ${minsLost}-minute unexpected delay. Shifted upcoming tasks by ${minsLost} minutes without schedule breakdown.`;
      reliefTip = 'Delays happen to everyone. By re-anchoring your afternoon, you maintain full control of your day.';
      break;
    case 'task_overrun':
      changesExplanation = `Compensated for a ${minsLost}-minute task overrun. Kept your high-priority goals and shifted flexible blocks.`;
      reliefTip = 'Tasks taking longer than expected is normal. Adjusting your plan prevents lingering afternoon stress.';
      break;
    case 'meeting':
      changesExplanation = `Accommodated unscheduled meeting "${disruption.urgentTitle || 'Client Sync'}" for ${disruption.urgentMins || 60} minutes. Added transition pauses to preserve focus.`;
      reliefTip = 'Meetings interrupt flow, but buffer blocks protect your momentum.';
      break;
    case 'fatigue':
      changesExplanation = `Adapted for energy slump: inserted an immediate 25-minute recharge pause, deferred non-essential tasks to tomorrow, and spaced remaining tasks with restorative breathers.`;
      reliefTip = 'Honoring fatigue is true productivity. Doing fewer things calmly beats burning out.';
      break;
    case 'custom':
    default:
      changesExplanation = `Adapted timeline for: "${disruption.description}". Preserved ${completedItems.length} completed tasks and rebalanced afternoon capacity.`;
      reliefTip = 'Your custom adjustment is in place. One step at a time.';
      break;
  }

  return {
    updatedSchedule,
    changesExplanation,
    deferredTasks,
    reliefTip,
  };
}
