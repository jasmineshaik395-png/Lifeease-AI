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
} from 'lucide-react';
import { Task, DailyPlan, ScheduleItem, UserPreferences } from '../types';
import { ActiveTab } from './Navbar';
import confetti from 'canvas-confetti';

interface AiPlannerViewProps {
  tasks: Task[];
  dailyPlan: DailyPlan | null;
  onPlanGenerated: (plan: DailyPlan) => void;
  onToggleScheduleItem: (itemId: string) => void;
  userPreferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const AiPlannerView: React.FC<AiPlannerViewProps> = ({
  tasks,
  dailyPlan,
  onPlanGenerated,
  onToggleScheduleItem,
  userPreferences,
  onUpdatePreferences,
  setActiveTab,
}) => {
  const [startTime, setStartTime] = useState(userPreferences.workStartTime || '09:00');
  const [endTime, setEndTime] = useState(userPreferences.workEndTime || '18:00');
  const [includeBreaks, setIncludeBreaks] = useState(userPreferences.includeBreaks ?? true);
  const [breakDuration, setBreakDuration] = useState(userPreferences.breakDuration || 15);
  const [focusStyle, setFocusStyle] = useState<'balanced' | 'deep-work' | 'light-and-steady'>(
    userPreferences.focusStyle || 'balanced'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('Initializing Gemini 3.8 Flash...');

  // Pending tasks count
  const pendingTasks = tasks.filter((t) => !t.completed);

  const handleGenerateSchedule = async () => {
    if (pendingTasks.length === 0) {
      setErrorMessage('You have no active pending tasks! Add some tasks or uncheck completed ones to generate a plan.');
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
            startTime,
            endTime,
            includeBreaks,
            breakDuration,
          },
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
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate schedule from Gemini API.');
      }

      const data = await response.json();

      const newPlan: DailyPlan = {
        id: `plan-${Date.now()}`,
        date: new Date().toISOString(),
        generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        items: data.items || [],
        summary: data.summary || 'Your custom daily schedule is ready.',
        focusScore: data.focusScore || 90,
        peakEnergyWindow: data.peakEnergyWindow || '09:30 AM - 11:45 AM',
        workloadStatus: data.workloadStatus || 'optimal',
        recommendations: data.recommendations || [
          'Tackle your hardest task before lunch.',
          'Take genuine breaks without screens.',
        ],
      };

      onPlanGenerated(newPlan);

      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred while generating the plan.');
    } finally {
      setIsLoading(false);
    }
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
            <span>Powered by Google Gemini 3.8 Flash</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Gemini AI Daily Planner
          </h1>

          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            Stop guessing what to do next. Gemini organizes your tasks into an optimal, non-overlapping timeline aligned with your biological focus rhythms and breaks.
          </p>
        </div>
      </div>

      {/* Control / Preference Settings & Generate Button */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 text-slate-800 font-bold text-sm">
          <Sliders className="w-4 h-4 text-blue-600" />
          <span>Customize Today's Scheduling Window & Preferences</span>
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
            <div className="flex items-center space-x-2">
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

        {/* Generate Button & Status */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Scheduling <strong className="text-slate-800">{pendingTasks.length} active tasks</strong> ({tasks.filter((t) => t.completed).length} already done)
          </div>

          <button
            onClick={handleGenerateSchedule}
            disabled={isLoading || pendingTasks.length === 0}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
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

        {/* Error message */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-3 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Daily Plan Result Display */}
      {dailyPlan ? (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                  Gemini Daily Synthesis
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Your Cognitive Blueprint for Today
                </h2>
                <p className="text-xs text-slate-400">
                  Generated at {dailyPlan.generatedAt}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-medium">Focus Feasibility</div>
                  <div className="text-xl font-black text-emerald-600">
                    {dailyPlan.focusScore}/100
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-800 font-bold uppercase">
                  {dailyPlan.workloadStatus}
                </div>
              </div>
            </div>

            <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/70 italic">
              "{dailyPlan.summary}"
            </p>

            {/* Peak Energy Window & Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/70 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Peak Energy Window</span>
                </div>
                <p className="font-semibold text-slate-800 text-sm">
                  {dailyPlan.peakEnergyWindow}
                </p>
                <p className="text-[11px] text-slate-600">
                  Gemini reserved this for your most demanding task.
                </p>
              </div>

              <div className="md:col-span-2 p-3.5 bg-purple-50/70 rounded-xl border border-purple-200/70 text-xs text-purple-900 space-y-1.5">
                <div className="font-bold flex items-center space-x-1.5">
                  <Lightbulb className="w-4 h-4 text-purple-600" />
                  <span>Gemini Recommendations for Today</span>
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  Chronological Daily Timeline ({dailyPlan.items.length} blocks)
                </h3>
                <p className="text-xs text-slate-500">
                  Follow step-by-step. Click checkbox when each time block is complete.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('reschedule')}
                className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100/70 border border-purple-200/60 px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Got Disrupted? Reschedule</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {dailyPlan.items.map((item, index) => {
                const isBreak = item.type === 'break';
                const isBuffer = item.type === 'buffer';
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
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">
              Ready to simplify your day?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Click the button above to have Gemini AI examine your tasks, calculate optimal blocks, and prevent decision fatigue.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
