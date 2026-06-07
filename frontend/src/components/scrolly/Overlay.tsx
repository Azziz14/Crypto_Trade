'use client';

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Hero } from '../sections/Hero';
import { Challenge } from '../sections/Challenge';
import { Architecture } from '../sections/Architecture';

interface OverlayProps {
  onStartTrading: () => void;
  onViewArchitecture: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({ onStartTrading, onViewArchitecture }) => {
  const { scrollYProgress } = useScroll();

  // Fine-tuned scrolling milestones for high-end cinematic pacing
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15, 0.22], [1, 1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.15, 0.22], [0, -30, -80]);

  const challengeOpacity = useTransform(scrollYProgress, [0.22, 0.3, 0.45, 0.52], [0, 1, 1, 0]);
  const challengeY = useTransform(scrollYProgress, [0.22, 0.3, 0.45, 0.52], [40, 0, 0, -40]);

  const archOpacity = useTransform(scrollYProgress, [0.52, 0.6, 0.78, 0.85], [0, 1, 1, 0]);
  const archY = useTransform(scrollYProgress, [0.52, 0.6, 0.78, 0.85], [40, 0, 0, -40]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 font-sans">
      
      {/* SECTION 1 - HERO */}
      <motion.div
        style={{ opacity: heroOpacity, y: heroY }}
        className="sticky top-0 left-0 w-full h-screen flex flex-col justify-center px-8 md:px-20 max-w-[1400px] mx-auto pointer-events-auto"
      >
        <Hero onStartTrading={onStartTrading} onViewArchitecture={onViewArchitecture} />
      </motion.div>

      {/* SECTION 2 - CHALLENGE */}
      <motion.div
        style={{ opacity: challengeOpacity, y: challengeY }}
        className="sticky top-0 left-0 w-full h-screen flex items-center px-8 md:px-20 max-w-[1400px] mx-auto pointer-events-auto"
      >
        <Challenge />
      </motion.div>

      {/* SECTION 3 - ARCHITECTURE */}
      <motion.div
        style={{ opacity: archOpacity, y: archY }}
        className="sticky top-0 left-0 w-full h-screen flex items-center px-8 md:px-20 max-w-[1400px] mx-auto pointer-events-auto"
      >
        <Architecture />
      </motion.div>
      
    </div>
  );
};
