'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

interface HealthData {
  water: number;
  sleep: number;
  steps: number;
  mood: number;
  lastUpdated: string;
}

interface ChatResponse {
  text: string;
  updatedData?: Partial<HealthData>;
}

// ---------------------------------------------------------------------------
// Local Rule-Based Fallback Responder
// ---------------------------------------------------------------------------
function getLocalFallbackResponse(userMessage: string, healthData: HealthData): ChatResponse {
  const lowerMsg = userMessage.toLowerCase();
  let response = "";
  const updates: Partial<HealthData> = {};

  // Water tracking
  if (lowerMsg.includes('water') || lowerMsg.includes('drink')) {
    const waterMatch = userMessage.match(/(\d+)\s*(glass|glasses|liter|l|cup|cups)/i);
    if (waterMatch) {
      const amount = parseInt(waterMatch[1]);
      const glasses = waterMatch[2].toLowerCase().includes('glass') || waterMatch[2].toLowerCase().includes('cup') ? amount : Math.round(amount * 4);
      updates.water = Math.min(12, healthData.water + glasses);
      response = `Great! I've logged ${glasses} glasses. You're now at ${updates.water || healthData.water} glasses today. Keep it up!`;
    } else if (lowerMsg.includes('enough')) {
      const percent = Math.round((healthData.water / 8) * 100);
      response = `You've had ${healthData.water} glasses today (${percent}% of your goal). ${healthData.water >= 8 ? "You're doing amazing!" : "Let's aim for 8 glasses."}`;
    } else {
      response = `How many glasses of water have you had today?`;
    }
  } 
  // Sleep
  else if (lowerMsg.includes('sleep')) {
    const sleepMatch = userMessage.match(/(\d+(\.\d+)?)\s*(hour|hours)/i);
    if (sleepMatch) {
      const amount = parseFloat(sleepMatch[1]);
      updates.sleep = amount;
      response = `Got it, I've updated your sleep log. Last night you slept ${amount} hours.`;
    } else if (lowerMsg.includes('improve') || lowerMsg.includes('better')) {
      response = `Try winding down 30 mins earlier, avoiding screens before bed, and sleeping in a completely dark room.`;
    } else {
      response = `Last night you got ${healthData.sleep} hours. How are you feeling after that?`;
    }
  } 
  // Steps
  else if (lowerMsg.includes('steps') || lowerMsg.includes('walk') || lowerMsg.includes('run')) {
    const stepsMatch = userMessage.match(/(\d+)\s*(steps)?/i);
    if (stepsMatch) {
      const amount = parseInt(stepsMatch[1]);
      // If user says "I am at X steps" or similar, use as total, otherwise increment
      if (lowerMsg.includes('at') || lowerMsg.includes('total') || lowerMsg.includes('reached')) {
        updates.steps = amount;
      } else {
        updates.steps = healthData.steps + amount;
      }
      response = `Awesome! Steps logged. You are currently at ${(updates.steps || healthData.steps).toLocaleString()} steps.`;
    } else {
      response = `You've walked ${healthData.steps.toLocaleString()} steps today. Let's try to hit the 10,000 steps goal!`;
    }
  } 
  // Mood / General check-in
  else if (lowerMsg.includes('feel') || lowerMsg.includes('mood') || lowerMsg.includes('today')) {
    const moodMatch = userMessage.match(/(\d+)\s*(\/10)?/i);
    if (moodMatch) {
      const amount = Math.min(10, Math.max(1, parseInt(moodMatch[1])));
      updates.mood = amount;
      response = `Logged your mood as ${amount}/10. Thank you for sharing how you feel.`;
    } else {
      response = `Your mood score is ${healthData.mood}/10. How is your energy level right now?`;
    }
  } 
  // Default conversational
  else {
    const responses = [
      "That's interesting! Tell me more about your health goals for today.",
      "I'm here to support your wellness journey. Would you like to log your water, sleep, steps, or mood?",
      "Thanks for sharing! What habits are we focusing on today?",
    ];
    response = responses[Math.floor(Math.random() * responses.length)];
  }

  return {
    text: response,
    updatedData: Object.keys(updates).length > 0 ? updates : undefined,
  };
}

// ---------------------------------------------------------------------------
// Main Server Action
// ---------------------------------------------------------------------------
export async function getGeminiResponse(
  userMessage: string,
  currentHealthData: HealthData
): Promise<ChatResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "placeholder_gemini_key") {
    console.log("[Gemini Server Action] GEMINI_API_KEY is not configured. Falling back to local rules.");
    return getLocalFallbackResponse(userMessage, currentHealthData);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `You are "Health Companion", a friendly, empathetic, and professional AI Health Coach.
Your goal is to help the user track their daily health habits (Water, Sleep, Steps, Mood) and offer encouraging, actionable wellness advice.

You must respond ONLY in a valid JSON object matching the following structure:
{
  "text": "Your conversational response here (keep it under 3-4 sentences, encouraging, conversational and clear)",
  "updatedData": {
     // Include this object ONLY if the user reported/logged a change in their health metrics.
     // Provide the NEW TOTAL value for the updated metric(s) based on the current stats provided below.
     // Only include metrics that the user explicitly mentioned updating.
     "water": number, // target goal is 8 glasses
     "sleep": number, // target goal is 7.5-8 hours
     "steps": number, // target goal is 10,000 steps
     "mood": number   // score out of 10
  }
}

Guidelines for updatedData calculations:
1. Water: If user drank/logged water, calculate the new total glasses. For example, if current is 4, and user drank 2, return 6.
2. Steps: If user walked/ran, calculate the new total steps. For example, if current is 5000, and user walked 2000, return 7000. If they specify their new total (e.g. "I am at 8000 steps now"), return that value (8000).
3. Sleep: If user logs last night's sleep, set the value.
4. Mood: If user reports how they feel, set the value (1 to 10).
5. ONLY update the metrics the user explicitly logs. Do NOT guess or change others. If no metrics are logged, omit the "updatedData" key or set it to null.

Here is the current state of today's health metrics:
- Water: ${currentHealthData.water} glasses (Goal: 8)
- Sleep: ${currentHealthData.sleep} hours (Goal: 8)
- Steps: ${currentHealthData.steps} steps (Goal: 10,000)
- Mood: ${currentHealthData.mood}/10
`;

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "Set up system context instructions." }]
        },
        {
          role: "model",
          parts: [{ text: JSON.stringify({ text: "System instructions understood. I will respond strictly in the requested JSON format and update metrics accurately." }) }]
        }
      ]
    });

    // Send the system instructions combined with the user message
    const prompt = `${systemPrompt}\n\nUser Message: "${userMessage}"`;
    const result = await chat.sendMessage(prompt);
    const responseText = result.response.text();
    
    const parsed: ChatResponse = JSON.parse(responseText);
    
    // Ensure numeric values in updatedData are sanitised
    if (parsed.updatedData) {
      if (typeof parsed.updatedData.water === 'string') parsed.updatedData.water = parseInt(parsed.updatedData.water);
      if (typeof parsed.updatedData.steps === 'string') parsed.updatedData.steps = parseInt(parsed.updatedData.steps);
      if (typeof parsed.updatedData.mood === 'string') parsed.updatedData.mood = parseInt(parsed.updatedData.mood);
      if (typeof parsed.updatedData.sleep === 'string') parsed.updatedData.sleep = parseFloat(parsed.updatedData.sleep);
      
      // Sanitise values
      if (parsed.updatedData.water !== undefined) parsed.updatedData.water = Math.max(0, Math.min(24, parsed.updatedData.water));
      if (parsed.updatedData.steps !== undefined) parsed.updatedData.steps = Math.max(0, Math.min(100000, parsed.updatedData.steps));
      if (parsed.updatedData.mood !== undefined) parsed.updatedData.mood = Math.max(1, Math.min(10, parsed.updatedData.mood));
      if (parsed.updatedData.sleep !== undefined) parsed.updatedData.sleep = Math.max(0, Math.min(24, parsed.updatedData.sleep));
    }

    return parsed;
  } catch (error) {
    console.error("[Gemini API Error] Failed to generate response:", error);
    // Fall back to rule-based parser on API error
    return getLocalFallbackResponse(userMessage, currentHealthData);
  }
}
