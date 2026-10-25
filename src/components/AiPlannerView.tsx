import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Lightbulb,
  ShieldCheck,
  Check,
  Loader2,
  Zap,
  Coffee,
  ArrowRight,
  Sliders,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Task, DailyPlan, ScheduleItem, UserPreferences } from '../types';
import { ActiveTab } from './Navbar';
import confetti from 'canvas-confetti';
import {
  validateAndAlignSchedule,
  generateDeterministicFallbackSchedule,
  calculateMeaningfulFocusScore,
  timeToMinutes,
  minutesToTime,
} from '../utils/scheduler';

interface AiPlannerViewProps {
  tasks: Task[];
  dailyPlan: DailyPlan | null;
  onPlanGenerated: (plan: DailyPlan) => void;
  onToggleScheduleItem: (itemId: string) => void;
  userPreferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
  setActiveTab: (tab: ActiveTab) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onGoToReschedule?: (preset?: string) => void;
}

export const AiPlannerView: React.FC<AiPlannerViewProps> = ({
  tasks,
  dailyPlan,
  onPlanGenerated,
  onToggleScheduleItem,
  userPreferences,
  onUpdatePreferences,
  setActiveTab,
  showToast,
  onGoToReschedule,
}) => {
  const [startTime, setStartTime] = useState(userPreferences.workStartTime || '09:00');
  const [endTime, setEndTime] = useState(userPreferences.workEndTime || '18:00');
  const [includeBreaks, setIncludeBreaks] = useState(userPreferences.includeBreaks ?? true);
  const [breakDuration, setBreakDuration] = useState(userPreferences.breakDuration || 15);
  const [focusStyle, setFocusStyle] = useState<'balanced' | 'deep-work' | 'light-and-steady'>(
    userPreferences.focusStyle || 'balanced'
  );
  const [allowHistoricalPlanning, setAllowHistoricalPlanning] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('Initializing Gemini 3.8 Flash...');

  const pendingTasks = tasks.filter((t) => !t.completed);

  // Time & boundary calculations
  const now = new Date();
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();
  const roundedCurrentMins = Math.ceil(currentMinutesFromMidnight / 5) * 5;
  const formattedCurrentTime = minutesToTime(roundedCurrentMins);

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  // Unfinished tasks are never placed in the past unless explicitly selected by user
  const effectiveStartMin = allowHistoricalPlanning
    ? startMin
    : currentMinutesFromMidnight >= startMin && currentMinutesFromMidnight < endMin
    ? roundedCurrentMins
    : startMin;

  const availableWindowMins = Math.max(0, endMin - effectiveStartMin);
  const totalTasksMins = pendingTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
  const isOverCapacity = totalTasksMins > availableWindowMins;

  const hasUnfinishedPastItems = Boolean(
    dailyPlan &&
      !dailyPlan.isHistorical &&
      dailyPlan.items?.some(
        (it) => !it.completed && timeToMinutes(it.startTime) < currentMinutesFromMidnight - 10
      )
  );

  const handleGenerateSchedule = async () => {
    if (pendingTasks.length === 0) {
      setErrorMessage('You have no active pending tasks! Add tasks or uncheck completed ones to generate a plan.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep('Evaluating task priorities and deadlines with Gemini 3.8 Flash...');

    // Save preferences
    onUpdatePreferences({
      ...userPreferences,
      workStartTime: startTime,
      workEndTime: endTime,
      includeBreaks,
      breakDuration,
      focusStyle,
    });

    // Re-evaluate live clock at button press time to avoid stale planning anchors
    const clickNow = new Date();
    const clickCurMins = clickNow.getHours() * 60 + clickNow.getMinutes();
    const clickRoundedMins = Math.ceil(clickCurMins / 5) * 5;
    const clickFormattedTime = minutesToTime(clickRoundedMins);
    const sMin = timeToMinutes(startTime);
    const eMin = timeToMinutes(endTime);

    if (!allowHistoricalPlanning && clickCurMins >= eMin) {
      setErrorMessage(
        `Current time (${clickFormattedTime}) is past your configured workday end (${endTime}). Please extend 'Workday Ends' in settings or enable 'Historical Planning' to review/plan your full day.`
      );
      setIsLoading(false);
      return;
    }

    const activeStartMin = allowHistoricalPlanning
      ? sMin
      : clickCurMins >= sMin && clickCurMins < eMin
      ? clickRoundedMins
      : sMin;

    const dynamicWindowMins = Math.max(30, eMin - activeStartMin);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    try {
      const stepTimer1 = setTimeout(() => {
        setLoadingStep('Analyzing cognitive energy curves & scheduling high-focus blocks...');
      }, 1200);

      const stepTimer2 = setTimeout(() => {
        setLoadingStep('Inserting restorative buffer breaks and anti-fatigue pauses...');
      }, 2500);

      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: pendingTasks,
          availableTime: {
            startTime: minutesToTime(activeStartMin),
            endTime,
            includeBreaks,
            breakDuration,
          },
          currentTime: clickFormattedTime,
          timezone: userTimezone,
          allowPastScheduling: allowHistoricalPlanning,
          focusStyle,
          currentDate: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          }),
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!response.ok) {
        let errorDetail = '';
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errJson = await response.json();
            errorDetail = errJson.error || '';
          } else {
            const text = await response.text();
            if (response.status === 404) {
              errorDetail = 'Backend API route (/api/generate-plan) returned 404. On Vercel, please ensure the repository commits (with vercel.json and api/index.ts) are pushed and GEMINI_API_KEY is configured in Vercel settings.';
            } else if (response.status === 503) {
              errorDetail = 'Gemini AI service is temporarily experiencing high traffic. Please retry in a moment or use the algorithmic fallback.';
            } else {
              errorDetail = `Server returned status ${response.status}.`;
            }
          }
        } catch (_) {}

        if (!errorDetail) {
          if (response.status === 404) {
            errorDetail = 'Backend API route (/api/generate-plan) returned 404. On Vercel, please ensure vercel.json and api/index.ts are deployed and GEMINI_API_KEY is configured in Vercel settings.';
          } else if (response.status === 429) {
            errorDetail = 'Gemini API rate limit or quota exceeded. Please wait a moment before retrying.';
          } else {
            errorDetail = `Request failed with HTTP status ${response.status}.`;
          }
        }
        throw new Error(errorDetail);
      }

      const data = await response.json();

      // Preserve existing completed tasks so achievements are never deleted
      const existingCompletedItems = dailyPlan?.items?.filter((it) => it.completed) || [];
      const combinedItems = [...existingCompletedItems, ...(data.items || [])];

      // Deterministic validation to guarantee non-overlapping time blocks, boundary checks, and safe deferral
      const validated = validateAndAlignSchedule(combinedItems, {
        startMinutes: activeStartMin,
        endMinutes: eMin,
        includeBreaks,
        breakDuration,
        tasks,
        deferOverflowTasks: true,
      });

      // Calculate Focus Score from documented criteria
      const scoreAnalysis = calculateMeaningfulFocusScore(
        validated.items,
        dynamicWindowMins,
        tasks
      );

      const highPriTask =
        validated.items.find((it) => it.type === 'task' && it.priority === 'high') ||
        validated.items.find((it) => it.type === 'task');
      const peakWindow = highPriTask
        ? `${highPriTask.startTime} - ${highPriTask.endTime}`
        : data.peakEnergyWindow || `${minutesToTime(activeStartMin)} - ${minutesToTime(activeStartMin + 120)}`;

      const deadlineConflicts = validated.conflicts.filter(
        (c) => c.includes('deadline') || c.includes('Deadline')
      );

      const nonContradictoryRecommendations: string[] = [];

      if (highPriTask) {
        nonContradictoryRecommendations.push(
          `Dedicate focused attention to "${highPriTask.title}" during ${highPriTask.startTime}–${highPriTask.endTime}.`
        );
      }

      if (includeBreaks) {
        const breakBlocks = validated.items.filter((it) => it.type === 'break');
        if (breakBlocks.length > 0) {
          nonContradictoryRecommendations.push(
            `You have ${breakBlocks.length} restorative break(s) (${breakDuration}m each) scheduled to sustain mental clarity.`
          );
        } else {
          nonContradictoryRecommendations.push(
            `Protect short restorative pauses between tasks to prevent cognitive fatigue.`
          );
        }
      }

      if (deadlineConflicts.length > 0) {
        nonContradictoryRecommendations.push(
          `⚠️ Deadline Notice: ${deadlineConflicts.length} task(s) finish after their requested deadlines. Review highlighted timeline blocks.`
        );
      } else if (validated.deferredTasks.length > 0) {
        nonContradictoryRecommendations.push(
          `${validated.deferredTasks.length} task(s) comfortably deferred to tomorrow to protect your ${endTime} workday boundary.`
        );
      } else {
        nonContradictoryRecommendations.push(
          `All scheduled commitments finish comfortably within your ${endTime} boundary.`
        );
      }

      const newPlan: DailyPlan = {
        id: `plan-${Date.now()}`,
        date: new Date().toISOString(),
        generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: validated.items,
        summary: data.summary || 'Your personalized daily schedule is ready.',
        focusScore: scoreAnalysis.score,
        focusScoreBreakdown: scoreAnalysis.breakdown,
        peakEnergyWindow: peakWindow,
        workloadStatus: scoreAnalysis.workloadStatus,
        recommendations: nonContradictoryRecommendations,
        conflicts: validated.conflicts,
        deferredTasks: validated.deferredTasks,
        isHistorical: allowHistoricalPlanning,
        isFallbackPlan: false,
        modelUsed: data.modelUsed || 'gemini-3.8-flash',
      };

      onPlanGenerated(newPlan);
      showToast('Gemini AI created your daily schedule!', 'success');

      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.warn('Gemini schedule generation error:', err);
      setErrorMessage(err.message || 'Unable to connect to Gemini AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseFallbackSchedule = () => {
    const existingCompletedItems = dailyPlan?.items?.filter((it) => it.completed) || [];

    const fallbackPlan = generateDeterministicFallbackSchedule(
      tasks,
      {
        ...userPreferences,
        workStartTime: startTime,
        workEndTime: endTime,
        includeBreaks,
        breakDuration,
        focusStyle,
      },
      { startMinutes: effectiveStartMin, allowHistorical: allowHistoricalPlanning }
    );

    if (existingCompletedItems.length > 0) {
      const combined = validateAndAlignSchedule([...existingCompletedItems, ...fallbackPlan.items], {
        startMinutes: effectiveStartMin,
        endMinutes: endMin,
        includeBreaks,
        breakDuration,
        tasks,
        deferOverflowTasks: true,
      });
      fallbackPlan.items = combined.items;
      fallbackPlan.conflicts = combined.conflicts;
      fallbackPlan.deferredTasks = combined.deferredTasks;
    }

    fallbackPlan.isHistorical = allowHistoricalPlanning;
    onPlanGenerated(fallbackPlan);
    setErrorMessage(null);
    showToast('Generated deterministic schedule (Non-AI Fallback)', 'info');
  };

  const handleItemCheck = (itemId: string, isCurrentlyCompleted: boolean) => {
    onToggleScheduleItem(itemId);
    if (!isCurrentlyCompleted) {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
      });
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Model: Google Gemini 3.8 Flash (gemini-3.8-flash)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Gemini AI Daily Planner
          </h1>

          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
            Eliminate decision fatigue. Gemini reviews your tasks, prioritizes by deadline and energy level, and organizes your hours into an optimal, non-overlapping timeline.
          </p>
        </div>
      </div>

      {/* Control / Preference Settings & Generate Button */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 text-slate-800 font-bold text-sm">
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Customize Today's Scheduling Window & Focus Style</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Start Time */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Workday Starts
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Workday Ends
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Breaks */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Anti-Burnout Breaks
            </label>
            <select
              value={breakDuration}
              onChange={(e) => setBreakDuration(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10 min breaks</option>
              <option value={15}>15 min breaks (Recommended)</option>
              <option value={20}>20 min breaks</option>
            </select>
          </div>

          {/* Focus Style */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Focus Pace Style
            </label>
            <select
              value={focusStyle}
              onChange={(e) => setFocusStyle(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
            >
              <option value="balanced">Balanced Flow</option>
              <option value="deep-work">Deep Work Sprint</option>
              <option value="light-and-steady">Light & Steady</option>
            </select>
          </div>
        </div>

        {/* Live Local Clock & Historical Planning Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs">
          <div className="flex items-center space-x-2 text-slate-700">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Current Local Time: <strong>{formattedCurrentTime}</strong> • Tasks start at:{' '}
              <strong className="text-blue-700">{minutesToTime(effectiveStartMin)}</strong>
            </span>
          </div>

          <label className="flex items-center space-x-2 text-slate-600 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={allowHistoricalPlanning}
              onChange={(e) => setAllowHistoricalPlanning(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span>Historical Planning (start from workday start {startTime} even if earlier than now)</span>
          </label>
        </div>

        {/* Capacity Indicator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2 pt-1 border-t border-slate-100">
          <div>
            Available window: <strong className="text-slate-800">{(availableWindowMins / 60).toFixed(1)} hrs</strong> • Requested tasks effort: <strong className="text-slate-800">{(totalTasksMins / 60).toFixed(1)} hrs</strong> across {pendingTasks.length} tasks
          </div>
          {isOverCapacity && (
            <div className="flex items-center space-x-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Effort exceeds window: Gemini will balance & defer non-critical items.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {errorMessage && (
            <button
              onClick={handleUseFallbackSchedule}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-300 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Use Deterministic Fallback Schedule</span>
            </button>
          )}

          <button
            onClick={handleGenerateSchedule}
            disabled={isLoading || pendingTasks.length === 0}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gemini Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{dailyPlan ? 'Regenerate Daily Plan' : 'Generate Daily Schedule'}</span>
              </>
            )}
          </button>
        </div>

        {/* Loading step banner */}
        {isLoading && (
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center space-x-3 text-purple-900 text-xs font-medium animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-purple-600 shrink-0" />
            <span>{loadingStep}</span>
          </div>
        )}

        {/* Error message with interactive Retry and Fallback buttons */}
        {errorMessage && (
          <div className="p-4 sm:p-5 bg-rose-50/90 border border-rose-200/90 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-start space-x-3 text-rose-900 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-rose-950 block">Schedule Generation Notice:</span>
                <p className="text-xs text-rose-800 leading-relaxed">{errorMessage}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 pl-8">
              <button
                onClick={handleGenerateSchedule}
                disabled={isLoading}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry with Gemini</span>
              </button>

              <button
                onClick={handleUseFallbackSchedule}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Generate Algorithmic Fallback Schedule</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Daily Plan Result Display */}
      {dailyPlan ? (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                    {dailyPlan.isFallbackPlan ? 'Deterministic Fallback Blueprint' : 'Gemini AI Synthesis'}
                  </span>
                  {dailyPlan.isHistorical ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      📜 Historical Planning Mode
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ⚡ Dynamic Live Schedule
                    </span>
                  )}
                  {dailyPlan.isFallbackPlan ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      Algorithmic Non-AI
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      {dailyPlan.modelUsed || 'gemini-3.8-flash'}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  Your Synchronized Timeline
                </h2>
                <p className="text-xs text-slate-400">
                  Generated at {dailyPlan.generatedAt}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-medium">Focus Score</div>
                  <div className="text-xl font-black text-emerald-600">
                    {dailyPlan.focusScore}/100
                  </div>
                  {dailyPlan.focusScoreBreakdown && (
                    <div className="flex items-center justify-end space-x-1.5 text-[9px] text-slate-500 font-medium pt-0.5">
                      <span title="Workload capacity score">Cap: {dailyPlan.focusScoreBreakdown.capacity}/35</span>
                      <span>•</span>
                      <span title="Priority placement score">Pri: {dailyPlan.focusScoreBreakdown.priority}/25</span>
                      <span>•</span>
                      <span title="Restorative break score">Brk: {dailyPlan.focusScoreBreakdown.breaks}/20</span>
                      <span>•</span>
                      <span title="Deadline safety score">Dln: {dailyPlan.focusScoreBreakdown.deadlines}/20</span>
                    </div>
                  )}
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-800 font-bold uppercase shrink-0">
                  {dailyPlan.workloadStatus}
                </div>
              </div>
            </div>

            <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/70 italic">
              "{dailyPlan.summary}"
            </p>

            {/* Deferred tasks card (workday protection) */}
            {dailyPlan.deferredTasks && dailyPlan.deferredTasks.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl space-y-2 text-xs text-amber-950">
                <div className="font-bold flex items-center justify-between text-amber-900">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Boundary Protected: {dailyPlan.deferredTasks.length} Task(s) Safely Deferred to Tomorrow</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-200/60 text-amber-900 rounded">
                    Zero Burnout Guard
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  To protect your end-of-day boundary ({endTime}) and prevent decision fatigue, these lower-priority tasks were scheduled for your next planning session:
                </p>
                <div className="space-y-1.5 pt-1">
                  {dailyPlan.deferredTasks.map((d, idx) => (
                    <div key={idx} className="flex items-start space-x-2 bg-white/70 p-2 rounded-xl border border-amber-200/60 text-[11px]">
                      <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-900">{d.taskTitle}</strong>
                        <span className="text-slate-600 block sm:inline sm:ml-1">— {d.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stale schedule re-anchor notice */}
            {hasUnfinishedPastItems && (
              <div className="p-4 bg-blue-50/90 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-900">
                <div className="flex items-start space-x-2.5">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-blue-950">Active Plan Behind Current Time</span>
                    <span className="text-blue-800 text-[11px]">
                      This plan was generated at {dailyPlan.generatedAt}. Current time is {formattedCurrentTime}. Unfinished tasks can be realigned starting from right now.
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={handleGenerateSchedule}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-anchor From Now</span>
                  </button>
                  <button
                    onClick={() => (onGoToReschedule ? onGoToReschedule('time_lost') : setActiveTab('reschedule'))}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center space-x-1 cursor-pointer"
                  >
                    <span>⏱️ 45m Delay</span>
                  </button>
                </div>
              </div>
            )}

            {/* Conflicts banner if detected */}
            {dailyPlan.conflicts && dailyPlan.conflicts.length > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1 text-xs text-amber-900">
                <div className="font-bold flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Scheduling Capacity Notice:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {dailyPlan.conflicts.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Peak Energy Window & Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/70 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Peak Focus Window</span>
                </div>
                <p className="font-semibold text-slate-800 text-sm">
                  {dailyPlan.peakEnergyWindow}
                </p>
                <p className="text-[11px] text-slate-600">
                  Scheduled for your highest cognitive demand task.
                </p>
              </div>

              <div className="md:col-span-2 p-4 bg-purple-50/70 rounded-2xl border border-purple-200/70 text-xs text-purple-900 space-y-1.5">
                <div className="font-bold flex items-center space-x-1.5">
                  <Lightbulb className="w-4 h-4 text-purple-600" />
                  <span>Productivity Recommendations</span>
                </div>
                <ul className="space-y-1 text-slate-700">
                  {dailyPlan.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start space-x-1.5 text-xs">
                      <span className="text-purple-600 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Interactive Timeline Schedule */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Chronological Daily Timeline ({dailyPlan.items.length} blocks)
                </h3>
                <p className="text-xs text-slate-500">
                  Strictly non-overlapping time blocks. Check off blocks as you complete them.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onGoToReschedule ? onGoToReschedule('time_lost') : setActiveTab('reschedule')}
                  className="text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Recalculate remaining schedule after an unexpected 45-minute delay"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>⏱️ 45m Delay</span>
                </button>

                <button
                  onClick={() => setActiveTab('reschedule')}
                  className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100/70 border border-purple-200/60 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Smart Reschedule</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {dailyPlan.items.map((item, index) => {
                const isBreak = item.type === 'break';
                const isBuffer = item.type === 'buffer' || item.type === 'review';
                const isCompleted = item.completed;

                return (
                  <div
                    key={item.id || index}
                    className={`p-4 sm:p-5 transition-all flex items-start space-x-4 ${
                      isCompleted
                        ? 'bg-slate-50/60 opacity-70'
                        : isBreak
                        ? 'bg-emerald-50/30 hover:bg-emerald-50/50'
                        : isBuffer
                        ? 'bg-amber-50/30 hover:bg-amber-50/50'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Time Column */}
                    <div className="w-24 sm:w-28 shrink-0 text-left">
                      <div className="text-xs font-bold text-slate-900">
                        {item.startTime}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        to {item.endTime}
                      </div>
                      <span className="inline-block mt-1 text-[10px] text-slate-400 font-medium">
                        ⏱️ {item.durationMinutes}m
                      </span>
                    </div>

                    {/* Completion Checkbox */}
                    <button
                      onClick={() => handleItemCheck(item.id, isCompleted)}
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'border-slate-300 hover:border-blue-500 bg-white'
                      }`}
                      aria-label="Toggle block completion"
                    >
                      {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Main Block Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm sm:text-base font-bold ${
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {item.title}
                        </span>

                        {/* Type badge */}
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isBreak
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isBuffer
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {item.type}
                        </span>

                        {item.priority && item.priority !== 'none' && (
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              item.priority === 'high'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.priority}
                          </span>
                        )}

                        {item.hasConflict && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200"
                            title={item.conflictReason || 'Deadline or boundary conflict'}
                          >
                            ⚠️ {item.conflictReason || 'Deadline Risk'}
                          </span>
                        )}
                      </div>

                      {item.reason && (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {item.reason}
                        </p>
                      )}

                      {item.productivityTip && (
                        <div className="inline-flex items-center space-x-1.5 text-[11px] text-purple-700 bg-purple-50/80 px-2.5 py-1 rounded-lg border border-purple-100/70">
                          <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />
                          <span>Tip: {item.productivityTip}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">
              Ready to simplify your day?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Click the button above to have Gemini AI balance your {pendingTasks.length} tasks and organize your day into non-overlapping focus blocks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
