'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useScroll, useMotionValue, motion, AnimatePresence } from 'framer-motion';

// Subcomponents imported directly
import { Hero } from '../sections/Hero';
import { Challenge } from '../sections/Challenge';
import { Architecture } from '../sections/Architecture';
import { TechStack } from '../sections/TechStack';

interface ScrollyCanvasProps {
  onStartTrading: () => void;
  onNavbarStateChange?: (state: 'transparent' | 'dark' | 'solid') => void;
}

export const ScrollyCanvas: React.FC<ScrollyCanvasProps> = ({ onStartTrading, onNavbarStateChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Active section state for unmounting overlay blocks
  const [activeSection, setActiveSection] = useState<'intro' | 'challenge' | 'architecture' | 'techstack'>('intro');

  // Scroll tracking for the local container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Master lerped progress for coin physics
  const lerpedProgress = useMotionValue(0);
  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);

  const totalFrames = 150;

  // Preload coin frames
  useEffect(() => {
    let loadedCount = 0;
    const loadedImages: HTMLImageElement[] = [];

    const preloadImages = async () => {
      const promises = Array.from({ length: totalFrames }).map((_, index) => {
        return new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          const frameStr = String(index).padStart(3, '0');
          img.src = `/sequence/frame_${frameStr}_delay-0.067s.webp`;
          
          img.onload = () => {
            loadedCount++;
            setLoadingProgress(Math.round((loadedCount / totalFrames) * 100));
            resolve(img);
          };
          img.onerror = () => resolve(img);
          loadedImages[index] = img;
        });
      });

      await Promise.all(promises);
      setImages(loadedImages);
      setIsLoaded(true);
    };

    preloadImages();
  }, []);

  // Update target progress from scroll progress and switch active sections
  useEffect(() => {
    return scrollYProgress.on('change', (latest) => {
      targetProgressRef.current = latest;
      
      // Determine active section cleanly
      if (latest < 0.22) {
        setActiveSection('intro');
      } else if (latest < 0.48) {
        setActiveSection('challenge');
      } else if (latest < 0.73) {
        setActiveSection('architecture');
      } else {
        setActiveSection('techstack');
      }

      // Fire navbar state updates
      if (onNavbarStateChange) {
        if (latest < 0.22) {
          onNavbarStateChange('transparent');
        } else if (latest < 0.73) {
          onNavbarStateChange('dark');
        } else {
          onNavbarStateChange('solid');
        }
      }
    });
  }, [scrollYProgress, onNavbarStateChange]);

  // Main high performance rendering & physics loop
  useEffect(() => {
    if (!isLoaded || images.length === 0) return;

    let animId: number;
    const lerpFactor = 0.08;

    const renderLoop = () => {
      const target = targetProgressRef.current;
      const current = currentProgressRef.current;
      
      // Calculate progress lerp
      const nextProgress = current + (target - current) * lerpFactor;
      currentProgressRef.current = nextProgress;
      lerpedProgress.set(nextProgress);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const frameIndex = Math.min(
          Math.max(Math.round(nextProgress * (totalFrames - 1)), 0),
          totalFrames - 1
        );
        const img = images[frameIndex];

        if (ctx && img && img.complete) {
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const imgRatio = img.width / img.height;
          const canvasRatio = canvasWidth / canvasHeight;

          let drawWidth = canvasWidth;
          let drawHeight = canvasHeight;
          let offsetX = 0;
          let offsetY = 0;

          if (canvasRatio > imgRatio) {
            drawHeight = canvasWidth / imgRatio;
            offsetY = (canvasHeight - drawHeight) / 2;
          } else {
            drawWidth = canvasHeight * imgRatio;
            offsetX = (canvasWidth - drawWidth) / 2;
          }

          // Dynamic coin scaling & transformation based on progress milestones
          let scale = 0.75;
          let shiftX = 0;
          let blurVal = 0;

          if (nextProgress < 0.22) {
            // INTRO: Far away, centered
            scale = 0.75;
            shiftX = 0;
          } else if (nextProgress < 0.48) {
            // CHALLENGE: Closer, shift to the right to frame left text
            const p = (nextProgress - 0.22) / 0.26; // 0 to 1
            scale = 0.75 + p * 0.25; // scales to 1.0
            shiftX = p * (canvasWidth * 0.15); // moves right
            
            // Subtle transition blur during transition
            const velocity = Math.abs(target - current);
            blurVal = Math.min(4, velocity * 15);
          } else if (nextProgress < 0.73) {
            // ARCHITECTURE: Zoomed close-up, shifts to side
            const p = (nextProgress - 0.48) / 0.25; // 0 to 1
            scale = 1.0 + p * 0.45; // scales to 1.45
            shiftX = (canvasWidth * 0.15) - p * (canvasWidth * 0.08); // remains rightish
          } else {
            // TECH STACK: Recedes into blurred background
            const p = (nextProgress - 0.73) / 0.27;
            scale = 1.45 - p * 0.55; // recedes to 0.9
            shiftX = (canvasWidth * 0.07) * (1 - p); // centers again
            blurVal = p * 6; // blurred background
          }

          ctx.clearRect(0, 0, canvasWidth, canvasHeight);

          // Apply scale/position matrices
          ctx.save();
          ctx.translate(canvasWidth / 2 + shiftX, canvasHeight / 2);
          ctx.scale(scale, scale);
          
          if (blurVal > 0.5) {
            ctx.filter = `blur(${blurVal}px)`;
          }

          ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [images, isLoaded]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    };

    window.addEventListener('resize', handleResize);
    if (isLoaded) handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoaded]);

  return (
    <div ref={containerRef} className="relative w-full h-[600vh] bg-[#0B0B0D]">
      {/* Buffer overlay */}
      {!isLoaded && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0B0D]">
          <div className="relative w-72 h-[1.5px] bg-white/5 rounded-full overflow-hidden mb-5">
            <div
              className="absolute left-0 top-0 h-full bg-neutral-300 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="font-mono text-[9px] tracking-[0.4em] text-neutral-500 uppercase">
            CACHING ENGINE NODES — {loadingProgress}%
          </div>
        </div>
      )}

      {/* Sticky presentation viewport */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden z-10 flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block object-cover pointer-events-none" />
        
        {/* Soft radial overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-transparent to-[#0B0B0D]/20 pointer-events-none z-12" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(11,11,13,0.92)_100%)] pointer-events-none z-12" />

        {/* ── MASTER OVERLAYS CONTAINER ── */}
        <div className="absolute inset-0 z-20 flex items-center px-8 md:px-20 max-w-[1400px] mx-auto pointer-events-none w-full h-full">
          <AnimatePresence mode="wait">
            
            {activeSection === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 40, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -40, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-8 md:left-20 max-w-4xl pointer-events-auto"
              >
                <Hero 
                  onStartTrading={onStartTrading} 
                  onViewArchitecture={() => {
                    const container = containerRef.current;
                    if (container) {
                      const offset = container.offsetTop + container.clientHeight * 0.48;
                      window.scrollTo({ top: offset, behavior: 'smooth' });
                    }
                  }} 
                />
              </motion.div>
            )}

            {activeSection === 'challenge' && (
              <motion.div
                key="challenge"
                initial={{ opacity: 0, y: 40, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -40, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-8 md:left-20 max-w-xl pointer-events-auto"
              >
                <Challenge />
              </motion.div>
            )}

            {activeSection === 'architecture' && (
              <motion.div
                key="architecture"
                initial={{ opacity: 0, y: 40, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -40, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-8 md:left-20 right-8 md:right-20 pointer-events-auto"
              >
                <Architecture />
              </motion.div>
            )}

            {activeSection === 'techstack' && (
              <motion.div
                key="techstack"
                initial={{ opacity: 0, y: 40, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -40, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-x-8 md:inset-x-20 overflow-y-auto max-h-[85vh] scrollbar-none pointer-events-auto"
              >
                <TechStack />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
