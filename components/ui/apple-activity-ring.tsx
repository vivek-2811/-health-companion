'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Flame, Play, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppleActivityCardProps {
  title?: string;
  className?: string;
  moveProgress?: number; // 0 to 1
  exerciseProgress?: number; // 0 to 1
  standProgress?: number; // 0 to 1
}

export function AppleActivityCard({
  title = "Activity",
  className,
  moveProgress = 0.82,
  exerciseProgress = 0.65,
  standProgress = 0.58,
}: AppleActivityCardProps) {
  
  const strokeWidth = 10;
  const size = 150;
  const center = size / 2;
  
  const rings = [
    {
      name: 'Move',
      progress: moveProgress,
      color: '#ff0055', // Apple Red
      trackColor: 'rgba(255, 0, 85, 0.12)',
      radius: 60,
      unit: 'kcal',
      current: Math.round(moveProgress * 600),
      target: 600,
      icon: <Flame className="w-4 h-4 text-[#ff0055]" />,
    },
    {
      name: 'Exercise',
      progress: exerciseProgress,
      color: '#00e676', // Apple Green
      trackColor: 'rgba(0, 230, 118, 0.12)',
      radius: 46,
      unit: 'min',
      current: Math.round(exerciseProgress * 30),
      target: 30,
      icon: <Play className="w-4 h-4 text-[#00e676]" />,
    },
    {
      name: 'Stand',
      progress: standProgress,
      color: '#00b0ff', // Apple Blue
      trackColor: 'rgba(0, 176, 255, 0.12)',
      radius: 32,
      unit: 'hr',
      current: Math.round(standProgress * 12),
      target: 12,
      icon: <Clock className="w-4 h-4 text-[#00b0ff]" />,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl transition-all duration-300 hover:border-zinc-700/80 hover:shadow-2xl hover:shadow-[#ff0055]/5 text-white w-full max-w-sm",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">{title}</h3>
        <TrendingUp className="w-4 h-4 text-zinc-500" />
      </div>

      <div className="flex items-center gap-6">
        {/* Ring SVGs */}
        <div className="relative flex-none" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90 select-none">
            {rings.map((ring, index) => {
              const circumference = 2 * Math.PI * ring.radius;
              return (
                <g key={ring.name}>
                  {/* Background Track */}
                  <circle
                    cx={center}
                    cy={center}
                    r={ring.radius}
                    fill="none"
                    stroke={ring.trackColor}
                    strokeWidth={strokeWidth}
                  />
                  {/* Animated Foreground Progress */}
                  <motion.circle
                    cx={center}
                    cy={center}
                    r={ring.radius}
                    fill="none"
                    stroke={ring.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference * (1 - Math.min(0.999, ring.progress)) }}
                    transition={{
                      duration: 1.6,
                      ease: [0.16, 1, 0.3, 1], // Apple style fluid ease-out
                      delay: index * 0.15,
                    }}
                  />
                </g>
              );
            })}
          </svg>
          {/* Central target or icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block -mb-0.5">Today</span>
              <span className="text-lg font-bold tabular-nums">
                {Math.round(((moveProgress + exerciseProgress + standProgress) / 3) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Legend / Details */}
        <div className="flex-1 space-y-3">
          {rings.map((ring) => (
            <div key={ring.name} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex-none">{ring.icon}</div>
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider -mb-0.5">{ring.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold tracking-tight tabular-nums">{ring.current}</span>
                  <span className="text-xs text-zinc-500">/ {ring.target} {ring.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
