import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, Check, AlertCircle, X, Clock, Calendar, Tag, Zap } from 'lucide-react';
import { Task, TaskCategory, TaskPriority } from '../types';

interface AiAssistantBarProps {
  onTaskCreated: (task: Task) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AiAssistantBar: React.FC<AiAssistantBarProps> = ({ onTaskCreated, showToast }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [interpretedTask, setInterpretedTask] = useState<Partial<Task> & { confidenceSummary?: string } | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const samplePrompts = [
    'Remind me to complete my Python assignment tomorrow at 5 PM',
    'Prepare pitch slides for hackathon tonight, high priority, takes 45 mins',
    'Doctor checkup next Tuesday at 10 AM',
    'Buy groceries and meal prep on Sunday evening',
  ];

  const handleParse = async (textToParse?: string) => {
    const promptText = (textToParse || input).trim();
    if (!promptText) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/parse-natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: promptText,
          currentDate: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to interpret request with Gemini AI.');
      }

      const data = await response.json();

      setInterpretedTask({
        id: `task-${Date.now()}`,
        title: data.title || promptText,
        description: data.description || '',
        category: (data.category as TaskCategory) || 'work',
        priority: (data.priority as TaskPriority) || 'medium',
        estimatedMinutes: Number(data.estimatedMinutes) || 30,
        deadline: data.deadline || undefined,
        preferredTime: data.preferredTime || 'anytime',
        energyLevel: data.energyLevel || 'medium',
        completed: false,
        createdAt: new Date().toISOString(),
        confidenceSummary: data.confidenceSummary,
      });

      setIsConfirmModalOpen(true);
      setInput('');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gemini could not parse your request. Try typing clearly.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSave = () => {
    if (!interpretedTask || !interpretedTask.title) return;

    const fullTask: Task = {
      id: interpretedTask.id || `task-${Date.now()}`,
      title: interpretedTask.title,
      description: interpretedTask.description || '',
      category: interpretedTask.category || 'work',
      priority: interpretedTask.priority || 'medium',
      estimatedMinutes: interpretedTask.estimatedMinutes || 30,
      deadline: interpretedTask.deadline,
      preferredTime: interpretedTask.preferredTime || 'anytime',
      energyLevel: interpretedTask.energyLevel || 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
    };

    onTaskCreated(fullTask);
    setIsConfirmModalOpen(false);
    setInterpretedTask(null);
    showToast(`Task "${fullTask.title}" scheduled!`, 'success');
  };

  return (
    <>
      {/* Natural Language Input Bar */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-5 rounded-2xl border border-blue-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-indigo-950 font-bold text-xs sm:text-sm">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>Gemini AI Natural Language Assistant</span>
          </div>
          <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
            Just type naturally
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleParse();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Remind me to complete my Python assignment tomorrow at 5 PM..."
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400 shadow-2xs"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Interpreting...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Ask Gemini</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Quick prompt suggestions */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 no-scrollbar text-[11px]">
          <span className="text-slate-400 font-medium shrink-0">Try:</span>
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setInput(prompt);
                handleParse(prompt);
              }}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200/80 shrink-0 transition-colors truncate max-w-xs cursor-pointer"
            >
              "{prompt}"
            </button>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && interpretedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Gemini Interpreted Your Request
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review and confirm before adding to your schedule
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Confidence Note */}
            {interpretedTask.confidenceSummary && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>{interpretedTask.confidenceSummary}</span>
              </div>
            )}

            {/* Editable Fields Preview */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={interpretedTask.title || ''}
                  onChange={(e) =>
                    setInterpretedTask({ ...interpretedTask, title: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Category
                  </label>
                  <select
                    value={interpretedTask.category || 'work'}
                    onChange={(e) =>
                      setInterpretedTask({
                        ...interpretedTask,
                        category: e.target.value as TaskCategory,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 capitalize"
                  >
                    <option value="work">💼 Work</option>
                    <option value="study">📚 Study</option>
                    <option value="personal">🌱 Personal</option>
                    <option value="health">🏃 Health</option>
                    <option value="chores">🧹 Chores</option>
                    <option value="finance">💳 Finance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Priority
                  </label>
                  <select
                    value={interpretedTask.priority || 'medium'}
                    onChange={(e) =>
                      setInterpretedTask({
                        ...interpretedTask,
                        priority: e.target.value as TaskPriority,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 capitalize"
                  >
                    <option value="high">🔴 High Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="low">🟢 Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Deadline / Due Time
                  </label>
                  <input
                    type="text"
                    value={interpretedTask.deadline || ''}
                    onChange={(e) =>
                      setInterpretedTask({ ...interpretedTask, deadline: e.target.value })
                    }
                    placeholder="e.g. Tomorrow, 5:00 PM"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={interpretedTask.estimatedMinutes || 30}
                    onChange={(e) =>
                      setInterpretedTask({
                        ...interpretedTask,
                        estimatedMinutes: Number(e.target.value) || 30,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirm & Add Task</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
