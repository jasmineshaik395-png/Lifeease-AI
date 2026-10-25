import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { DashboardView } from './components/DashboardView';
import { TaskManagerView } from './components/TaskManagerView';
import { AiPlannerView } from './components/AiPlannerView';
import { GeminiView } from './components/GeminiView';
import { SmartRescheduleView } from './components/SmartRescheduleView';
import { AnalyticsView } from './components/AnalyticsView';
import { TaskModal } from './components/TaskModal';
import { BeginnerGuideModal } from './components/BeginnerGuideModal';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { Task, DailyPlan, UserPreferences, TaskCategory } from './types';
import {
  getStoredTasks,
  saveStoredTasks,
  getStoredPlan,
  saveStoredPlan,
  getStoredPreferences,
  saveStoredPreferences,
  resetAllData,
  resetSampleDataOnly,
} from './utils/storage';
import { sendBrowserNotification, getActiveReminders } from './utils/notifications';
import { Sparkles, Heart, Shield, RefreshCw, AlertTriangle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [tasks, setTasks] = useState<Task[]>(() => getStoredTasks());
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(() => getStoredPlan());
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(() =>
    getStoredPreferences()
  );

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [reschedulePreset, setReschedulePreset] = useState<string>('time_lost');

  const handleGoToReschedule = (preset?: string) => {
    if (preset) setReschedulePreset(preset);
    setActiveTab('reschedule');
  };

  // Toast feedback state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Synchronize state changes to localStorage
  useEffect(() => {
    saveStoredTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveStoredPlan(dailyPlan);
  }, [dailyPlan]);

  useEffect(() => {
    saveStoredPreferences(userPreferences);
  }, [userPreferences]);

  // Periodic Reminder Alert (runs every 60 seconds)
  useEffect(() => {
    const checkReminders = () => {
      const active = getActiveReminders(tasks);
      if (active.length > 0 && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const topReminder = active[0];
        sendBrowserNotification(
          `Reminder: ${topReminder.taskTitle}`,
          `Due: ${topReminder.deadline} • Priority: ${topReminder.priority}`
        );
      }
    };

    const initialTimeout = setTimeout(checkReminders, 5000);
    const interval = setInterval(checkReminders, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [tasks]);

  // Task Actions
  const handleSaveTask = (task: Task) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id);
      if (exists) {
        showToast(`Task "${task.title}" updated`, 'success');
        return prev.map((t) => (t.id === task.id ? { ...task, updatedAt: new Date().toISOString() } : t));
      } else {
        showToast(`Task "${task.title}" created`, 'success');
        return [{ ...task, isSample: false, updatedAt: new Date().toISOString() }, ...prev];
      }
    });
    setTaskToEdit(null);
  };

  const handleDuplicateTask = (task: Task) => {
    const duplicated: Task = {
      ...task,
      id: `task-${Date.now()}`,
      title: `${task.title} (Copy)`,
      completed: false,
      completedAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSample: false,
      subtasks: task.subtasks?.map((st, i) => ({
        ...st,
        id: `sub-${Date.now()}-${i}`,
        completed: false,
      })),
    };
    setTasks((prev) => [duplicated, ...prev]);
    showToast(`Duplicated "${task.title}"`, 'info');
  };

  const handleImportTasks = (importedTasks: Task[]) => {
    setTasks((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const newItems = importedTasks.filter((t) => !existingIds.has(t.id));
      return [...newItems, ...prev];
    });
    showToast('Imported tasks successfully', 'success');
  };

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (dailyPlan) {
      const updatedItems = dailyPlan.items.filter((item) => item.taskId !== taskId);
      setDailyPlan({ ...dailyPlan, items: updatedItems });
    }
    showToast(`Deleted task "${taskToDelete?.title || 'item'}"`, 'info');
  };

  const handleToggleTask = (taskId: string) => {
    let nextCompletedState = false;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          nextCompletedState = !t.completed;
          return {
            ...t,
            completed: nextCompletedState,
            completedAt: nextCompletedState ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    setDailyPlan((prevPlan) => {
      if (!prevPlan) return null;
      return {
        ...prevPlan,
        items: prevPlan.items.map((item) =>
          item.taskId === taskId ? { ...item, completed: nextCompletedState } : item
        ),
      };
    });
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId && t.subtasks) {
          const updatedSubtasks = t.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          const allDone = updatedSubtasks.every((st) => st.completed);
          return {
            ...t,
            subtasks: updatedSubtasks,
            completed: allDone ? true : t.completed,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  const handleQuickAddTask = (title: string, category: TaskCategory) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      description: '',
      category,
      priority: 'medium',
      estimatedMinutes: 30,
      preferredTime: 'anytime',
      energyLevel: 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSample: false,
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleClearCompleted = () => {
    const count = tasks.filter((t) => t.completed).length;
    setTasks((prev) => prev.filter((t) => !t.completed));
    showToast(`Cleared ${count} completed tasks`, 'info');
  };

  // Safe reset confirmation handlers
  const handleConfirmResetSampleOnly = () => {
    const updated = resetSampleDataOnly(tasks);
    setTasks(updated);
    setIsResetConfirmOpen(false);
    showToast('Restored sample tasks without touching your custom tasks!', 'success');
  };

  const handleConfirmResetAll = () => {
    const data = resetAllData();
    setTasks(data.tasks);
    setDailyPlan(data.plan);
    setUserPreferences(data.prefs);
    setIsResetConfirmOpen(false);
    showToast('Reset all data to fresh hackathon state', 'info');
  };

  // Schedule Actions
  const handleToggleScheduleItem = (itemId: string) => {
    if (!dailyPlan) return;
    let targetTaskId: string | undefined;
    let nextCompletedState = false;

    setDailyPlan((prevPlan) => {
      if (!prevPlan) return null;
      const updatedItems = prevPlan.items.map((item) => {
        if (item.id === itemId) {
          targetTaskId = item.taskId;
          nextCompletedState = !item.completed;
          return { ...item, completed: nextCompletedState };
        }
        return item;
      });
      return { ...prevPlan, items: updatedItems };
    });

    if (targetTaskId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === targetTaskId
            ? {
                ...t,
                completed: nextCompletedState,
                completedAt: nextCompletedState ? new Date().toISOString() : undefined,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
    }
  };

  const handlePlanGenerated = (plan: DailyPlan) => {
    setDailyPlan(plan);
  };

  const handleApplyUpdatedSchedule = (updatedPlan: DailyPlan) => {
    setDailyPlan(updatedPlan);
  };

  const handleUpdatePreferences = (prefs: UserPreferences) => {
    setUserPreferences(prefs);
  };

  const completedTasksCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTaskModal={() => {
          setTaskToEdit(null);
          setIsTaskModalOpen(true);
        }}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        completedTasksCount={completedTasksCount}
        totalTasksCount={tasks.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'home' && (
          <HomeView
            onGetStarted={() => setActiveTab('dashboard')}
            setActiveTab={setActiveTab}
            tasks={tasks}
            hasGeneratedPlan={Boolean(dailyPlan)}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            tasks={tasks}
            dailyPlan={dailyPlan}
            onToggleTask={handleToggleTask}
            onQuickAddTask={handleQuickAddTask}
            onTaskCreatedFromAi={handleSaveTask}
            setActiveTab={setActiveTab}
            onOpenNewTaskModal={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            showToast={showToast}
            onGoToReschedule={handleGoToReschedule}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskManagerView
            tasks={tasks}
            onAddTask={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
            onEditTask={(task) => {
              setTaskToEdit(task);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onToggleTask={handleToggleTask}
            onToggleSubtask={handleToggleSubtask}
            onDuplicateTask={handleDuplicateTask}
            onImportTasks={handleImportTasks}
            onClearCompleted={handleClearCompleted}
            onResetSampleData={() => setIsResetConfirmOpen(true)}
            onTaskCreatedFromAi={handleSaveTask}
            showToast={showToast}
          />
        )}

        {activeTab === 'planner' && (
          <AiPlannerView
            tasks={tasks}
            dailyPlan={dailyPlan}
            onPlanGenerated={handlePlanGenerated}
            onToggleScheduleItem={handleToggleScheduleItem}
            userPreferences={userPreferences}
            onUpdatePreferences={handleUpdatePreferences}
            setActiveTab={setActiveTab}
            showToast={showToast}
            onGoToReschedule={handleGoToReschedule}
          />
        )}

        {activeTab === 'gemini' && (
          <GeminiView
            tasks={tasks}
            onAddTaskFromGemini={handleSaveTask}
            setActiveTab={setActiveTab}
            showToast={showToast}
          />
        )}

        {activeTab === 'reschedule' && (
          <SmartRescheduleView
            tasks={tasks}
            dailyPlan={dailyPlan}
            onApplyUpdatedSchedule={handleApplyUpdatedSchedule}
            setActiveTab={setActiveTab}
            showToast={showToast}
            initialPreset={reschedulePreset}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView tasks={tasks} dailyPlan={dailyPlan} />
        )}
      </main>

      {/* Task Create/Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onSaveTask={handleSaveTask}
        taskToEdit={taskToEdit}
      />

      {/* Beginner Guide Modal */}
      <BeginnerGuideModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        onGoToPlanner={() => setActiveTab('planner')}
        onGoToTasks={() => setActiveTab('tasks')}
        onGoToReschedule={() => setActiveTab('reschedule')}
      />

      {/* Safe Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">
                Reset Sample Data?
              </h3>
              <p className="text-xs text-slate-500">
                You have {tasks.filter((t) => !t.isSample).length} custom tasks that you created. Choose how you would like to reset:
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                onClick={handleConfirmResetSampleOnly}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Keep my custom tasks & refresh sample items
              </button>
              <button
                onClick={handleConfirmResetAll}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Reset everything to initial state
              </button>
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast feedback notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white/80 backdrop-blur-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-800">LifeEase AI</span>
            <span>–</span>
            <span>Reimagine Everyday Life • Make the Complex Simple</span>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Beginner Guide & Hackathon Pitch
            </button>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Reset Sample Data
            </button>
            <span className="flex items-center space-x-1 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Browser Local Storage</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
