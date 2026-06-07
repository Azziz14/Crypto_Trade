'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Typewriter } from '../ui/typewriter-text';

export const Architecture: React.FC = () => {
  const [startType, setStartType] = useState(false);

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center pointer-events-auto select-none relative z-25">
      
      {/* Graphical schematic flow - Left side */}
      <div 
        className="relative mx-auto bg-[#0A0A0C] border border-white/5 rounded-2xl overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.6)]"
        style={{ height: '360px', width: '100%', maxWidth: '360px' }}
      >
        {/* Connection flows */}
        <svg className="absolute inset-0 w-full h-full text-white/5" viewBox="0 0 360 360" fill="none">
          <motion.path
            d="M 180,39 L 180,134"
            stroke="rgba(57, 255, 20, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -20 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />
          <motion.path
            d="M 180,134 L 180,229"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -20 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />
          <motion.path
            d="M 180,229 L 180,324"
            stroke="rgba(0, 229, 255, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -20 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />
        </svg>

        {/* Nodes stack - Absolutely positioned to perfectly align with SVG lines */}
        <div className="absolute inset-0 z-10 font-mono text-[9px] tracking-[0.2em] uppercase">
          
          {/* Node 1: Binance Stream */}
          <div 
            style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', height: '38px', width: '240px' }}
            className="border border-white/10 bg-[#121215] rounded-lg text-white font-medium shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Binance Stream (wss)
          </div>

          {/* Node 2: Spring Boot Broker */}
          <div 
            style={{ position: 'absolute', top: '115px', left: '50%', transform: 'translateX(-50%)', height: '38px', width: '240px' }}
            className="border border-white/10 bg-[#121215] rounded-lg text-white font-medium shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
            Spring Boot Broker
          </div>

          {/* Node 3: Redis Pub/Sub */}
          <div 
            style={{ position: 'absolute', top: '210px', left: '50%', transform: 'translateX(-50%)', height: '38px', width: '240px' }}
            className="border border-[#39FF14]/20 bg-[#121215] rounded-lg text-white font-medium shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] shadow-[0_0_6px_#39FF14]" />
            Redis In-Memory Broker
          </div>

          {/* Node 4: React Clients */}
          <div 
            style={{ position: 'absolute', top: '305px', left: '50%', transform: 'translateX(-50%)', height: '38px', width: '240px' }}
            className="border border-white/10 bg-[#121215] rounded-lg text-white font-medium shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            React Client Desk
          </div>
          
        </div>
      </div>

      {/* Narrative block - Right side */}
      <motion.div 
        initial="hidden"
        whileInView="visible"
        onViewportEnter={() => setStartType(true)}
        viewport={{ once: true, margin: "-100px" }}
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
        }}
        className="max-w-xl lg:pl-8 text-left"
      >
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 16, filter: 'blur(3px)' },
            visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
          }}
          className="text-[#39FF14] font-mono text-[10px] tracking-[0.4em] uppercase mb-4"
        >
          Architectural Blueprint
        </motion.div>
        
        <motion.h2 
          variants={{
            hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
            visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
          }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-white leading-[1.05] mb-6 font-display min-h-[48px] sm:min-h-[60px]"
        >
          {startType ? (
            <Typewriter text="Infrastructure Flow" speed={120} />
          ) : (
            ""
          )}
        </motion.h2>
        
        <div className="space-y-4 text-neutral-400 font-light leading-relaxed text-sm md:text-base">
          <motion.p 
            variants={{
              hidden: { opacity: 0, y: 16, filter: 'blur(3px)' },
              visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
            }}
          >
            Built a Java Spring Boot backend with a persistent WebSocket layer directly connected to Binance's streaming API.
          </motion.p>
          <motion.p 
            variants={{
              hidden: { opacity: 0, y: 16, filter: 'blur(3px)' },
              visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
            }}
          >
            Redis Pub/Sub acts as the in-memory message broker, fanning out live price ticks to all connected React clients within milliseconds.
          </motion.p>
          <motion.p 
            variants={{
              hidden: { opacity: 0, y: 16, filter: 'blur(3px)' },
              visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } }
            }}
          >
            A custom order-book reconciliation engine keeps state consistent across reconnects and network drops.
          </motion.p>
        </div>
      </motion.div>
      
    </div>
  );
};
