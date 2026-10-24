import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { DashboardView } from './components/DashboardView';
import { TaskManagerView } from './components/TaskManagerView';
import { AiPlannerView } from './components/AiPlannerView';
import { SmartRescheduleView } from './components/SmartRescheduleView';
import { AnalyticsView } from './components/AnalyticsView';
import { TaskModal } from './components/TaskModal';
import { BeginnerGuideModal } from './components/BeginnerGuideModal';
import { Task, DailyPlan, UserPreferences, TaskCategory } from './types';
import {
  getStoredTasks,
  saveStoredTasks,
  getStoredPlan,
  saveStoredPlan,
  getStoredPreferences,
  saveStoredPreferences,
  resetAllData,
} from './utils/storage';
import { Sparkles, Heart, Shield, RefreshCw } from 'lucide-react';

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

  // Task Actions
  const handleSaveTask = (task: Task) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === task.id);
      if (exists) {
        return prev.map((t) => (t.id === task.id ? task : t));
      } else {
        return [task, ...prev];
      }
    });
    setTaskToEdit(null);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    // Also remove reference from daily plan if present
    if (dailyPlan) {
      const updatedItems = dailyPlan.items.filter((item) => item.taskId !== taskId);
      setDailyPlan({ ...dailyPlan, items: updatedItems });
    }
  };

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextCompleted = !t.completed;
          return {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        }
        return t;
      })
    );

    // Also toggle in daily plan if present
    if (dailyPlan) {
      setDailyPlan((prevPlan) => {
        if (!prevPlan) return null;
        return {
          ...prevPlan,
          items: prevPlan.items.map((item) =>
            item.taskId === taskId ? { ...item, completed: !item.completed } : item
          ),
        };
      });
    }
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId && t.subtasks) {
          const updatedSubtasks = t.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          // If all subtasks completed, auto-mark task as completed
          const allDone = updatedSubtasks.every((st) => st.completed);
          return {
            ...t,
            subtasks: updatedSubtasks,
            completed: allDone ? true : t.completed,
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
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
  };

  const handleResetSampleData = () => {
    const data = resetAllData();
    setTasks(data.tasks);
    setDailyPlan(data.plan);
    setUserPreferences(data.prefs);
  };

  // Schedule Actions
  const handleToggleScheduleItem = (itemId: string) => {
    if (!dailyPlan) return;
    let targetTaskId: string | undefined;

    setDailyPlan((prevPlan) => {
      if (!prevPlan) return null;
      const updatedItems = prevPlan.items.map((item) => {
        if (item.id === itemId) {
          targetTaskId = item.taskId;
          return { ...item, completed: !item.completed };
        }
        return item;
      });
      return { ...prevPlan, items: updatedItems };
    });

    // If item had a linked task, toggle that task too!
    if (targetTaskId) {
      handleToggleTask(targetTaskId);
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
            setActiveTab={setActiveTab}
            onOpenNewTaskModal={() => {
              setTaskToEdit(null);
              setIsTaskModalOpen(true);
            }}
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
            onClearCompleted={handleClearCompleted}
            onResetSampleData={handleResetSampleData}
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
          />
        )}

        {activeTab === 'reschedule' && (
          <SmartRescheduleView
            tasks={tasks}
            dailyPlan={dailyPlan}
            onApplyUpdatedSchedule={handleApplyUpdatedSchedule}
            setActiveTab={setActiveTab}
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
              onClick={handleResetSampleData}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Reset Sample Data
            </button>
            <span className="flex items-center space-x-1 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Local Storage Saved</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
