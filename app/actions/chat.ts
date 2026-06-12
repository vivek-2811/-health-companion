'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

interface HealthData {
  water: number;
  sleep: number;
  steps: number;
  mood: number;
  lastUpdated: string;
}

export interface ChatResponse {
  text: string;
  updatedData?: Partial<HealthData>;
  actions?: {
    type: 'update_health_logs' | 'create_habit' | 'log_meal';
    payload: any;
  }[];
}

// ---------------------------------------------------------------------------
// Local Rule-Based Fallback Responder
// ---------------------------------------------------------------------------
function getLocalFallbackResponse(userMessage: string, healthData: HealthData): ChatResponse {
  const lowerMsg = userMessage.toLowerCase();
  let response = "";
  const updates: Partial<HealthData> = {};
  const actions: any[] = [];

  // Water tracking
  if (lowerMsg.includes('water') || lowerMsg.includes('drink')) {
    const waterMatch = userMessage.match(/(\d+)\s*(ml|milliliters|millilitres|l|liter|liters|glass|glasses|cup|cups)/i);
    if (waterMatch) {
      const amount = parseInt(waterMatch[1]);
      const unit = waterMatch[2].toLowerCase();
      let addedMl = amount;
      
      if (unit.includes('glass') || unit.includes('cup')) {
        addedMl = amount * 250;
      } else if (unit.includes('liter') || unit === 'l') {
        addedMl = amount * 1000;
      }

      updates.water = healthData.water + addedMl;
      response = `Great! I've logged ${addedMl}ml of water. You are now at ${updates.water}ml today. Keep it up!`;
      actions.push({
        type: 'update_health_logs',
        payload: { water: updates.water }
      });
    } else {
      // Default fallback increment
      updates.water = healthData.water + 250;
      response = `Logged 1 glass (250ml) of water. You are now at ${updates.water}ml.`;
      actions.push({
        type: 'update_health_logs',
        payload: { water: updates.water }
      });
    }
  } 
  // Sleep
  else if (lowerMsg.includes('sleep') || lowerMsg.includes('slept')) {
    const sleepMatch = userMessage.match(/(\d+(\.\d+)?)\s*(hour|hours|hr|hrs)/i);
    if (sleepMatch) {
      const amount = parseFloat(sleepMatch[1]);
      updates.sleep = amount;
      response = `Got it, I've updated your sleep log. Last night you slept ${amount} hours.`;
      actions.push({
        type: 'update_health_logs',
        payload: { sleep: amount }
      });
    } else {
      response = `Last night you got ${healthData.sleep} hours. How are you feeling today?`;
    }
  } 
  // Habit creation
  else if (lowerMsg.includes('habit') || lowerMsg.includes('routine') || lowerMsg.includes('meditate') || lowerMsg.includes('read') || lowerMsg.includes('stretch') || lowerMsg.includes('walk') || lowerMsg.includes('journal')) {
    const habitTypes = ['meditate', 'read', 'stretch', 'walk', 'journal', 'workout'];
    let name = 'New Habit';
    for (const h of habitTypes) {
      if (lowerMsg.includes(h)) {
        name = h.charAt(0).toUpperCase() + h.slice(1);
        break;
      }
    }
    response = `Done. I've created the habit "${name}" for you.`;
    actions.push({
      type: 'create_habit',
      payload: {
        name,
        frequency: 'daily',
        category: name.toLowerCase()
      }
    });
  }
  // Meal logging
  else if (lowerMsg.includes('eat') || lowerMsg.includes('ate') || lowerMsg.includes('had') || lowerMsg.includes('breakfast') || lowerMsg.includes('lunch') || lowerMsg.includes('dinner') || lowerMsg.includes('snack')) {
    let mealType = 'snack';
    if (lowerMsg.includes('breakfast')) mealType = 'breakfast';
    else if (lowerMsg.includes('lunch')) mealType = 'lunch';
    else if (lowerMsg.includes('dinner')) mealType = 'dinner';

    const items = lowerMsg.includes('eggs') ? 'eggs' : 'meal';
    const calories = lowerMsg.includes('eggs') ? 140 : 250;
    const protein = lowerMsg.includes('eggs') ? 12 : 10;
    const carbs = lowerMsg.includes('eggs') ? 1 : 20;
    const fat = lowerMsg.includes('eggs') ? 10 : 8;

    response = `I've logged that under ${mealType}. Estimated calories: ${calories} kcal.`;
    actions.push({
      type: 'log_meal',
      payload: {
        meal_type: mealType,
        description: items,
        calories,
        protein,
        carbs,
        fat
      }
    });
  }
  // Weekly progress
  else if (lowerMsg.includes('week') || lowerMsg.includes('doing') || lowerMsg.includes('progress')) {
    response = `Your weekly average looks good. Keep hitting your water target of 2000ml and sleep target of 8 hours!`;
  } 
  // Default conversational
  else {
    const responses = [
      "That's interesting! Tell me more about your health goals.",
      "I'm here to support your Aurora health journey. Would you like to log your water, sleep, habits, or meals?",
      "Thanks for sharing! What habits are we focusing on today?",
    ];
    response = responses[Math.floor(Math.random() * responses.length)];
  }

  return {
    text: response,
    updatedData: Object.keys(updates).length > 0 ? updates : undefined,
    actions: actions.length > 0 ? actions : undefined,
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

    const systemPrompt = `You are "Aurora", a friendly, empathetic, and professional AI Health Companion.
Your goal is to help the user track their daily health habits (Water, Sleep, Steps, Mood, Habits, Nutrition) and offer encouraging, actionable wellness advice.

You must respond ONLY in a valid JSON object matching the following structure:
{
  "text": "Your conversational response here (keep it under 2-3 sentences, encouraging, conversational, deep calm coach persona)",
  "updatedData": {
     // Include this object ONLY if the user reported/logged a change in their core metrics (water, sleep, steps, mood).
     // Provide the NEW TOTAL value for the updated metric(s) based on the current stats provided below.
     // Only include metrics that the user explicitly mentioned updating.
     "water": number, // total water in ml today (e.g. 500, 1000, 2000). Goal: 2000 ml.
     "sleep": number, // total sleep in hours. Goal: 8 hours.
     "steps": number, // total steps. Goal: 10,000 steps.
     "mood": number   // score out of 10
  },
  "actions": [
     // Include this array of actions ONLY if the user requested a specific update.
     // 1. { "type": "update_health_logs", "payload": { "water": number, "sleep": number, "steps": number, "mood": number } }
     // 2. { "type": "create_habit", "payload": { "name": "Habit Name", "category": "meditate|read|stretch|walk|journal|general", "frequency": "daily|weekly" } }
     // 3. { "type": "log_meal", "payload": { "meal_type": "breakfast|lunch|dinner|snack", "description": "food items details", "calories": number, "protein": number, "carbs": number, "fat": number } }
  ]
}

Guidelines for updatedData calculations:
1. Hydration: Water is tracked in ML. If user logs "I drank 500ml water" or "drank 2 glasses of water" (estimate 1 glass = 250ml), calculate the new total. If current is 1000, and user drank 500ml, return 1500 in updatedData.water.
2. Sleep: User sleeps in hours (e.g. "I slept 7.5 hours last night"). Set this value.
3. Steps: Set total steps.
4. Habits: If user wants to create a habit (e.g. "create a habit to read every night" or "I want to start meditating"), return a "create_habit" action.
5. Nutrition: If user logs eating something (e.g. "I ate chicken salad for lunch"), return a "log_meal" action. You must estimate the macros (calories, protein, carbs, fat) for the food item and provide it in the payload.

Here is the current state of today's health metrics:
- Water: ${currentHealthData.water} ml (Goal: 2000 ml)
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
      if (parsed.updatedData.water !== undefined) parsed.updatedData.water = Math.max(0, Math.min(10000, parsed.updatedData.water));
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
