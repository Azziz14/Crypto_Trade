import React, { useEffect, useRef, useState } from 'react';
import { createChart, LineSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { useBinanceTicker } from '../hooks/useBinanceTicker';

interface LiveChartProps {
  symbol: string;
  initialPrice: number;
  onPriceUpdate: (price: number) => void;
}

export const LiveChart: React.FC<LiveChartProps> = ({ symbol, initialPrice, onPriceUpdate }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const historyRef = useRef<Record<string, { time: Time; value: number }[]>>({});
  
  // Stable wrapper ref for the parent callback to avoid hook teardown
  const onPriceUpdateRef = useRef(onPriceUpdate);
  onPriceUpdateRef.current = onPriceUpdate;

  // Generate clean mock history based on the selected symbol
  const getMockHistory = (sym: string) => {
    if (historyRef.current[sym]) {
      return historyRef.current[sym];
    }

    const data: { time: Time; value: number }[] = [];
    let basePrice = initialPrice > 0 ? initialPrice : 5611200; // Seed with live price to prevent graph jump
    if (sym.includes('ETH') && basePrice === 5611200) basePrice = 292250;
    else if (sym.includes('SOL') && basePrice === 5611200) basePrice = 13770;
    else if (sym.includes('BNB') && basePrice === 5611200) basePrice = 48840;
    else if (sym.includes('ADA') && basePrice === 5611200) basePrice = 37.5;

    const now = Math.floor(Date.now() / 1000);
    // Generate 60 points, 10s intervals
    for (let i = 60; i > 0; i--) {
      const timeVal = now - i * 10;
      // Random walk with very tiny micro-fluctuations (realistic)
      basePrice = basePrice + (Math.random() - 0.5) * (basePrice * 0.0008);
      data.push({ time: timeVal as Time, value: parseFloat(basePrice.toFixed(2)) });
    }
    historyRef.current[sym] = data;
    return data;
  };

  // 1. Chart Creation and Initialization
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const initialHeight = typeof window !== 'undefined' 
      ? Math.min(Math.max(220, window.innerHeight * 0.35), 450)
      : 280;

    // Create chart with a minimal, institutional matte graphite design
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: initialHeight,
      layout: {
        background: { color: 'transparent' }, // Inherit matte graphite container background
        textColor: 'rgba(255, 255, 255, 0.4)', // Faint muted text
        fontFamily: "'Satoshi', 'Neue Montreal', 'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' }, // Almost invisible grid lines
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
      },
      rightPriceScale: {
        borderColor: 'transparent', // Remove borders
        visible: true,
        alignLabels: true,
      },
      timeScale: {
        borderColor: 'transparent',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    // Add Line Series - thin, neon green, clean
    const lineSeries = chart.addSeries(LineSeries, {
      color: '#00e676', // Soft neon green
      lineWidth: 2,
      crosshairMarkerVisible: true,
      priceLineVisible: false, // Clean up horizontal last price line
    });

    // Load initial history
    const initialData = getMockHistory(symbol);
    lineSeries.setData(initialData);

    // Initial notify of the starting price
    if (initialData.length > 0) {
      onPriceUpdateRef.current(initialData[initialData.length - 1].value);
    }

    chartRef.current = chart;
    lineSeriesRef.current = lineSeries;

    // Responsive resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const computedHeight = Math.min(Math.max(220, window.innerHeight * 0.35), 450);
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: computedHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      lineSeriesRef.current = null;
    };
  }, [symbol]);

  // 2. Consume real-time updates directly from the Binance WebSocket stream hook
  useBinanceTicker(symbol, (inrPrice) => {
    if (!lineSeriesRef.current) return;

    const now = Math.floor(Date.now() / 1000);
    const mockData = historyRef.current[symbol] || [];
    const lastTick = mockData[mockData.length - 1];
    const lastTickTime = lastTick ? (lastTick.time as number) : 0;

    // Notify parent view of the latest price to keep the quick execution order matching in real-time
    onPriceUpdateRef.current(inrPrice);

    // Append to series - enforce strict time order required by lightweight-charts
    if (lastTick && now <= lastTickTime) {
      // If time is identical or backward, update the current point's value
      lastTick.value = inrPrice;
      lineSeriesRef.current.update(lastTick);
    } else {
      // Append a new point
      const safeTime = Math.max(now, lastTickTime + 1);
      const newTick = { time: safeTime as Time, value: inrPrice };
      mockData.push(newTick);

      // Keep history window to latest 180 points to maintain performance
      if (mockData.length > 180) {
        mockData.shift();
      }

      historyRef.current[symbol] = mockData;
      lineSeriesRef.current.update(newTick);
    }
  });

  return (
    <div style={{ position: 'relative', width: '100%', background: '#0a0d10', borderRadius: '4px', padding: '12px' }}>
      {/* Zoom / Navigation Controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 10,
        display: 'flex',
        gap: '6px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '3px',
        borderRadius: '6px',
        backdropFilter: 'blur(8px)'
      }}>
        <button
          onClick={() => {
            const timeScale = chartRef.current?.timeScale();
            const range = timeScale?.getVisibleLogicalRange();
            if (timeScale && range) {
              const len = range.to - range.from;
              timeScale.setVisibleLogicalRange({
                from: range.from + len * 0.15,
                to: range.to - len * 0.15,
              });
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '14px',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Zoom In"
        >
          ＋
        </button>
        <button
          onClick={() => {
            const timeScale = chartRef.current?.timeScale();
            const range = timeScale?.getVisibleLogicalRange();
            if (timeScale && range) {
              const len = range.to - range.from;
              timeScale.setVisibleLogicalRange({
                from: range.from - len * 0.15,
                to: range.to + len * 0.15,
              });
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '14px',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Zoom Out"
        >
          －
        </button>
        <button
          onClick={() => chartRef.current?.timeScale().resetTimeScale()}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '10px',
            fontWeight: 600,
            padding: '0 6px',
            height: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="Reset Zoom"
        >
          RESET
        </button>
      </div>
      <div ref={chartContainerRef} style={{ width: '100%' }} />
    </div>
  );
};
