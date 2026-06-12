'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  User, Calendar, Activity, ArrowLeft, ArrowRight, Check, 
  Droplet, Moon, Award, Bell, ShieldAlert 
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

interface ProfileData {
  first_name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  wake_time: string;
  bed_time: string;
  activity_level: 'low' | 'medium' | 'high';
  goals: string[];
  notification_prefs: {
    hydration: boolean;
    sleep: boolean;
    habits: boolean;
    insights: boolean;
  };
}

const initialProfile: ProfileData = {
  first_name: '',
  age: 25,
  gender: 'female',
  height: 170,
  weight: 65,
  wake_time: '07:00',
  bed_time: '22:30',
  activity_level: 'medium',
  goals: [],
  notification_prefs: {
    hydration: true,
    sleep: true,
    habits: true,
    insights: true,
  }
};

const goalOptions = [
  'Improve Hydration',
  'Sleep Better',
  'Build Better Habits',
  'Eat Healthier',
  'Improve Energy Levels',
  'Improve Consistency'
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentication required.');
        router.push('/signin');
        return;
      }
      
      // Load current metadata name as default
      if (user.user_metadata?.first_name) {
        setProfile(prev => ({ ...prev, first_name: user.user_metadata.first_name }));
      }
      setIsReady(true);
    };
    checkUser();
  }, [supabase, router]);

  const handleGoalToggle = (goal: string) => {
    setProfile(prev => {
      const goals = prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal];
      return { ...prev, goals };
    });
  };

  const handleNext = () => {
    if (step === 1 && !profile.first_name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Insert/Upsert user profile in table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          first_name: profile.first_name,
          age: Number(profile.age),
          gender: profile.gender,
          height: Number(profile.height),
          weight: Number(profile.weight),
          wake_time: profile.wake_time,
          bed_time: profile.bed_time,
          activity_level: profile.activity_level,
          goals: profile.goals,
          notification_prefs: profile.notification_prefs
        });

      if (profileError) throw profileError;

      // 2. Insert standard default habits for the user based on selected goals
      const defaultHabits = [];
      if (profile.goals.includes('Improve Hydration')) {
        defaultHabits.push({ user_id: user.id, name: 'Drink Water (2L)', category: 'hydrate', frequency: 'daily' });
      }
      if (profile.goals.includes('Sleep Better')) {
        defaultHabits.push({ user_id: user.id, name: 'Sleep before 11 PM', category: 'sleep', frequency: 'daily' });
      }
      if (profile.goals.includes('Build Better Habits')) {
        defaultHabits.push({ user_id: user.id, name: 'Morning Meditation', category: 'meditate', frequency: 'daily' });
      }
      if (profile.goals.includes('Eat Healthier')) {
        defaultHabits.push({ user_id: user.id, name: 'Log all meals', category: 'meals', frequency: 'daily' });
      }

      if (defaultHabits.length > 0) {
        await supabase.from('habits').insert(defaultHabits);
      }

      // 3. Mark auth user metadata as onboarded so middleware/dashboard knows
      await supabase.auth.updateUser({
        data: { onboarded: true, first_name: profile.first_name }
      });

      toast.success('Welcome to Aurora!', { description: 'Your profile has been created.' });
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Error saving profile onboarding details:', err);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-white">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-zinc-950 text-white p-6 overflow-y-auto">
      <Toaster position="top-center" richColors closeButton />
      
      {/* Header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pb-6 border-b border-zinc-900 flex-none">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">Onboarding</span>
          <span className="bg-zinc-800 text-zinc-350 text-[10px] px-2 py-0.5 rounded-full font-bold">Step {step} of 4</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map(s => (
            <div 
              key={s} 
              className={`w-6 h-1.5 rounded-full transition-colors duration-300 ${s <= step ? 'bg-emerald-400' : 'bg-zinc-850'}`}
            />
          ))}
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="flex-1 max-w-md w-full mx-auto flex flex-col justify-center py-6 min-h-[350px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Let's get to know you.</h2>
                <p className="text-xs text-zinc-500">Provide your basic profile details for customized health plans.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="name-input" className="text-xs font-semibold text-zinc-400">FIRST NAME</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-4 h-4 text-zinc-650" />
                    <input
                      id="name-input"
                      type="text"
                      placeholder="Enter your name"
                      value={profile.first_name}
                      onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full bg-zinc-900/60 border border-zinc-850 focus:border-zinc-700 pl-11 pr-4 py-3.5 rounded-2xl text-sm focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="age-input" className="text-xs font-semibold text-zinc-400">AGE</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-3.5 w-4 h-4 text-zinc-650" />
                      <input
                        id="age-input"
                        type="number"
                        min="1"
                        max="120"
                        value={profile.age}
                        onChange={(e) => setProfile(prev => ({ ...prev, age: parseInt(e.target.value) || 25 }))}
                        className="w-full bg-zinc-900/60 border border-zinc-850 focus:border-zinc-700 pl-11 pr-4 py-3.5 rounded-2xl text-sm focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="gender-select" className="text-xs font-semibold text-zinc-400">GENDER</label>
                    <select
                      id="gender-select"
                      value={profile.gender}
                      onChange={(e) => setProfile(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full bg-zinc-900/60 border border-zinc-850 focus:border-zinc-700 px-4 py-3.5 rounded-2xl text-sm focus:outline-none focus:ring-0 text-white"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Your physical parameters.</h2>
                <p className="text-xs text-zinc-500">We use these details to configure target metrics like daily hydration levels.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="height-input" className="text-xs font-semibold text-zinc-400">HEIGHT (CM)</label>
                  <input
                    id="height-input"
                    type="number"
                    min="50"
                    max="280"
                    value={profile.height}
                    onChange={(e) => setProfile(prev => ({ ...prev, height: parseInt(e.target.value) || 170 }))}
                    className="w-full bg-zinc-900/60 border border-zinc-850 focus:border-zinc-700 px-4 py-3.5 rounded-2xl text-sm focus:outline-none focus:ring-0"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="weight-input" className="text-xs font-semibold text-zinc-400">WEIGHT (KG)</label>
                  <input
                    id="weight-input"
                    type="number"
                    min="20"
                    max="400"
                    value={profile.weight}
                    onChange={(e) => setProfile(prev => ({ ...prev, weight: parseInt(e.target.value) || 65 }))}
                    className="w-full bg-zinc-900/60 border border-zinc-850 focus:border-zinc-700 px-4 py-3.5 rounded-2xl text-sm focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Lifestyle routine.</h2>
                <p className="text-xs text-zinc-500">Wake-up/sleeping times assist in scheduling habit checkpoints and hydration triggers.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="wake-time-input" className="text-xs font-semibold text-zinc-400">WAKE-UP TIME</label>
                    <input
                      id="wake-time-input"
                      type="time"
                      value={profile.wake_time}
                      onChange={(e) => setProfile(prev => ({ ...prev, wake_time: e.target.value }))}
                      className="w-full bg-zinc-900/60 border border-zinc-850 focus:border-zinc-700 px-4 py-3.5 rounded-2xl text-sm focus:outline-none focus:ring-0 text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="sleep-time-input" className="text-xs font-semibold text-zinc-400">BEDTIME</label>
                    <input
                      id="sleep-time-input"
                      type="time"
                      value={profile.bed_time}
                      onChange={(e) => setProfile(prev => ({ ...prev, bed_time: e.target.value }))}
                      className="w-full bg-zinc-900/60 border border-zinc-850 focus:border-zinc-700 px-4 py-3.5 rounded-2xl text-sm focus:outline-none focus:ring-0 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="activity-select" className="text-xs font-semibold text-zinc-400">DAILY ACTIVITY LEVEL</label>
                  <select
                    id="activity-select"
                    value={profile.activity_level}
                    onChange={(e) => setProfile(prev => ({ ...prev, activity_level: e.target.value as 'low' | 'medium' | 'high' }))}
                    className="w-full bg-zinc-900/60 border border-zinc-850 focus:border-zinc-700 px-4 py-3.5 rounded-2xl text-sm focus:outline-none focus:ring-0 text-white"
                  >
                    <option value="low">Sedentary (Minimal exercise)</option>
                    <option value="medium">Moderately Active (Light walk/runs)</option>
                    <option value="high">Very Active (Heavy training/sports)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Your Health Goals.</h2>
                <p className="text-xs text-zinc-500">Pick targets to personalize Aurora notifications and habit checklist prompts.</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {goalOptions.map((goal) => {
                  const isSelected = profile.goals.includes(goal);
                  return (
                    <button
                      key={goal}
                      onClick={() => handleGoalToggle(goal)}
                      className={`text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between text-xs font-semibold ${
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-400/50 text-emerald-450' 
                          : 'bg-zinc-900/60 border-zinc-850 hover:border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span>{goal}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-zinc-900 space-y-3">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" /> Notification Preferences
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2.5 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.notification_prefs.hydration}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        notification_prefs: { ...prev.notification_prefs, hydration: e.target.checked }
                      }))}
                      className="rounded text-emerald-500 focus:ring-0 bg-zinc-800 border-zinc-700 w-4 h-4"
                    />
                    <span>Hydration</span>
                  </label>

                  <label className="flex items-center gap-2.5 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.notification_prefs.sleep}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        notification_prefs: { ...prev.notification_prefs, sleep: e.target.checked }
                      }))}
                      className="rounded text-emerald-500 focus:ring-0 bg-zinc-800 border-zinc-700 w-4 h-4"
                    />
                    <span>Sleep</span>
                  </label>

                  <label className="flex items-center gap-2.5 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.notification_prefs.habits}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        notification_prefs: { ...prev.notification_prefs, habits: e.target.checked }
                      }))}
                      className="rounded text-emerald-500 focus:ring-0 bg-zinc-800 border-zinc-700 w-4 h-4"
                    />
                    <span>Habits</span>
                  </label>

                  <label className="flex items-center gap-2.5 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.notification_prefs.insights}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        notification_prefs: { ...prev.notification_prefs, insights: e.target.checked }
                      }))}
                      className="rounded text-emerald-500 focus:ring-0 bg-zinc-800 border-zinc-700 w-4 h-4"
                    />
                    <span>Insights</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Controls */}
      <div className="max-w-md w-full mx-auto pt-6 border-t border-zinc-900 flex justify-between gap-4 flex-none">
        {step > 1 ? (
          <button
            onClick={handleBack}
            disabled={isLoading}
            className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-850 active:bg-zinc-850 text-zinc-350 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 border border-zinc-850 transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <div className="flex-1" />
        )}

        {step < 4 ? (
          <button
            onClick={handleNext}
            className="flex-1 py-3.5 bg-white text-zinc-950 font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 hover:bg-zinc-100 transition-all active:scale-[0.98]"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 py-3.5 bg-gradient-to-tr from-emerald-500 to-teal-400 text-zinc-950 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 hover:from-emerald-450 hover:to-teal-350 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Finish Setup <Check className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
