'use client';

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Search, Bell, Settings } from 'lucide-react';

const HeroWebGPUCanvas = dynamic(() => import('./hero-canvas'), {
  ssr: false,
  loading: () => (
    <div
      className="absolute inset-0 z-10"
      style={{
        background:
          'radial-gradient(circle at 50% 40%, rgba(120, 40, 40, 0.45) 0%, rgba(3, 7, 18, 0.95) 55%, #030712 100%)',
      }}
    />
  ),
});

export const HeroFuturistic = ({ onStartTrading }: { onStartTrading?: () => void }) => {
  const titleWords = 'Antigravity Crypto Simulator'.split(' ');
  const subtitle = 'Real-time paper trading desk with INR virtual balance.';
  const [visibleWords, setVisibleWords] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [delays, setDelays] = useState<number[]>([]);
  const [subtitleDelay, setSubtitleDelay] = useState(0);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const [scrollScale, setScrollScale] = useState(0.75);

  useEffect(() => {
    const handleScroll = () => {
      if (!dashboardRef.current) return;
      const rect = dashboardRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      // Progress: 0 when bottom of viewport, 1 when fully visible
      const progress = Math.min(Math.max(0, (windowHeight - rect.top) / (windowHeight * 0.6)), 1);
      setScrollScale(0.75 + progress * 0.25);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setDelays(titleWords.map(() => Math.random() * 0.07));
    setSubtitleDelay(Math.random() * 0.1);
  }, [titleWords.length]);

  useEffect(() => {
    if (visibleWords < titleWords.length) {
      const timeout = setTimeout(() => setVisibleWords(visibleWords + 1), 600);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => setSubtitleVisible(true), 800);
      return () => clearTimeout(timeout);
    }
  }, [visibleWords, titleWords.length]);

  // ── Dashboard state logic ──────────────────────────────────────────────────
  const [tickerOffset, setTickerOffset] = useState(0);
  type Panel = 'trade' | 'portfolio' | 'balance' | 'history';
  const [activePanel, setActivePanel] = useState<Panel>('trade');

  interface CryptoPrice {
    inr: number;
    inr_24h_change: number;
  }
  const [prices, setPrices] = useState<{
    bitcoin: CryptoPrice;
    ethereum: CryptoPrice;
    tether: CryptoPrice;
    binancecoin: CryptoPrice;
    solana: CryptoPrice;
    ripple: CryptoPrice;
  } | null>(null);

  const [orderBook, setOrderBook] = useState<{
    asks: [string, string][];
    bids: [string, string][];
    usdInr: number;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerOffset((prev) => prev + 1);
    }, 200);
    return () => clearInterval(timer);
  }, []);

  const fetchPrices = React.useCallback(async () => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin,solana,ripple&vs_currencies=inr&include_24hr_change=true',
        { cache: 'no-store' }
      );
      if (!res.ok) return;
      const data = await res.json();
      setPrices(data);
    } catch { /* ignore fallback values */ }
  }, []);

  const fetchOrderBook = React.useCallback(async () => {
    try {
      const depthRes = await fetch(
        'https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=8',
        { cache: 'no-store' }
      );
      const depth = await depthRes.json();
      setOrderBook({
        asks: depth.asks as [string, string][],
        bids: depth.bids as [string, string][],
        usdInr: prices?.tether?.inr ?? 84,
      });
    } catch { /* ignore */ }
  }, [prices]);

  useEffect(() => {
    fetchPrices();
    const priceInterval = setInterval(fetchPrices, 30000);
    return () => clearInterval(priceInterval);
  }, [fetchPrices]);

  useEffect(() => {
    if (prices) {
      fetchOrderBook();
      const obInterval = setInterval(fetchOrderBook, 10000);
      return () => clearInterval(obInterval);
    }
  }, [fetchOrderBook, prices]);

  const fmt = (n: number, dec = 0) =>
    '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  const BTC = prices?.bitcoin?.inr ?? (70883 * 84);
  const ETH = prices?.ethereum?.inr ?? (3667 * 84);
  const USDT = prices?.tether?.inr ?? 84;
  const BNB = prices?.binancecoin?.inr ?? (624 * 84);
  const SOL = prices?.solana?.inr ?? (138 * 84);
  const XRP = prices?.ripple?.inr ?? (0.54 * 84);
  void USDT;

  const btcChange = prices?.bitcoin?.inr_24h_change ?? 2.13;
  const ethChange = prices?.ethereum?.inr_24h_change ?? 3.27;
  const bnbChange = prices?.binancecoin?.inr_24h_change ?? 2.05;
  const solChange = prices?.solana?.inr_24h_change ?? 4.19;
  const xrpChange = prices?.ripple?.inr_24h_change ?? 3.79;

  const btcLive = BTC + Math.sin(tickerOffset * 0.1) * (BTC * 0.0015);

  const scrollSmoothToDashboard = () => {
    if (dashboardRef.current) {
      dashboardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#030712]">
      {/* ── STAGE 1: WEBGL CANVAS HEADER (No Scroll-Zoom) ── */}
      <div className="relative h-screen overflow-hidden flex flex-col justify-center items-center">
        <div className="h-screen uppercase items-center w-full absolute z-30 pointer-events-none px-10 flex justify-center flex-col text-center">
          <div className="text-3xl md:text-5xl xl:text-6xl font-extrabold tracking-tight">
            <div className="flex flex-wrap justify-center gap-x-2 md:gap-x-4 overflow-hidden text-white">
              {titleWords.map((word, index) => (
                <div
                  key={index}
                  className={index < visibleWords ? 'fade-in' : ''}
                  style={{ animationDelay: `${index * 0.13 + (delays[index] || 0)}s`, opacity: index < visibleWords ? undefined : 0 }}
                >
                  {word}
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs md:text-lg xl:text-xl mt-4 max-w-xl overflow-hidden text-white font-bold opacity-80">
            <div
              className={subtitleVisible ? 'fade-in-subtitle' : ''}
              style={{ animationDelay: `${titleWords.length * 0.13 + 0.2 + subtitleDelay}s`, opacity: subtitleVisible ? undefined : 0 }}
            >
              {subtitle}
            </div>
          </div>
        </div>

        <button
          onClick={scrollSmoothToDashboard}
          className="explore-btn z-40 cursor-pointer"
          style={{ animationDelay: '2.2s', pointerEvents: 'auto' }}
        >
          Scroll to explore
          <span className="explore-arrow">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" className="arrow-svg">
              <path d="M11 5V17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M6 12L11 17L16 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </span>
        </button>

        <HeroWebGPUCanvas />
      </div>

      {/* ── STAGE 2: LIVE FORECASTING TERMINAL DASHBOARD ── */}
      <div 
        ref={dashboardRef}
        className="relative z-20 w-full max-w-7xl mx-auto px-6 py-20"
      >
        <div className="mb-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-850 pr-4 backdrop-blur-sm border border-stone-800/40 mb-4">
            <span className="px-2 py-0.5 bg-green-500 text-green-950 text-xs font-bold rounded-full">LIVE</span>
            <span className="text-sm text-gray-300 tracking-tight">Real-time market analytics and book tracking</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Forecasting & Terminal Desk
          </h2>
          <p className="text-gray-400 mt-2 max-w-2xl text-balance">
            Track live order depth, trade execution streams, and portfolios simulated in Rupees with institutional grade reliability.
          </p>
        </div>

        <div 
          className="bg-black/80 backdrop-blur-xl rounded-2xl border border-stone-800/70 overflow-hidden shadow-2xl will-change-transform"
          style={{
            transform: `scale(${scrollScale})`,
            transformOrigin: "center top",
            transition: 'transform 0.08s linear',
          }}
        >
          {/* Dashboard Header Tabs */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-b border-gray-800/50 gap-4">
            <div className="flex flex-wrap items-center gap-4 md:gap-8 w-full sm:w-auto justify-center sm:justify-start">
              <span className="text-xl font-bold text-white">Forecaster</span>
              <div className="flex items-center gap-1 bg-stone-900/60 p-1 rounded-full border border-stone-800/40">
                {(['trade', 'portfolio', 'balance', 'history'] as Panel[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePanel(p)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 capitalize ${
                      activePanel === p
                        ? 'bg-white text-black border border-white/20'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {p === 'history' ? 'Tx History' : p}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 text-gray-400">
              <Search className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
              <Bell className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
              <Settings className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
            </div>
          </div>

          {/* ── PANEL: TRADE ── */}
          {activePanel === 'trade' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              {/* Left Column: List */}
              <div className="space-y-4">
                <div className="bg-gray-900/30 rounded-xl p-4 border border-orange-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">₿</div>
                    <div>
                      <div className="text-white font-medium">BTC/INR</div>
                      <div className="text-xs text-gray-400">Live • Binance</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono mb-1">{fmt(btcLive)}</div>
                  <div className={`text-sm font-semibold ${btcChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {btcChange >= 0 ? '+' : ''}{btcChange.toFixed(2)}% (24h)
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { symbol: 'BTC',  name: 'Bitcoin',  price: fmt(BTC  + Math.sin(tickerOffset * 0.08) * BTC  * 0.001), change: btcChange, positive: btcChange >= 0 },
                    { symbol: 'ETH',  name: 'Ethereum', price: fmt(ETH  + Math.cos(tickerOffset * 0.08) * ETH  * 0.001), change: ethChange, positive: ethChange >= 0 },
                    { symbol: 'BNB',  name: 'Binance Coin', price: fmt(BNB + Math.sin(tickerOffset * 0.1)  * BNB  * 0.001), change: bnbChange, positive: bnbChange >= 0 },
                    { symbol: 'SOL',  name: 'Solana',   price: fmt(SOL  + Math.cos(tickerOffset * 0.12) * SOL  * 0.001), change: solChange, positive: solChange >= 0 },
                    { symbol: 'XRP',  name: 'Ripple',   price: fmt(XRP  + Math.sin(tickerOffset * 0.09) * XRP  * 0.001, 2), change: xrpChange, positive: xrpChange >= 0 },
                  ].map((crypto, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 hover:bg-stone-900/50 rounded-lg transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${crypto.positive ? 'bg-green-400' : 'bg-red-400'}`} />
                        <div>
                          <div className="text-white text-sm font-medium">{crypto.symbol}</div>
                          <div className="text-gray-400 text-xs">{crypto.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-sm font-mono">{crypto.price}</div>
                        <div className={`text-xs font-semibold ${crypto.positive ? 'text-green-400' : 'text-red-400'}`}>
                          {crypto.positive ? '+' : ''}{crypto.change.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Center Column: Live Chart */}
              <div className="lg:col-span-1 bg-gray-900/20 rounded-xl p-4 flex flex-col h-80 border border-stone-850">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm">BTC/INR Chart</span>
                    <span className="text-green-400 text-sm font-bold font-mono">{fmt(btcLive)}</span>
                  </div>
                  <div className="flex gap-1 text-[10px]">
                    {['1s','15m','1H','1D'].map((tf) => (
                      <button key={tf} className={`px-2 py-0.5 rounded ${tf === '1H' ? 'bg-white text-black' : 'text-gray-400 hover:text-white bg-stone-900'}`}>{tf}</button>
                    ))}
                  </div>
                </div>

                <div className="relative flex-1 bg-black/40 rounded-lg overflow-hidden border border-stone-850/40">
                  <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none">
                    {[0, 1, 2, 3].map(i => <div key={i} className="w-full border-t border-white/5" />)}
                  </div>
                  <div className="absolute inset-0 flex items-end px-3 pb-2 gap-[2px]">
                    {Array.from({ length: 60 }, (_, i) => {
                      const phase = (i + tickerOffset * 0.5) * 0.3;
                      const bodyH  = Math.abs(Math.sin(phase) * 32 + Math.cos(phase * 1.3) * 12) + 8;
                      const totalH = bodyH + Math.abs(Math.sin(phase * 2.1) * 10) + 4;
                      const isGreen = Math.sin(phase + 0.4) > 0;
                      const color = isGreen ? '#22c55e' : '#ef4444';
                      const wickH = totalH - bodyH;
                      return (
                        <div key={i} className="flex flex-col items-center justify-end flex-1" style={{ minWidth: '2px', maxWidth: '6px' }}>
                          <div style={{ width: '1px', height: `${wickH}%`, background: color, opacity: 0.6 }} />
                          <div style={{ width: '100%', height: `${bodyH}%`, background: color, opacity: 0.85, borderRadius: '1px' }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Order Book */}
              <div className="bg-gray-900/30 rounded-xl p-4 border border-stone-850">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-medium text-sm">Order Book</span>
                  <div className="flex gap-2">
                    <button onClick={onStartTrading} className="text-green-400 text-xs hover:underline cursor-pointer">Buy Order</button>
                    <button onClick={onStartTrading} className="text-red-400 text-xs hover:underline cursor-pointer">Sell Order</button>
                  </div>
                </div>
                <div className="space-y-1 text-[11px] font-mono">
                  {orderBook
                    ? orderBook.asks.slice(0, 5).map(([p, q], i) => (
                        <div key={`sell-${i}`} className="grid grid-cols-3 gap-2 text-red-400">
                          <span>{fmt(parseFloat(p) * orderBook.usdInr)}</span>
                          <span className="text-center">{parseFloat(q).toFixed(4)}</span>
                          <span className="text-right">{fmt(parseFloat(p) * orderBook.usdInr * parseFloat(q))}</span>
                        </div>
                      ))
                    : Array.from({ length: 5 }, (_, i) => (
                        <div key={`sell-${i}`} className="grid grid-cols-3 gap-2 text-red-400/80">
                          <span>{fmt(BTC * 1.002)}</span>
                          <span className="text-center">0.0512</span>
                          <span className="text-right">{fmt(BTC * 1.002 * 0.0512)}</span>
                        </div>
                      ))
                  }
                  <div className="py-2 text-center border-y border-stone-800 text-green-400 font-bold">{fmt(btcLive)}</div>
                  {orderBook
                    ? orderBook.bids.slice(0, 5).map(([p, q], i) => (
                        <div key={`buy-${i}`} className="grid grid-cols-3 gap-2 text-green-400">
                          <span>{fmt(parseFloat(p) * orderBook.usdInr)}</span>
                          <span className="text-center">{parseFloat(q).toFixed(4)}</span>
                          <span className="text-right">{fmt(parseFloat(p) * orderBook.usdInr * parseFloat(q))}</span>
                        </div>
                      ))
                    : Array.from({ length: 5 }, (_, i) => (
                        <div key={`buy-${i}`} className="grid grid-cols-3 gap-2 text-green-400/80">
                          <span>{fmt(BTC * 0.998)}</span>
                          <span className="text-center">0.1245</span>
                          <span className="text-right">{fmt(BTC * 0.998 * 0.1245)}</span>
                        </div>
                      ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* ── PANEL: PORTFOLIO ── */}
          {activePanel === 'portfolio' && (
            <div className="p-6">
              <h3 className="text-white font-semibold text-lg mb-4">Portfolio holdings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {[
                    { sym: 'BTC', w: 40, col: '#f7931a', val: BTC },
                    { sym: 'ETH', w: 30, col: '#627eea', val: ETH },
                    { sym: 'BNB', w: 20, col: '#f3ba2f', val: BNB },
                    { sym: 'SOL', w: 10, col: '#9945ff', val: SOL },
                  ].map((c) => (
                    <div key={c.sym}>
                      <div className="flex justify-between text-xs text-gray-300 mb-1">
                        <span>{c.sym} holding ({c.w}%)</span>
                        <span>{fmt(c.val)}</span>
                      </div>
                      <div className="w-full bg-stone-900 rounded-full h-1">
                        <div className="h-1 rounded-full" style={{ width: `${c.w}%`, background: c.col }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-stone-900/40 border border-stone-850 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-400">Asset Net Worth</span><span className="text-green-400 font-mono font-bold">{fmt(BTC * 0.05 + ETH * 0.5)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">Total Profits</span><span className="text-green-400 font-mono font-bold">+₹1,24,930.00</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">Risk Allocation</span><span className="text-white">Aggressive (100% Crypto)</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ── PANEL: BALANCE ── */}
          {activePanel === 'balance' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-stone-900/60 p-5 rounded-xl border border-stone-800/60">
                <div className="text-xs text-gray-400 mb-1">Cash Balance</div>
                <div className="text-2xl font-bold font-mono text-green-400">₹1,00,00,000.00</div>
              </div>
              <div className="bg-stone-900/60 p-5 rounded-xl border border-stone-800/60">
                <div className="text-xs text-gray-400 mb-1">Portfolio Assets</div>
                <div className="text-2xl font-bold font-mono text-white">{fmt(BTC * 0.01 + ETH * 0.2)}</div>
              </div>
              <div className="bg-stone-900/60 p-5 rounded-xl border border-stone-800/60">
                <div className="text-xs text-gray-400 mb-1">Leverage Ratio</div>
                <div className="text-2xl font-bold text-white">1x (No leverage)</div>
              </div>
            </div>
          )}

          {/* ── PANEL: HISTORY ── */}
          {activePanel === 'history' && (
            <div className="p-6">
              <div className="bg-stone-950 rounded-xl overflow-hidden border border-stone-850">
                <div className="grid grid-cols-4 text-xs text-gray-400 p-3 border-b border-stone-850 font-bold uppercase">
                  <span>Type</span><span>Asset</span><span>Qty</span><span className="text-right">Total(₹)</span>
                </div>
                {[
                  { type: 'BUY', sym: 'BTC', qty: '0.0024', val: BTC * 0.0024 },
                  { type: 'BUY', sym: 'ETH', qty: '0.1250', val: ETH * 0.1250 },
                  { type: 'SELL', sym: 'SOL', qty: '1.5000', val: SOL * 1.5 },
                ].map((row, idx) => (
                  <div key={idx} className="grid grid-cols-4 text-sm p-3 border-b border-stone-900/60 hover:bg-stone-900/20 transition-all font-mono">
                    <span className={row.type === 'BUY' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{row.type}</span>
                    <span className="text-white">{row.sym}</span>
                    <span className="text-gray-300">{row.qty}</span>
                    <span className="text-right text-white font-semibold">{fmt(row.val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HeroFuturistic;
