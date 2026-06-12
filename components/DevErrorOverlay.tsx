'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, ChevronRight, RotateCcw } from 'lucide-react';

interface DevError {
  id: string;
  message: string;
  source: 'unhandledRejection' | 'errorEvent' | 'boundary';
  stack?: string;
  timestamp: Date;
}

export function DevErrorOverlay() {
  const [errors, setErrors] = useState<DevError[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Only run this in development
    if (process.env.NODE_ENV === 'production') return;

    const handleError = (event: ErrorEvent) => {
      // Avoid circular infinite loops if overlay itself fails
      if (event.filename?.includes('DevErrorOverlay')) return;
      
      const newErr: DevError = {
        id: Math.random().toString(36).substring(2, 9),
        message: event.message || 'Unknown runtime error',
        source: 'errorEvent',
        stack: event.error?.stack || 'No stack trace available',
        timestamp: new Date()
      };
      
      setErrors(prev => [...prev, newErr]);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const newErr: DevError = {
        id: Math.random().toString(36).substring(2, 9),
        message: reason?.message || String(reason || 'Unhandled Promise Rejection'),
        source: 'unhandledRejection',
        stack: reason?.stack || 'No stack trace available',
        timestamp: new Date()
      };

      setErrors(prev => [...prev, newErr]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (process.env.NODE_ENV === 'production' || errors.length === 0) {
    return null;
  }

  const handleDismiss = (id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  };

  const handleClearAll = () => {
    setErrors([]);
  };

  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[99999] bg-red-600 hover:bg-red-500 text-white p-3 rounded-full flex items-center justify-center cursor-pointer shadow-2xl animate-bounce"
        title="Show Dev Errors"
      >
        <ShieldAlert className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-white text-red-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-extrabold border-2 border-red-600">
          {errors.length}
        </span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[99999] max-w-sm w-full bg-zinc-950/95 border border-red-500/30 rounded-3xl p-5 shadow-[0_20px_50px_rgba(239,68,68,0.15)] backdrop-blur-md text-white font-sans">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
        <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
          <ShieldAlert className="w-5 h-5" />
          <span>Aurora Sandbox Console ({errors.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleClearAll} 
            title="Clear all"
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setIsMinimized(true)} 
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
        {errors.map((err) => (
          <div key={err.id} className="relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 text-xs">
            <button
              onClick={() => handleDismiss(err.id)}
              className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="bg-red-500/10 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                {err.source === 'unhandledRejection' ? 'Rejection' : 'Runtime'}
              </span>
              <span className="text-zinc-500 text-[10px]">
                {err.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="font-semibold text-zinc-200 break-words mb-1 pr-4">
              {err.message}
            </div>
            <pre className="text-[10px] text-zinc-500 overflow-x-auto bg-black/40 p-2 rounded-lg max-h-24 scrollbar-none font-mono">
              {err.stack || 'No stack trace available'}
            </pre>
          </div>
        ))}
      </div>
      
      <div className="text-[9px] text-zinc-500 mt-3 text-center">
        This overlay catches dev crashes and is automatically hidden in production builds.
      </div>
    </div>
  );
}
