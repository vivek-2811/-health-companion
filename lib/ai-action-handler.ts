/**
 * ai-action-handler.ts — AI call wrapper with timeout and robust client-side/regex parser fallback.
 * Catches Gemini API outages, rate limits, or slow response times, providing offline recovery.
 */

interface HealthData {
  water: number;
  sleep: number;
  steps: number;
  mood: number;
  lastUpdated: string;
}

export interface AIActionResponse {
  text: string;
  updatedData?: Partial<HealthData>;
  actions?: {
    type: 'update_health_logs' | 'create_habit' | 'log_meal';
    payload: any;
  }[];
}

/**
 * Fallback parser using regular expressions to extract metrics, habits, or nutrition logs
 * if the AI service fails or times out.
 */
export function getLocalRegexFallback(message: string, currentData: HealthData): AIActionResponse {
  const text = message.toLowerCase();
  const response: AIActionResponse = {
    text: "I've processed your command locally.",
    updatedData: {},
    actions: [],
  };

  let updated = false;

  // 1. Water Intake Tracking (ml or glasses)
  const mlMatch = text.match(/(\d+)\s*(ml|milliliters|millilitres)/i);
  const glassMatch = text.match(/(\d+)\s*(glass|glasses|cup|cups)/i);
  
  if (mlMatch) {
    const ml = parseInt(mlMatch[1]);
    // 1 glass = 250ml approximately
    const currentWaterMl = currentData.water;
    response.updatedData!.water = currentWaterMl + ml;
    response.text = `Logged ${ml}ml of water. You're doing great!`;
    response.actions!.push({
      type: 'update_health_logs',
      payload: { water: currentData.water + ml }
    });
    updated = true;
  } else if (glassMatch) {
    const glasses = parseInt(glassMatch[1]);
    const ml = glasses * 250;
    const currentWaterMl = currentData.water;
    response.updatedData!.water = currentWaterMl + ml;
    response.text = `Logged ${glasses} glasses (${ml}ml) of water. Keep hydrating!`;
    response.actions!.push({
      type: 'update_health_logs',
      payload: { water: currentData.water + ml }
    });
    updated = true;
  } else if (text.includes('water') || text.includes('drink')) {
    // Default quick log
    const ml = 250;
    response.updatedData!.water = currentData.water + ml;
    response.text = `Logged 250ml of water. Let's aim for 2000ml today!`;
    response.actions!.push({
      type: 'update_health_logs',
      payload: { water: currentData.water + ml }
    });
    updated = true;
  }

  // 2. Sleep Tracking
  const sleepMatch = text.match(/(\d+(\.\d+)?)\s*(hour|hours|hr|hrs)/i);
  if (sleepMatch) {
    const hours = parseFloat(sleepMatch[1]);
    response.updatedData!.sleep = hours;
    response.text = `Got it. I've logged ${hours} hours of sleep for last night.`;
    response.actions!.push({
      type: 'update_health_logs',
      payload: { sleep: hours }
    });
    updated = true;
  }

  // 3. Step Tracking
  const stepMatch = text.match(/(\d+)\s*(steps|step)/i);
  if (stepMatch) {
    const steps = parseInt(stepMatch[1]);
    // Check if adding or setting absolute
    if (text.includes('add') || text.includes('walked') || text.includes('ran')) {
      response.updatedData!.steps = currentData.steps + steps;
    } else {
      response.updatedData!.steps = steps;
    }
    response.text = `Logged ${steps.toLocaleString()} steps. Keep moving!`;
    response.actions!.push({
      type: 'update_health_logs',
      payload: { steps: response.updatedData!.steps }
    });
    updated = true;
  }

  // 4. Mood Logging
  const moodMatch = text.match(/(\d+)\s*(\/10)?/);
  if (text.includes('mood') && moodMatch) {
    const moodVal = Math.min(10, Math.max(1, parseInt(moodMatch[1])));
    response.updatedData!.mood = moodVal;
    response.text = `Logged your mood as ${moodVal}/10. Thanks for checking in.`;
    response.actions!.push({
      type: 'update_health_logs',
      payload: { mood: moodVal }
    });
    updated = true;
  }

  // 5. Habit Creation
  if (text.includes('habit') || text.includes('routine')) {
    // Look for common habits like reading, meditating, stretching, etc.
    const habitTypes = ['meditate', 'read', 'stretch', 'walk', 'journal', 'workout', 'hydrate', 'early bed'];
    let detectedHabit = '';
    
    for (const h of habitTypes) {
      if (text.includes(h)) {
        detectedHabit = h.charAt(0).toUpperCase() + h.slice(1);
        break;
      }
    }

    if (!detectedHabit) {
      // Try extracting custom name
      const customMatch = text.match(/(?:create|add|make|start)(?:\s+a)?(?:\s+habit\s+to)?\s+([a-zA-Z0-9\s]{3,30})(?:\s+every|\s+daily|\s+night|\s+morning)?/i);
      if (customMatch && customMatch[1]) {
        detectedHabit = customMatch[1].trim();
      }
    }

    if (detectedHabit) {
      response.text = `Done. I've created the habit: "${detectedHabit}".`;
      response.actions!.push({
        type: 'create_habit',
        payload: {
          name: detectedHabit,
          frequency: text.includes('weekly') ? 'weekly' : 'daily',
          category: detectedHabit.toLowerCase()
        }
      });
      updated = true;
    }
  }

  // 6. Nutrition Logging
  if (text.includes('eat') || text.includes('ate') || text.includes('had') || text.includes('meal') || text.includes('food') || text.includes('breakfast') || text.includes('lunch') || text.includes('dinner') || text.includes('snack')) {
    let mealType = 'snack';
    if (text.includes('breakfast')) mealType = 'breakfast';
    else if (text.includes('lunch')) mealType = 'lunch';
    else if (text.includes('dinner')) mealType = 'dinner';

    // Parse description
    const descMatch = text.match(/(?:eat|ate|had|log|logged)\s+(?:a|some)?\s*([a-zA-Z0-9\s,]{3,50})(?:\s+for\s+)(?:breakfast|lunch|dinner|snack)/i) 
      || text.match(/(?:for\s+)(?:breakfast|lunch|dinner|snack)(?:,\s+i\s+ate|,\s+i\s+had|\s+i\s+had)\s+([a-zA-Z0-9\s,]{3,50})/i)
      || text.match(/(?:ate|had|log)\s+([a-zA-Z0-9\s,]{3,50})/i);
      
    const description = descMatch ? descMatch[1].trim() : 'meal';
    
    // Estimate some basic placeholder macro figures based on food items
    let calories = 250;
    let protein = 10;
    let carbs = 20;
    let fat = 8;

    if (description.includes('egg') || description.includes('eggs')) {
      calories = 140; protein = 12; carbs = 1; fat = 10;
    } else if (description.includes('chicken') || description.includes('meat') || description.includes('fish')) {
      calories = 350; protein = 30; carbs = 5; fat = 15;
    } else if (description.includes('salad')) {
      calories = 150; protein = 4; carbs = 10; fat = 8;
    } else if (description.includes('apple') || description.includes('banana') || description.includes('fruit')) {
      calories = 90; protein = 1; carbs = 22; fat = 0;
    } else if (description.includes('rice') || description.includes('bread') || description.includes('toast')) {
      calories = 200; protein = 4; carbs = 40; fat = 2;
    }

    response.text = `I've logged "${description}" as your ${mealType}. Estimated macros: ${calories} kcal (${protein}g Protein, ${carbs}g Carbs, ${fat}g Fat).`;
    response.actions!.push({
      type: 'log_meal',
      payload: {
        meal_type: mealType,
        description: description,
        calories,
        protein,
        carbs,
        fat
      }
    });
    updated = true;
  }

  // If no metric was parsed, offer general coaching feedback
  if (!updated) {
    response.text = "I'm on local offline mode. I can help you log water (e.g. 'drank 500ml'), sleep (e.g. 'slept 8 hours'), steps, mood, create habits, or log meals.";
    response.updatedData = undefined;
  }

  return response;
}

/**
 * Executes a Gemini request with a specified timeout. 
 * If it times out or throws an error, it falls back to regex matching.
 */
export async function safeGetGeminiResponse(
  userMessage: string,
  currentHealthData: HealthData,
  geminiCallFn: (msg: string, data: HealthData) => Promise<any>,
  timeoutMs = 8000
): Promise<AIActionResponse> {
  
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('AI Request Timeout')), timeoutMs)
  );

  try {
    // Run Gemini API call in parallel with the timeout promise
    const response = await Promise.race([
      geminiCallFn(userMessage, currentHealthData),
      timeoutPromise
    ]);

    if (!response || (!response.text && !response.updatedData && !response.actions)) {
      throw new Error('Malformed AI response');
    }

    return {
      text: response.text,
      updatedData: response.updatedData || undefined,
      actions: response.actions || undefined,
    };
  } catch (error: any) {
    console.warn(`[safeGetGeminiResponse] AI request failed or timed out: ${error.message || error}. Using local parser.`);
    // Failover
    return getLocalRegexFallback(userMessage, currentHealthData);
  }
}
