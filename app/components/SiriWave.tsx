'use client';

import React, { useEffect, useRef } from 'react';

interface SiriWaveProps {
  isListening: boolean;
}

export function SiriWave({ isListening }: SiriWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const colors = [
      'rgba(255, 45, 85, 0.7)',   // Pink-Red
      'rgba(0, 220, 255, 0.7)',   // Cyan-Blue
      'rgba(180, 50, 255, 0.7)',  // Purple
      'rgba(50, 255, 120, 0.6)',  // Green
      'rgba(255, 180, 0, 0.6)'    // Yellow
    ];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerY = height / 2;

      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < colors.length; i++) {
        ctx.beginPath();

        // Wave characteristics
        // Speed up when listening
        const speed = (0.04 + i * 0.015) * (isListening ? 1.8 : 0.2);
        // Larger amplitude when listening
        const baseAmplitude = isListening ? 22 : 2.5;
        // Vary amplitude over time to simulate dynamic voice input
        const noise = isListening ? Math.sin(phase * 0.4 + i) * 6 : 0;
        const amplitude = Math.max(1, baseAmplitude + noise) * (1 - i * 0.15);
        const frequency = 0.012 + i * 0.003;

        ctx.strokeStyle = colors[i];
        ctx.lineWidth = i === 1 ? 3 : 1.5;
        
        ctx.shadowBlur = isListening ? 12 : 0;
        ctx.shadowColor = colors[i];

        for (let x = 0; x < width; x++) {
          // Taper edges gracefully to 0 (sine envelope)
          const envelope = Math.sin((x / width) * Math.PI);
          const y = centerY + Math.sin(x * frequency + phase + i * 1.5) * amplitude * envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      phase += isListening ? 0.12 : 0.015;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [isListening]);

  return (
    <div className="relative w-full h-20 overflow-hidden flex items-center justify-center bg-transparent">
      {/* Siri glow center */}
      {isListening && (
        <div className="absolute inset-x-1/4 h-12 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ filter: 'blur(0.3px)' }}
      />
    </div>
  );
}
