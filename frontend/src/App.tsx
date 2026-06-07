'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { Auth } from './views/Auth';
import { Dashboard } from './views/Dashboard';
import { Watchlist } from './views/Watchlist';
import { History } from './views/History';
import { Leaderboard } from './views/Leaderboard';
import { Admin } from './views/Admin';
import { Pricing } from './components/ui/pricing-section-with-comparison';
import { StackedCircularFooter } from './components/ui/stacked-circular-footer';
import NavHeader from '@/components/ui/nav-header';
import { TrendingUp } from 'lucide-react';
import * as THREE from 'three';
import { ScrollyCanvas } from './components/scrolly/ScrollyCanvas';
import { Overlay } from './components/scrolly/Overlay';
import { TechStack } from './components/sections/TechStack';
import { Projects } from './components/sections/Projects';
import { TickerRibbon } from './components/ui/ticker-ribbon';
import Lenis from 'lenis';

const HeroFuturistic = dynamic(
  () => import('./components/ui/hero-futuristic').then((mod) => mod.HeroFuturistic),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-screen w-full bg-[#030712] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
          <p className="text-white/70 text-sm tracking-wide">Loading hero scene…</p>
        </div>
      </div>
    ),
  }
);

const CoinStairsCanvas = dynamic(
  () => import('./components/CoinStairsCanvas').then((mod) => mod.CoinStairsCanvas),
  { ssr: false }
);

type TabType = 'home' | 'dashboard' | 'watchlist' | 'history' | 'leaderboard' | 'admin' | 'techstack' | 'projects';

// ─── Persistent background canvas that mounts ONCE and never re-mounts ───────
// It renders a slow red-tinted radial glow to unify all pages visually.
const PersistentBg: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector3(el.clientWidth, el.clientHeight, 1) },
      },
      vertexShader: `
        precision mediump float;
        void main() { gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: `
        precision mediump float;
        uniform float iTime;
        uniform vec3 iResolution;

        void main() {
          vec2 uv = gl_FragCoord.xy / iResolution.xy;

          // Slow drifting glow blobs
          float t = iTime * 0.12;
          vec2 c1 = vec2(0.25 + sin(t * 0.7) * 0.15, 0.5 + cos(t * 0.5) * 0.2);
          vec2 c2 = vec2(0.75 + cos(t * 0.6) * 0.12, 0.4 + sin(t * 0.8) * 0.18);

          float d1 = length(uv - c1);
          float d2 = length(uv - c2);

          // Red-accent glow
          float g1 = exp(-d1 * d1 * 10.0) * 0.35;
          float g2 = exp(-d2 * d2 * 12.0) * 0.25;

          vec3 col = vec3(0.02, 0.01, 0.025); // near-black base
          col += vec3(0.55, 0.06, 0.06) * g1; // red glow
          col += vec3(0.05, 0.08, 0.35) * g2; // blue-purple glow

          // vignette
          float vig = 1.0 - smoothstep(0.4, 1.0, length(uv - 0.5));
          col *= vig * 1.2;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthWrite: false,
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3
    ));
    scene.add(new THREE.Mesh(geo, material));

    let raf: number;
    const start = performance.now();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      material.uniforms.iTime.value = (performance.now() - start) / 1000;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      material.uniforms.iResolution.value.set(el.clientWidth, el.clientHeight, 1);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      material.dispose();
      geo.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
};

const CursorEffect: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const desiredPosition = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const currentPosition = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    const interactiveSelectors = ['button', 'a', 'input', 'textarea', 'select', '[role="button"]'];
    const updateCursor = () => {
      currentPosition.current.x += (desiredPosition.current.x - currentPosition.current.x) * 0.35;
      currentPosition.current.y += (desiredPosition.current.y - currentPosition.current.y) * 0.35;
      if (cursorRef.current) {
        cursorRef.current.style.left = `${currentPosition.current.x}px`;
        cursorRef.current.style.top = `${currentPosition.current.y}px`;
      }
      requestRef.current = requestAnimationFrame(updateCursor);
    };

    const handleMouseMove = (event: MouseEvent) => {
      desiredPosition.current = { x: event.clientX, y: event.clientY };
      if (cursorRef.current) {
        cursorRef.current.style.opacity = '1';
        cursorRef.current.style.left = `${event.clientX}px`;
        cursorRef.current.style.top = `${event.clientY}px`;
      }
    };

    const handleMouseLeave = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '0';
    };

    const handleHover = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const isInteractive = interactiveSelectors.some((selector) => target.closest(selector));
      if (cursorRef.current) {
        cursorRef.current.classList.toggle('cursor-hover', isInteractive);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mouseover', handleHover);
    requestRef.current = requestAnimationFrame(updateCursor);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mouseover', handleHover);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div ref={cursorRef} className="custom-cursor" aria-hidden="true">
      <span className="cursor-ring" />
      <span className="cursor-core" />
    </div>
  );
};

// ─── Page transition variants ─────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as any }
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: 'blur(3px)',
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as any }
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] as any }
  }
};

// ─── Main App Content ─────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showAuth, setShowAuth] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [navbarState, setNavbarState] = useState<'transparent' | 'dark' | 'solid'>('transparent');
  const mainScrollRef = useRef<HTMLElement>(null);
  const warpOverlayRef = useRef<HTMLDivElement>(null);
  const sectionRefs = {
    home: useRef<HTMLDivElement>(null),
    techstack: useRef<HTMLDivElement>(null),
    projects: useRef<HTMLDivElement>(null),
    dashboard: useRef<HTMLDivElement>(null),
    watchlist: useRef<HTMLDivElement>(null),
    history: useRef<HTMLDivElement>(null),
    leaderboard: useRef<HTMLDivElement>(null),
    admin: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') return;

    const handleScroll = () => {
      const scrollPos = window.scrollY;
      const container = sectionRefs.home.current;
      if (!container) return;

      const containerHeight = container.clientHeight;
      const progress = scrollPos / containerHeight;

      if (progress < 0.73) {
        setActiveTab('home');
      } else if (progress < 0.95) {
        setActiveTab('techstack');
      } else {
        setActiveTab('projects');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  useEffect(() => {
    const enterDelay = window.setTimeout(() => setAppReady(true), 1100);
    return () => window.clearTimeout(enterDelay);
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const warpOverlay = warpOverlayRef.current;
    let lastPulse = 0;

    const warpTrigger = ScrollTrigger.create({
      trigger: mainScrollRef.current || document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        if (!warpOverlay) return;
        const now = performance.now();
        if (Math.abs(self.getVelocity()) > 1250 && now - lastPulse > 350) {
          lastPulse = now;
          gsap.killTweensOf(warpOverlay);
          gsap.timeline()
            .to(warpOverlay, { opacity: 0.18, duration: 0.08, ease: 'power2.out' })
            .to(warpOverlay, { opacity: 0, duration: 0.28, ease: 'power2.out' });
        }
      }
    });

    return () => {
      warpTrigger.kill();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleScroll = () => {
      document.querySelectorAll<HTMLElement>('.sparse-scroll-item').forEach((el) => {
        const rect = el.getBoundingClientRect();
        const progress = (rect.top + rect.height * 0.45) / window.innerHeight;
        const opacity = 1 - Math.min(Math.abs(progress - 0.45) * 0.5, 0.4);
        el.style.opacity = `${opacity}`;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const LoaderOverlay = (
    <AnimatePresence>
      {!appReady && (
        <motion.div
          key="page-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="page-loader-overlay"
        >
          <div className="page-loader-card">
            <div className="loader-ring" />
            <div className="loader-copy">
              <h3>Powering up the crypto engine</h3>
              <p>Loading contents, animations and market motion...</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (loading) {
    return (
      <div style={{ position: 'relative', zIndex: 1 }}>
        <PersistentBg />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          gap: '16px',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(0, 176, 255, 0.2) 0%, rgba(170, 59, 255, 0.2) 100%)',
            boxShadow: '0 0 20px rgba(0, 176, 255, 0.2)'
          }}>
            <TrendingUp size={32} style={{ color: '#00b0ff' }} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#94a3b8' }}>
            Connecting to crypto trade trading desk...
          </div>
        </div>
      </div>
    );
  }

  const scrollToSection = (section: TabType) => {
    if (section === 'dashboard') {
      setActiveTab('dashboard');
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    if (activeTab === 'dashboard') {
      setActiveTab(section);
      setTimeout(() => {
        performScroll(section);
      }, 50);
      return;
    }

    performScroll(section);
  };

  const performScroll = (section: TabType) => {
    if (section === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (section === 'techstack') {
      const container = sectionRefs.home.current;
      if (container) {
        // Scroll directly to the 85% milestone inside ScrollyCanvas (techstack zone)
        const offset = container.offsetTop + container.clientHeight * 0.85;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    } else if (section === 'projects') {
      const ref = sectionRefs.projects;
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    setActiveTab(section);
  };

  const isTerminalMode = activeTab === 'dashboard';


  // ── Logged in: all app sections on one page ──────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {!isTerminalMode && <PersistentBg />}
      <CursorEffect />
      <div className="sparse-scroll-ghosts" aria-hidden="true" />
      <div ref={warpOverlayRef} className="warp-pulse-overlay" aria-hidden="true" />
      {LoaderOverlay}

      <NavHeader
        activeKey={activeTab}
        onSelect={(section) => scrollToSection(section as TabType)}
        onSignIn={() => setShowAuth(true)}
      />


      {!isTerminalMode ? (
        <>
          <motion.section
            className="relative z-[1] w-full"
            ref={sectionRefs.home}
            id="home"
            variants={pageVariants}
            initial="initial"
            animate="animate"
          >
            <div className="relative w-full">
              <ScrollyCanvas 
                onStartTrading={() => scrollToSection('dashboard')}
                onNavbarStateChange={setNavbarState}
              />
            </div>
          </motion.section>

          <main ref={mainScrollRef} className="w-full max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col gap-24 relative z-10">
            <div ref={sectionRefs.projects} id="projects">
              <Projects />
            </div>

            <div className="py-12">
              <Pricing />
            </div>

            <StackedCircularFooter />
          </main>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[1400px] mx-auto px-6 pt-36 pb-12 flex-1 relative z-10"
        >
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
            <div>
              <div className="text-amber-400/80 font-mono text-[9px] tracking-[0.3em] uppercase mb-3">
                Trading Desk Workspace
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-white font-display">
                Execution Terminal
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-neutral-400">Low-Latency API Active</span>
            </div>
          </div>
          
          <Dashboard />
        </motion.div>
      )}


      <AnimatePresence>
        {showAuth && (
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="auth-modal-backdrop"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAuth(false); }}
          >
            <motion.div
              className="auth-modal-panel"
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.96 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                onClick={() => setShowAuth(false)}
                className="auth-modal-close"
                aria-label="Close sign in panel"
              >
                ✕
              </button>
              <Auth onBack={() => setShowAuth(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <AppContent />
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;
