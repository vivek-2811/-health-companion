"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

// ─── Icon Components ───────────────────────────────────────────────────────────

interface IconProps {
  className?: string;
}

export const HomeIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

export const MessageIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export const ChartIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

export const AwardIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 15l-3.5 2.1.93-3.94L6 10.7l4.06-.35L12 6.8l1.94 3.55L18 10.7l-3.43 2.46.93 3.94z" />
    <circle cx="12" cy="12" r="10" strokeWidth={2} fill="none" />
  </svg>
);

// ─── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipProps {
  children: React.ReactNode;
  content: string;
}

const Tooltip = ({ children, content }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative flex flex-col items-center">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="tooltip"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 px-2.5 py-1 text-xs font-medium text-white bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none"
          >
            {content}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Dock Item with Magnetic Effect ───────────────────────────────────────────

interface DockItemProps {
  children: React.ReactNode;
  tooltip: string;
  isActive?: boolean;
  onClick?: () => void;
}

const ITEM_SIZE = 52;
const MAGNIFY_SIZE = 72;
const MAGNIFY_RANGE = 80; // px distance for magnification effect

const DockItem = ({ children, tooltip, isActive = false, onClick }: DockItemProps) => {
  const ref = useRef<HTMLButtonElement>(null);
  const mouseX = useMotionValue(Infinity);

  const size = useSpring(
    useTransform(mouseX, [-MAGNIFY_RANGE, 0, MAGNIFY_RANGE], [ITEM_SIZE, MAGNIFY_SIZE, ITEM_SIZE]),
    { stiffness: 400, damping: 28 }
  );

  return (
    <Tooltip content={tooltip}>
      <motion.button
        ref={ref}
        onMouseMove={(e) => {
          if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            mouseX.set(e.clientX - (rect.left + rect.width / 2));
          }
        }}
        onMouseLeave={() => mouseX.set(Infinity)}
        onClick={onClick}
        whileTap={{ scale: 0.88 }}
        className={`relative flex items-center justify-center rounded-2xl transition-colors focus:outline-none
          ${isActive
            ? 'bg-white/20 text-white shadow-lg shadow-white/10'
            : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/60 hover:text-white'
          }`}
        style={{ width: size, height: size }}
        aria-label={tooltip}
      >
        {children}
        {/* Active dot indicator */}
        {isActive && (
          <motion.div
            layoutId="dock-active-dot"
            className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-white"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
      </motion.button>
    </Tooltip>
  );
};

// ─── Separator ────────────────────────────────────────────────────────────────

const Separator = () => (
  <div className="w-px self-stretch bg-zinc-700/50 mx-1 my-2" />
);

// ─── Main Dock Component ───────────────────────────────────────────────────────

export interface DockNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface DockProps {
  items: DockNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function MacOSDock({ items, activeId, onSelect }: DockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 80, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28, delay: 0.1 }}
      className="flex items-end gap-1.5 px-3 py-2.5
        bg-zinc-900/80 backdrop-blur-2xl
        border border-zinc-700/60
        rounded-2xl shadow-2xl shadow-black/60"
    >
      {items.map((item, idx) => (
        <React.Fragment key={item.id}>
          {/* Optional separator before last item */}
          {idx === items.length - 1 && items.length > 2 && <Separator />}
          <DockItem
            tooltip={item.label}
            isActive={activeId === item.id}
            onClick={() => onSelect(item.id)}
          >
            {item.icon}
          </DockItem>
        </React.Fragment>
      ))}
    </motion.div>
  );
}

// ─── Standalone Demo Export ────────────────────────────────────────────────────

const DATA_NAVBAR = [
  { href: "#", label: "Home", icon: <HomeIcon /> },
  { href: "#", label: "Messages", icon: <MessageIcon /> },
  { href: "#", label: "Insights", icon: <ChartIcon /> },
];

export function DockTheme() {
  const [active, setActive] = useState("Home");

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="pointer-events-none text-center text-8xl font-semibold leading-none
          bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent mb-16"
      >
        Dock
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-end gap-2 px-4 py-3
          bg-zinc-900/80 backdrop-blur-xl
          border border-zinc-700/50
          rounded-2xl shadow-2xl shadow-black/50"
      >
        {DATA_NAVBAR.map((item) => (
          <DockItem
            key={item.label}
            tooltip={item.label}
            isActive={active === item.label}
            onClick={() => setActive(item.label)}
          >
            {item.icon}
          </DockItem>
        ))}
      </motion.div>
    </div>
  );
}
