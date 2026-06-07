import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRightCircle, Zap, LockKeyhole, Fingerprint, Menu, X 
} from 'lucide-react';

interface LandingPageProps {
  onStartTrading: () => void;
}

// Geometric SVG Logo
const GeometricLogo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg 
    viewBox="0 0 256 256" 
    fill="#192837" 
    className={className}
  >
    <path d="M 64 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 L 128 64 L 128 64.5 L 161 32 L 192 0 L 256 0 L 256 64 L 192 128 L 128 128 L 128 192 L 96 223 L 63.5 256 L 0 256 L 0 192 Z M 256 192 L 224 223 L 191.5 256 L 128 256 L 128 192 L 192 128 L 256 128 Z" />
  </svg>
);

// Shared fadeUp Animation Variants
const fadeUpVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { 
      delay: i * 0.15, 
      duration: 0.6, 
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
    }
  })
};

export const LandingPage: React.FC<LandingPageProps> = ({ onStartTrading }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = ["Vault", "Plans", "Install", "News", "Help"];

  return (
    <div className="relative min-h-screen bg-transparent overflow-hidden flex flex-col font-sans">
      
      {/* Persistent video background is rendered globally in App.tsx to avoid transition stuttering */}

      {/* ── NAVBAR ── */}
      <header className="relative z-10 w-full max-w-[1280px] mx-auto px-5 sm:px-8 py-4 sm:py-5">
        <div className="flex justify-between items-center w-full">
          {/* Left: Logo & Crypto Trade Brand Name */}
          <div className="flex items-center gap-3 select-none">
            <GeometricLogo className="w-8 h-8" />
            <span 
              className="text-lg font-bold tracking-tight text-[#192837] uppercase"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              crypto trade
            </span>
          </div>

          {/* Center Links (hidden on mobile, visible md+) */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onStartTrading();
                }}
                className="text-sm font-medium text-[#192837] transition-opacity duration-200 hover:opacity-70"
              >
                {link}
              </a>
            ))}
          </nav>

          {/* Right actions (hidden on mobile, visible md+) */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onStartTrading}
              className="bg-[#7342E2] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-[0_4px_12px_rgba(115,66,226,0.35)] active:scale-95 transition-all cursor-pointer"
            >
              Start For Free
            </button>
            <button
              onClick={onStartTrading}
              className="bg-[#F2F2EE] text-[#192837] text-sm font-semibold px-5 py-2.5 rounded-full hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-95 transition-all cursor-pointer"
            >
              Sign In
            </button>
          </div>

          {/* Mobile hamburger menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-[#192837] p-2 hover:opacity-70 transition-opacity cursor-pointer"
            aria-label="Toggle Menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* ── MOBILE MENU (Slide-in Sheet) ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden md:hidden">
            
            {/* 1. Backdrop layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-[#192837]/35 backdrop-blur-[4px]"
            />

            {/* 2. Slide-out Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ 
                type: 'tween',
                ease: [0.22, 1, 0.36, 1],
                duration: 0.45 
              }}
              className="absolute right-0 top-0 bottom-0 w-[min(88vw,360px)] h-[100dvh] bg-[#CFC8C5] shadow-[-12px_0_48px_rgba(25,40,55,0.18)] flex flex-col py-6"
            >
              {/* Mobile Sheet Header */}
              <div className="flex justify-between items-center px-6 mb-6">
                <div className="flex items-center gap-3">
                  <GeometricLogo className="w-8 h-8" />
                  <span 
                    className="text-lg font-bold tracking-tight text-[#192837] uppercase"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    crypto trade
                  </span>
                </div>
                
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-10 h-10 rounded-full bg-[#192837]/10 flex items-center justify-center text-[#192837] cursor-pointer"
                >
                  <X size={20} />
                </motion.button>
              </div>

              {/* Divider */}
              <div className="h-[1px] bg-[#192837]/12 mx-6 mb-6" />

              {/* Navigation links with stagger effect */}
              <div className="flex flex-col gap-2 px-6 flex-1">
                {navLinks.map((link, i) => (
                  <motion.a
                    key={link}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      onStartTrading();
                    }}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0,
                      transition: { 
                        delay: 0.18 + i * 0.07,
                        duration: 0.4,
                        ease: 'easeOut'
                      }
                    }}
                    className="text-[1.1rem] font-semibold text-[#192837] py-3 px-4 rounded-xl hover:bg-black/10 transition-colors"
                  >
                    {link}
                  </motion.a>
                ))}
              </div>

              {/* Mobile CTA Buttons */}
              <div className="px-6 mt-auto space-y-3">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onStartTrading();
                  }}
                  className="w-full bg-[#7342E2] text-white text-[0.95rem] font-semibold py-3.5 rounded-full hover:brightness-110 transition-all cursor-pointer"
                >
                  Start For Free
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onStartTrading();
                  }}
                  className="w-full bg-[#F2F2EE] text-[#192837] text-[0.95rem] font-semibold py-3.5 rounded-full hover:bg-gray-200 transition-all cursor-pointer"
                >
                  Sign In
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── HERO CONTENT ── */}
      <main className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-[1280px] mx-auto px-5 sm:px-8 pt-[clamp(40px,8vw,72px)] pb-12">
        <div className="max-w-[660px] mx-auto flex flex-col items-center">
          
          {/* Heading with Zap, LockKeyhole, and Fingerprint icons */}
          <motion.h1
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="text-center font-heading font-bold mb-6 text-[#192837]"
            style={{ 
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.65rem, 5vw, 3rem)',
              lineHeight: '1.05',
              letterSpacing: '-0.01em'
            }}
          >
            Lock{' '}
            <Zap 
              size={24} 
              className="inline align-middle relative -top-[2px] mx-1" 
              style={{ color: '#192837', fill: '#192837' }} 
            />{' '}
            Down Your{' '}
            <LockKeyhole 
              size={24} 
              className="inline align-middle relative -top-[2px] mx-1" 
              style={{ color: '#192837' }} 
            />{' '}
            Passwords
            <br />
            with Ironclad Security
            <Fingerprint 
              size={24} 
              className="inline align-middle relative -top-[2px] ml-[6px] mr-[4px]" 
              style={{ color: '#192837' }} 
            />
          </motion.h1>

          {/* Subheading */}
          <motion.p
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
            className="font-body text-center mb-8 text-[#192837]/80 max-w-[560px]"
            style={{ 
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
              lineHeight: '1.65'
            }}
          >
            Zero stress, total control. Unbreakable storage, one-tap access, and pro-grade tools for your non-stop world.
          </motion.p>

          {/* Call To Action Button */}
          <motion.div
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUpVariants}
          >
            <motion.button
              onClick={onStartTrading}
              whileHover={{ scale: 1.04, filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center justify-between gap-8 bg-[#7342E2] text-white py-[17px] px-6 rounded-[50px] shadow-[0_4px_24px_rgba(115,66,226,0.28)] transition-all cursor-pointer font-semibold"
              style={{ 
                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                minWidth: '210px'
              }}
            >
              <span>Get It Free</span>
              <ArrowRightCircle size={20} className="text-white" />
            </motion.button>
          </motion.div>

        </div>
      </main>

    </div>
  );
};
