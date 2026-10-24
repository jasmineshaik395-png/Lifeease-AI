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

// Helper for resilient Gemini API calls (tries gemini-3.8-flash with timeout fallback to gemini-3.1-flash-lite)
async function generateContentResilient(params: {
  contents: string;
  systemInstruction: string;
  responseSchema?: any;
}) {
  const primaryModel = 'gemini-3.8-flash';
  const fallbackModel = 'gemini-3.1-flash-lite';

  const callPrimary = async () => {
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: params.responseSchema,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });
    return response.text;
  };

  const callFallback = async () => {
    console.log(`Using resilient model ${fallbackModel}...`);
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
    // Give primary 7 seconds; if slow or overloaded, fallback responds immediately
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PRIMARY_TIMEOUT')), 7000)
    );
    return await Promise.race([callPrimary(), timeoutPromise]);
  } catch (err: any) {
    console.warn(`Primary model error or timeout (${err?.message || err}). Routing to ${fallbackModel}...`);
    return await callFallback();
  }
}

// Health / status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    appName: 'LifeEase AI',
    geminiConfigured: Boolean(apiKey && apiKey.length > 5),
    primaryModel: 'gemini-3.8-flash',
    fallbackModel: 'gemini-3.1-flash-lite',
  });
});

// 1. GENERATE DAILY AI PLAN
app.post('/api/generate-plan', async (req, res) => {
  try {
    const { tasks, availableTime, focusStyle, currentDate } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one task to schedule.' });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const systemPrompt = `You are LifeEase AI, an empathetic productivity architect and cognitive scheduling master.
Your goal is: "Reimagine Everyday Life – Make the Complex Simple".
Design a realistic, stress-free, high-efficiency daily schedule for the user based strictly on their tasks, preferences, and available time window.

Rules:
1. Respect energy curves: Schedule deep, high-priority, high-energy cognitive tasks in the morning / peak window.
2. Group related categories or place lighter tasks (chores, emails, admin) during post-lunch dips.
3. Automatically insert short revitalizing breaks (e.g. 10-15 minutes) between intense work blocks.
4. Set realistic start & end times strictly within the user's available window (default: ${availableTime?.startTime || '09:00'} to ${availableTime?.endTime || '18:00'}).
5. Keep times in formatted string (e.g. "09:00 AM", "10:15 AM").
6. Provide a warm, empowering executive summary explaining why the day is structured this way, a focus score (0-100), peak energy window, and 2-3 actionable recommendations.`;

    const userPrompt = JSON.stringify({
      currentDate: currentDate || 'Today',
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

    const resultText = await generateContentResilient({
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

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating plan with Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate schedule with Gemini AI.',
    });
  }
});

// 2. SMART RESCHEDULING (Dynamic Disruption Engine)
app.post('/api/smart-reschedule', async (req, res) => {
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
2. Accommodate the urgent disruption or compress time realistically.
3. If not everything fits, defer lower priority or non-deadline tasks to tomorrow with a kind, reassuring rationale.
4. Protect essential sanity breaks so the user does not burn out.
5. Return the updated schedule, a clear breakdown of changes made, deferred tasks (if any), and an encouraging relief tip.`;

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

    const resultText = await generateContentResilient({
      contents: userPrompt,
      systemInstruction: systemPrompt,
      responseSchema: schema,
    });

    const parsed = JSON.parse(resultText || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in smart rescheduling with Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to reschedule with Gemini AI.',
    });
  }
});

// 3. TASK BREAKDOWN (Make the Complex Simple)
app.post('/api/breakdown-task', async (req, res) => {
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

    const resultText = await generateContentResilient({
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
      error: error?.message || 'Failed to breakdown task with Gemini AI.',
    });
  }
});

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

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
