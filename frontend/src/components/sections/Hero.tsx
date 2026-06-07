'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Typewriter } from '../ui/typewriter-text';

interface HeroProps {
  onStartTrading: () => void;
  onViewArchitecture: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartTrading, onViewArchitecture }) => {
  return (
    <div className="w-full flex flex-col items-start text-left max-w-4xl relative z-25 pointer-events-auto select-none pt-[20vh]">
      
      {/* Editorial Label */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="text-amber-400/80 font-mono text-[9px] tracking-[0.4em] uppercase mb-6"
      >
        Real-Time Trading Infrastructure
      </motion.div>

      {/* Hero Header */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter text-white leading-[0.95] mb-8 font-display min-h-[60px] sm:min-h-[80px] md:min-h-[100px]"
      >
        <Typewriter text="CryptoTrade" speed={140} />
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="text-base md:text-lg text-neutral-400 font-light leading-relaxed max-w-lg mb-16"
      >
        Ultra-low latency market streaming infrastructure engineered for high-frequency crypto trading systems.
      </motion.p>

      {/* Premium low-latency metrics */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.4, ease: 'easeOut' }}
        className="flex flex-wrap gap-x-12 gap-y-6 border-t border-white/5 pt-10 w-full max-w-xl mb-16"
      >
        <div>
          <div className="font-mono text-xl md:text-2xl font-light text-white tracking-tight">&lt; 100ms</div>
          <div className="text-[8px] uppercase tracking-[0.2em] text-neutral-500 mt-1 font-mono">Update Latency</div>
        </div>
        <div>
          <div className="font-mono text-xl md:text-2xl font-light text-white tracking-tight">1,000+</div>
          <div className="text-[8px] uppercase tracking-[0.2em] text-neutral-500 mt-1 font-mono">Concurrent Streams</div>
        </div>
        <div>
          <div className="font-mono text-xl md:text-2xl font-light text-white tracking-tight">99.9%</div>
          <div className="text-[8px] uppercase tracking-[0.2em] text-neutral-500 mt-1 font-mono">Uptime SLA</div>
        </div>
      </motion.div>

      {/* Matte Graphite Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap gap-5"
      >
        <button
          onClick={onStartTrading}
          className="relative px-6 py-3 rounded-lg bg-[#141416] border border-white/5 text-white font-medium text-[10px] tracking-wider uppercase transition-all duration-300 hover:bg-[#1A1A1E] hover:border-white/10 cursor-pointer shadow-md"
        >
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="relative z-10 flex items-center gap-2.5">
            Live Market Feed
            <span className="text-neutral-500">→</span>
          </span>
        </button>

        <button
          onClick={onViewArchitecture}
          className="px-6 py-3 rounded-lg bg-transparent border border-white/5 text-neutral-400 font-medium text-[10px] tracking-wider uppercase hover:border-white/10 hover:text-white transition-all duration-300 cursor-pointer"
        >
          Explore Architecture
        </button>
      </motion.div>
    </div>
  );
};
