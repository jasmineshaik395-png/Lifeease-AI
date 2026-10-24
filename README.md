# LifeEase AI – Your Everyday Life Simplifier

> **Hackathon Theme:** *Reimagine Everyday Life – Make the Complex Simple*

LifeEase AI is a full-stack, intelligent daily life planning application powered by **Google Gemini AI**. It transforms scattered to-do lists, chaotic schedules, and sudden everyday disruptions into calm, structured, high-focus days.

---

## 🌟 Key Features

1. **Effortless Task Management (CRUD)**
   - Add, edit, organize, filter, and complete daily tasks.
   - Categorize by Work, Study, Personal, Health, Chores, or Finance.
   - Assign priorities (High, Medium, Low), estimated durations, deadlines, and focus energy levels.
   - Subtasks checklist with real-time completion tracking and celebratory confetti animations.

2. **Gemini AI Micro-Step Breakdown**
   - Click the **"Gemini AI Breakdown"** button inside any task.
   - The AI automatically splits daunting or complex projects into 3–5 bite-sized, 10–15 minute immediate micro-actions with psychological tips to overcome procrastination.

3. **Gemini AI Daily Planner**
   - Configure custom available hours (e.g., 9:00 AM – 6:00 PM), anti-burnout break durations (10, 15, or 20 mins), and focus styles (Balanced Flow, Deep Work Sprint, Light & Steady).
   - Generates non-overlapping, chronological daily schedules aligned with biological energy curves (morning deep work, afternoon admin, and restorative breaks).
   - Includes **Focus Feasibility Score**, **Peak Energy Window**, **AI Executive Synthesis**, and tailored daily recommendations.
   - Interactive time blocks on a visual timeline that can be checked off in real time.

4. **Smart Rescheduling (Disruption Shield)**
   - When sudden emergencies occur (urgent boss requests, 45-minute delays/traffic, unscheduled meetings, or afternoon fatigue), click **Smart Reschedule**.
   - Gemini recalculates the remaining hours, slots in the urgent priority, preserves sanity breaks, and comfortably defers non-critical chores to tomorrow.
   - 1-click apply to seamlessly update your active daily plan.

5. **Visual Progress & Analytics**
   - Interactive SVG Donut completion ratio chart.
   - Category effort distribution bars (Work, Study, Personal, Health, Chores, Finance).
   - Priority throughput meters (High, Medium, Low).
   - Consistency streak tracker.

6. **Browser Local Storage & Security**
   - All tasks, daily plans, and user preferences auto-save to browser `localStorage` (no account creation required).
   - **Secure Server-Side Gemini API:** All AI calls are made through an Express backend (`server.ts`) using the official `@google/genai` TypeScript SDK. API keys remain strictly server-side and are never exposed to the client.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Canvas Confetti
- **Backend:** Node.js, Express, TypeScript (TSX)
- **AI Engine:** Google Gemini AI (`@google/genai` SDK using `gemini-3.8-flash` with resilient fallback to `gemini-3.1-flash-lite`)
- **Build Tool:** Vite 8

---

## 🚀 Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/lifeease-ai.git
cd lifeease-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and add your Gemini API key:

```env
GEMINI_API_KEY="your-gemini-api-key-here"
PORT=3000
```

### 4. Run the Development Server

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

### 5. Build for Production

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
├── .env.example              # Example environment configuration (no secrets)
├── .gitignore                # Ignored files (node_modules, .env, dist, etc.)
├── index.html                # Application entry HTML with SEO metadata
├── metadata.json             # AI Studio app metadata
├── package.json              # Dependencies and scripts
├── server.ts                 # Full-stack Express server with Gemini AI endpoints
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration with Tailwind CSS v4
└── src/
    ├── App.tsx               # Main application container and tab state
    ├── main.tsx              # React DOM mounting
    ├── index.css             # Tailwind CSS imports
    ├── types/
    │   └── index.ts          # Core TypeScript interfaces (Task, DailyPlan, etc.)
    ├── utils/
    │   └── storage.ts        # Browser localStorage helpers & sample data
    └── components/
        ├── Navbar.tsx        # Navigation header with responsive mobile drawer
        ├── HomeView.tsx      # Landing page and theme presentation
        ├── DashboardView.tsx # Dashboard with stats, checklist, and quick add
        ├── TaskManagerView.tsx # Full CRUD task manager with filters and export
        ├── TaskModal.tsx     # Task creation/editing modal with AI breakdown
        ├── AiPlannerView.tsx # Gemini AI daily schedule generator and timeline
        ├── SmartRescheduleView.tsx # Dynamic disruption engine
        ├── AnalyticsView.tsx # Progress tracking with visual SVG charts
        └── BeginnerGuideModal.tsx # Simple English guide for judges & beginners
```

---

## 🔒 Security Best Practices

- **Zero Client-Side Keys:** The `GEMINI_API_KEY` is kept exclusively on the server (`server.ts`) and is never embedded in client-side bundles.
- **Git Hygiene:** `.env` and sensitive files are excluded via `.gitignore` to prevent secret leakage.

---

## 📄 License

Apache-2.0
