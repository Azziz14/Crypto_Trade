'use client';

import React, { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Typewriter } from '../ui/typewriter-text';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } 
  }
};

export const Challenge: React.FC = () => {
  const [startType, setStartType] = useState(false);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      onViewportEnter={() => setStartType(true)}
      viewport={{ once: true, margin: "-100px" }}
      className="w-full flex flex-col items-start text-left max-w-2xl relative z-25 pointer-events-auto select-none"
    >
      <motion.div 
        variants={itemVariants}
        className="text-[#39FF14] font-mono text-[10px] tracking-[0.4em] uppercase mb-6"
      >
        Performance Barriers
      </motion.div>
      
      <motion.h2 
        variants={itemVariants}
        className="text-4xl sm:text-6xl font-bold tracking-tighter text-white leading-[1.05] mb-8 font-display min-h-[50px] sm:min-h-[70px]"
      >
        {startType ? (
          <Typewriter text="The Latency Bottleneck" speed={120} />
        ) : (
          ""
        )}
      </motion.h2>
      
      <motion.p 
        variants={itemVariants}
        className="text-lg md:text-xl text-neutral-400 font-light leading-relaxed max-w-xl"
      >
        Designing a system that could handle thousands of concurrent market data streams with absolute minimum latency while keeping a React UI smooth and responsive.
      </motion.p>
    </motion.div>
  );
};
