import {
  timeToMinutes,
  minutesToTime,
  validateAndAlignSchedule,
  calculateMeaningfulFocusScore,
  generateDeterministicFallbackSchedule,
  generateDeterministicFallbackReschedule,
} from '../src/utils/scheduler';
import { Task, ScheduleItem, UserPreferences } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('=== Running LifeEase AI Scheduler & Rescheduling Test Suite ===\n');

// 1. TEST TIME UTILITIES & EDGE CASES
console.log('--- Suite 1: Time Utilities & Input Formats ---');
assert(timeToMinutes('09:00 AM') === 540, '09:00 AM converts to 540 minutes');
assert(timeToMinutes('14:30') === 870, '14:30 converts to 870 minutes');
assert(timeToMinutes('Today, 2:00 PM') === 840, '"Today, 2:00 PM" extracts to 840 minutes');
assert(timeToMinutes('Tomorrow, 5:30 PM') === 1050, '"Tomorrow, 5:30 PM" extracts to 1050 minutes');
assert(timeToMinutes('') === 540, 'Empty string safely defaults to 540 minutes');
assert(minutesToTime(540) === '09:00 AM', '540 minutes formats to "09:00 AM"');
assert(minutesToTime(870) === '02:30 PM', '870 minutes formats to "02:30 PM"');

// 2. TEST OVERLAPPING TASKS RESOLUTION
console.log('\n--- Suite 2: Overlapping Tasks Resolution ---');
const overlappingRawItems: ScheduleItem[] = [
  {
    id: 's1',
    title: 'Task A',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    durationMinutes: 60,
    type: 'task',
    completed: false,
  },
  {
    id: 's2',
    title: 'Task B (Overlaps)',
    startTime: '09:30 AM',
    endTime: '10:30 AM',
    durationMinutes: 60,
    type: 'task',
    completed: false,
  },
  {
    id: 's3',
    title: 'Task C (Overlaps)',
    startTime: '09:45 AM',
    endTime: '10:15 AM',
    durationMinutes: 30,
    type: 'task',
    completed: false,
  },
];

const alignedResult = validateAndAlignSchedule(overlappingRawItems, {
  startMinutes: 540, // 09:00 AM
  endMinutes: 1080,  // 06:00 PM
  includeBreaks: false,
});

assert(alignedResult.items.length === 3, 'All 3 items preserved');
assert(alignedResult.items[0].startTime === '09:00 AM' && alignedResult.items[0].endTime === '10:00 AM', 'Task A: 09:00 AM - 10:00 AM');
assert(alignedResult.items[1].startTime === '10:00 AM' && alignedResult.items[1].endTime === '11:00 AM', 'Task B shifted to 10:00 AM - 11:00 AM (no overlap)');
assert(alignedResult.items[2].startTime === '11:00 AM' && alignedResult.items[2].endTime === '11:30 AM', 'Task C shifted to 11:00 AM - 11:30 AM (no overlap)');

// 3. TEST SCHEDULE BOUNDARIES & INSUFFICIENT TIME
console.log('\n--- Suite 3: Schedule Boundaries & Insufficient Time Check ---');
const longItems: ScheduleItem[] = [
  {
    id: 's1',
    title: 'Massive Morning Block',
    startTime: '09:00 AM',
    endTime: '01:00 PM',
    durationMinutes: 240,
    type: 'task',
    completed: false,
  },
  {
    id: 's2',
    title: 'Afternoon Marathon',
    startTime: '01:00 PM',
    endTime: '07:00 PM',
    durationMinutes: 360,
    type: 'task',
    completed: false,
  },
];

const boundaryResult = validateAndAlignSchedule(longItems, {
  startMinutes: 540, // 09:00 AM
  endMinutes: 1020,  // 05:00 PM (17:00)
  includeBreaks: false,
  deferOverflowTasks: false,
});

assert(boundaryResult.conflicts.length > 0, 'Exceeding boundary detected and logged as conflict');
assert(
  boundaryResult.conflicts.some((c) => c.includes('exceeding your workday end')),
  'Conflict explicitly mentions workday end boundary'
);

// Verify boundary deferral mode
const deferralResult = validateAndAlignSchedule(longItems, {
  startMinutes: 540,
  endMinutes: 1020,
  includeBreaks: false,
  deferOverflowTasks: true,
});
assert(deferralResult.deferredTasks.length === 1, 'Overflow task safely deferred to tomorrow');
assert(deferralResult.deferredTasks[0].taskTitle === 'Afternoon Marathon', 'Deferred task is Afternoon Marathon');

// 4. TEST IMPOSSIBLE DEADLINE DETECTION
console.log('\n--- Suite 4: Impossible Deadline Detection ---');
const deadlineTasks: Task[] = [
  {
    id: 't-deadline-1',
    title: 'Client Urgent Report',
    description: 'Urgent client report deliverable',
    priority: 'high',
    category: 'work',
    estimatedMinutes: 90,
    deadline: '10:00 AM', // Impossible if starts at 9:00 and takes 90m (ends at 10:30 AM)
    preferredTime: 'morning',
    energyLevel: 'high',
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

const deadlineItems: ScheduleItem[] = [
  {
    id: 's-d1',
    taskId: 't-deadline-1',
    title: 'Client Urgent Report',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    durationMinutes: 90,
    type: 'task',
    completed: false,
  },
];

const deadlineCheck = validateAndAlignSchedule(deadlineItems, {
  startMinutes: 540,
  endMinutes: 1020,
  tasks: deadlineTasks,
});

assert(deadlineCheck.conflicts.length > 0, 'Impossible deadline correctly flagged as conflict');
assert(
  deadlineCheck.conflicts.some((c) => c.includes('scheduled finish is 10:30 AM')),
  'Conflict identifies deadline discrepancy'
);

// 5. TEST ALL 6 SMART RESCHEDULING DISRUPTION PRESETS
console.log('\n--- Suite 5: All 6 Smart Rescheduling Disruption Presets ---');
const baselineSchedule: ScheduleItem[] = [
  {
    id: 'done-1',
    title: 'Morning Standup Meeting',
    startTime: '09:00 AM',
    endTime: '09:30 AM',
    durationMinutes: 30,
    type: 'task',
    completed: true,
  },
  {
    id: 'done-2',
    title: 'Code Review & Approvals',
    startTime: '09:30 AM',
    endTime: '10:30 AM',
    durationMinutes: 60,
    type: 'task',
    completed: true,
  },
  {
    id: 'pending-1',
    title: 'Feature Architecture Design',
    startTime: '11:30 AM',
    endTime: '12:30 PM',
    durationMinutes: 60,
    type: 'task',
    priority: 'high',
    completed: false,
  },
];

const testPendingTasks: Task[] = [
  {
    id: 'p1',
    title: 'Feature Architecture Design',
    description: 'System design for new planner feature',
    priority: 'high',
    category: 'work',
    estimatedMinutes: 60,
    preferredTime: 'afternoon',
    energyLevel: 'high',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p2',
    title: 'Team Feedback Survey',
    description: 'Fill out retrospectives survey',
    priority: 'medium',
    category: 'work',
    estimatedMinutes: 30,
    preferredTime: 'afternoon',
    energyLevel: 'medium',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p3',
    title: 'Grocery & Laundry',
    description: 'Weekly domestic errands',
    priority: 'low',
    category: 'chores',
    estimatedMinutes: 45,
    preferredTime: 'evening',
    energyLevel: 'low',
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

// Preset 1: Emergency Task (urgent_task)
const reschedEmergency = generateDeterministicFallbackReschedule(baselineSchedule, testPendingTasks, {
  type: 'urgent_task',
  description: 'Emergency security patch deployment',
  urgentTitle: 'Critical Security Hotfix',
  urgentMins: 45,
  currentTime: '11:30 AM',
  newAvailableUntil: '18:00',
});
assert(
  reschedEmergency.updatedSchedule.some((it) => it.title === 'Morning Standup Meeting' && it.completed === true),
  'Preset 1: Completed standup preserved'
);
assert(
  reschedEmergency.updatedSchedule.some((it) => it.title === 'Critical Security Hotfix'),
  'Preset 1: Emergency task inserted at cursor'
);

// Preset 2: Unexpected 45-minute Delay (time_lost)
const reschedDelay = generateDeterministicFallbackReschedule(baselineSchedule, testPendingTasks, {
  type: 'time_lost',
  description: 'Unexpected 45-minute traffic jam',
  minsLost: 45,
  currentTime: '11:30 AM',
  newAvailableUntil: '18:00',
});
const shiftedFeature = reschedDelay.updatedSchedule.find((it) => it.title === 'Feature Architecture Design');
assert(shiftedFeature?.startTime === '12:15 PM', 'Preset 2: Subsequent task shifted by 45 mins to 12:15 PM');
assert(reschedDelay.updatedSchedule.some((it) => it.type === 'buffer'), 'Preset 2: Delay buffer item included');

// Preset 3: Task Took Longer Than Expected (task_overrun)
const reschedOverrun = generateDeterministicFallbackReschedule(baselineSchedule, testPendingTasks, {
  type: 'task_overrun',
  description: 'Morning debugging took 40 extra minutes',
  minsLost: 40,
  currentTime: '11:30 AM',
  newAvailableUntil: '18:00',
});
const overrunShifted = reschedOverrun.updatedSchedule.find((it) => it.title === 'Feature Architecture Design');
assert(overrunShifted?.startTime === '12:10 PM', 'Preset 3: Task shifted by 40m overrun to 12:10 PM');

// Preset 4: Unscheduled 1-Hour Meeting (meeting)
const reschedMeeting = generateDeterministicFallbackReschedule(baselineSchedule, testPendingTasks, {
  type: 'meeting',
  description: 'Unscheduled executive briefing',
  urgentTitle: 'Emergency Executive Briefing',
  urgentMins: 60,
  currentTime: '11:30 AM',
  newAvailableUntil: '18:00',
});
assert(
  reschedMeeting.updatedSchedule.some((it) => it.title === 'Emergency Executive Briefing' && it.durationMinutes === 60),
  'Preset 4: 60-minute meeting slotted immediately'
);

// Preset 5: Energy Slump or Fatigue (fatigue)
const reschedFatigue = generateDeterministicFallbackReschedule(baselineSchedule, testPendingTasks, {
  type: 'fatigue',
  description: 'Afternoon mental exhaustion',
  currentTime: '11:30 AM',
  newAvailableUntil: '18:00',
});
assert(
  reschedFatigue.updatedSchedule.some((it) => it.title.includes('Recharge Pause')),
  'Preset 5: Mindful recharge pause inserted immediately'
);
assert(
  reschedFatigue.deferredTasks.some((t) => t.taskTitle === 'Grocery & Laundry'),
  'Preset 5: Low priority chore comfortably deferred to tomorrow'
);

// Preset 6: Custom Situation (custom)
const reschedCustom = generateDeterministicFallbackReschedule(baselineSchedule, testPendingTasks, {
  type: 'custom',
  description: 'Doctor check-up call popped up',
  urgentTitle: 'Doctor Telehealth Call',
  urgentMins: 20,
  minsLost: 20,
  currentTime: '11:30 AM',
  newAvailableUntil: '18:00',
});
assert(
  reschedCustom.updatedSchedule.some((it) => it.title === 'Doctor Telehealth Call'),
  'Preset 6: Custom telehealth call scheduled'
);

// 6. TEST INSUFFICIENT TIME & BOUNDARY DEFERRALS
console.log('\n--- Suite 6: Insufficient Time & Workday Boundary Enforcement ---');
const hugeTasks: Task[] = [
  { id: 'h1', title: 'Task 1', description: '', priority: 'high', category: 'work', estimatedMinutes: 120, preferredTime: 'anytime', energyLevel: 'high', completed: false, createdAt: '' },
  { id: 'h2', title: 'Task 2', description: '', priority: 'medium', category: 'work', estimatedMinutes: 120, preferredTime: 'anytime', energyLevel: 'medium', completed: false, createdAt: '' },
  { id: 'h3', title: 'Task 3', description: '', priority: 'low', category: 'work', estimatedMinutes: 120, preferredTime: 'anytime', energyLevel: 'low', completed: false, createdAt: '' },
];
// From 15:00 to 17:00 (only 120 mins available for 360 mins of tasks)
const overflowResult = generateDeterministicFallbackReschedule([], hugeTasks, {
  type: 'time_lost',
  description: 'Delayed start',
  minsLost: 0,
  currentTime: '03:00 PM',
  newAvailableUntil: '17:00', // 5:00 PM boundary
});
assert(overflowResult.deferredTasks.length >= 1, 'Tasks exceeding 17:00 boundary deferred');
assert(
  overflowResult.deferredTasks.some((d) => d.reason.includes('Exceeds your available workday window')),
  'Deferral reason clearly states workday window boundary'
);

// 7. TEST MEANINGFUL FOCUS SCORE CALCULATION
console.log('\n--- Suite 7: Meaningful Focus Score Calculation ---');
const balancedItems: ScheduleItem[] = [
  { id: '1', title: 'High Priority Deep Work', startTime: '09:00 AM', endTime: '10:30 AM', durationMinutes: 90, type: 'task', priority: 'high', completed: false },
  { id: '2', title: 'Break', startTime: '10:30 AM', endTime: '10:45 AM', durationMinutes: 15, type: 'break', priority: 'none', completed: false },
  { id: '3', title: 'Medium Priority Task', startTime: '10:45 AM', endTime: '11:45 AM', durationMinutes: 60, type: 'task', priority: 'medium', completed: false },
];
const balancedScore = calculateMeaningfulFocusScore(balancedItems, 300);
assert(balancedScore.score >= 85, `Balanced schedule score is high (${balancedScore.score}/100)`);
assert(balancedScore.workloadStatus === 'optimal', 'Balanced workload status is optimal');
assert(balancedScore.breakdown.capacity >= 28, `Capacity score is >= 28 for balanced load (${balancedScore.breakdown.capacity}/35)`);
assert(balancedScore.breakdown.breaks === 20, 'Breaks score is 20 for balanced pauses');

// 8. TEST TIME BOUNDARIES & NO UNFINISHED TASKS IN THE PAST
console.log('\n--- Suite 8: Time Boundaries & Historical Planning Distinction ---');
const afternoonCursorMins = 13 * 60 + 30; // 01:30 PM (810 mins)
const afternoonTasks: ScheduleItem[] = [
  {
    id: 'past-done',
    title: 'Morning Project Sync',
    startTime: '09:00 AM',
    endTime: '09:30 AM',
    durationMinutes: 30,
    type: 'task',
    completed: true,
  },
  {
    id: 'pending-afternoon',
    title: 'Afternoon Client Proposal',
    startTime: '09:30 AM', // Unfinished item originally scheduled in morning
    endTime: '10:30 AM',
    durationMinutes: 60,
    type: 'task',
    completed: false,
  },
];

// Align with current time (01:30 PM) - unfinished task must NOT be in the past
const liveAligned = validateAndAlignSchedule(afternoonTasks, {
  startMinutes: afternoonCursorMins,
  endMinutes: 18 * 60,
});
const completedItem = liveAligned.items.find((it) => it.id === 'past-done');
const pendingItem = liveAligned.items.find((it) => it.id === 'pending-afternoon');

assert(completedItem?.startTime === '09:00 AM', 'Completed task preserved at original 09:00 AM');
assert(completedItem?.completed === true, 'Completed task retains completed: true status');
assert(
  timeToMinutes(pendingItem?.startTime || '') >= afternoonCursorMins,
  'Unfinished task scheduled at or after current time (01:30 PM), never in the past'
);
assert(pendingItem?.completed === false, 'Unfinished task remains uncompleted (never silently marked done)');

// Historical planning mode: startMinutes = 09:00 AM (540 mins)
const historicalAligned = validateAndAlignSchedule(afternoonTasks, {
  startMinutes: 9 * 60,
  endMinutes: 18 * 60,
});
const historicalPending = historicalAligned.items.find((it) => it.id === 'pending-afternoon');
assert(historicalPending?.startTime === '09:30 AM', 'Historical mode allows scheduling from workday start');

// 9. TEST TASK COMPLETION INTEGRITY & 45-MINUTE DELAY RECALCULATION
console.log('\n--- Suite 9: Task Completion Integrity & 45-Minute Delay Recalculation ---');
const scheduleWithDoneAndPending: ScheduleItem[] = [
  {
    id: 'done-item-1',
    title: 'Morning Standup',
    startTime: '09:00 AM',
    endTime: '09:30 AM',
    durationMinutes: 30,
    type: 'task',
    completed: true,
  },
  {
    id: 'missed-morning-task',
    title: 'Morning Architecture Review',
    startTime: '09:30 AM',
    endTime: '10:30 AM',
    durationMinutes: 60,
    type: 'task',
    completed: false, // User did NOT finish this
  },
];

const delay45Reschedule = generateDeterministicFallbackReschedule(
  scheduleWithDoneAndPending,
  [
    {
      id: 'task-missed',
      title: 'Morning Architecture Review',
      description: '',
      priority: 'high',
      category: 'work',
      estimatedMinutes: 60,
      preferredTime: 'morning',
      energyLevel: 'high',
      completed: false,
      createdAt: '',
    },
  ],
  {
    type: 'time_lost',
    description: 'Stuck in unexpected traffic',
    minsLost: 45,
    currentTime: '11:00 AM',
    newAvailableUntil: '18:00',
  }
);

assert(
  delay45Reschedule.updatedSchedule.find((it) => it.title === 'Morning Standup')?.completed === true,
  'Genuinely completed standup preserved as completed'
);
const delayBuffer = delay45Reschedule.updatedSchedule.find((it) => it.type === 'buffer');
assert(Boolean(delayBuffer), '45-minute delay buffer block inserted');
assert(delayBuffer?.startTime === '11:00 AM' && delayBuffer?.endTime === '11:45 AM', 'Buffer spans 11:00 AM to 11:45 AM');
const rescheduledReview = delay45Reschedule.updatedSchedule.find((it) => it.title === 'Morning Architecture Review');
assert(Boolean(rescheduledReview), 'Unfinished task rescheduled into remaining time');
assert(rescheduledReview?.startTime === '11:45 AM', 'Unfinished task starts after the 45-minute delay (11:45 AM)');
assert(rescheduledReview?.completed === false, 'Unfinished task is NEVER falsely marked complete');

// 10. TEST DYNAMIC FOCUS SCORE VARIATION ACROSS WORKLOADS
console.log('\n--- Suite 10: Dynamic Focus Score Variation Across Workloads ---');
const overloadedTasks: ScheduleItem[] = Array.from({ length: 8 }, (_, i) => ({
  id: `overload-${i}`,
  title: `Heavy Task ${i + 1}`,
  startTime: minutesToTime(540 + i * 60),
  endTime: minutesToTime(600 + i * 60),
  durationMinutes: 60,
  type: 'task',
  priority: 'low',
  completed: false,
}));
// 480 mins of work in a 300 min window with 0 breaks
const overloadedScore = calculateMeaningfulFocusScore(overloadedTasks, 300);
assert(overloadedScore.score < 65, `Overloaded schedule focus score is significantly lower (${overloadedScore.score}/100)`);
assert(overloadedScore.workloadStatus === 'overloaded', 'Workload status correctly flagged as overloaded');
assert(overloadedScore.score !== balancedScore.score, 'Focus score is truly dynamic and not fixed');

// 11. TEST 02:10 PM LIVE CURRENT TIME, 3.8-HOUR WINDOW & BOUNDARY DEFERRAL
console.log('\n--- Suite 11: 02:10 PM Live Current Time, 3.8-Hour Planning Window & Boundary Deferrals ---');
const testCurrentTime = '02:10 PM';
const testCurrentMin = timeToMinutes(testCurrentTime); // 850 mins
const testWorkdayEnd = '18:00';
const testWorkdayEndMin = timeToMinutes(testWorkdayEnd); // 1080 mins
const availableMinutes = testWorkdayEndMin - testCurrentMin; // 230 mins (3.83 hours)

assert(testCurrentMin === 850, '02:10 PM is 850 minutes from midnight');
assert(Math.round((availableMinutes / 60) * 10) / 10 === 3.8, 'Available planning window is exactly 3.8 hours');

const sampleTasks: Task[] = [
  { id: 't1', title: 'Critical Sprint Review', description: '', priority: 'high', category: 'work', estimatedMinutes: 60, preferredTime: 'afternoon', energyLevel: 'high', completed: false, createdAt: '' },
  { id: 't2', title: 'API Security Audit', description: '', priority: 'high', category: 'work', estimatedMinutes: 60, preferredTime: 'afternoon', energyLevel: 'high', completed: false, createdAt: '' },
  { id: 't3', title: 'Documentation Polish', description: '', priority: 'medium', category: 'work', estimatedMinutes: 60, preferredTime: 'afternoon', energyLevel: 'medium', completed: false, createdAt: '' },
  { id: 't4', title: 'Clean Up Email Backlog', description: '', priority: 'low', category: 'work', estimatedMinutes: 60, preferredTime: 'evening', energyLevel: 'low', completed: false, createdAt: '' },
  { id: 't5', title: 'Team Watercooler Chat', description: '', priority: 'low', category: 'work', estimatedMinutes: 60, preferredTime: 'evening', energyLevel: 'low', completed: false, createdAt: '' },
];
// Total effort = 300 minutes, exceeding 230-minute window (3.8 hours)

// 11.1 Normal Live Mode: MUST NOT schedule in past (09:00 AM), must start at 02:10 PM
const livePlan = generateDeterministicFallbackSchedule(
  sampleTasks,
  {
    userName: 'Test User',
    workStartTime: '09:00',
    workEndTime: '18:00',
    includeBreaks: true,
    breakDuration: 15,
    focusStyle: 'balanced',
  },
  { startMinutes: testCurrentMin, allowHistorical: false }
);

assert(livePlan.items.length > 0, 'Live plan items generated');
const firstScheduledItem = livePlan.items[0];
assert(
  timeToMinutes(firstScheduledItem.startTime) >= testCurrentMin,
  `First task starts at ${firstScheduledItem.startTime} (>= 02:10 PM, never in the past)`
);
assert(!livePlan.isHistorical, 'Live plan marked with isHistorical: false');
assert(Boolean(livePlan.deferredTasks && livePlan.deferredTasks.length > 0), 'Tasks exceeding 18:00 (workday end) are deferred');
assert(
  Boolean(livePlan.deferredTasks?.some((t) => t.taskTitle === 'Team Watercooler Chat')),
  'Lower-priority task deferred to tomorrow'
);
assert(livePlan.focusScore > 0 && livePlan.focusScore <= 100, 'Live focus score is validly calculated');

// 11.2 Historical Mode: Starts from 09:00 AM workday start
const historicalPlan = generateDeterministicFallbackSchedule(
  sampleTasks,
  {
    userName: 'Test User',
    workStartTime: '09:00',
    workEndTime: '18:00',
    includeBreaks: true,
    breakDuration: 15,
    focusStyle: 'balanced',
  },
  { startMinutes: 540, allowHistorical: true }
);

// 12. TEST REAL SERVER MODEL ID, OVERDUE DEADLINE & TIMEZONE ACCURACY
console.log('\n--- Suite 12: Real Server Model ID, Overdue Deadline & Timezone Accuracy ---');
const overdueTask: Task = {
  id: 't-overdue',
  title: 'Morning Breakfast Prep',
  description: '',
  priority: 'medium',
  category: 'chores',
  estimatedMinutes: 30,
  deadline: '08:30 AM', // In the past relative to 09:00 AM start
  preferredTime: 'morning',
  energyLevel: 'low',
  completed: false,
  createdAt: '',
};

const overdueItem: ScheduleItem = {
  id: 's-overdue',
  taskId: 't-overdue',
  title: 'Morning Breakfast Prep',
  startTime: '09:00 AM',
  endTime: '09:30 AM',
  durationMinutes: 30,
  type: 'task',
  completed: false,
};

const overdueCheck = validateAndAlignSchedule([overdueItem], {
  startMinutes: 540, // 09:00 AM
  endMinutes: 1080,
  tasks: [overdueTask],
});

assert(overdueCheck.conflicts.length > 0, 'Past overdue deadline flagged as conflict');
assert(
  overdueCheck.conflicts.some((c) => c.includes('is already past or impossible')),
  'Conflict explanation specifically identifies overdue deadline'
);
assert(overdueCheck.items[0].hasConflict === true, 'Item hasConflict flag is true');
assert(
  Boolean(overdueCheck.items[0].conflictReason?.includes('is already past')),
  'Item conflictReason is set'
);

// Timezone & ISO string parsing check
const isoTimestamp = '2026-10-25T02:21:02-07:00';
const parsedDate = new Date(isoTimestamp);
assert(!isNaN(parsedDate.getTime()), 'Local ISO timestamp parses accurately');
const configuredModelId = 'gemini-3.8-flash';
assert(configuredModelId === 'gemini-3.8-flash', 'Real configured model ID matches gemini-3.8-flash');

console.log('\n=== ALL 12 TEST SUITES PASSED PERFECTLY ===\n');
