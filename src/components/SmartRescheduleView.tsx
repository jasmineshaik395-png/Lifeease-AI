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
} from 'lucide-react';
import { Task, DailyPlan, ScheduleItem, RescheduleResult } from '../types';
import { ActiveTab } from './Navbar';
import confetti from 'canvas-confetti';

interface SmartRescheduleViewProps {
  tasks: Task[];
  dailyPlan: DailyPlan | null;
  onApplyUpdatedSchedule: (updatedPlan: DailyPlan) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const SmartRescheduleView: React.FC<SmartRescheduleViewProps> = ({
  tasks,
  dailyPlan,
  onApplyUpdatedSchedule,
  setActiveTab,
}) => {
  const [disruptionType, setDisruptionType] = useState<
    'urgent_task' | 'time_lost' | 'fatigue' | 'meeting' | 'custom'
  >('urgent_task');

  const [disruptionDescription, setDisruptionDescription] = useState(
    'Boss requested an urgent executive summary presentation due by 2:30 PM (takes ~45 mins).'
  );
  const [urgentTaskTitle, setUrgentTaskTitle] = useState('Urgent Executive Summary Presentation');
  const [urgentTaskMinutes, setUrgentTaskMinutes] = useState(45);
  const [timeLostMinutes, setTimeLostMinutes] = useState(45);
  const [newAvailableUntil, setNewAvailableUntil] = useState('17:00');
  const [currentTime, setCurrentTime] = useState('11:30 AM');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<RescheduleResult | null>(null);

  // Preset triggers for easy testing
  const presets = [
    {
      id: 'urgent_task',
      label: '🚨 Urgent Task Dropped In',
      desc: 'Boss requested urgent executive slides due by 2:30 PM (takes ~45 mins).',
      urgentTitle: 'Urgent Executive Presentation Slides',
      urgentMins: 45,
    },
    {
      id: 'time_lost',
      label: '⏳ Delayed by 45 Minutes',
      desc: 'Previous meeting ran over / got stuck in traffic; I lost 45 minutes of scheduled time.',
      minsLost: 45,
    },
    {
      id: 'meeting',
      label: '📅 Unscheduled 1-Hour Meeting',
      desc: 'An unexpected client call was just scheduled for 1:00 PM for 60 minutes.',
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
      desc: 'Type your own surprise change or disruption...',
    },
  ];

  const handleSelectPreset = (preset: (typeof presets)[0]) => {
    setDisruptionType(preset.id as any);
    setDisruptionDescription(preset.desc);
    if (preset.urgentTitle) setUrgentTaskTitle(preset.urgentTitle);
    if (preset.urgentMins) setUrgentTaskMinutes(preset.urgentMins);
    if (preset.minsLost) setTimeLostMinutes(preset.minsLost);
  };

  const handleExecuteReschedule = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const pendingTasks = tasks.filter((t) => !t.completed);

    try {
      const response = await fetch('/api/smart-reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSchedule: dailyPlan?.items || [],
          remainingTasks: pendingTasks,
          disruptionType,
          disruptionDescription,
          urgentTaskTitle: disruptionType === 'urgent_task' || disruptionType === 'meeting' ? urgentTaskTitle : undefined,
          urgentTaskMinutes: disruptionType === 'urgent_task' || disruptionType === 'meeting' ? urgentTaskMinutes : undefined,
          urgentTaskPriority: 'high',
          timeLostMinutes: disruptionType === 'time_lost' ? timeLostMinutes : 0,
          newAvailableUntil,
          currentTime,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to reschedule with Gemini AI.');
      }

      const data: RescheduleResult = await response.json();
      setResult(data);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error executing smart reschedule.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySchedule = () => {
    if (!result) return;

    const updatedPlan: DailyPlan = {
      id: `plan-rescheduled-${Date.now()}`,
      date: new Date().toISOString(),
      generatedAt: `Rescheduled at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      items: result.updatedSchedule,
      summary: result.changesExplanation,
      focusScore: 92,
      peakEnergyWindow: 'Rebalanced for current focus',
      workloadStatus: result.deferredTasks.length > 0 ? 'manageable' : 'optimal',
      recommendations: [
        result.reliefTip,
        'Breathe easy: your essential priorities remain safe.',
      ],
    };

    onApplyUpdatedSchedule(updatedPlan);
    setActiveTab('planner');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-purple-100">
            <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>Gemini AI Disruption Shield</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Smart Rescheduling Engine
          </h1>

          <p className="text-purple-100 text-sm sm:text-base leading-relaxed">
            Real life rarely goes according to a static schedule. When an unexpected emergency pops up or delays occur, Gemini instantly rebalances your day so you never feel stressed or overwhelmed.
          </p>
        </div>
      </div>

      {/* Main Grid: Config on Left, Result on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Select Disruption (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm pb-2 border-b border-slate-100">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>1. What Disruption Happened?</span>
            </div>

            {/* Presets */}
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

            {/* Disruption Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Disruption Explanation
              </label>
              <textarea
                rows={3}
                value={disruptionDescription}
                onChange={(e) => setDisruptionDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Current Time */}
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

              {(disruptionType === 'urgent_task' || disruptionType === 'meeting') && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Duration Needed
                  </label>
                  <input
                    type="number"
                    value={urgentTaskMinutes}
                    onChange={(e) => setUrgentTaskMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {disruptionType === 'time_lost' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Minutes Lost
                  </label>
                  <input
                    type="number"
                    value={timeLostMinutes}
                    onChange={(e) => setTimeLostMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>

            {/* Reschedule CTA */}
            <button
              onClick={handleExecuteReschedule}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gemini Re-balancing Schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Smart Reschedule</span>
                </>
              )}
            </button>

            {errorMessage && (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        {/* Right Output: Gemini Recalculation (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2 text-purple-700 font-extrabold text-base">
                  <Sparkles className="w-5 h-5" />
                  <span>Gemini Rebalanced Schedule</span>
                </div>
                <button
                  onClick={handleApplySchedule}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Apply to My Active Plan</span>
                </button>
              </div>

              {/* Cognitive Relief Tip */}
              {result.reliefTip && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-emerald-950 text-xs flex items-start space-x-2.5">
                  <HeartHandshake className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-emerald-900">
                      Peace of Mind Note:
                    </strong>
                    {result.reliefTip}
                  </div>
                </div>
              )}

              {/* What changed narrative */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  How Your Day Was Adjusted
                </span>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                  {result.changesExplanation}
                </p>
              </div>

              {/* Deferred tasks notice */}
              {result.deferredTasks && result.deferredTasks.length > 0 && (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
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

              {/* New Schedule Items */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  New Timeline Starting From {currentTime}
                </span>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {result.updatedSchedule.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        item.type === 'break'
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="truncate mr-3">
                        <div className="font-bold truncate">{item.title}</div>
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
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <RefreshCw className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                No active rescheduling yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select a scenario on the left or type your unexpected surprise, then click "Execute Smart Reschedule" to see Gemini in action!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
