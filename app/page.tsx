'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight, Activity, Sparkles, Droplet, Moon, Heart } from 'lucide-react';
import Link from 'next/link';

interface Slide {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

const slides: Slide[] = [
  {
    title: "Meet your personal health companion.",
    subtitle: "Understand yourself better every day with Aurora. Your personalized guide to wellness.",
    icon: <Sparkles className="w-16 h-16 text-emerald-400" />,
    color: "from-emerald-500/20 to-teal-500/20",
  },
  {
    title: "Track hydration, sleep, habits, and nutrition.",
    subtitle: "A unified place to monitor your daily water intake, sleep cycles, active habits, and meals.",
    icon: <Droplet className="w-16 h-16 text-blue-400" />,
    color: "from-blue-500/20 to-indigo-500/20",
  },
  {
    title: "Receive personalized daily insights.",
    subtitle: "Get smart advice tailored to your active logs, helping you adjust your routines in real time.",
    icon: <Activity className="w-16 h-16 text-purple-400" />,
    color: "from-purple-500/20 to-pink-500/20",
  },
  {
    title: "Build healthier routines through consistency.",
    subtitle: "Track streaks, unlock achievements, and build lasting habits with supportive reminders.",
    icon: <Moon className="w-16 h-16 text-indigo-400" />,
    color: "from-indigo-500/20 to-violet-500/20",
  },
  {
    title: "Learn more about yourself every day.",
    subtitle: "Aurora understands you and helps you achieve a calm, premium, and healthy daily lifestyle.",
    icon: <Heart className="w-16 h-16 text-rose-400" />,
    color: "from-rose-500/20 to-orange-500/20",
  }
];

export default function IntroPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  // Auto-advance slide every 5 seconds if user is idle
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleNext = () => {
    if (currentSlide === slides.length - 1) {
      router.push('/signup');
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    router.push('/signup');
  };

  const activeSlide = slides[currentSlide];

  return (
    <div className="flex-1 flex flex-col justify-between bg-zinc-950 text-white overflow-hidden p-6 relative">
      {/* Background Glow */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <div className={`w-[280px] h-[280px] rounded-full bg-gradient-to-tr ${activeSlide.color} blur-[60px] opacity-40 transition-all duration-1000`} />
      </div>

      {/* Header */}
      <div className="z-10 flex items-center justify-between w-full max-w-md mx-auto pt-4 flex-none">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center">
            <Activity className="w-4 h-4 text-zinc-950 font-bold" />
          </div>
          <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
            Aurora
          </span>
        </div>
        <button
          onClick={handleSkip}
          className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Slide Content */}
      <div className="z-10 flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto my-auto py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center text-center space-y-6"
          >
            {/* Animated Icon Container */}
            <motion.div
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="w-32 h-32 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl flex items-center justify-center shadow-xl shadow-black/30"
            >
              {activeSlide.icon}
            </motion.div>

            {/* Slide Text */}
            <div className="space-y-3 px-2">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl leading-snug">
                {activeSlide.title}
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-[320px] mx-auto">
                {activeSlide.subtitle}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Indicators & CTAs */}
      <div className="z-10 w-full max-w-md mx-auto space-y-6 pb-6 flex-none">
        {/* Indicators */}
        <div className="flex justify-center gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentSlide ? 'w-6 bg-emerald-400' : 'w-1.5 bg-zinc-800'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleNext}
            className="w-full py-4 bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-950 font-semibold rounded-3xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.985]"
          >
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
            {currentSlide === slides.length - 1 ? <ArrowRight className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div className="text-center">
            <span className="text-xs text-zinc-500">Already have an account? </span>
            <Link
              href="/signin"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
