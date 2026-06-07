'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Typewriter } from '../ui/typewriter-text';

interface TechItem {
  name: string;
  role: string;
  desc: string;
  spec: string;
}

const techItems: TechItem[] = [
  {
    name: 'Java',
    role: 'Execution Engine',
    desc: 'High-performance execution environment for managing multi-threaded streaming pipelines.',
    spec: 'JDK 21 LTS'
  },
  {
    name: 'Spring Boot',
    role: 'Backend Core',
    desc: 'Robust system infrastructure organizing endpoints, connection pools, and core security.',
    spec: 'Spring Boot 3.2'
  },
  {
    name: 'WebSockets',
    role: 'Real-Time Transport',
    desc: 'Persistent transport channel pushing market ticks to connected terminals in sub-milliseconds.',
    spec: 'STOMP Protocol'
  },
  {
    name: 'Redis',
    role: 'Memory Cache Broker',
    desc: 'Ultra-fast event broker routing price fluctuations across live servers.',
    spec: 'Redis Pub/Sub'
  },
  {
    name: 'Binance API',
    role: 'Liquidity Feed',
    desc: 'Low-latency streaming socket client pulling live market rates and order depth directly.',
    spec: 'Binance WebSockets'
  },
  {
    name: 'TypeScript',
    role: 'State Verification',
    desc: 'Strict type schema synchronization securing frontend-backend JSON model integrity.',
    spec: 'Strict Type System'
  }
];

export const TechStack: React.FC = () => {
  const [startType, setStartType] = useState(false);

  return (
    <section className="py-32 px-6 md:px-12 max-w-[1400px] mx-auto bg-transparent relative z-25 select-none">
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        onViewportEnter={() => setStartType(true)}
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-3xl mb-20 text-left"
      >
        <div className="text-[#39FF14] font-mono text-[10px] tracking-[0.4em] uppercase mb-6">
          High-performance Stack
        </div>
        <h2 className="text-4xl sm:text-6xl font-bold tracking-tighter text-white leading-[1.05] mb-8 font-display min-h-[48px] sm:min-h-[68px]">
          {startType ? (
            <Typewriter text="Engineered Base" speed={120} />
          ) : (
            ""
          )}
        </h2>
        <p className="text-neutral-400 font-light leading-relaxed max-w-xl text-sm md:text-base">
          Selected for single-digit millisecond latency guarantees, state consistency, and enterprise scalability.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {techItems.map((tech, idx) => (
          <motion.div
            key={tech.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="neon-glass-panel p-8 overflow-hidden transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-6">
              <span className="font-mono text-[9px] tracking-wider text-[#39FF14] uppercase">
                {tech.role}
              </span>
              <span className="font-mono text-[9px] tracking-wider text-neutral-500 uppercase border border-white/5 px-2.5 py-1 rounded">
                {tech.spec}
              </span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-white mb-4">
              {tech.name}
            </h3>
            
            <p className="text-neutral-450 font-light text-xs sm:text-sm leading-relaxed">
              {tech.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
