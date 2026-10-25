import React from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Database,
  ShieldCheck,
  PlayCircle,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';

interface BeginnerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToPlanner: () => void;
  onGoToTasks: () => void;
  onGoToReschedule: () => void;
}

export const BeginnerGuideModal: React.FC<BeginnerGuideModalProps> = ({
  isOpen,
  onClose,
  onGoToPlanner,
  onGoToTasks,
  onGoToReschedule,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                Beginner Guide & Hackathon Demo Flow
              </h2>
              <p className="text-xs text-slate-500">
                Simple English walkthrough on how to use every feature
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-700 text-sm">
          {/* Welcome note */}
          <div className="p-4 bg-blue-50/70 border border-blue-200/60 rounded-2xl space-y-2">
            <h3 className="font-bold text-blue-950 flex items-center space-x-2 text-sm">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span>Theme 2: "Reimagine Everyday Life — Make the Complex Simple"</span>
            </h3>
            <p className="text-xs text-blue-900 leading-relaxed">
              Every day, people struggle with scattered to-do lists, unpredictable disruptions, and cognitive burnout.
              LifeEase AI automates the thinking part: it arranges your tasks into a gentle, focused schedule using Google Gemini AI and protects your sanity when plans change.
            </p>
          </div>

          {/* 3 Step Hackathon Demo Routine */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
              Recommended 2-Minute Demo for Judges
            </h4>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-extrabold flex items-center justify-center">
                      1
                    </span>
                    <span>Show Tasks & AI Micro-Step Breakdown</span>
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      onGoToTasks();
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Go to Tasks →
                  </button>
                </div>
                <p className="text-xs text-slate-600">
                  Open the <strong>Tasks</strong> tab. Notice realistic sample tasks pre-loaded. Click <strong>Create Task</strong>, type any big task (like "Research solar energy"), and click <strong>"Gemini AI Breakdown"</strong> to see it split into 3-5 immediate sub-steps!
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-extrabold flex items-center justify-center">
                      2
                    </span>
                    <span>Generate the Gemini AI Daily Plan</span>
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      onGoToPlanner();
                    }}
                    className="text-xs font-semibold text-purple-600 hover:underline"
                  >
                    Go to Planner →
                  </button>
                </div>
                <p className="text-xs text-slate-600">
                  Head to <strong>AI Planner</strong> and click <strong>"Generate Daily Schedule"</strong>. Watch Gemini 3.8 Flash compute non-overlapping time blocks, insert restorative breaks, identify your peak focus window, and give tailored advice.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-extrabold flex items-center justify-center">
                      3
                    </span>
                    <span>Simulate a Disruption with Smart Reschedule</span>
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      onGoToReschedule();
                    }}
                    className="text-xs font-semibold text-amber-600 hover:underline"
                  >
                    Go to Reschedule →
                  </button>
                </div>
                <p className="text-xs text-slate-600">
                  Click <strong>Smart Reschedule</strong>. Select <em>"🚨 Urgent Task Dropped In"</em> or <em>"⏳ Delayed by 45 Minutes"</em> and click <strong>Execute Smart Reschedule</strong>. Gemini re-balances the remaining hours and kindly defers low-priority chores to tomorrow.
                </p>
              </div>
            </div>
          </div>

          {/* Under the hood FAQ */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">
              Key Technical Details (For Beginners)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  <span>Browser Local Storage</span>
                </div>
                <p className="text-slate-600">
                  Your tasks, daily schedule, and preferences are automatically saved in your browser. Refreshing the page never loses your progress.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Secure Server-Side AI</span>
                </div>
                <p className="text-slate-600">
                  All calls to Gemini AI run on the Express backend server (`server.ts`). Your API keys remain safe and never leak into the browser.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Got it, let's explore!
          </button>
        </div>
      </div>
    </div>
  );
};
