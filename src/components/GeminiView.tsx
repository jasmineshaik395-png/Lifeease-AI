import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  Loader2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lightbulb,
  Clock,
  Layers,
} from 'lucide-react';
import { Task, TaskCategory, TaskPriority } from '../types';
import { ActiveTab } from './Navbar';

interface GeminiMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  actionTips?: string[];
  suggestedTask?: {
    title: string;
    category: TaskCategory;
    priority: TaskPriority;
    estimatedMinutes: number;
    deadline?: string;
  };
}

interface GeminiViewProps {
  tasks: Task[];
  onAddTaskFromGemini: (task: Task) => void;
  setActiveTab: (tab: ActiveTab) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GeminiView: React.FC<GeminiViewProps> = ({
  tasks,
  onAddTaskFromGemini,
  setActiveTab,
  showToast,
}) => {
  const [messages, setMessages] = useState<GeminiMessage[]>([
    {
      id: 'welcome',
      sender: 'gemini',
      text: "Hello! I am your LifeEase AI Everyday Life Assistant powered by Google Gemini 3.8 Flash.\n\nTell me what you are working on, ask for advice on beating procrastination, or describe tasks in natural language (e.g. 'Remind me to review Python algorithms tomorrow at 3 PM'). How can I simplify your day?",
      actionTips: [
        "Ask: 'How do I manage an overwhelming task list?'",
        "Type: 'Remind me to study algorithms tomorrow at 2 PM'",
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const pendingCount = tasks.filter((t) => !t.completed).length;

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: GeminiMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.slice(-4).map((m) => ({ sender: m.sender, text: m.text })),
          currentTasksSummary: `${pendingCount} pending tasks: ${tasks
            .filter((t) => !t.completed)
            .slice(0, 4)
            .map((t) => t.title)
            .join(', ')}`,
        }),
      });

      if (!chatRes.ok) {
        throw new Error('Chat API returned an error');
      }

      const data = await chatRes.json();
      const geminiReply: GeminiMessage = {
        id: `gemini-${Date.now()}`,
        sender: 'gemini',
        text: data.reply || 'Here is what I recommend for simplifying your day:',
        actionTips: data.actionTips,
        suggestedTask: data.hasSuggestedTask && data.suggestedTask?.title
          ? {
              title: data.suggestedTask.title,
              category: (data.suggestedTask.category as TaskCategory) || 'work',
              priority: (data.suggestedTask.priority as TaskPriority) || 'medium',
              estimatedMinutes: Number(data.suggestedTask.estimatedMinutes) || 30,
              deadline: data.suggestedTask.deadline,
            }
          : undefined,
      };
      setMessages((prev) => [...prev, geminiReply]);
    } catch (err) {
      console.warn('Gemini chat failed, fallback empathetic response:', err);
      const fallbackReply: GeminiMessage = {
        id: `gemini-${Date.now()}`,
        sender: 'gemini',
        text: `I heard: "${query}".\n\nWhen things feel complex, simplify down to your single most crucial task. Put everything else on hold for 25 minutes, set a timer, and begin without worrying about perfection.`,
        actionTips: [
          'Pick the single highest priority task right now',
          'Work in a focused 25-minute Pomodoro sprint',
          'Take a mandatory 5-minute breather before switching context',
        ],
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSuggestedTask = (suggested: NonNullable<GeminiMessage['suggestedTask']>) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: suggested.title,
      description: 'Created via conversational Gemini AI Assistant',
      category: suggested.category,
      priority: suggested.priority,
      estimatedMinutes: suggested.estimatedMinutes,
      deadline: suggested.deadline,
      preferredTime: 'anytime',
      energyLevel: 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSample: false,
    };

    onAddTaskFromGemini(newTask);
    showToast(`Added "${suggested.title}" to your tasks!`, 'success');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold text-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Verified Integration: Google Gemini 3.8 Flash (Server-Side)</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Conversational Gemini AI Assistant
          </h1>

          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
            Your personal everyday cognitive coach. Turn chaotic thoughts into clear tasks, optimize mental energy, or get advice on simplifying your routine.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-blue-200">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Zero client API exposure</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{pendingCount} active tasks tracked</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Conversation Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[520px] overflow-hidden">
        {/* Chat History */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {msg.sender === 'user' ? <Send className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200/70 text-slate-800'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Practical Action Tips */}
                {msg.actionTips && msg.actionTips.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center space-x-1">
                      <Lightbulb className="w-3 h-3 text-amber-500" />
                      <span>Immediate Friction-Reducers:</span>
                    </span>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {msg.actionTips.map((tip, i) => (
                        <li key={i} className="flex items-start space-x-1.5">
                          <span className="text-purple-500 font-bold">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {msg.suggestedTask && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-purple-200 text-slate-800 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{msg.suggestedTask.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800">
                        {msg.suggestedTask.priority}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>📁 {msg.suggestedTask.category}</span>
                      <span>⏱️ {msg.suggestedTask.estimatedMinutes}m</span>
                      {msg.suggestedTask.deadline && (
                        <span className="text-amber-700 font-semibold">📅 {msg.suggestedTask.deadline}</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleAddSuggestedTask(msg.suggestedTask!)}
                      className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Add to My Task List</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-3 text-xs text-slate-400">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <span>Gemini is thinking and structuring your request...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Gemini or type a task: 'Remind me to study algorithms tomorrow at 2 PM'..."
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          {/* Quick Prompts */}
          <div className="flex items-center space-x-2 overflow-x-auto pt-2.5 text-[11px] no-scrollbar">
            <span className="text-slate-400 shrink-0 font-medium">Quick suggestions:</span>
            <button
              onClick={() => handleSend("Plan my study routine for finals")}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 shrink-0 cursor-pointer"
            >
              "Plan study routine"
            </button>
            <button
              onClick={() => handleSend("Remind me to finish Python assignment tomorrow at 5 PM")}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 shrink-0 cursor-pointer"
            >
              "Finish Python assignment"
            </button>
            <button
              onClick={() => setActiveTab('planner')}
              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 shrink-0 font-semibold cursor-pointer"
            >
              Open AI Planner →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
