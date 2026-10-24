import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
  Download,
  RotateCcw,
  CheckSquare,
  Square,
  Check,
} from 'lucide-react';
import { Task, TaskCategory, TaskPriority } from '../types';
import confetti from 'canvas-confetti';

interface TaskManagerViewProps {
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onClearCompleted: () => void;
  onResetSampleData: () => void;
}

export const TaskManagerView: React.FC<TaskManagerViewProps> = ({
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTask,
  onToggleSubtask,
  onClearCompleted,
  onResetSampleData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'duration' | 'title'>('created');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const categories: Array<{ id: string; label: string; icon: string }> = [
    { id: 'all', label: 'All', icon: '📁' },
    { id: 'work', label: 'Work', icon: '💼' },
    { id: 'study', label: 'Study', icon: '📚' },
    { id: 'personal', label: 'Personal', icon: '🌱' },
    { id: 'health', label: 'Health', icon: '🏃' },
    { id: 'chores', label: 'Chores', icon: '🧹' },
    { id: 'finance', label: 'Finance', icon: '💳' },
  ];

  // Filtering and Sorting
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchDesc = t.description?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc) return false;
        }
        // Category
        if (selectedCategory !== 'all' && t.category !== selectedCategory) {
          return false;
        }
        // Priority
        if (selectedPriority !== 'all' && t.priority !== selectedPriority) {
          return false;
        }
        // Status
        if (selectedStatus === 'pending' && t.completed) return false;
        if (selectedStatus === 'completed' && !t.completed) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          const weight: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };
          return weight[b.priority] - weight[a.priority];
        }
        if (sortBy === 'duration') {
          return b.estimatedMinutes - a.estimatedMinutes;
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        // default: created
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tasks, searchQuery, selectedCategory, selectedPriority, selectedStatus, sortBy]);

  const handleToggle = (taskId: string, isCurrentlyCompleted: boolean) => {
    onToggleTask(taskId);
    if (!isCurrentlyCompleted) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `lifeease_tasks_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6 pb-14">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Task Manager</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {tasks.length} total
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Add, organize, and break down daily obligations. Data auto-saves to browser local storage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Export tasks as JSON file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={onResetSampleData}
            className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Reset to hackathon sample tasks"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sample Tasks</span>
          </button>

          {completedCount > 0 && (
            <button
              onClick={onClearCompleted}
              className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Done ({completedCount})</span>
            </button>
          )}

          <button
            onClick={onAddTask}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-sm shadow-blue-500/25 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Top row: search & dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks by name or notes..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Status filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses ({tasks.length})</option>
              <option value="pending">Pending ({tasks.filter((t) => !t.completed).length})</option>
              <option value="completed">Completed ({completedCount})</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Sort dropdown */}
          <div className="sm:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created">Sort: Newest</option>
              <option value="priority">Sort: Priority</option>
              <option value="duration">Sort: Duration</option>
              <option value="title">Sort: Title A-Z</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count =
              cat.id === 'all'
                ? tasks.length
                : tasks.filter((t) => t.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] ml-1 px-1 rounded-full ${
                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">No tasks match your filters</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria or create a new task to get started!
            </p>
            <button
              onClick={onAddTask}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
            >
              Add a new task
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.completed;
            const subtaskCompleted = task.subtasks?.filter((s) => s.completed).length || 0;
            const totalSubtasks = task.subtasks?.length || 0;

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-xs group ${
                  isCompleted
                    ? 'border-slate-200 bg-slate-50/50'
                    : 'border-slate-200/80 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Checkbox & Info */}
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggle(task.id, isCompleted)}
                      className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'border-slate-300 hover:border-blue-500 bg-white'
                      }`}
                      aria-label="Toggle task completion"
                    >
                      {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-base font-bold tracking-tight ${
                            isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </h3>

                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            task.priority === 'high'
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : task.priority === 'medium'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {task.priority} Priority
                        </span>

                        {/* Category Badge */}
                        <span className="text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {task.category}
                        </span>

                        {/* Energy Level */}
                        <span className="text-[10px] font-medium text-slate-500">
                          ⚡ {task.energyLevel} energy
                        </span>
                      </div>

                      {task.description && (
                        <p
                          className={`text-xs sm:text-sm leading-relaxed ${
                            isCompleted ? 'text-slate-400' : 'text-slate-600'
                          }`}
                        >
                          {task.description}
                        </p>
                      )}

                      {/* Meta Tags: duration, deadline, preferred time */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 font-medium">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{task.estimatedMinutes} mins</span>
                        </div>

                        {task.deadline && (
                          <div className="flex items-center space-x-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Due: {task.deadline}</span>
                          </div>
                        )}

                        {task.preferredTime !== 'anytime' && (
                          <span className="text-indigo-600">
                            Prefers: {task.preferredTime}
                          </span>
                        )}

                        {totalSubtasks > 0 && (
                          <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                            {subtaskCompleted}/{totalSubtasks} subtasks done
                          </span>
                        )}
                      </div>

                      {/* Subtasks checklist preview */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="pt-2.5 mt-2 border-t border-slate-100 space-y-1.5">
                          {task.subtasks.map((st) => (
                            <div
                              key={st.id}
                              onClick={() => onToggleSubtask(task.id, st.id)}
                              className="flex items-center space-x-2 text-xs cursor-pointer group/sub"
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                                  st.completed
                                    ? 'bg-purple-600 border-purple-600 text-white'
                                    : 'border-slate-300 group-hover/sub:border-purple-500 bg-white'
                                }`}
                              >
                                {st.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                              <span
                                className={`truncate ${
                                  st.completed ? 'line-through text-slate-400' : 'text-slate-700'
                                }`}
                              >
                                {st.title}
                              </span>
                              {st.minutes && (
                                <span className="text-[10px] text-slate-400">({st.minutes}m)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Edit & Delete */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => onEditTask(task)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                      title="Edit task"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTaskToDelete(task.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-xl animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Delete this task?</h3>
              <p className="text-xs text-slate-500">
                This action cannot be undone. It will remove this task from your list and local storage.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setTaskToDelete(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteTask(taskToDelete);
                  setTaskToDelete(null);
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
