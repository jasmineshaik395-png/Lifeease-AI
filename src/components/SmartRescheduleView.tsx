import React, { useState } from 'react';
import {
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Clock,
  Calendar,
  ArrowRight,
  ShieldAlert,
  HeartHandshake,
  CheckCircle2,
  Loader2,
  CalendarDays,
  Check,
  X,
  Split,
  RotateCcw,
  Sliders,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { Task, DailyPlan, ScheduleItem, RescheduleResult } from '../types';
import { ActiveTab } from './Navbar';
import {
  generateDeterministicFallbackReschedule,
  validateAndAlignSchedule,
  calculateMeaningfulFocusScore,
  timeToMinutes,
  minutesToTime,
} from '../utils/scheduler';
import confetti from 'canvas-confetti';

interface SmartRescheduleViewProps {
  tasks: Task[];
  dailyPlan: DailyPlan | null;
  onApplyUpdatedSchedule: (updatedPlan: DailyPlan) => void;
  setActiveTab: (tab: ActiveTab) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialPreset?: string;
}

export const SmartRescheduleView: React.FC<SmartRescheduleViewProps> = ({
  tasks,
  dailyPlan,
  onApplyUpdatedSchedule,
  setActiveTab,
  showToast,
  initialPreset,
}) => {
  const getInitialTime = () => {
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const padH = h < 10 ? `0${h}` : `${h}`;
    const padM = m < 10 ? `0${m}` : `${m}`;
    return `${padH}:${padM} ${ampm}`;
  };

  const [disruptionType, setDisruptionType] = useState<
    'urgent_task' | 'time_lost' | 'fatigue' | 'meeting' | 'task_overrun' | 'custom'
  >((initialPreset as any) || 'time_lost');

  const [disruptionDescription, setDisruptionDescription] = useState(
    initialPreset === 'urgent_task'
      ? 'Boss requested an urgent executive presentation due by 2:30 PM (takes ~45 mins).'
      : 'Previous commitment ran over; lost 45 minutes of scheduled time. Need to rebalance afternoon.'
  );
  const [urgentTaskTitle, setUrgentTaskTitle] = useState('Urgent Priority Request');
  const [urgentTaskMinutes, setUrgentTaskMinutes] = useState(45);
  const [timeLostMinutes, setTimeLostMinutes] = useState(45);
  const [newAvailableUntil, setNewAvailableUntil] = useState('18:00');
  const [currentTime, setCurrentTime] = useState(getInitialTime);

  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<RescheduleResult | null>(null);

  // Comparison tab state
  const [viewMode, setViewMode] = useState<'comparison' | 'revised_only'>('comparison');

  const presets = [
    {
      id: 'urgent_task',
      label: '🚨 Emergency Task Dropped In',
      desc: 'Boss requested an urgent executive presentation due by 2:30 PM (takes ~45 mins).',
      urgentTitle: 'Urgent Executive Presentation',
      urgentMins: 45,
    },
    {
      id: 'time_lost',
      label: '⏳ Unexpected 45-Minute Delay',
      desc: 'Previous meeting ran over / got stuck in traffic; lost 45 minutes of scheduled time.',
      minsLost: 45,
    },
    {
      id: 'task_overrun',
      label: '⏱️ Task Took Longer Than Expected',
      desc: 'Debugging hackathon issue took 40 minutes longer than planned. Need to shift the afternoon.',
      minsLost: 40,
    },
    {
      id: 'meeting',
      label: '📅 Unscheduled 1-Hour Meeting',
      desc: 'An unexpected client sync was scheduled for 1:00 PM for 60 minutes.',
      urgentTitle: 'Unscheduled Client Sync',
      urgentMins: 60,
    },
    {
      id: 'fatigue',
      label: '😴 Energy Slump / Fatigue',
      desc: 'Feeling drained; need to slow down pace, lengthen breaks, and postpone low-priority chores.',
    },
    {
      id: 'custom',
      label: '✏️ Custom Situation',
      desc: 'Family errand popped up; need to step away for 30 minutes and finish by 5:30 PM.',
      urgentTitle: 'Custom Priority Task',
      urgentMins: 30,
      minsLost: 30,
    },
  ];

  const handleSelectPreset = (preset: (typeof presets)[0]) => {
    setDisruptionType(preset.id as any);
    setDisruptionDescription(preset.desc);
    setValidationError(null);
    setErrorMessage(null);
    if (preset.urgentTitle) setUrgentTaskTitle(preset.urgentTitle);
    if (preset.urgentMins) setUrgentTaskMinutes(preset.urgentMins);
    if (preset.minsLost) setTimeLostMinutes(preset.minsLost);
  };

  React.useEffect(() => {
    if (initialPreset) {
      const match = presets.find((p) => p.id === initialPreset);
      if (match) {
        handleSelectPreset(match);
      }
    }
  }, [initialPreset]);

  const handleExecuteReschedule = async () => {
    if (isLoading) return; // Prevent duplicate submissions

    setValidationError(null);
    setErrorMessage(null);

    // 1. INPUT VALIDATION
    const parsedCurrentMin = timeToMinutes(currentTime);
    if (!currentTime.trim() || isNaN(parsedCurrentMin)) {
      setValidationError('Please enter a valid current time (e.g., 11:30 AM or 14:00).');
      return;
    }

    if (disruptionType === 'urgent_task' || disruptionType === 'meeting') {
      if (!urgentTaskTitle.trim()) {
        setValidationError(
          disruptionType === 'meeting'
            ? 'Please specify a title for the unscheduled meeting.'
            : 'Please specify a title for the emergency task.'
        );
        return;
      }
      if (!urgentTaskMinutes || urgentTaskMinutes <= 0 || urgentTaskMinutes > 480) {
        setValidationError('Please specify a valid duration between 5 and 480 minutes.');
        return;
      }
    }

    if (disruptionType === 'time_lost' || disruptionType === 'task_overrun') {
      if (!timeLostMinutes || timeLostMinutes <= 0 || timeLostMinutes > 360) {
        setValidationError('Please specify between 5 and 360 minutes lost or overrun.');
        return;
      }
    }

    if (disruptionType === 'custom') {
      if (!disruptionDescription.trim()) {
        setValidationError('Please provide a brief description of your custom disruption.');
        return;
      }
    }

    const pendingTasks = tasks.filter((t) => !t.completed);

    setIsLoading(true);

    try {
      const response = await fetch('/api/smart-reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSchedule: dailyPlan?.items || [],
          remainingTasks: pendingTasks,
          disruptionType,
          disruptionDescription,
          urgentTaskTitle:
            disruptionType === 'urgent_task' || disruptionType === 'meeting' || (disruptionType === 'custom' && urgentTaskTitle)
              ? urgentTaskTitle
              : undefined,
          urgentTaskMinutes:
            disruptionType === 'urgent_task' || disruptionType === 'meeting' || (disruptionType === 'custom' && urgentTaskTitle)
              ? urgentTaskMinutes
              : undefined,
          urgentTaskPriority: 'high',
          timeLostMinutes:
            disruptionType === 'time_lost' || disruptionType === 'task_overrun'
              ? timeLostMinutes
              : disruptionType === 'custom'
              ? timeLostMinutes
              : 0,
          newAvailableUntil,
          currentTime,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to reschedule with Gemini AI.');
      }

      const data: RescheduleResult = await response.json();

      // Validate output in application code to guarantee non-overlapping sequential blocks
      const validated = validateAndAlignSchedule(data.updatedSchedule || [], {
        startMinutes: parsedCurrentMin,
        endMinutes: timeToMinutes(newAvailableUntil || '18:00'),
        includeBreaks: true,
        tasks: pendingTasks,
        deferOverflowTasks: true,
      });

      const combinedDeferred = [
        ...(data.deferredTasks || []),
        ...(validated.deferredTasks || []),
      ];
      const seenDeferred = new Set<string>();
      const uniqueDeferred = combinedDeferred.filter((d) => {
        if (seenDeferred.has(d.taskTitle)) return false;
        seenDeferred.add(d.taskTitle);
        return true;
      });

      setResult({
        ...data,
        updatedSchedule: validated.items,
        deferredTasks: uniqueDeferred,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
      showToast('Smart Reschedule calculated! Review comparison below.', 'success');
    } catch (err: any) {
      console.warn('API Reschedule failed, falling back to deterministic reschedule:', err);
      const fallbackResult = generateDeterministicFallbackReschedule(
        dailyPlan?.items || [],
        pendingTasks,
        {
          type: disruptionType,
          description: disruptionDescription,
          urgentTitle:
            disruptionType === 'urgent_task' || disruptionType === 'meeting' || (disruptionType === 'custom' && urgentTaskTitle)
              ? urgentTaskTitle
              : undefined,
          urgentMins: urgentTaskMinutes,
          minsLost:
            disruptionType === 'time_lost' || disruptionType === 'task_overrun'
              ? timeLostMinutes
              : disruptionType === 'custom'
              ? timeLostMinutes
              : 0,
          currentTime,
          newAvailableUntil,
        }
      );

      setResult({
        ...fallbackResult,
        changesExplanation: `${fallbackResult.changesExplanation} (Deterministic Non-AI Fallback)`,
      });
      showToast('Generated deterministic reschedule (Non-AI Fallback)', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySchedule = () => {
    if (!result) return;

    const availableWindowMins = Math.max(
      60,
      timeToMinutes(newAvailableUntil) - timeToMinutes(currentTime)
    );
    const scoreAnalysis = calculateMeaningfulFocusScore(
      result.updatedSchedule,
      availableWindowMins,
      tasks
    );

    const updatedPlan: DailyPlan = {
      id: `plan-rescheduled-${Date.now()}`,
      date: new Date().toISOString(),
      generatedAt: `Rescheduled at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      items: result.updatedSchedule,
      summary: result.changesExplanation,
      focusScore: scoreAnalysis.score,
      focusScoreBreakdown: scoreAnalysis.breakdown,
      peakEnergyWindow: 'Rebalanced for current focus',
      workloadStatus: scoreAnalysis.workloadStatus,
      recommendations: [
        result.reliefTip,
        result.deferredTasks.length > 0
          ? `${result.deferredTasks.length} task(s) deferred to tomorrow to protect your boundary (${newAvailableUntil}).`
          : 'All remaining commitments fit comfortably within your remaining hours.',
      ],
      conflicts: [],
      deferredTasks: result.deferredTasks,
      isFallbackPlan: false,
    };

    onApplyUpdatedSchedule(updatedPlan);
    showToast('Applied revised schedule to your active plan!', 'success');
    setActiveTab('planner');
  };

  const handleReject = () => {
    setResult(null);
    showToast('Disruption rejected. Kept original schedule.', 'info');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-purple-100">
            <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>Signature Engine: Dynamic Disruption Shield</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Smart Rescheduling Engine
          </h1>

          <p className="text-purple-100 text-xs sm:text-sm leading-relaxed">
            Real life happens. When an unexpected emergency strikes, delays occur, or energy dips, LifeEase instantly rebalances your remaining hours, protects completed tasks, and defers flexible tasks without panic.
          </p>
        </div>
      </div>

      {/* Main Grid: Config on Left, Comparison on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Select Disruption (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm pb-2 border-b border-slate-100">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>1. Select Disruption Type</span>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              {presets.map((preset) => {
                const isSelected = disruptionType === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50/80 border-purple-500 text-purple-900 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70 font-medium'
                    }`}
                  >
                    <div className="text-xs">{preset.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Fatigue Special Notice */}
            {disruptionType === 'fatigue' && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <span>😴 Fatigue Recovery Mode:</span>
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Inserts an immediate 25-minute mindful recharge pause, defers non-critical chores to tomorrow, and adds 15-minute pacing breathers between remaining deep work.
                </p>
              </div>
            )}

            {/* Disruption Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Disruption Explanation
              </label>
              <textarea
                rows={2}
                value={disruptionDescription}
                onChange={(e) => setDisruptionDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Inputs based on disruption type */}
            {(disruptionType === 'urgent_task' || disruptionType === 'meeting' || disruptionType === 'custom') && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {disruptionType === 'meeting' ? 'Meeting Title' : 'Task / Event Title'}
                </label>
                <input
                  type="text"
                  value={urgentTaskTitle}
                  onChange={(e) => setUrgentTaskTitle(e.target.value)}
                  placeholder="e.g. Unscheduled Client Sync"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            {/* Current Time, Duration, and Workday Boundary */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Current Time
                </label>
                <input
                  type="text"
                  value={currentTime}
                  onChange={(e) => setCurrentTime(e.target.value)}
                  placeholder="e.g. 11:30 AM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Available Until
                </label>
                <input
                  type="time"
                  value={newAvailableUntil}
                  onChange={(e) => setNewAvailableUntil(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {(disruptionType === 'urgent_task' || disruptionType === 'meeting' || disruptionType === 'custom') && (
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Duration Needed (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    value={urgentTaskMinutes}
                    onChange={(e) => setUrgentTaskMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {(disruptionType === 'time_lost' || disruptionType === 'task_overrun' || disruptionType === 'custom') && (
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Minutes Lost / Delayed
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    value={timeLostMinutes}
                    onChange={(e) => setTimeLostMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* General Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Reschedule CTA Button (Protected against duplicate submissions) */}
            <button
              onClick={handleExecuteReschedule}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Re-calculating Schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Smart Reschedule</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Output: Before vs After Comparison & Confirmation (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
              {/* Header with Accept / Reject Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2 text-purple-700 font-extrabold text-base">
                  <Sparkles className="w-5 h-5" />
                  <span>Review Proposed Adjustments</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleReject}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Reject & Keep
                  </button>
                  <button
                    onClick={handleApplySchedule}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Apply Revised Plan</span>
                  </button>
                </div>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setViewMode('comparison')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    viewMode === 'comparison'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Side-by-Side Comparison
                </button>
                <button
                  onClick={() => setViewMode('revised_only')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    viewMode === 'revised_only'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Revised Schedule Only
                </button>
              </div>

              {/* Cognitive Relief Tip */}
              {result.reliefTip && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl text-emerald-950 text-xs flex items-start space-x-2.5">
                  <HeartHandshake className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-emerald-900">
                      Cognitive Peace of Mind:
                    </strong>
                    {result.reliefTip}
                  </div>
                </div>
              )}

              {/* What changed narrative */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  How Your Day Was Rebalanced
                </span>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                  {result.changesExplanation}
                </p>
              </div>

              {/* Deferred tasks notice */}
              {result.deferredTasks && result.deferredTasks.length > 0 && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                    <CalendarDays className="w-4 h-4 text-amber-700" />
                    <span>Comfortably Postponed to Tomorrow:</span>
                  </div>
                  <ul className="space-y-1 text-xs text-amber-950">
                    {result.deferredTasks.map((def, i) => (
                      <li key={i} className="flex items-start space-x-1.5">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>
                          <strong>{def.taskTitle}:</strong> {def.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Comparison view */}
              {viewMode === 'comparison' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Before column */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-600 flex items-center justify-between pb-1 border-b border-slate-200">
                      <span>Original Schedule</span>
                      <span className="text-[10px] text-slate-400">Before Disruption</span>
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {dailyPlan?.items && dailyPlan.items.length > 0 ? (
                        dailyPlan.items.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg border text-[11px] ${
                              item.completed
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                : 'bg-white border-slate-200/80 text-slate-700'
                            }`}
                          >
                            <div className="font-semibold truncate flex items-center justify-between">
                              <span>{item.title}</span>
                              {item.completed && (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                                  Done
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {item.startTime} – {item.endTime}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic p-2">No prior plan set</p>
                      )}
                    </div>
                  </div>

                  {/* After column */}
                  <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2">
                    <div className="text-xs font-bold text-purple-900 flex items-center justify-between pb-1 border-b border-purple-200">
                      <span>Revised Schedule</span>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                        Adapted
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {result.updatedSchedule.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg border text-[11px] shadow-2xs ${
                            item.completed
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                              : item.type === 'buffer'
                              ? 'bg-amber-50 border-amber-200 text-amber-900'
                              : item.priority === 'high'
                              ? 'bg-white border-purple-300 text-purple-950 font-semibold'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="font-bold truncate flex items-center justify-between">
                            <span>{item.title}</span>
                            {item.completed && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                                Done
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-purple-700 font-medium">
                            {item.startTime} – {item.endTime} ({item.durationMinutes}m)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Revised Only View */
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    New Timeline
                  </span>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {result.updatedSchedule.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                          item.completed
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : item.type === 'break'
                            ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                            : item.type === 'buffer'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="truncate mr-3">
                          <div className="font-bold truncate flex items-center space-x-1.5">
                            <span>{item.title}</span>
                            {item.completed && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded">
                                Completed Earlier
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.startTime} – {item.endTime} ({item.durationMinutes}m)
                          </div>
                          {item.reason && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">
                              {item.reason}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white border border-slate-200 shrink-0">
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <RefreshCw className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Ready to handle unexpected surprises?
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select a disruption preset on the left (e.g. 45-minute delay or emergency task), adjust parameters, and click "Execute Smart Reschedule" to view the adapted timeline.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
