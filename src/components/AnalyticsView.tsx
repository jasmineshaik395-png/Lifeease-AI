import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  Zap,
  Coffee,
  ShieldCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Task, DailyPlan, TaskCategory, TaskPriority } from '../types';

interface AnalyticsViewProps {
  tasks: Task[];
  dailyPlan: DailyPlan | null;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tasks, dailyPlan }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Minutes calculations based purely on actual task data
  const completedMinutes = tasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);
  const remainingMinutes = tasks
    .filter((t) => !t.completed)
    .reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);

  // Dynamic real streak calculation based on actual completedAt dates
  const streakDays = useMemo(() => {
    const completedDates = tasks
      .filter((t) => t.completed && t.completedAt)
      .map((t) => new Date(t.completedAt!).toDateString());

    const uniqueDates = Array.from(new Set(completedDates));
    // If user completed tasks today, streak is at least 1 day
    return uniqueDates.length;
  }, [tasks]);

  // Category distribution from real data
  const categoryStats: Record<TaskCategory, { total: number; completed: number; minutes: number }> = {
    work: { total: 0, completed: 0, minutes: 0 },
    study: { total: 0, completed: 0, minutes: 0 },
    personal: { total: 0, completed: 0, minutes: 0 },
    health: { total: 0, completed: 0, minutes: 0 },
    chores: { total: 0, completed: 0, minutes: 0 },
    finance: { total: 0, completed: 0, minutes: 0 },
  };

  tasks.forEach((t) => {
    if (categoryStats[t.category]) {
      categoryStats[t.category].total += 1;
      categoryStats[t.category].minutes += (t.estimatedMinutes || 30);
      if (t.completed) categoryStats[t.category].completed += 1;
    }
  });

  // Priority distribution from real data
  const priorityStats: Record<TaskPriority, { total: number; completed: number }> = {
    high: { total: 0, completed: 0 },
    medium: { total: 0, completed: 0 },
    low: { total: 0, completed: 0 },
  };

  tasks.forEach((t) => {
    if (priorityStats[t.priority]) {
      priorityStats[t.priority].total += 1;
      if (t.completed) priorityStats[t.priority].completed += 1;
    }
  });

  const categoryMeta: Record<TaskCategory, { label: string; color: string; bg: string }> = {
    work: { label: 'Work & Projects', color: '#3b82f6', bg: 'bg-blue-500' },
    study: { label: 'Study & Learning', color: '#8b5cf6', bg: 'bg-purple-500' },
    personal: { label: 'Personal Growth', color: '#10b981', bg: 'bg-emerald-500' },
    health: { label: 'Health & Wellness', color: '#f59e0b', bg: 'bg-amber-500' },
    chores: { label: 'Home & Chores', color: '#64748b', bg: 'bg-slate-500' },
    finance: { label: 'Finance & Bills', color: '#06b6d4', bg: 'bg-cyan-500' },
  };

  if (totalTasks === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <BarChart3 className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-lg font-bold text-slate-900">
            No Task Data Recorded Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Create or complete tasks to see real-time completion ratios, category allocation, and effort metrics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Visual Progress & Habit Momentum</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Metrics calculated strictly from your real active and completed application tasks.
          </p>
        </div>

        {/* Momentum Badge */}
        <div className="flex items-center space-x-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 px-4 py-2.5 rounded-2xl">
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
            <Flame className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase text-amber-800">
              Active Activity Record
            </div>
            <div className="text-sm font-extrabold text-amber-950">
              {streakDays > 0 ? `${streakDays} Day${streakDays > 1 ? 's' : ''} Active 🔥` : 'Start your streak today!'}
            </div>
          </div>
        </div>
      </div>

      {/* 3 Metric Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Completed Effort
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {(completedMinutes / 60).toFixed(1)} hrs
            </h3>
            <p className="text-xs text-emerald-600 font-semibold mt-0.5">
              {completedTasks} tasks finalized
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Scheduled Ahead
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {(remainingMinutes / 60).toFixed(1)} hrs
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {pendingTasks} tasks pending
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              High Priority Throughput
            </p>
            <h3 className="text-2xl font-black text-purple-700 mt-1">
              {priorityStats.high.completed} of {priorityStats.high.total}
            </h3>
            <p className="text-xs text-purple-600 font-semibold mt-0.5">
              {priorityStats.high.total > 0
                ? `${Math.round((priorityStats.high.completed / priorityStats.high.total) * 100)}% critical focus cleared`
                : 'No high priority items'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Donut Completion Ring */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Task Completion Ratio
              </h3>
              <p className="text-xs text-slate-500">
                Calculated strictly from {totalTasks} tracked tasks
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {completionRate}% Complete
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
            {/* SVG Donut Chart */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="88"
                  cy="88"
                  r="70"
                  stroke="#f1f5f9"
                  strokeWidth="18"
                  fill="transparent"
                />
                <circle
                  cx="88"
                  cy="88"
                  r="70"
                  stroke="url(#gradient-blue-purple)"
                  strokeWidth="18"
                  strokeDasharray={2 * Math.PI * 70}
                  strokeDashoffset={2 * Math.PI * 70 * (1 - completionRate / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  fill="transparent"
                />
                <defs>
                  <linearGradient id="gradient-blue-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute text-center space-y-0.5">
                <div className="text-3xl font-black text-slate-900">
                  {completionRate}%
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Success
                </div>
              </div>
            </div>

            {/* Legend / Breakdown */}
            <div className="space-y-3 w-full sm:w-auto">
              <div className="flex items-center space-x-3 text-xs">
                <span className="w-3.5 h-3.5 rounded-md bg-gradient-to-r from-blue-600 to-purple-600 shrink-0" />
                <span className="text-slate-600 font-medium">Completed:</span>
                <strong className="text-slate-900">{completedTasks} tasks</strong>
              </div>

              <div className="flex items-center space-x-3 text-xs">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-200 shrink-0" />
                <span className="text-slate-600 font-medium">Pending:</span>
                <strong className="text-slate-900">{pendingTasks} tasks</strong>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                Estimated remaining effort: <strong>{(remainingMinutes / 60).toFixed(1)} hours</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Category Distribution Bar Chart */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Time Distribution by Category
            </h3>
            <p className="text-xs text-slate-500">
              Where your effort is allocated across life areas
            </p>
          </div>

          <div className="space-y-3.5 pt-1">
            {(Object.keys(categoryStats) as TaskCategory[]).map((cat) => {
              const stat = categoryStats[cat];
              const meta = categoryMeta[cat];
              const totalMins = completedMinutes + remainingMinutes;
              const percent = totalMins > 0 ? Math.round((stat.minutes / totalMins) * 100) : 0;

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{meta.label}</span>
                    <span className="text-slate-500 font-medium">
                      {stat.minutes}m ({percent}%) • {stat.completed}/{stat.total} done
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full ${meta.bg} transition-all duration-700 ease-out`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
