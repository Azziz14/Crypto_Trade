"use client";

import React, { useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useBinanceStreams } from "../../hooks/useBinanceStreams";
import { Menu, X } from "lucide-react";

interface NavHeaderProps {
  activeKey?: string;
  onSelect?: (section: string) => void;
  onSignIn?: () => void;
}

const navItems = [
  { key: "home", label: "Overview" },
  { key: "techstack", label: "Stack" },
  { key: "projects", label: "Modules" },
];

function NavHeader({ activeKey, onSelect, onSignIn }: NavHeaderProps) {
  const { scrollYProgress } = useScroll();
  const [mobileOpen, setMobileOpen] = useState(false);

  const headerBg = useTransform(
    scrollYProgress,
    [0, 0.25],
    ["rgba(0, 0, 0, 0.0)", "rgba(11, 11, 13, 0.35)"]
  );
  const headerBorder = useTransform(
    scrollYProgress,
    [0, 0.25],
    ["rgba(255, 255, 255, 0.0)", "rgba(255, 255, 255, 0.03)"]
  );
  const headerY = useTransform(scrollYProgress, [0, 0.25], [0, -6]);

  const tickers = useBinanceStreams();

  const formatPrice = (price: number) => {
    if (price === 0) return "—";
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  };

  return (
    <>
      <motion.div
        style={{ backgroundColor: headerBg, borderBottomColor: headerBorder, y: headerY }}
        className="w-full fixed top-0 inset-x-0 z-[60] px-4 sm:px-6 md:px-12 py-3 sm:py-4 border-b select-none pointer-events-auto backdrop-blur-[10px] flex flex-col gap-2 sm:gap-3.5 transition-colors duration-300"
      >
        {/* Ticker ribbon — hidden on phones */}
        <div className="hidden sm:flex w-full items-center justify-between text-[10px] font-mono tracking-[0.2em] text-neutral-400 border-b border-white/[0.02] pb-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-500">
            <span className="w-1 h-1 rounded-full bg-emerald-500/55 animate-pulse" />
            Live Exchange Feed
          </div>
          <div className="flex items-center gap-4 lg:gap-8 overflow-x-auto scrollbar-none">
            {Object.entries(tickers).map(([symbol, data]) => {
              const name = symbol.replace("USDT", "");
              const isUp = data.change24h >= 0;
              const flashClass =
                data.flash === "up"
                  ? "text-emerald-400 font-bold"
                  : data.flash === "down"
                  ? "text-rose-400 font-bold"
                  : "";
              const isMobileCollapsible = symbol === "ADAUSDT" || symbol === "BNBUSDT";
              const displayClass = isMobileCollapsible ? "hidden lg:flex" : "flex";
              return (
                <div
                  key={symbol}
                  className={`${displayClass} items-center gap-2 transition-colors duration-200 ${flashClass} shrink-0`}
                >
                  <span>{name}</span>
                  <span className="text-neutral-400">{formatPrice(data.price)}</span>
                  {data.price > 0 && (
                    <span className={isUp ? "text-emerald-500/70" : "text-rose-500/70"}>
                      {isUp ? "+" : ""}
                      {data.change24h.toFixed(1)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Main nav row */}
        <div className="w-full flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-white text-[13px] tracking-wider uppercase">
              CryptoTrade
            </span>
          </div>

          {/* Desktop center links */}
          <nav className="hidden md:flex items-center gap-8 font-mono text-[11px] tracking-[0.15em] uppercase">
            {navItems.map((item) => {
              const isActive = activeKey === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onSelect?.(item.key)}
                  className={`transition-colors duration-250 cursor-pointer ${
                    isActive ? "text-white" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-6 font-mono text-[11px] tracking-[0.15em] uppercase">
            <button
              onClick={onSignIn}
              className="text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            >
              Access Portal
            </button>
            <button
              onClick={() => onSelect?.("dashboard")}
              className="border border-white/10 px-3 py-1 rounded text-neutral-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            >
              Access Terminal
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden text-neutral-400 hover:text-white p-2 rounded-lg border border-white/10 hover:border-white/20 transition-all cursor-pointer active:scale-95"
            aria-label="Open navigation menu"
          >
            <Menu size={18} />
          </button>
        </div>
      </motion.div>

      {/* Mobile Slide-in Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-[6px]"
            />

            {/* Slide panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.38 }}
              className="absolute right-0 top-0 bottom-0 w-[min(85vw,320px)] bg-[#090a0c] border-l border-white/[0.07] flex flex-col overflow-y-auto"
            >
              {/* Panel header */}
              <div className="flex justify-between items-center px-6 py-5 border-b border-white/[0.07]">
                <span className="font-bold text-white text-[13px] tracking-widest uppercase">
                  CryptoTrade
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/20 transition-all cursor-pointer active:scale-90"
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-1 px-4 py-4 flex-1">
                {navItems.map((item, i) => {
                  const isActive = activeKey === item.key;
                  return (
                    <motion.button
                      key={item.key}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        transition: { delay: 0.08 + i * 0.06, ease: "easeOut" },
                      }}
                      onClick={() => {
                        onSelect?.(item.key);
                        setMobileOpen(false);
                      }}
                      className={`w-full text-left py-3.5 px-4 rounded-xl font-mono text-[12px] tracking-widest uppercase transition-all cursor-pointer active:scale-[0.98] ${
                        isActive
                          ? "text-[#39FF14] bg-[#39FF14]/[0.06] border border-[#39FF14]/20"
                          : "text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                      }`}
                    >
                      {item.label}
                    </motion.button>
                  );
                })}
              </nav>

              {/* Mobile CTAs */}
              <div className="flex flex-col gap-3 px-5 py-5 border-t border-white/[0.07]">
                {/* Live ticker summary on mobile */}
                <div className="flex items-center gap-2 justify-center mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70 animate-pulse" />
                  <span className="text-[10px] font-mono text-neutral-500 tracking-widest uppercase">
                    Markets Live
                  </span>
                </div>
                <button
                  onClick={() => {
                    onSignIn?.();
                    setMobileOpen(false);
                  }}
                  className="w-full py-3.5 rounded-xl border border-white/10 text-neutral-300 font-mono text-[11px] tracking-widest uppercase hover:border-white/20 hover:text-white transition-all cursor-pointer active:scale-[0.98]"
                >
                  Access Portal
                </button>
                <button
                  onClick={() => {
                    onSelect?.("dashboard");
                    setMobileOpen(false);
                  }}
                  className="w-full py-3.5 rounded-xl bg-[#39FF14] text-black font-bold font-mono text-[11px] tracking-widest uppercase hover:brightness-110 shadow-[0_0_20px_rgba(57,255,20,0.25)] transition-all cursor-pointer active:scale-[0.98]"
                >
                  Launch Terminal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default NavHeader;
