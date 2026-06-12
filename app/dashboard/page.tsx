'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Mic, MicOff, Send, TrendingUp, Droplet, Moon, Award, 
  MessageCircle, User, LogOut, Check, X, ShieldAlert, 
  Coffee, Apple, Pizza, Plus, Clock, Settings, ShieldCheck, 
  ChevronRight, Calendar, Heart, Trash2, Edit2, Play, Pause, FastForward,
  Sparkles
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { SiriOrb } from '@/components/ui/siri-orb';
import { MacOSDock, HomeIcon, MessageIcon, ChartIcon } from '@/components/ui/mac-os-dock';
import { createClient } from '@/lib/supabase/client';
import { getGeminiResponse } from '@/app/actions/chat';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { safeQuery } from '@/lib/supabase/safe-query';
import { safeGetGeminiResponse } from '@/lib/ai-action-handler';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface HealthData {
  water: number; // in ml
  sleep: number; // in hours
  steps: number;
  mood: number;
  lastUpdated: string;
}

interface WeeklyData {
  day: string;
  water: number;
  sleep: number;
  steps: number;
}

interface Habit {
  id: string;
  name: string;
  frequency: string;
  category: string;
  status: 'active' | 'paused';
  completedToday?: boolean;
  skippedToday?: boolean;
}

interface Meal {
  id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
}

interface UserProfile {
  first_name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  wake_time: string;
  bed_time: string;
  activity_level: string;
  goals: string[];
  notification_prefs: {
    hydration: boolean;
    sleep: boolean;
    habits: boolean;
    insights: boolean;
  };
}

const initialHealthData: HealthData = {
  water: 500, // ml
  sleep: 7.5,
  steps: 8200,
  mood: 8,
  lastUpdated: new Date().toISOString(),
};

const initialWeeklyData: WeeklyData[] = [
  { day: 'Mon', water: 1500, sleep: 7, steps: 9500 },
  { day: 'Tue', water: 1000, sleep: 6.5, steps: 7200 },
  { day: 'Wed', water: 2000, sleep: 8, steps: 11000 },
  { day: 'Thu', water: 1250, sleep: 7, steps: 8500 },
  { day: 'Fri', water: 1750, sleep: 7.5, steps: 9800 },
  { day: 'Sat', water: 750, sleep: 9, steps: 4500 },
  { day: 'Sun', water: 1250, sleep: 7.5, steps: 8200 },
];

export default function AuroraDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'insights' | 'settings'>('home');
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('messages');
      if (savedMessages) {
        try {
          return JSON.parse(savedMessages).map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
        } catch {
          // fallback
        }
      }
    }
    return [
      { id: 1, text: "Hi! I'm Aurora, your health companion. How are you feeling today?", isUser: false, timestamp: new Date() }
    ];
  });
  const [inputText, setInputText] = useState('');
  const [healthData, setHealthData] = useState<HealthData>(initialHealthData);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>(initialWeeklyData);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Custom Modules State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  
  // Modals state
  const [showMealModal, setShowMealModal] = useState(false);
  const [mealCategory, setMealCategory] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [mealDesc, setMealDesc] = useState('');
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCat, setNewHabitCat] = useState('general');

  const recognitionRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const handleUserMessageRef = useRef<(text: string) => void>(() => {});

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors
    }
    router.push('/signin');
    router.refresh();
  }, [supabase, router]);



  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Load profile, meals, habits, and health logs
  const fetchDashboardData = useCallback(async (userId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Get profile questionnaire
    const { data: profileLog } = await safeQuery<any>(
      () => supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
      'profiles',
      null
    );
    if (profileLog) {
      setProfile(profileLog as unknown as UserProfile);
    }

    // 2. Get today's health logs (water, sleep, steps, mood)
    const { data: todayLog } = await safeQuery<any>(
      () => supabase.from('health_logs').select('*').eq('user_id', userId).eq('date', todayStr).maybeSingle(),
      'health_logs',
      null
    );

    let currentWater = initialHealthData.water;
    let currentSleep = initialHealthData.sleep;
    let currentSteps = initialHealthData.steps;
    let currentMood = initialHealthData.mood;

    if (todayLog) {
      currentWater = todayLog.water;
      currentSleep = parseFloat(todayLog.sleep);
      currentSteps = todayLog.steps;
      currentMood = todayLog.mood;
      setHealthData({
        water: todayLog.water,
        sleep: parseFloat(todayLog.sleep),
        steps: todayLog.steps,
        mood: todayLog.mood,
        lastUpdated: todayLog.updated_at,
      });
    } else {
      // Initialize with default
      const { data: newLog } = await safeQuery<any>(
        () => supabase.from('health_logs').insert({
          user_id: userId,
          date: todayStr,
          water: currentWater,
          sleep: currentSleep,
          steps: currentSteps,
          mood: currentMood
        }).select().maybeSingle(),
        'health_logs',
        null
      );
      if (newLog) {
        setHealthData({
          water: newLog.water,
          sleep: parseFloat(newLog.sleep),
          steps: newLog.steps,
          mood: newLog.mood,
          lastUpdated: newLog.updated_at,
        });
      }
    }

    // 3. Fetch habits and logs
    const { data: habitsList } = await safeQuery<any[]>(
      () => supabase.from('habits').select('*').eq('user_id', userId),
      'habits',
      []
    );

    const { data: habitLogsList } = await safeQuery<any[]>(
      () => supabase.from('habit_logs').select('*').eq('date', todayStr),
      'habit_logs',
      []
    );

    if (habitsList) {
      const mappedHabits = habitsList.map((h: any) => {
        const logged = habitLogsList?.find((l: any) => l.habit_id === h.id);
        return {
          id: h.id,
          name: h.name,
          frequency: h.frequency,
          category: h.category,
          status: h.status,
          completedToday: logged?.status === 'completed',
          skippedToday: logged?.status === 'skipped',
        };
      });
      setHabits(mappedHabits);
    }

    // 4. Fetch today's nutrition meals
    const { data: mealsList } = await safeQuery<any[]>(
      () => supabase.from('meals').select('*').eq('user_id', userId).eq('date', todayStr),
      'meals',
      []
    );
    if (mealsList) {
      setMeals(mealsList as unknown as Meal[]);
    }

    // 5. Fetch weekly trends
    const { data: weeklyLogs } = await safeQuery<any[]>(
      () => supabase.from('health_logs').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(7),
      'weekly_trends',
      []
    );

    if (weeklyLogs && weeklyLogs.length > 0) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const chartData = [];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = dayNames[d.getDay()];
        
        const log = weeklyLogs.find((l: any) => l.date === dateStr);
        chartData.push({
          day: dayName,
          water: log ? log.water : (dateStr === todayStr ? currentWater : 0),
          sleep: log ? parseFloat(log.sleep) : (dateStr === todayStr ? currentSleep : 0),
          steps: log ? log.steps : (dateStr === todayStr ? currentSteps : 0),
        });
      }
      setWeeklyData(chartData);
    }
  }, [supabase]);

  // Auth User check
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        fetchDashboardData(user.id);
      } else {
        router.push('/signin');
      }
    };
    checkUser();
  }, [supabase, router, fetchDashboardData]);

  // Save metrics to Supabase
  const saveToSupabase = useCallback(async (newData: HealthData) => {
    if (!user) return;
    const dateStr = new Date().toISOString().split('T')[0];
    await supabase.from('health_logs').upsert({
      user_id: user.id,
      date: dateStr,
      water: newData.water,
      sleep: newData.sleep,
      steps: newData.steps,
      mood: newData.mood,
    }, { onConflict: 'user_id,date' });
  }, [supabase, user]);

  // Initialize Speech APIs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const SpeechReg = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechReg) {
        recognitionRef.current = new SpeechReg();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          handleUserMessageRef.current(transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
          toast.error("Couldn't hear you clearly. Let's try again!");
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  // Speak response with low male pitch settings
  const speak = (text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.82;
    utterance.pitch = 0.55;
    utterance.volume = 1;

    // Async voice retrieval
    const voices = synthRef.current.getVoices();
    const maleVoice = voices.find(v => {
      const name = v.name.toLowerCase();
      return name.includes('male') || name.includes('david') || name.includes('mark') || name.includes('google uk english male');
    });
    if (maleVoice) utterance.voice = maleVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  };

  // Perform AI action triggers
  const executeAIActions = useCallback(async (actions: any[]) => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];

    for (const action of actions) {
      if (action.type === 'update_health_logs') {
        const updates = action.payload;
        setHealthData(prev => {
          const updated = { ...prev, ...updates };
          saveToSupabase(updated);
          return updated;
        });
      } 
      else if (action.type === 'create_habit') {
        const { name, frequency, category } = action.payload;
        const { data: newHabit } = await supabase.from('habits').insert({
          user_id: user.id,
          name,
          frequency: frequency || 'daily',
          category: category || 'general',
          status: 'active'
        }).select().maybeSingle();

        if (newHabit) {
          setHabits(prev => [...prev, {
            id: newHabit.id,
            name: newHabit.name,
            frequency: newHabit.frequency,
            category: newHabit.category,
            status: newHabit.status,
            completedToday: false,
            skippedToday: false
          }]);
        }
      } 
      else if (action.type === 'log_meal') {
        const { meal_type, description, calories, protein, carbs, fat } = action.payload;
        const { data: newMeal } = await supabase.from('meals').insert({
          user_id: user.id,
          meal_type,
          description,
          calories,
          protein,
          carbs,
          fat,
          date: todayStr
        }).select().maybeSingle();

        if (newMeal) {
          setMeals(prev => [...prev, newMeal as unknown as Meal]);
        }
      }
    }
  }, [user, supabase, saveToSupabase]);

  // Handle conversational user messages
  const handleUserMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user) return;

    const userMsg: Message = {
      id: Date.now(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await safeGetGeminiResponse(
        text,
        healthData,
        async (msg, data) => await getGeminiResponse(msg, data)
      );

      const aiMsg: Message = {
        id: Date.now() + 1,
        text: response.text,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
      speak(response.text);

      // Execute updates parsed agentically
      if (response.updatedData) {
        const newData = { ...healthData, ...response.updatedData };
        setHealthData(newData);
        saveToSupabase(newData);
        toast.success("Metrics updated by AI Companion");
      }

      if (response.actions && response.actions.length > 0) {
        await executeAIActions(response.actions);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to Aurora");
    }
  }, [healthData, saveToSupabase, user, executeAIActions]);

  useEffect(() => {
    handleUserMessageRef.current = handleUserMessage;
  }, [handleUserMessage]);

  // Quick action checks
  const handleQuickWaterAdd = (amountMl: number) => {
    setHealthData(prev => {
      const updated = { ...prev, water: prev.water + amountMl };
      saveToSupabase(updated);
      toast.success(`Added ${amountMl}ml of water`);
      return updated;
    });
  };

  const handleCustomWaterAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const amount = parseInt(data.get('customWater') as string) || 0;
    if (amount > 0) {
      handleQuickWaterAdd(amount);
      e.currentTarget.reset();
    }
  };

  // Complete/skip habits
  const handleHabitAction = async (habitId: string, action: 'completed' | 'skipped' | 'active') => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      if (action === 'active') {
        // Delete log
        await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('date', todayStr);
        setHabits(prev => prev.map(h => h.id === habitId ? { ...h, completedToday: false, skippedToday: false } : h));
        toast.info("Habit progress reset");
      } else {
        // Upsert log
        await supabase.from('habit_logs').upsert({
          habit_id: habitId,
          date: todayStr,
          status: action
        }, { onConflict: 'habit_id,date' });

        setHabits(prev => prev.map(h => 
          h.id === habitId 
            ? { ...h, completedToday: action === 'completed', skippedToday: action === 'skipped' } 
            : h
        ));
        toast.success(action === 'completed' ? "Habit completed! Keep it up" : "Habit skipped");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not update habit log");
    }
  };

  const handlePauseHabit = async (habitId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    await supabase.from('habits').update({ status: nextStatus }).eq('id', habitId);
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, status: nextStatus } : h));
    toast.info(nextStatus === 'paused' ? 'Habit paused' : 'Habit resumed');
  };

  // Log meals manually
  const handleMealSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];

    setIsListening(false);
    try {
      // Estimate macros locally
      let calories = 200;
      let protein = 5;
      let carbs = 25;
      let fat = 4;

      const desc = mealDesc.toLowerCase();
      if (desc.includes('egg') || desc.includes('eggs')) {
        calories = 140; protein = 12; carbs = 1; fat = 10;
      } else if (desc.includes('chicken') || desc.includes('meat') || desc.includes('fish')) {
        calories = 380; protein = 35; carbs = 2; fat = 14;
      } else if (desc.includes('rice') || desc.includes('bread') || desc.includes('sandwich')) {
        calories = 300; protein = 8; carbs = 45; fat = 6;
      } else if (desc.includes('salad') || desc.includes('vegetables')) {
        calories = 120; protein = 3; carbs = 12; fat = 5;
      } else if (desc.includes('protein shake') || desc.includes('whey')) {
        calories = 180; protein = 25; carbs = 5; fat = 2;
      }

      const { data: newMeal } = await supabase.from('meals').insert({
        user_id: user.id,
        meal_type: mealCategory,
        description: mealDesc,
        calories,
        protein,
        carbs,
        fat,
        date: todayStr
      }).select().maybeSingle();

      if (newMeal) {
        setMeals(prev => [...prev, newMeal as unknown as Meal]);
        toast.success(`Logged ${mealCategory}`);
        setShowMealModal(false);
        setMealDesc('');
      }
    } catch {
      toast.error("Could not log meal");
    }
  };

  // Create habit manually
  const handleHabitSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !newHabitName.trim()) return;

    try {
      const { data: newHabit } = await supabase.from('habits').insert({
        user_id: user.id,
        name: newHabitName,
        category: newHabitCat,
        frequency: 'daily',
        status: 'active'
      }).select().maybeSingle();

      if (newHabit) {
        setHabits(prev => [...prev, {
          id: newHabit.id,
          name: newHabit.name,
          category: newHabit.category,
          frequency: newHabit.frequency,
          status: newHabit.status,
          completedToday: false,
          skippedToday: false
        }]);
        toast.success("Habit created!");
        setShowHabitModal(false);
        setNewHabitName('');
      }
    } catch {
      toast.error("Could not create habit");
    }
  };

  // Macro Totals
  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFat = meals.reduce((sum, m) => sum + m.fat, 0);

  // SVG Water Bottle Level Calc
  // target water: 2000 ml
  const bottleFillHeight = Math.min(100, Math.max(0, (healthData.water / 2000) * 100));
  const yFill = 180 - (bottleFillHeight * 140) / 100;

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast.error("Voice input not supported in this browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info("Listening... Speak now");
      } catch {
        toast.error("Couldn't start voice input");
      }
    }
  };

  // Auto Scroll Chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-dvh bg-zinc-950 text-white overflow-hidden font-sans">
      <Toaster position="top-center" richColors closeButton />

      {/* Header */}
      <div className="bg-zinc-950/95 border-b border-zinc-900 flex-none z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-500 rounded-2xl flex items-center justify-center">
              <Award className="w-5 h-5 text-zinc-950" />
            </div>
            <div>
              <div className="font-semibold text-base leading-none bg-gradient-to-r from-white to-zinc-350 bg-clip-text text-transparent">Aurora</div>
              <div className="text-[10px] text-emerald-400 font-medium">Health Companion</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSignOut}
              className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Screens Content */}
      <div className={`flex-1 ${activeTab === 'chat' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
        <div className="w-full max-w-md mx-auto h-full flex flex-col">
          <AnimatePresence mode="wait">

            {/* HOME VIEW */}
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="p-4 space-y-6 pb-16"
              >
                {/* Greeting / Insights Header */}
                <div className="pt-2">
                  <h1 className="text-2xl font-bold tracking-tight">
                    Welcome, {profile?.first_name || user?.user_metadata?.first_name || 'Friend'}.
                  </h1>
                  
                  {/* Daily Insight Card */}
                  <div className="mt-3 p-4 bg-gradient-to-tr from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-3xl">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-450 tracking-wider uppercase mb-1">
                      <Sparkles className="w-3.5 h-3.5" /> Daily Insights
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                      {healthData.sleep < 7.0 
                        ? "You slept slightly less than average last night. Prioritize hydration and consistent snacks today."
                        : "Your sleep metrics look steady today! Aim for 2000ml water to keep hydration locked."
                      }
                    </p>
                  </div>
                </div>

                {/* Bento Grid layout */}
                <div className="space-y-4">
                  
                  {/* Row 1: Hydration Card with SVG Bottle */}
                  <ErrorBoundary name="Hydration Widget">
                    <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-5 grid grid-cols-5 gap-4 items-center">
                      <div className="col-span-3 space-y-3">
                        <div className="flex items-center gap-2 text-blue-400">
                          <Droplet className="w-4 h-4" />
                          <span className="text-[10px] font-bold tracking-wider uppercase">Hydration</span>
                        </div>
                        <div>
                          <div className="text-3xl font-bold tabular-nums">
                            {healthData.water}
                            <span className="text-sm text-zinc-500 font-normal"> / 2000ml</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            {healthData.water >= 2000 ? "Goal met!" : `${2000 - healthData.water}ml remaining`}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleQuickWaterAdd(250)}
                            className="bg-zinc-850 hover:bg-zinc-800 text-xs px-2.5 py-1.5 rounded-xl border border-zinc-800 transition-colors font-semibold"
                          >
                            +250ml
                          </button>
                          <button
                            onClick={() => handleQuickWaterAdd(500)}
                            className="bg-zinc-850 hover:bg-zinc-800 text-xs px-2.5 py-1.5 rounded-xl border border-zinc-800 transition-colors font-semibold"
                          >
                            +500ml
                          </button>
                        </div>
                        
                        <form onSubmit={handleCustomWaterAdd} className="flex gap-1.5 pt-1">
                          <input 
                            type="number"
                            name="customWater"
                            placeholder="Custom..."
                            className="w-20 bg-zinc-950 border border-zinc-850 px-2 py-1 rounded-lg text-xs placeholder:text-zinc-650 focus:outline-none"
                          />
                          <button 
                            type="submit"
                            className="bg-white text-zinc-950 px-2.5 py-1 rounded-lg text-xs font-bold"
                          >
                            Add
                          </button>
                        </form>
                      </div>
                      
                      {/* Interactive SVG bottle container */}
                      <div className="col-span-2 flex justify-center">
                        <svg viewBox="0 0 100 200" className="w-24 h-44 drop-shadow-md">
                          <defs>
                            <clipPath id="bottle-clip">
                              <rect x="25" y="40" width="50" height="140" rx="15" />
                              <rect x="40" y="15" width="20" height="25" rx="4" />
                            </clipPath>
                            <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#60a5fa" />
                              <stop offset="100%" stopColor="#2563eb" />
                            </linearGradient>
                          </defs>
                          
                          {/* Bottle Glass Body outline */}
                          <rect x="23" y="38" width="54" height="144" rx="17" fill="none" stroke="#27272a" strokeWidth="2" />
                          <rect x="38" y="13" width="24" height="27" rx="5" fill="none" stroke="#27272a" strokeWidth="2" />
                          
                          {/* Water Fill with clip path */}
                          <g clipPath="url(#bottle-clip)">
                            <motion.rect
                              initial={{ y: 180 }}
                              animate={{ y: yFill }}
                              transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                              x="10"
                              width="80"
                              height="180"
                              fill="url(#water-grad)"
                            />
                          </g>
                          
                          {/* Measurement marks */}
                          <line x1="30" y1="75" x2="38" y2="75" stroke="#3f3f46" strokeWidth="1" />
                          <line x1="30" y1="110" x2="38" y2="110" stroke="#3f3f46" strokeWidth="1" />
                          <line x1="30" y1="145" x2="38" y2="145" stroke="#3f3f46" strokeWidth="1" />
                        </svg>
                      </div>
                    </div>
                  </ErrorBoundary>

                  {/* Row 2: Grid of Sleep & Streaks */}
                  <div className="grid grid-cols-2 gap-4">
                    <ErrorBoundary name="Sleep Widget">
                      <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-5 space-y-4">
                        <div className="flex items-center justify-between text-indigo-400">
                          <div className="flex items-center gap-1.5">
                            <Moon className="w-4 h-4" />
                            <span className="text-[9px] font-bold tracking-wider uppercase">Sleep</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold">{healthData.sleep}<span className="text-xs text-zinc-500 font-normal">h</span></div>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Consistency: 84%</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900">
                          <Clock className="w-3 h-3 text-zinc-550" />
                          <span>Bed: {profile?.bed_time || '22:30'}</span>
                        </div>
                      </div>
                    </ErrorBoundary>

                    <ErrorBoundary name="Streak Widget">
                      <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-5 space-y-4">
                        <div className="flex items-center justify-between text-orange-400">
                          <div className="flex items-center gap-1.5">
                            <Award className="w-4 h-4" />
                            <span className="text-[9px] font-bold tracking-wider uppercase">Streaks</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold">5<span className="text-xs text-zinc-500 font-normal"> days</span></div>
                          <p className="text-[10px] text-zinc-500 mt-0.5">Consistency score: 92%</p>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/15 px-2 py-1 rounded-full w-max">
                          ★ LEVEL 2 COACH
                        </div>
                      </div>
                    </ErrorBoundary>
                  </div>

                  {/* Row 3: Habits Checklist */}
                  <ErrorBoundary name="Habits Widget">
                    <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Check className="w-4 h-4" />
                          <span className="text-[10px] font-bold tracking-wider uppercase">Habits Due Today</span>
                        </div>
                        <button 
                          onClick={() => setShowHabitModal(true)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {habits.length === 0 ? (
                        <div className="text-center py-4 text-xs text-zinc-500">
                          No habits added. Tap "+" to add new habit.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {habits.map((habit) => (
                            <div key={habit.id} className="flex items-center justify-between bg-zinc-950/40 border border-zinc-900 p-2.5 rounded-2xl">
                              <div className="flex items-center gap-2.5">
                                <button
                                  onClick={() => handleHabitAction(habit.id, habit.completedToday ? 'active' : 'completed')}
                                  className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center ${
                                    habit.completedToday 
                                      ? 'bg-emerald-500 border-emerald-400 text-zinc-950' 
                                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                                  }`}
                                >
                                  {habit.completedToday && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </button>
                                <span className={`text-xs font-medium ${habit.completedToday ? 'line-through text-zinc-650' : 'text-zinc-200'} ${habit.status === 'paused' ? 'opacity-40' : ''}`}>
                                  {habit.name}
                                </span>
                              </div>
                              
                              <div className="flex gap-1.5 items-center">
                                <button
                                  onClick={() => handlePauseHabit(habit.id, habit.status)}
                                  title={habit.status === 'active' ? 'Pause' : 'Resume'}
                                  className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300"
                                >
                                  {habit.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => handleHabitAction(habit.id, habit.skippedToday ? 'active' : 'skipped')}
                                  title="Skip Today"
                                  className={`p-1 rounded text-xs px-2 ${
                                    habit.skippedToday ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                                  }`}
                                >
                                  Skip
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ErrorBoundary>

                  {/* Row 4: Nutrition / Meals logs */}
                  <ErrorBoundary name="Nutrition Widget">
                    <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                        <div className="flex items-center gap-2 text-rose-400">
                          <Heart className="w-4 h-4" />
                          <span className="text-[10px] font-bold tracking-wider uppercase">Nutrition Awareness</span>
                        </div>
                        <button 
                          onClick={() => setShowMealModal(true)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Macros Stats */}
                      <div className="grid grid-cols-4 gap-2 text-center bg-zinc-950/30 p-3 rounded-2xl border border-zinc-900">
                        <div>
                          <div className="text-sm font-bold">{totalCalories}</div>
                          <div className="text-[8px] text-zinc-550 font-bold uppercase">CALORIES</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-amber-400">{totalProtein}g</div>
                          <div className="text-[8px] text-zinc-550 font-bold uppercase">PROTEIN</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-blue-400">{totalCarbs}g</div>
                          <div className="text-[8px] text-zinc-550 font-bold uppercase">CARBS</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-rose-400">{totalFat}g</div>
                          <div className="text-[8px] text-zinc-550 font-bold uppercase">FAT</div>
                        </div>
                      </div>

                      {/* Meal Logs by category */}
                      <div className="space-y-2">
                        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => {
                          const mealLogs = meals.filter(m => m.meal_type === type);
                          return (
                            <div key={type} className="flex justify-between items-center bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-900">
                              <div className="flex items-center gap-2">
                                {type === 'breakfast' && <Coffee className="w-3.5 h-3.5 text-amber-400" />}
                                {type === 'lunch' && <Apple className="w-3.5 h-3.5 text-green-400" />}
                                {type === 'dinner' && <Pizza className="w-3.5 h-3.5 text-indigo-400" />}
                                {type === 'snack' && <Award className="w-3.5 h-3.5 text-purple-400" />}
                                <span className="text-xs font-semibold uppercase text-zinc-450">{type}</span>
                              </div>
                              <div className="text-right text-xs">
                                {mealLogs.length === 0 ? (
                                  <button 
                                    onClick={() => { setMealCategory(type); setShowMealModal(true); }}
                                    className="text-zinc-650 hover:text-zinc-400 text-[10px] font-semibold border-b border-dashed border-zinc-800"
                                  >
                                    Log Meal
                                  </button>
                                ) : (
                                  <span className="text-zinc-300 font-medium">{mealLogs.map(m => m.description).join(', ')}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </ErrorBoundary>

                </div>
              </motion.div>
            )}

            {/* CHAT TAB - Voice AI Companion */}
            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex flex-col h-full overflow-hidden"
              >
                {/* Chat Messages */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                      <div className="w-12 h-12 bg-emerald-500/10 text-emerald-450 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-zinc-350">Say something like: "I drank 500ml water" or "Log 8 hours sleep last night"</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {messages.map((msg) => (
                        <motion.div 
                          key={msg.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[82%] px-4 py-3.5 rounded-3xl text-[14px] leading-tight ${msg.isUser 
                            ? 'bg-white text-zinc-950 rounded-br-none font-medium' 
                            : 'bg-zinc-900 border border-zinc-850 rounded-bl-none'}`}>
                            {msg.text}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                {/* Preconfigured Quick Prompt Actions */}
                <div className="px-4 pb-3 flex gap-2 overflow-x-auto flex-none scrollbar-none">
                  {[
                    "I drank 500ml water",
                    "I slept 8 hours last night",
                    "Create habit to meditate every morning",
                    "I ate two eggs for breakfast"
                  ].map((action, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleUserMessage(action)}
                      className="text-[10px] font-bold text-zinc-450 whitespace-nowrap px-3.5 py-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 rounded-2xl transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>

                {/* Voice + Text Input Panel */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex-none relative">
                  <AnimatePresence mode="wait">
                    {isListening ? (
                      <motion.div
                        key="listening-ui"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="flex flex-col items-center justify-center space-y-3 py-2"
                      >
                        <div className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase animate-pulse">
                          Listening... Speak Naturally
                        </div>
                        <SiriOrb
                          size="110px"
                          animationDuration={6}
                          className="drop-shadow-[0_0_15px_rgba(99,102,241,0.25)]"
                        />
                        <button
                          onClick={toggleVoiceInput}
                          className="px-5 py-2 bg-red-500 hover:bg-red-650 text-white rounded-full text-[10px] font-bold tracking-wider uppercase transition-colors active:scale-95 flex items-center gap-1"
                        >
                          <MicOff className="w-3 h-3" /> Stop Listening
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="input-ui"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex gap-2 items-center"
                      >
                        <button 
                          onClick={toggleVoiceInput}
                          className="p-3.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-850 rounded-2xl transition-all active:scale-95"
                          title="Speak"
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                        <input
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (setInputText(''), handleUserMessage(inputText))}
                          placeholder="Message Aurora..."
                          className="flex-1 bg-zinc-900 border border-zinc-850 px-4 py-3.5 rounded-2xl text-xs placeholder:text-zinc-650 focus:outline-none"
                        />
                        <button 
                          onClick={() => { if (inputText.trim()) { handleUserMessage(inputText); setInputText(''); } }}
                          className="bg-white text-zinc-950 p-3.5 rounded-2xl hover:bg-zinc-150 transition-colors active:scale-95"
                        >
                          <Send className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {isSpeaking && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      Aurora Speaking
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* INSIGHTS TAB */}
            {activeTab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="p-4 space-y-6 pb-16"
              >
                <div>
                  <h2 className="font-bold text-xl">Weekly Analysis</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Hydration, sleep and activity stats</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-5">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-4">WATER INTAKE TREND</div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
                          <XAxis dataKey="day" stroke="#52525b" fontSize={10} />
                          <YAxis stroke="#52525b" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} />
                          <Bar dataKey="water" fill="#3b82f6" radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-5">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-4">SLEEP AND STEPS DURATION</div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
                          <XAxis dataKey="day" stroke="#52525b" fontSize={10} />
                          <YAxis stroke="#52525b" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }} />
                          <Line type="monotone" dataKey="sleep" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3 }} />
                          <Line type="monotone" dataKey="steps" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SETTINGS / PROFILE SCREEN */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="p-4 space-y-6 pb-16"
              >
                <div>
                  <h2 className="font-bold text-xl">Settings & Profile</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Manage health parameters and goals</p>
                </div>

                <div className="space-y-4">
                  {/* Profile Metrics summary */}
                  <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-850">
                      <User className="w-5 h-5 text-emerald-400" />
                      <div className="text-xs font-bold uppercase tracking-wider text-zinc-200">Personal Attributes</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-zinc-500 block">Age</span>
                        <span className="font-semibold text-zinc-200">{profile?.age || 25} yrs</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Gender</span>
                        <span className="font-semibold text-zinc-200 uppercase">{profile?.gender || 'Female'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Height</span>
                        <span className="font-semibold text-zinc-200">{profile?.height || 170} cm</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Weight</span>
                        <span className="font-semibold text-zinc-200">{profile?.weight || 65} kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Health Goals Summary */}
                  <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-850">
                      <Award className="w-5 h-5 text-orange-400" />
                      <div className="text-xs font-bold uppercase tracking-wider text-zinc-200">Core Goals</div>
                    </div>
                    
                    {profile?.goals && profile.goals.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {profile.goals.map((goal, i) => (
                          <span key={i} className="text-[10px] font-bold bg-zinc-950 text-zinc-350 border border-zinc-850 px-2.5 py-1 rounded-full">
                            ✓ {goal}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500 py-1">No custom goals configured.</div>
                    )}
                  </div>

                  {/* Device Integrations */}
                  <div className="bg-zinc-900/60 border border-zinc-850 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-blue-400" />
                        <div className="text-xs font-bold uppercase tracking-wider text-zinc-200">Device Connections</div>
                      </div>
                      <span className="bg-zinc-850 text-zinc-500 text-[8px] font-bold px-2 py-0.5 rounded uppercase">optional</span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-900">
                        <span className="text-xs font-semibold text-zinc-350">Apple Health</span>
                        <button className="text-[10px] bg-zinc-850 text-zinc-400 border border-zinc-800 px-3 py-1 rounded-full font-bold">Connect</button>
                      </div>
                      <div className="flex justify-between items-center bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-900">
                        <span className="text-xs font-semibold text-zinc-350">Google Health Connect</span>
                        <button className="text-[10px] bg-zinc-850 text-zinc-400 border border-zinc-800 px-3 py-1 rounded-full font-bold">Connect</button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Manual Meal Logging dialog overlay */}
      <AnimatePresence>
        {showMealModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-sm text-white space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold uppercase tracking-wide">Log Meal</h3>
                <button 
                  onClick={() => setShowMealModal(false)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleMealSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="meal-select" className="text-xs font-bold text-zinc-450 uppercase">Meal Type</label>
                  <select
                    id="meal-select"
                    value={mealCategory}
                    onChange={(e) => setMealCategory(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-850 px-4 py-3 rounded-2xl text-xs focus:outline-none"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="meal-desc-input" className="text-xs font-bold text-zinc-450 uppercase">What did you eat?</label>
                  <input
                    id="meal-desc-input"
                    type="text"
                    required
                    placeholder="e.g. 2 boiled eggs and wheat toast"
                    value={mealDesc}
                    onChange={(e) => setMealDesc(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 px-4 py-3 rounded-2xl text-xs focus:outline-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-white text-zinc-950 font-bold rounded-2xl text-xs transition-transform active:scale-[0.98]"
                >
                  Save Log
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Habit Creation dialog overlay */}
      <AnimatePresence>
        {showHabitModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-sm text-white space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold uppercase tracking-wide">Add Habit</h3>
                <button 
                  onClick={() => setShowHabitModal(false)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleHabitSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="habit-name-input" className="text-xs font-bold text-zinc-450 uppercase">Habit Title</label>
                  <input
                    id="habit-name-input"
                    type="text"
                    required
                    placeholder="e.g. Read for 15 minutes"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 px-4 py-3 rounded-2xl text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="habit-category-select" className="text-xs font-bold text-zinc-450 uppercase">Category</label>
                  <select
                    id="habit-category-select"
                    value={newHabitCat}
                    onChange={(e) => setNewHabitCat(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 px-4 py-3 rounded-2xl text-xs focus:outline-none"
                  >
                    <option value="meditate">Meditation</option>
                    <option value="read">Reading</option>
                    <option value="stretch">Stretching</option>
                    <option value="walk">Walking</option>
                    <option value="journal">Journaling</option>
                    <option value="general">General Routine</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-white text-zinc-950 font-bold rounded-2xl text-xs transition-transform active:scale-[0.98]"
                >
                  Create Habit
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Dock */}
      <div className="flex-none z-50 pb-4 pt-2 flex justify-center bg-zinc-950/95 border-t border-zinc-900/50">
        <MacOSDock
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as any)}
          items={[
            { id: 'home',     label: 'Home',     icon: <HomeIcon className="w-5 h-5" /> },
            { id: 'chat',     label: 'Coach',    icon: <MessageIcon className="w-5 h-5" /> },
            { id: 'insights', label: 'Insights', icon: <ChartIcon className="w-5 h-5" /> },
            { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
          ]}
        />
      </div>
    </div>
  );
}
