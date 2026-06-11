'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, TrendingUp, Droplet, Moon, Award, MessageCircle, User } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { SiriWave } from './components/SiriWave';
import { SiriOrb } from '@/components/ui/siri-orb';
import { AppleActivityCard } from '@/components/ui/apple-activity-ring';
import { MacOSDock, HomeIcon, MessageIcon, ChartIcon } from '@/components/ui/mac-os-dock';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface HealthData {
  water: number;
  sleep: number;
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

const initialHealthData: HealthData = {
  water: 5,
  sleep: 7.5,
  steps: 8200,
  mood: 8,
  lastUpdated: '2026-06-11T00:00:00.000Z',
};

const initialWeeklyData: WeeklyData[] = [
  { day: 'Mon', water: 6, sleep: 7, steps: 9500 },
  { day: 'Tue', water: 4, sleep: 6.5, steps: 7200 },
  { day: 'Wed', water: 7, sleep: 8, steps: 11000 },
  { day: 'Thu', water: 5, sleep: 7, steps: 8500 },
  { day: 'Fri', water: 6, sleep: 7.5, steps: 9800 },
  { day: 'Sat', water: 3, sleep: 9, steps: 4500 },
  { day: 'Sun', water: 5, sleep: 7.5, steps: 8200 },
];

export default function HealthCompanion() {
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'insights'>('home');
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hi! I'm your AI Health Coach. How are you feeling today?", isUser: false, timestamp: new Date('2026-06-11T00:00:00.000Z') }
  ]);
  const [inputText, setInputText] = useState('');
  const [healthData, setHealthData] = useState<HealthData>(initialHealthData);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>(initialWeeklyData);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognitionRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Load from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('healthData');
    if (savedData) {
      setHealthData(JSON.parse(savedData));
    } else {
      setHealthData(prev => ({ ...prev, lastUpdated: new Date().toISOString() }));
    }
    
    const savedWeekly = localStorage.getItem('weeklyData');
    if (savedWeekly) setWeeklyData(JSON.parse(savedWeekly));
    
    const savedMessages = localStorage.getItem('messages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(parsed);
      } catch (e) {
        setMessages(JSON.parse(savedMessages));
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('healthData', JSON.stringify(healthData));
  }, [healthData]);

  useEffect(() => {
    localStorage.setItem('weeklyData', JSON.stringify(weeklyData));
  }, [weeklyData]);

  useEffect(() => {
    localStorage.setItem('messages', JSON.stringify(messages));
  }, [messages]);

  // Initialize Speech APIs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          handleUserMessage(transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
          toast.error("Couldn't hear you clearly. Try again!");
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const speak = (text: string) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  // Agentic AI Response Engine
  const generateAIResponse = (userMessage: string): { text: string; updatedData?: Partial<HealthData> } => {
    const lowerMsg = userMessage.toLowerCase();
    let response = "";
    let updates: Partial<HealthData> = {};

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
      if (lowerMsg.includes('improve') || lowerMsg.includes('better')) {
        response = `Based on your data, you averaged 7.4 hours this week. Try winding down 30 mins earlier and avoiding screens. Want me to set a bedtime reminder?`;
      } else if (lowerMsg.includes('how')) {
        response = `Last night you got ${healthData.sleep} hours. Solid! Your weekly average is looking healthy.`;
      } else {
        response = `Your sleep looks good overall. Anything specific bothering you?`;
      }
    } 
    // Weekly progress
    else if (lowerMsg.includes('week') || lowerMsg.includes('doing') || lowerMsg.includes('progress')) {
      const avgWater = Math.round(weeklyData.reduce((sum, d) => sum + d.water, 0) / 7);
      const avgSleep = (weeklyData.reduce((sum, d) => sum + d.sleep, 0) / 7).toFixed(1);
      response = `This week you're averaging ${avgWater} glasses of water and ${avgSleep} hours of sleep. Your steps are strong mid-week! You're making great progress.`;
    } 
    // Habits
    else if (lowerMsg.includes('habit') || lowerMsg.includes('focus')) {
      response = `I recommend focusing on consistent water intake and getting to bed before 11pm. Your mood is highest on days you hit 8k steps.`;
    } 
    // Mood / General check-in
    else if (lowerMsg.includes('feel') || lowerMsg.includes('mood') || lowerMsg.includes('today')) {
      response = `Your mood score is ${healthData.mood}/10 — nice! How's your energy today?`;
    } 
    // Default conversational
    else {
      const responses = [
        "That's interesting! Tell me more about how you're feeling.",
        "I'm here to help. Want me to check any of your metrics?",
        "Thanks for sharing. How else can I support you today?",
      ];
      response = responses[Math.floor(Math.random() * responses.length)];
    }

    return { text: response, updatedData: Object.keys(updates).length > 0 ? updates : undefined };
  };

  const handleUserMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now(),
      text: text.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);

    // Generate AI response
    setTimeout(() => {
      const { text: aiText, updatedData } = generateAIResponse(text);

      const aiMsg: Message = {
        id: Date.now() + 1,
        text: aiText,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);
      speak(aiText);

      // Update health data agentically
      if (updatedData) {
        const newData = { ...healthData, ...updatedData };
        setHealthData(newData);
        
        // Update today's weekly data
        const today = new Date().getDay();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayName = dayNames[today];
        
        setWeeklyData(prev => 
          prev.map(day => 
            day.day === todayName 
              ? { ...day, water: newData.water, sleep: newData.sleep, steps: newData.steps }
              : day
          )
        );
        
        toast.success('Health data updated!', { description: 'AI Coach logged your progress' });
      }
    }, 600);
  };

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
      } catch (e) {
        toast.error("Couldn't start voice input");
      }
    }
  };

  const sendTextMessage = () => {
    if (inputText.trim()) {
      handleUserMessage(inputText);
      setInputText('');
    }
  };

  const quickActions = [
    "How am I doing this week?",
    "Did I drink enough water?",
    "How can I improve my sleep?",
    "What habits should I focus on?",
  ];

  return (
    <div className="flex flex-col h-dvh bg-zinc-950 text-white overflow-hidden">
      <Toaster position="top-center" richColors closeButton />

      {/* Header */}
      <div className="bg-zinc-950/95 border-b border-zinc-800 flex-none z-50">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-2xl flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-lg">Aether</div>
              <div className="text-[10px] text-emerald-400 -mt-1">AI Health Coach</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Online
          </div>
        </div>
      </div>

      {/* Main Content Area with animated tab transitions */}
      <div className={`flex-1 ${activeTab === 'chat' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
        <div className="w-full max-w-md mx-auto h-full flex flex-col">
          <AnimatePresence mode="wait">

            {/* HOME TAB */}
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                className="p-4 space-y-6 pb-12"
              >
                {/* Greeting */}
                <div className="pt-2">
                  <div className="text-3xl font-semibold tracking-tight">Good afternoon, Alex.</div>
                  <div className="text-zinc-400 mt-1">You're doing great today.</div>
                </div>

                {/* Apple Activity Rings */}
                <AppleActivityCard 
                  title="Activity Goals"
                  moveProgress={healthData.steps / 10000}
                  exerciseProgress={0.70}
                  standProgress={healthData.sleep / 8}
                />

                {/* Today's Metrics */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="text-sm font-medium text-zinc-400">TODAY'S SNAPSHOT</div>
                    <div className="text-[10px] px-2 py-0.5 bg-zinc-900 rounded text-zinc-500">Updated just now</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5"
                    >
                      <div className="flex items-center gap-2 text-emerald-400 mb-4">
                        <Droplet className="w-4 h-4" /> <span className="text-xs font-medium tracking-widest">WATER</span>
                      </div>
                      <div className="text-5xl font-semibold tabular-nums">{healthData.water}<span className="text-2xl text-zinc-500">/8</span></div>
                      <div className="text-xs text-zinc-500 mt-1">glasses</div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5"
                    >
                      <div className="flex items-center gap-2 text-indigo-400 mb-4">
                        <Moon className="w-4 h-4" /> <span className="text-xs font-medium tracking-widest">SLEEP</span>
                      </div>
                      <div className="text-5xl font-semibold tabular-nums">{healthData.sleep}</div>
                      <div className="text-xs text-zinc-500 mt-1">hours last night</div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5"
                    >
                      <div className="flex items-center gap-2 text-orange-400 mb-4">
                        <TrendingUp className="w-4 h-4" /> <span className="text-xs font-medium tracking-widest">STEPS</span>
                      </div>
                      <div className="text-5xl font-semibold tabular-nums">{healthData.steps.toLocaleString()}</div>
                      <div className="text-xs text-zinc-500 mt-1">of 10k goal</div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5"
                    >
                      <div className="flex items-center gap-2 text-rose-400 mb-4">
                        <User className="w-4 h-4" /> <span className="text-xs font-medium tracking-widest">MOOD</span>
                      </div>
                      <div className="text-5xl font-semibold tabular-nums">{healthData.mood}<span className="text-2xl text-zinc-500">/10</span></div>
                      <div className="text-xs text-zinc-500 mt-1">feeling great</div>
                    </motion.div>
                  </div>
                </div>

                {/* Voice CTA */}
                <motion.button
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  onClick={() => setActiveTab('chat')}
                  className="w-full bg-white text-black py-4 rounded-3xl font-medium flex items-center justify-center gap-3 active:bg-zinc-100 transition-all active:scale-[0.985]"
                >
                  <MessageCircle className="w-5 h-5" /> Talk to your AI Coach
                </motion.button>
              </motion.div>
            )}

            {/* CHAT TAB - Voice AI */}
            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                className="flex flex-col h-full overflow-hidden"
              >
                {/* Chat Messages */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-4">
                  <AnimatePresence>
                    {messages.map((msg) => (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[82%] px-4 py-3 rounded-3xl text-[15px] leading-tight ${msg.isUser 
                          ? 'bg-white text-black rounded-br-none' 
                          : 'bg-zinc-800 rounded-bl-none'}`}>
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Quick Prompts */}
                <div className="px-4 pb-3 flex gap-2 overflow-x-auto flex-none">
                  {quickActions.map((action, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleUserMessage(action)}
                      className="text-xs whitespace-nowrap px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-800 border border-zinc-800 rounded-2xl transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>

                {/* Voice + Text Input */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex-none relative">
                  <AnimatePresence mode="wait">
                    {isListening ? (
                      <motion.div
                        key="listening-ui"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex flex-col items-center justify-center space-y-3 py-2"
                      >
                        <div className="text-center text-xs text-indigo-400 animate-pulse font-medium tracking-wide">
                          LISTENING... SPEAK NOW
                        </div>
                        
                        {/* Siri Orb component */}
                        <SiriOrb
                          size="130px"
                          animationDuration={8}
                          className="drop-shadow-[0_0_20px_rgba(168,85,247,0.35)]"
                        />
                        
                        <button
                          onClick={toggleVoiceInput}
                          className="px-6 py-2 bg-red-500 text-white rounded-full text-xs font-semibold hover:bg-red-600 transition-colors active:scale-95 flex items-center gap-1.5 shadow-lg shadow-red-500/20"
                        >
                          <MicOff className="w-3.5 h-3.5" /> Tap to Stop
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="input-ui"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex gap-2 items-center"
                      >
                        <button 
                          onClick={toggleVoiceInput}
                          className="p-4 rounded-3xl flex items-center justify-center transition-all active:scale-[0.985] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800"
                          title="Speak Naturally"
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                        
                        <input
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                          placeholder="Or type here..."
                          className="flex-1 bg-zinc-900 border border-zinc-800 px-5 py-4 rounded-3xl text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
                        />
                        <button 
                          onClick={sendTextMessage} 
                          className="bg-white text-black p-4 rounded-3xl hover:bg-zinc-200 active:bg-zinc-300 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {isSpeaking && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full animate-pulse flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      AI Coach Speaking
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* INSIGHTS TAB */}
            {activeTab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                className="p-4 pb-12 space-y-8"
              >
                <div>
                  <div className="font-semibold text-xl mb-1">Weekly Insights</div>
                  <div className="text-sm text-zinc-400">Your trends at a glance</div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5"
                >
                  <div className="text-xs text-zinc-400 mb-3 tracking-[1px]">WATER INTAKE</div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="day" stroke="#52525b" />
                        <YAxis stroke="#52525b" />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px' }} />
                        <Bar dataKey="water" fill="#10b981" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5"
                >
                  <div className="text-xs text-zinc-400 mb-3 tracking-[1px]">SLEEP & STEPS</div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="day" stroke="#52525b" />
                        <YAxis stroke="#52525b" />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px' }} />
                        <Line type="natural" dataKey="sleep" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} />
                        <Line type="natural" dataKey="steps" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Navigation — macOS Dock */}
      <div className="flex-none z-50 pb-4 pt-2 flex justify-center bg-zinc-950/95 border-t border-zinc-800/50">
        <MacOSDock
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as 'home' | 'chat' | 'insights')}
          items={[
            { id: 'home',     label: 'Home',     icon: <HomeIcon className="w-5 h-5" /> },
            { id: 'chat',     label: 'Coach',    icon: <MessageIcon className="w-5 h-5" /> },
            { id: 'insights', label: 'Insights', icon: <ChartIcon className="w-5 h-5" /> },
          ]}
        />
      </div>
    </div>
  );
}
