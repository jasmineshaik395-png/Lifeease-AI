# LifeEase AI – Your Everyday Life Simplifier

> **Hackathon Theme:** *Theme 2: Reimagine Everyday Life — Make the Complex Simple*  
> **Live Website:** [https://lifeeaseai-app.vercel.app](https://lifeeaseai-app.vercel.app)  
> **GitHub Repository:** [https://github.com/jasmineshaik395-png/Lifeease-AI](https://github.com/jasmineshaik395-png/Lifeease-AI)

LifeEase AI is a full-stack, intelligent everyday planning assistant powered by **Google Gemini AI**. It transforms scattered to-do lists, chaotic schedules, and sudden disruptions into calm, structured, high-focus days.

---

## 🌟 Key Features

1. **Intuitive Task Lifecycle & Management**
   - Add, edit, duplicate, filter, search, and delete daily tasks.
   - Categorize by Work, Study, Personal, Health, Chores, or Finance.
   - Set priorities (High, Medium, Low), estimated durations, deadlines, and focus energy levels.
   - Subtasks checklist with real-time completion tracking and celebratory confetti animations.
   - Distinguishes between sample demonstration data and your custom tasks.

2. **Conversational Gemini AI Assistant (Natural Language Parsing)**
   - Type or speak naturally: *"Remind me to complete my Python assignment tomorrow at 5 PM with high priority"*.
   - Gemini automatically extracts title, category, priority, duration, deadline, and provides a clear confirmation dialog before saving.

3. **Gemini AI Daily Planner & Deterministic Fallback**
   - Configurable workday window (e.g. 9:00 AM – 6:00 PM), anti-burnout break durations (10, 15, or 20 mins), and focus styles (Balanced Flow, Deep Work Sprint, Light & Steady).
   - Generates non-overlapping chronological focus blocks with cognitive energy curve matching.
   - Includes **Focus Feasibility Score**, **Peak Energy Window**, **AI Executive Synthesis**, and conflict warnings.
   - Includes an algorithmic deterministic fallback so the schedule generator works even if the API is offline.

4. **Smart Rescheduling (Disruption Shield — Signature Feature)**
   - When sudden emergencies occur (urgent requests, 45-minute delays/traffic, unscheduled meetings, or afternoon fatigue), click **Smart Reschedule**.
   - Side-by-side **Before vs After comparison** showing original vs revised timelines.
   - Gemini recalculates remaining hours, slots in the urgent task, preserves sanity breaks, and comfortably defers non-critical chores to tomorrow.
   - 1-click apply or reject to stay in total control.

5. **AI Micro-Step Breakdown**
   - 1-click button inside any task splits daunting projects into 3–5 bite-sized, 10–15 minute micro-actions with anti-procrastination tips.

6. **Browser Notifications & Active Reminders**
   - Real browser notification engine (`Notification.requestPermission`) that alerts users to upcoming deadlines.
   - Active reminders card highlighting urgent tasks due today.

7. **Visual Progress & Analytics**
   - Interactive SVG Donut completion ratio chart.
   - Category effort distribution bars (Work, Study, Personal, Health, Chores, Finance).
   - Priority throughput meters (High, Medium, Low).
   - Active consistency streak calculated from real task completions.

8. **Browser Local Storage & Privacy**
   - No login or personal data collection required. Data persists across refreshes in browser `localStorage`.
   - Safe migration, corruption recovery, and JSON backup export/import.
   - **Zero Client-Side API Exposure:** Server-side Gemini API calls via Express (`server.ts`) protecting secret keys.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti
- **Backend:** Node.js, Express, TypeScript (TSX)
- **Serverless Adapter:** Vercel Serverless Function (`/api/index.ts`, `vercel.json`)
- **AI Engine:** Google Gemini AI (`@google/genai` SDK using `gemini-3.8-flash` with resilient fallback to `gemini-3.1-flash-lite`)
- **Build Tool:** Vite 8

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/jasmineshaik395-png/Lifeease-AI.git
cd Lifeease-AI
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.env` based on `.env.example`:

```bash
cp .env.example .env
```

Add your Gemini API key:

```env
GEMINI_API_KEY="your-gemini-api-key-here"
PORT=3000
```

### 4. Run Development Server

```bash
npm run dev
```

Open your browser at `http://localhost:3000`.

### 5. Build for Production / Vercel

```bash
npm run build
```

---

## ☁️ Vercel Deployment

This repository includes `vercel.json` and `/api/index.ts`:

1. Import the repository `https://github.com/jasmineshaik395-png/Lifeease-AI` into [Vercel](https://vercel.com).
2. Under **Settings > Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Google Gemini API key.
3. Deploy! Vercel automatically builds the Vite frontend and deploys the Express serverless API.

---

## 📄 License

Apache-2.0
