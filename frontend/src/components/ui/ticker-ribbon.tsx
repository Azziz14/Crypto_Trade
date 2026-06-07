'use client';

import React from 'react';
import { useBinanceStreams } from '../../hooks/useBinanceStreams';

export const TickerRibbon: React.FC = () => {
  const tickers = useBinanceStreams();

  const formatPrice = (price: number) => {
    if (price === 0) return 'Loading...';
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
  };

  const getFlashClass = (flash: 'up' | 'down' | null) => {
    if (flash === 'up') return 'text-emerald-400 bg-emerald-500/10 scale-[1.02] border-emerald-500/20';
    if (flash === 'down') return 'text-rose-400 bg-rose-500/10 scale-[1.02] border-rose-500/20';
    return 'text-neutral-400 bg-transparent border-transparent';
  };

  return (
    <div className="w-full bg-[#0B0B0D] border-b border-white/5 py-2.5 px-6 relative z-30 overflow-hidden select-none">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between text-xs font-mono tracking-wider">
        <div className="flex items-center gap-2 text-neutral-500 text-[10px] uppercase font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Network Feed
        </div>

        <div className="flex items-center gap-6 md:gap-12">
          {Object.entries(tickers).map(([symbol, data]) => {
            const displayName = symbol.replace('USDT', '');
            const isPositive = data.change24h >= 0;

            return (
              <div
                key={symbol}
                className={`flex items-center gap-3 px-3 py-1 rounded border transition-all duration-300 ${getFlashClass(
                  data.flash
                )}`}
              >
                <span className="font-semibold text-neutral-200">{displayName}</span>
                <span className="font-light text-white">{formatPrice(data.price)}</span>
                {data.price > 0 && (
                  <span
                    className={`text-[10px] font-semibold ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {data.change24h.toFixed(2)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
