-- ====================================================
-- Aurora Mobile Health Companion — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ====================================================

-- 1. Create the health_logs table (Core Metrics)
CREATE TABLE IF NOT EXISTS public.health_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    water INTEGER DEFAULT 0, -- represented in ml (e.g. 250, 500, 2000)
    sleep NUMERIC(4,2) DEFAULT 0,
    steps INTEGER DEFAULT 0,
    mood INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Enable RLS on health_logs
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

-- 2. Create the user_profiles table (Onboarding Questionnaire Metadata)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    first_name TEXT,
    age INTEGER,
    gender TEXT,
    height NUMERIC, -- in cm
    weight NUMERIC, -- in kg
    wake_time TEXT, -- e.g. "07:00"
    bed_time TEXT,  -- e.g. "22:30"
    activity_level TEXT, -- e.g. "low", "medium", "high"
    goals TEXT[], -- e.g. ['Improve Hydration', 'Sleep Better']
    notification_prefs JSONB DEFAULT '{"hydration": true, "sleep": true, "habits": true, "insights": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create the habits table (Habit Formation)
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    frequency TEXT DEFAULT 'daily', -- daily, weekly
    category TEXT DEFAULT 'general', -- e.g. reading, meditation, stretching, walking
    status TEXT DEFAULT 'active', -- active, paused
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on habits
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

-- 4. Create the habit_logs table (Habit Completion Logs)
CREATE TABLE IF NOT EXISTS public.habit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL, -- completed, skipped
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_habit_date UNIQUE (habit_id, date)
);

-- Enable RLS on habit_logs
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create the meals table (Nutrition Log)
CREATE TABLE IF NOT EXISTS public.meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_type TEXT NOT NULL, -- breakfast, lunch, dinner, snack
    description TEXT NOT NULL,
    calories INTEGER DEFAULT 0,
    protein INTEGER DEFAULT 0,
    carbs INTEGER DEFAULT 0,
    fat INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on meals
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;


-- ====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================

-- Policies for health_logs
CREATE POLICY "Users can view their own health logs" ON public.health_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own health logs" ON public.health_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own health logs" ON public.health_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policies for habits
CREATE POLICY "Users can view their own habits" ON public.habits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own habits" ON public.habits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own habits" ON public.habits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own habits" ON public.habits FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for habit_logs (via join check or direct match check)
CREATE POLICY "Users can view their own habit logs" ON public.habit_logs 
    FOR SELECT TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_logs.habit_id AND h.user_id = auth.uid()));

CREATE POLICY "Users can insert their own habit logs" ON public.habit_logs 
    FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_logs.habit_id AND h.user_id = auth.uid()));

CREATE POLICY "Users can update/delete their own habit logs" ON public.habit_logs 
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_logs.habit_id AND h.user_id = auth.uid()));

-- Policies for meals
CREATE POLICY "Users can view their own meals" ON public.meals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meals" ON public.meals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meals" ON public.meals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meals" ON public.meals FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- ====================================================
-- TRIGGERS & HELPERS
-- ====================================================

-- Automated updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_health_logs BEFORE UPDATE ON public.health_logs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_user_profiles BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_habits BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
