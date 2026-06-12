-- ==========================================
-- Health Companion — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Create the health_logs table
CREATE TABLE IF NOT EXISTS public.health_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    water INTEGER DEFAULT 0,
    sleep NUMERIC(4,2) DEFAULT 0,
    steps INTEGER DEFAULT 0,
    mood INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

-- 3. Create security policies for authenticated users
CREATE POLICY "Users can view their own health logs"
    ON public.health_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health logs"
    ON public.health_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health logs"
    ON public.health_logs
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Automated updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.health_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
