'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Typewriter } from '../ui/typewriter-text';

interface Project {
  title: string;
  scope: string;
  metric: string;
  metricLabel: string;
  details: string;
}

const projects: Project[] = [
  {
    title: 'Real-Time Market Engine',
    scope: 'Core Trading Engine',
    metric: '< 15ms',
    metricLabel: 'Processing Speed',
    details: 'Custom non-blocking processing engine built in Java using lock-free data structures and thread affinity optimization for volatile order book processing.'
  },
  {
    title: 'Streaming Connection Clusters',
    scope: 'Binance API Integration',
    metric: '10,000+',
    metricLabel: 'Ticks Dispatched / Sec',
    details: 'Fault-tolerant WebSocket client system executing active failovers and heartbeat monitors directly mapped into Binance raw pricing endpoints.'
  },
  {
    title: 'Order Book Reconciliation',
    scope: 'State Verification Pipeline',
    metric: '100% SLA',
    metricLabel: 'Consistency Accuracy',
    details: 'Dynamic state reconciliation logic designed on Redis pipeline systems, verifying local cache sequences against remote websocket streams.'
  },
  {
    title: 'Low-Latency Rendering UI',
    scope: 'Frontend Architecture',
    metric: '120 FPS',
    metricLabel: 'Rendering Performance',
    details: 'Event throttling pipeline preventing React DOM blockages during rapid incoming websocket events, managing off-screen pricing buffers.'
  }
];

export const Projects: React.FC = () => {
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
          Case Studies
        </div>
        <h2 className="text-4xl sm:text-6xl font-bold tracking-tighter text-white leading-[1.05] mb-8 font-display min-h-[48px] sm:min-h-[68px]">
          {startType ? (
            <Typewriter text="Infrastructure Modules" speed={120} />
          ) : (
            ""
          )}
        </h2>
        <p className="text-neutral-400 font-light leading-relaxed max-w-xl text-sm md:text-base">
          Subsystems engineered to coordinate under microsecond latency restrictions and ensure stable trading.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {projects.map((proj, idx) => (
          <motion.div
            key={proj.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="neon-glass-panel p-10 overflow-hidden transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-white/5 pb-8">
              <div>
                <span className="font-mono text-[9px] tracking-wider text-[#39FF14] uppercase">
                  {proj.scope}
                </span>
                <h3 className="text-2xl font-bold tracking-tight text-white mt-1 font-display">
                  {proj.title}
                </h3>
              </div>
              <div className="text-left md:text-right">
                <div className="font-mono text-3xl font-light text-white tracking-tight">
                  {proj.metric}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-neutral-500 mt-1 font-mono">
                  {proj.metricLabel}
                </div>
              </div>
            </div>

            <p className="text-neutral-450 font-light leading-relaxed text-sm md:text-base">
              {proj.details}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
