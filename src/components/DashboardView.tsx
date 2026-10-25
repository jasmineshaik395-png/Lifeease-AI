import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  Flame,
  Plus,
  RefreshCw,
  Bell,
  BellOff,
  BellRing,
  AlertTriangle,
} from 'lucide-react';
import { Task, DailyPlan, TaskCategory } from '../types';
import { ActiveTab } from './Navbar';
import { AiAssistantBar } from './AiAssistantBar';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getActiveReminders,
  sendBrowserNotification,
} from '../utils/notifications';
import confetti from 'canvas-confetti';

interface DashboardViewProps {
  tasks: Task[];
  dailyPlan: DailyPlan | null;
  onToggleTask: (taskId: string) => void;
  onQuickAddTask: (title: string, category: TaskCategory) => void;
  onTaskCreatedFromAi: (task: Task) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewTaskModal: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onGoToReschedule?: (preset?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  dailyPlan,
  onToggleTask,
  onQuickAddTask,
  onTaskCreatedFromAi,
  setActiveTab,
  onOpenNewTaskModal,
  showToast,
  onGoToReschedule,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState<TaskCategory>('work');
  const [notifPerm, setNotifPerm] = useState(getNotificationPermission());

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalEstimatedMinutes = tasks.reduce((acc, t) => acc + (t.completed ? 0 : t.estimatedMinutes), 0);
  const totalEstimatedHours = (totalEstimatedMinutes / 60).toFixed(1);

  const highPriorityPending = tasks.filter((t) => !t.completed && t.priority === 'high').length;
  const activeReminders = getActiveReminders(tasks);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAddTask(quickTitle.trim(), quickCategory);
    setQuickTitle('');
    showToast(`Task added: "${quickTitle.trim()}"`, 'success');
  };

  const handleTaskCheck = (taskId: string, isCurrentlyCompleted: boolean) => {
    onToggleTask(taskId);
    if (!isCurrentlyCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
      showToast('Task completed! Keep up the momentum! 🎉', 'success');
    }
  };

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      sendBrowserNotification('LifeEase AI Reminders Active', 'We will alert you for upcoming tasks and deadlines.');
      showToast('Browser notifications enabled! You will receive timely alerts.', 'success');
    } else if (perm === 'denied') {
      showToast('Notifications blocked in browser settings. Please allow notifications for this site.', 'error');
    }
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-8 pb-14">
      {/* Top Welcome Bar */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-blue-200 text-xs sm:text-sm font-medium">
              <Calendar className="w-4 h-4" />
              <span>{todayFormatted}</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Flame className="w-4 h-4 text-amber-300" />
                <span>Productivity Flow: Active</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome to Your Simplified Day!
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm max-w-xl">
              Focus on what matters most. Let Gemini balance your cognitive workload and protect your everyday peace of mind.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('planner')}
              className="px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-bold text-xs sm:text-sm shadow-md hover:bg-blue-50 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>{dailyPlan ? 'View AI Schedule' : 'Generate Daily Plan'}</span>
            </button>
            <button
              onClick={() => (onGoToReschedule ? onGoToReschedule('time_lost') : setActiveTab('reschedule'))}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-medium text-xs sm:text-sm border border-white/25 transition-all flex items-center space-x-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reschedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Assistant Natural Language Bar */}
      <AiAssistantBar onTaskCreated={onTaskCreatedFromAi} showToast={showToast} />

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Completion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Completion Rate
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {progressPercent}%
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {completedTasks} of {totalTasks} tasks done
            </p>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                className="text-slate-100"
                fill="transparent"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray={2 * Math.PI * 22}
                strokeDashoffset={2 * Math.PI * 22 * (1 - progressPercent / 100)}
                strokeLinecap="round"
                className="text-blue-600 transition-all duration-700 ease-out"
                fill="transparent"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-slate-700">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Metric 2: Estimated Workload */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Remaining Effort
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {totalEstimatedHours}h
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {totalEstimatedMinutes} mins across {pendingTasks} tasks
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Urgent / High Priority */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              High Priority
            </p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">
              {highPriorityPending}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {highPriorityPending === 0 ? 'All critical items clear!' : 'Needs focus today'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: AI Schedule Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              AI Schedule
            </p>
            <h3 className="text-xl font-bold text-indigo-900 mt-1">
              {dailyPlan ? `${dailyPlan.focusScore}/100 Score` : 'Not Created'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {dailyPlan ? `${dailyPlan.items.length} time blocks set` : 'Gemini planner ready'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Checklist & Reminders/Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Task Checklist & Quick Add */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Add Bar */}
          <form
            onSubmit={handleQuickAdd}
            className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-2.5"
          >
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Quick manual task add (e.g. Call dentist)..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value as TaskCategory)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
              >
                <option value="work">Work</option>
                <option value="study">Study</option>
                <option value="personal">Personal</option>
                <option value="health">Health</option>
                <option value="chores">Chores</option>
                <option value="finance">Finance</option>
              </select>

              <button
                type="submit"
                disabled={!quickTitle.trim()}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Today's Tasks Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-base sm:text-lg">Daily Task Checklist</h2>
                <p className="text-xs text-slate-500">
                  {completedTasks} completed • {pendingTasks} pending
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenNewTaskModal}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100/70 transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Detailed Task</span>
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  View All ({tasks.length}) →
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">No tasks found!</p>
                  <button
                    onClick={onOpenNewTaskModal}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Add your first task
                  </button>
                </div>
              ) : (
                tasks.slice(0, 6).map((task) => {
                  return (
                    <div
                      key={task.id}
                      className={`p-4 transition-colors flex items-start space-x-3 group ${
                        task.completed ? 'bg-slate-50/60' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <button
                        onClick={() => handleTaskCheck(task.id, task.completed)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                          task.completed
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'border-slate-300 hover:border-blue-500 bg-white'
                        }`}
                        aria-label="Toggle task completion"
                      >
                        {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-sm font-semibold truncate ${
                              task.completed ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {task.title}
                          </span>

                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              task.priority === 'high'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                : task.priority === 'medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                          <span className="capitalize text-slate-600 font-medium">
                            📁 {task.category}
                          </span>
                          <span>⏱️ {task.estimatedMinutes}m</span>
                          {task.deadline && (
                            <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded">
                              📅 {task.deadline}
                            </span>
                          )}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <span className="text-indigo-600 font-medium">
                              ✅ {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {tasks.length > 6 && (
              <div className="p-3 text-center bg-slate-50/50 border-t border-slate-100">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Showing 6 of {tasks.length} tasks. Click to manage all →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Reminders & AI Schedule Snapshot */}
        <div className="space-y-6">
          {/* Upcoming Deadlines & Reminders Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Upcoming Reminders</span>
              </div>
              {notifPerm === 'granted' ? (
                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <BellRing className="w-3 h-3" />
                  <span>Alerts On</span>
                </span>
              ) : (
                <button
                  onClick={handleEnableNotifications}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Enable alerts
                </button>
              )}
            </div>

            {activeReminders.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                No urgent deadlines or reminders right now. You are all caught up!
              </p>
            ) : (
              <div className="space-y-2">
                {activeReminders.map((rem) => (
                  <div
                    key={rem.taskId}
                    className="p-2.5 rounded-xl border border-amber-200/70 bg-amber-50/40 text-xs flex items-start justify-between"
                  >
                    <div className="truncate mr-2">
                      <div className="font-semibold text-slate-900 truncate">
                        {rem.taskTitle}
                      </div>
                      <div className="text-[11px] text-amber-800 font-medium mt-0.5 flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{rem.deadline}</span>
                      </div>
                    </div>
                    {rem.isUrgent && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 shrink-0">
                        Urgent
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-slate-400">
              * Browser notifications deliver alerts while your browser window is active.
            </p>
          </div>

          {/* AI Schedule Preview Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Gemini Daily Plan</h3>
              </div>
              {dailyPlan && (
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                  {dailyPlan.focusScore}/100 Score
                </span>
              )}
            </div>

            {dailyPlan ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 italic bg-purple-50/50 p-3 rounded-xl border border-purple-100 leading-relaxed">
                  "{dailyPlan.summary}"
                </p>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {dailyPlan.items.slice(0, 4).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        item.type === 'break'
                          ? 'bg-emerald-50/60 border-emerald-200/70 text-emerald-900'
                          : 'bg-slate-50 border-slate-200/80 text-slate-800'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="font-semibold truncate">{item.title}</div>
                        <div className="text-[10px] text-slate-500">
                          {item.startTime} – {item.endTime}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 shrink-0">
                        {item.type}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setActiveTab('planner')}
                  className="w-full py-2.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>Open Full Timeline ({dailyPlan.items.length} items)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3 bg-gradient-to-b from-purple-50/50 to-blue-50/30 rounded-xl p-4 border border-dashed border-purple-200">
                <Sparkles className="w-8 h-8 text-purple-500 mx-auto animate-bounce" />
                <h4 className="font-bold text-slate-800 text-sm">No schedule generated yet</h4>
                <p className="text-xs text-slate-600">
                  Let Gemini analyze your {tasks.length} tasks and organize your hours seamlessly.
                </p>
                <button
                  onClick={() => setActiveTab('planner')}
                  className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  Generate Daily Schedule Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
