import React from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldCheck,
  Zap,
  TrendingUp,
  RefreshCw,
  Layers,
  HeartHandshake,
  PlayCircle,
} from 'lucide-react';
import { ActiveTab } from './Navbar';
import { Task } from '../types';

interface HomeViewProps {
  onGetStarted: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  tasks: Task[];
  hasGeneratedPlan: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onGetStarted,
  setActiveTab,
  tasks,
  hasGeneratedPlan,
}) => {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-20">
        {/* Background decorative gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-br from-blue-100/60 via-purple-100/40 to-transparent -z-10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute -top-12 right-10 w-72 h-72 bg-purple-200/40 -z-10 blur-2xl rounded-full" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/40 -z-10 blur-2xl rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Hackathon Theme Pill */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-blue-50/90 border border-blue-200/80 shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
            <span className="text-xs sm:text-sm font-semibold text-blue-900">
              Theme 2: Reimagine Everyday Life — Make the Complex Simple
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Everyday Life is Complex.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              We Make It Effortless.
            </span>
          </h1>

          {/* Subheading */}
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
            LifeEase AI combines intelligent task management with the power of{' '}
            <strong className="text-slate-900 font-semibold">Google Gemini AI</strong> to automatically
            craft your ideal daily schedule, absorb sudden surprises, and keep you energized without burnout.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center space-x-2 group cursor-pointer"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setActiveTab('planner')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm sm:text-base border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Try Gemini AI Planner</span>
            </button>

            <button
              onClick={() => setActiveTab('gemini')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold text-sm sm:text-base border border-purple-200 shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>💬 Chat with Gemini</span>
            </button>
          </div>

          {/* Mini Proof Points */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-500 font-medium">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Real Google Gemini AI (3.8 Flash)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Browser Local Storage (No sign-up)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Dynamic Smart Rescheduling</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive App Teaser / Preview Card */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden">
          {/* Top Mock Window Bar */}
          <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs font-semibold text-slate-500 hidden sm:inline">
                LifeEase AI Intelligent Workspace • Live Preview
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ready for Action</span>
            </div>
          </div>

          {/* Interactive Preview Content */}
          <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-gradient-to-b from-white to-slate-50/50">
            {/* Column 1: Active To-Do Snapshot */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Your Unorganized Tasks</span>
                </h3>
                <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                  {tasks.length} items
                </span>
              </div>
              <div className="space-y-2">
                {tasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs flex items-center justify-between"
                  >
                    <div className="truncate mr-2 font-medium text-slate-800">
                      {task.title}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        task.priority === 'high'
                          ? 'bg-rose-100 text-rose-700'
                          : task.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setActiveTab('tasks')}
                className="w-full py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Open Task Manager →
              </button>
            </div>

            {/* Column 2: What Gemini AI Does */}
            <div className="bg-gradient-to-br from-blue-50/80 to-purple-50/80 p-5 rounded-xl border border-blue-200/60 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-indigo-950 text-sm flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Gemini AI Engine</span>
                </h3>
                <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                  Cognitive AI
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gemini evaluates deadlines, mental energy curves, task dependencies, and breaks to convert chaotic lists into a synchronized, non-overlapping timeline.
              </p>
              <div className="p-3 bg-white rounded-lg border border-purple-200/70 text-xs space-y-1.5 shadow-2xs">
                <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide">
                  AI Optimization Sample
                </div>
                <div className="text-slate-800 font-medium">
                  "09:00 AM: Hackathon Pitch Deck (Peak Focus)"
                </div>
                <div className="text-slate-500 text-[11px]">
                  "10:15 AM: 15-min Coffee & Eye Rest Break"
                </div>
              </div>
              <button
                onClick={() => setActiveTab('planner')}
                className="w-full py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-1"
              >
                <span>Generate Today's Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Column 3: The Smart Reschedule Superpower */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                  <span>When Life Happens</span>
                </h3>
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                  Disruption Shield
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sudden 45-minute delay or emergency work request? Click one button. LifeEase recalculates your remaining hours and reschedules effortlessly.
              </p>
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/60 text-xs text-amber-900">
                <strong className="block font-semibold">No Guilt, No Stress:</strong>
                Lower priority chores automatically shift to tomorrow without cluttering your mind.
              </div>
              <button
                onClick={() => setActiveTab('reschedule')}
                className="w-full py-2 text-xs font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
              >
                Explore Smart Rescheduling →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Pillars of Simplification */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            How LifeEase Simplifies Everyday Chaos
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Engineered specifically to transform daily friction into clarity and peace of mind.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all space-y-3 group">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Cognitive Time Blocking
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Gemini matches high-cognition work with your morning peak energy, scheduling admin & chores during natural afternoon dips.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-200 transition-all space-y-3 group">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Instant Smart Reschedule
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              When unexpected tasks or delays occur, Gemini instantly calculates what can fit today and defer what shouldn't.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all space-y-3 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              AI Micro-Step Breakdown
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Staring at a big intimidating task? 1-click breaks it down into 3-5 simple 15-minute actionable steps with zero friction.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all space-y-3 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              Progress & Visual Analytics
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Interactive completion rate rings, category time breakdowns, and habit streaks keep you motivated and confident every day.
            </p>
          </div>
        </div>
      </section>

      {/* Hackathon Alignment Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Why This Project Matters</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Reimagining Everyday Life Through Empathetic AI
            </h2>

            <p className="text-blue-100 text-base sm:text-lg leading-relaxed">
              Traditional calendar apps and to-do lists are static. When life throws a curveball, they break—leaving users anxious and behind.
              <strong className="text-white block mt-2">
                LifeEase AI turns AI from an intimidating tool into a compassionate personal co-pilot
              </strong>
              that continuously simplifies your day so you can focus on living.
            </p>

            <div className="pt-2 flex flex-wrap gap-4">
              <button
                onClick={onGetStarted}
                className="px-6 py-3.5 rounded-xl bg-white text-blue-900 font-bold hover:bg-blue-50 shadow-md transition-all cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => setActiveTab('reschedule')}
                className="px-6 py-3.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-semibold border border-white/20 transition-all cursor-pointer"
              >
                Test Smart Rescheduling
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
