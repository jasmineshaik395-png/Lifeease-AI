import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper for resilient Gemini API calls (tries gemini-3.8-flash with generous timeout and graceful fallback to gemini-3.1-flash-lite)
async function generateContentResilient(params: {
  contents: string;
  systemInstruction: string;
  responseSchema?: any;
}): Promise<{ text: string; modelUsed: string }> {
  const primaryModel = 'gemini-3.8-flash';
  const fallbackModel = 'gemini-3.1-flash-lite';

  const callWithTimeout = async (
    fn: () => Promise<string | undefined>,
    ms: number,
    label: string
  ): Promise<string> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms);
    });
    try {
      const res = await Promise.race([fn(), timeoutPromise]);
      return res || '{}';
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const callPrimary = async () => {
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: params.responseSchema,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MINIMAL,
        },
      },
    });
    return response.text;
  };

  const callFallback = async () => {
    console.log(`[LifeEase AI] Routing to fallback model ${fallbackModel}...`);
    const fallbackResponse = await ai.models.generateContent({
      model: fallbackModel,
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: params.responseSchema,
      },
    });
    return fallbackResponse.text;
  };

  try {
    // 35 seconds gives gemini-3.8-flash plenty of time to synthesize complex schemas without premature timeout
    const text = await callWithTimeout(callPrimary, 35000, 'PRIMARY');
    return { text, modelUsed: primaryModel };
  } catch (err: any) {
    const isTimeout = err?.message?.includes('PRIMARY_TIMEOUT');
    console.warn(
      `[LifeEase AI] Primary model (${primaryModel}) ${isTimeout ? 'timed out after 35s' : 'encountered error'}: ${err?.message || err}. Routing to ${fallbackModel}...`
    );
    try {
      const fallbackText = await callWithTimeout(callFallback, 25000, 'FALLBACK');
      return { text: fallbackText, modelUsed: fallbackModel };
    } catch (fallbackErr: any) {
      console.error(`[LifeEase AI] Both ${primaryModel} and ${fallbackModel} failed:`, fallbackErr);
      throw err;
    }
  }
}

// Error formatter that returns helpful messages without leaking secrets
function formatGeminiErrorMessage(error: any): string {
  const msg = error?.message || String(error || '');
  if (!apiKey || apiKey.trim().length === 0) {
    return 'GEMINI_API_KEY environment variable is not configured on the server. Please configure GEMINI_API_KEY in your Vercel Project Settings (Settings > Environment Variables).';
  }
  if (msg.includes('API_KEY_INVALID') || msg.includes('403') || msg.includes('API key not valid')) {
    return 'Invalid Gemini API key provided. Please check GEMINI_API_KEY in your deployment environment variables.';
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || msg.includes('quota')) {
    return 'Gemini API rate limit or quota exceeded. Please wait a few moments and try again, or use the algorithmic fallback.';
  }
  if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('overloaded')) {
    return 'Gemini AI service is temporarily experiencing high demand. Please try again shortly or use the algorithmic fallback scheduler.';
  }
  if (msg.includes('TIMEOUT') || msg.includes('PRIMARY_TIMEOUT')) {
    return 'Gemini request timed out. You can retry or generate a schedule using the non-AI fallback.';
  }
  return msg || 'Failed to process request with Gemini AI.';
}

const apiRouter = express.Router();

// Health / status endpoint
apiRouter.get('/status', (req, res) => {
  res.json({
    status: 'online',
    appName: 'LifeEase AI',
    geminiConfigured: Boolean(apiKey && apiKey.length > 5),
    primaryModel: 'gemini-3.8-flash',
    fallbackModel: 'gemini-3.1-flash-lite',
  });
});

// 1. GENERATE DAILY AI PLAN
apiRouter.post('/generate-plan', async (req, res) => {
  try {
    const { tasks, availableTime, focusStyle, currentDate, currentTime, allowPastScheduling } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one task to schedule.' });
    }

    if (!apiKey || apiKey.trim().length === 0) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY environment variable is not configured on the server. Please configure GEMINI_API_KEY in your Vercel Project Settings (Settings > Environment Variables).',
      });
    }

    const systemPrompt = `You are LifeEase AI, an empathetic productivity architect and cognitive scheduling master.
Your goal is: "Reimagine Everyday Life – Make the Complex Simple".
Design a realistic, stress-free, high-efficiency daily schedule for the user based strictly on their actual tasks, user preferences, and available time window.

CORE SCHEDULING RULES:
1. Current Local Time: ${currentTime || 'Not provided'}.
2. Available Workday Window: ${availableTime?.startTime || '09:00'} to ${availableTime?.endTime || '18:00'}.
3. Historical Scheduling: ${allowPastScheduling ? 'ALLOWED (The user explicitly requested historical planning from workday start).' : 'FORBIDDEN. Do NOT schedule unfinished tasks in the past! The first scheduled block MUST start at or after the current local time (' + (currentTime || availableTime?.startTime || '09:00') + ').'}
4. Real Tasks Only: Schedule ONLY the user's actual tasks provided in the prompt. Use their real task titles, ids, and estimated durations. Do NOT invent fictional tasks.
5. Prevent Overlapping Blocks: Every block must start strictly at or after the previous block finishes.
6. Energy Curves: Schedule deep, high-priority, high-energy cognitive tasks in the earliest available focus windows.
7. Automatically insert short revitalizing breaks (e.g. 10-15 minutes) between intense work blocks if breaks are enabled.
8. Deadlines: Respect task deadlines; ensure tasks finish before their target deadlines whenever feasible.
9. Transparent Evaluation: Provide an empowering executive summary, a focus score (0-100), peak energy window, and 2-3 actionable, non-contradictory recommendations matching the scheduled blocks.`;

    const userPrompt = JSON.stringify({
      currentDate: currentDate || 'Today',
      currentTime: currentTime || null,
      allowPastScheduling: Boolean(allowPastScheduling),
      availableTime: {
        startTime: availableTime?.startTime || '09:00',
        endTime: availableTime?.endTime || '18:00',
        includeBreaks: availableTime?.includeBreaks ?? true,
        breakDuration: availableTime?.breakDuration || 15,
      },
      focusStyle: focusStyle || 'balanced',
      tasks: tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        estimatedMinutes: t.estimatedMinutes,
        deadline: t.deadline,
        preferredTime: t.preferredTime,
        energyLevel: t.energyLevel,
      })),
    });

    const schema = {
      type: Type.OBJECT,
      properties: {
        items: {
          type: Type.ARRAY,
          description: 'Chronological list of schedule items for the day',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              taskId: { type: Type.STRING, description: 'ID of matching user task or empty if break' },
              title: { type: Type.STRING },
              startTime: { type: Type.STRING, description: 'Formatted time like 09:00 AM' },
              endTime: { type: Type.STRING, description: 'Formatted time like 10:00 AM' },
              durationMinutes: { type: Type.INTEGER },
              type: { type: Type.STRING, description: 'task | break | buffer | review' },
              priority: { type: Type.STRING, description: 'high | medium | low | none' },
              reason: { type: Type.STRING, description: 'Why this time slot was chosen' },
              productivityTip: { type: Type.STRING, description: 'A quick tip to complete this smoothly' },
            },
            required: ['id', 'title', 'startTime', 'endTime', 'durationMinutes', 'type', 'reason'],
          },
        },
        summary: { type: Type.STRING, description: 'Brief motivating overview of the plan' },
        focusScore: { type: Type.INTEGER, description: 'Score from 1 to 100 on feasibility and balance' },
        peakEnergyWindow: { type: Type.STRING, description: 'e.g. 09:30 AM - 11:45 AM' },
        workloadStatus: { type: Type.STRING, description: 'manageable | optimal | heavy | overloaded' },
        recommendations: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '3 practical tips for the user today',
        },
      },
      required: ['items', 'summary', 'focusScore', 'peakEnergyWindow', 'workloadStatus', 'recommendations'],
    };

    const { text: resultText, modelUsed } = await generateContentResilient({
      contents: userPrompt,
      systemInstruction: systemPrompt,
      responseSchema: schema,
    });

    const parsed = JSON.parse(resultText || '{}');

    // Ensure all items have completed: false flag for client toggling
    if (Array.isArray(parsed.items)) {
      parsed.items = parsed.items.map((item: any) => ({
        ...item,
        completed: false,
      }));
    }

    return res.json({
      ...parsed,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error generating plan with Gemini:', error);
    return res.status(500).json({
      error: formatGeminiErrorMessage(error),
    });
  }
});

// 2. SMART RESCHEDULING (Dynamic Disruption Engine)
apiRouter.post('/smart-reschedule', async (req, res) => {
  try {
    const {
      currentSchedule,
      remainingTasks,
      disruptionType,
      disruptionDescription,
      urgentTaskTitle,
      urgentTaskMinutes,
      urgentTaskPriority,
      timeLostMinutes,
      newAvailableUntil,
      currentTime,
    } = req.body;

    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const systemPrompt = `You are LifeEase AI Smart Rescheduler.
When unexpected events strike (e.g. an urgent boss request, sudden 45-minute delay, meeting overrun, energy drop), everyday life becomes overwhelming.
Your job is to make it simple again:
1. Re-balance the remainder of today's schedule starting from ${currentTime || 'now'}.
2. CRITICAL PRESERVATION: Any tasks in currentSchedule that are already completed (completed: true) or whose scheduled time ended before ${currentTime || 'now'} MUST be preserved intact in updatedSchedule with completed: true and their original times.
3. Accommodate the delay or disruption (e.g. 45 minutes lost) by shifting only remaining upcoming tasks forward.
4. Respect fixed commitments and deadlines. If not everything fits before ${newAvailableUntil || '18:00'}, defer lower priority or non-urgent tasks to tomorrow with clear empathetic reasons in deferredTasks.
5. Return the full updated daily schedule (preserved morning tasks + rebalanced afternoon tasks), a clear explanation of changes made, deferred tasks (if any), and an encouraging relief tip.`;

    const userPrompt = JSON.stringify({
      currentTime: currentTime || '11:00 AM',
      disruptionType,
      disruptionDescription,
      urgentTask: urgentTaskTitle
        ? {
            title: urgentTaskTitle,
            durationMinutes: urgentTaskMinutes || 30,
            priority: urgentTaskPriority || 'high',
          }
        : null,
      timeLostMinutes: timeLostMinutes || 0,
      newAvailableUntil: newAvailableUntil || '18:00',
      currentSchedule: currentSchedule || [],
      remainingTasks: remainingTasks || [],
    });

    const schema = {
      type: Type.OBJECT,
      properties: {
        updatedSchedule: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              taskId: { type: Type.STRING },
              title: { type: Type.STRING },
              startTime: { type: Type.STRING },
              endTime: { type: Type.STRING },
              durationMinutes: { type: Type.INTEGER },
              type: { type: Type.STRING },
              priority: { type: Type.STRING },
              reason: { type: Type.STRING },
              productivityTip: { type: Type.STRING },
              completed: { type: Type.BOOLEAN },
            },
            required: ['id', 'title', 'startTime', 'endTime', 'durationMinutes', 'type'],
          },
        },
        changesExplanation: {
          type: Type.STRING,
          description: 'Clear, concise narrative explaining how the day was rebalanced without stress',
        },
        deferredTasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              taskTitle: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ['taskTitle', 'reason'],
          },
          description: 'Tasks comfortably moved to tomorrow to relieve pressure',
        },
        reliefTip: {
          type: Type.STRING,
          description: 'Empathetic cognitive advice to stay relaxed and centered',
        },
      },
      required: ['updatedSchedule', 'changesExplanation', 'deferredTasks', 'reliefTip'],
    };

    const { text: resultText, modelUsed } = await generateContentResilient({
      contents: userPrompt,
      systemInstruction: systemPrompt,
      responseSchema: schema,
    });

    const parsed = JSON.parse(resultText || '{}');
    return res.json({
      ...parsed,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error in smart rescheduling with Gemini:', error);
    return res.status(500).json({
      error: formatGeminiErrorMessage(error),
    });
  }
});

// 3. TASK BREAKDOWN (Make the Complex Simple)
apiRouter.post('/breakdown-task', async (req, res) => {
  try {
    const { taskTitle, taskDescription } = req.body;

    if (!taskTitle) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    const schema = {
      type: Type.OBJECT,
      properties: {
        subtasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              minutes: { type: Type.INTEGER },
              completed: { type: Type.BOOLEAN },
            },
            required: ['id', 'title', 'minutes'],
          },
        },
        proTip: { type: Type.STRING, description: 'One psychological tip to overcome friction or procrastination' },
      },
      required: ['subtasks', 'proTip'],
    };

    const { text: resultText } = await generateContentResilient({
      contents: `Task: ${taskTitle}\nDetails: ${taskDescription || 'None'}\nBreak this complex or daunting task down into 3 to 5 easy, bite-sized, sequential micro-steps. Estimate minutes for each.`,
      systemInstruction:
        'You are LifeEase AI. You take any complex, overwhelming task and turn it into simple, frictionless, immediate micro-actions.',
      responseSchema: schema,
    });

    const parsed = JSON.parse(resultText || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error breaking down task:', error);
    return res.status(500).json({
      error: formatGeminiErrorMessage(error),
    });
  }
});

// 4. NATURAL LANGUAGE AI ASSISTANT (Convert plain English into structured task)
apiRouter.post('/parse-natural-language', async (req, res) => {
  try {
    const { input, currentDate } = req.body;

    if (!input || typeof input !== 'string' || !input.trim()) {
      return res.status(400).json({ error: 'Please provide task description in natural language.' });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    const systemPrompt = `You are LifeEase AI Natural Language Assistant.
Current reference context: ${currentDate || 'Today'}.
Parse the user's natural language request into a clean, structured task.
Example input: "Remind me to finish my Python assignment tomorrow at 5 PM with high priority"
Output fields:
- title: concise task title (e.g., "Finish Python assignment")
- description: optional extra context or notes mentioned
- category: one of 'work' | 'study' | 'personal' | 'health' | 'chores' | 'finance'
- priority: 'high' | 'medium' | 'low'
- estimatedMinutes: realistic estimated minutes (default 30-45 if not specified)
- deadline: formatted deadline string like "Tomorrow, 5:00 PM" or "Today, 6:00 PM"
- preferredTime: 'anytime' | 'morning' | 'afternoon' | 'evening'
- energyLevel: 'high' | 'medium' | 'low'
- confidenceSummary: friendly 1-sentence confirmation of what was understood`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        category: { type: Type.STRING, description: 'work | study | personal | health | chores | finance' },
        priority: { type: Type.STRING, description: 'high | medium | low' },
        estimatedMinutes: { type: Type.INTEGER },
        deadline: { type: Type.STRING },
        preferredTime: { type: Type.STRING, description: 'anytime | morning | afternoon | evening' },
        energyLevel: { type: Type.STRING, description: 'high | medium | low' },
        confidenceSummary: { type: Type.STRING },
      },
      required: ['title', 'category', 'priority', 'estimatedMinutes', 'confidenceSummary'],
    };

    const { text: resultText } = await generateContentResilient({
      contents: `User task request: "${input.trim()}"`,
      systemInstruction: systemPrompt,
      responseSchema: schema,
    });

    const parsed = JSON.parse(resultText || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing natural language with Gemini:', error);
    return res.status(500).json({
      error: formatGeminiErrorMessage(error),
    });
  }
});

// 5. CONVERSATIONAL GEMINI CHAT & COACH
apiRouter.post('/chat', async (req, res) => {
  try {
    const { message, history, currentTasksSummary } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    const systemPrompt = `You are LifeEase AI, an empathetic cognitive coach and everyday life assistant built for the hackathon theme: "Reimagine Everyday Life — Make the Complex Simple".
Your goal is to reduce mental clutter, make daunting days feel manageable, combat procrastination, and give practical, reassuring guidance.
If the user mentions an actionable task or chore they want to accomplish, extract it into 'suggestedTask' so they can add it to their task board in one click.
Context of user's active tasks: ${currentTasksSummary || 'None provided'}.
Keep responses structured, encouraging, and free of fluff.`;

    const chatContext = Array.isArray(history) && history.length > 0
      ? `Conversation History:\n${history.map((h: any) => `${h.sender === 'user' ? 'User' : 'LifeEase'}: ${h.text}`).join('\n')}\n\nLatest User Message: ${message.trim()}`
      : `User Message: ${message.trim()}`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING, description: 'Empathetic, clear, and actionable advice' },
        actionTips: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '1 to 3 bullet points of immediate friction-reducing actions',
        },
        hasSuggestedTask: { type: Type.BOOLEAN },
        suggestedTask: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING, description: 'work | study | personal | health | chores | finance' },
            priority: { type: Type.STRING, description: 'high | medium | low' },
            estimatedMinutes: { type: Type.INTEGER },
            deadline: { type: Type.STRING },
          },
        },
      },
      required: ['reply', 'actionTips'],
    };

    const { text: resultText } = await generateContentResilient({
      contents: chatContext,
      systemInstruction: systemPrompt,
      responseSchema: schema,
    });

    const parsed = JSON.parse(resultText || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in Gemini Chat:', error);
    return res.status(500).json({
      error: formatGeminiErrorMessage(error),
    });
  }
});

// Mount API router for both /api prefix (Vite dev & local Node) and direct root (Vercel serverless functions)
app.use('/api', apiRouter);
app.use('/', apiRouter);


// Production or Vite Dev server middleware mounting
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LifeEase AI Server] Running on http://0.0.0.0:${PORT}`);
  });
}

// In local dev and standard Node containers, run startServer. On Vercel, app is exported as serverless handler.
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}

export default app;
