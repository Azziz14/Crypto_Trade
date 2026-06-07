import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { LiveChart } from '../components/LiveChart';
import { useBinanceStreams } from '../hooks/useBinanceStreams';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IndianRupee, Wallet, 
  ArrowUpRight, ArrowDownRight, RefreshCw, ShoppingCart, 
  Layers, CheckCircle, AlertTriangle 
} from 'lucide-react';

interface HoldingDTO {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

interface PortfolioResponse {
  userId: number;
  email: string;
  cashBalance: number;
  initialBalance: number;
  totalPortfolioValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  holdings: HoldingDTO[];
}

export const Dashboard: React.FC = () => {
  const { user, apiFetch, updateBalance } = useAuth();
  const { prices, priceDirections, subscribeToTopic } = useWebSocket();
  const tickers = useBinanceStreams();
  const isGuest = !user;

  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [orderStatus, setOrderStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [currentSelectedPrice, setCurrentSelectedPrice] = useState<number>(0);

  useEffect(() => {
    setCurrentSelectedPrice(getLivePrice(selectedSymbol));
  }, [selectedSymbol]);

  // Available trading pairs on dashboard
  const DEFAULT_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT'];

  const fetchPortfolio = async () => {
    try {
      const res = await apiFetch('/api/portfolio');
      if (res.ok) {
        const data: PortfolioResponse = await res.json();
        setPortfolio(data);
        updateBalance(data.cashBalance);
      }
    } catch (err) {
      console.error('Failed to fetch portfolio', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // 1. Initial Load of Portfolio
  useEffect(() => {
    if (!user) {
      setDashboardLoading(false);
      return;
    }
    fetchPortfolio();
  }, [user]);

  // 2. Subscribe to STOMP WebSocket Portfolio Updates
  useEffect(() => {
    if (!user || !portfolio?.userId) return;
    
    console.log(`Subscribing to WebSocket portfolio updates for user: ${portfolio.userId}`);
    const unsubscribe = subscribeToTopic(`/topic/portfolio/${portfolio.userId}`, (updatedPortfolio: PortfolioResponse) => {
      console.log('Received WebSocket portfolio update', updatedPortfolio);
      setPortfolio(updatedPortfolio);
      updateBalance(updatedPortfolio.cashBalance);
    });

    return unsubscribe;
  }, [portfolio?.userId]);

  // 3. Subscribe to all default ticker streams in WebSocketContext
  useEffect(() => {
    const unsubscribes = DEFAULT_PAIRS.map((pair) => 
      subscribeToTopic(`/topic/prices/${pair}`, () => {})
    );
    return () => unsubscribes.forEach((unsub) => unsub());
  }, []);

  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);


  // Convert default pricing from USD to INR equivalent using 83.50 rate
  const getLivePrice = (sym: string): number => {
    const binanceTicker = tickers[sym];
    if (binanceTicker && binanceTicker.price > 0) {
      return binanceTicker.price * 83.50;
    }
    return prices[sym] || (portfolio?.holdings.find(h => h.symbol === sym)?.currentPrice) || 
      (sym === 'BTCUSDT' ? 5611200.00 : sym === 'ETHUSDT' ? 292250.00 : sym === 'SOLUSDT' ? 13777.50 : sym === 'BNBUSDT' ? 48847.50 : 37.575);
  };

  const formatINR = (val: number, minDec = 2, maxDec = 2) => {
    return '₹' + val.toLocaleString('en-IN', {
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec
    });
  };

  const formatINRShort = (val: number) => {
    if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
    if (val >= 100000) return '₹' + (val / 100000).toFixed(2) + ' L';
    return '₹' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderStatus(null);

    if (isGuest) {
      setOrderStatus({ type: 'error', message: 'Sign in to activate trading and portfolio updates.' });
      return;
    }

    setTradeLoading(true);
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setOrderStatus({ type: 'error', message: 'Quantity must be a positive number!' });
      setTradeLoading(false);
      return;
    }

    try {
      const endpoint = tradeType === 'BUY' ? '/api/trade/buy' : '/api/trade/sell';
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          symbol: selectedSymbol,
          quantity: qty,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setOrderStatus({
          type: 'success',
          message: `Successfully executed ${tradeType} order! ID: ${data.tradeId}`,
        });
        setQuantity('');
        
        // Instant trigger portfolio refresh (will also be updated via WS)
        fetchPortfolio();
      } else {
        setOrderStatus({
          type: 'error',
          message: data.error || 'Failed to execute trade!',
        });
      }
    } catch (err: any) {
      setOrderStatus({
        type: 'error',
        message: err.message || 'An error occurred during trade execution.',
      });
    } finally {
      setTradeLoading(false);
    }
  };

  const calculatedTotal = parseFloat(quantity) ? parseFloat(quantity) * currentSelectedPrice : 0;

  if (dashboardLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="pulsing" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
          Loading trading terminal data...
        </div>
      </div>
    );
  }

  const cash = isGuest ? 0 : portfolio?.cashBalance ?? user?.virtualBalance ?? 0;
  const initial = isGuest ? 0 : portfolio?.initialBalance ?? user?.initialBalance ?? 1000000;
  const totalValue = isGuest ? 0 : portfolio?.totalPortfolioValue ?? cash;
  const totalPnL = isGuest ? 0 : portfolio?.totalPnL ?? (totalValue - initial);
  const totalPnLPercent = isGuest ? 0 : portfolio?.totalPnLPercent ?? (initial > 0 ? (totalPnL * 100) / initial : 0);
  const holdingsValue = totalValue - cash;

  // Assemble Asset Allocation slices for SVG Donut Chart
  const slices: { label: string; value: number; color: string; percent: number }[] = [];
  if (totalValue > 0) {
    slices.push({
      label: 'Cash (₹)',
      value: cash,
      color: '#ff9100', // vibrant orange
      percent: (cash / totalValue) * 100
    });
    if (portfolio?.holdings) {
      const colors = ['#00e676', '#00b0ff', '#aa3bff', '#e040fb', '#00e5ff'];
      portfolio.holdings.forEach((h, idx) => {
        const livePrice = getLivePrice(h.symbol);
        const mktVal = h.quantity * livePrice;
        if (mktVal > 0) {
          slices.push({
            label: h.symbol.replace('USDT', ''),
            value: mktVal,
            color: colors[idx % colors.length],
            percent: (mktVal / totalValue) * 100
          });
        }
      });
    }
  } else {
    slices.push({
      label: 'Cash (₹)',
      value: 0,
      color: '#ff9100',
      percent: 100
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* Top Portfolio Valuation Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Net Worth Card */}
        <div className="neon-glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px 20px', borderLeft: '3px solid #00e5ff' }}>
          <div style={{
            background: 'rgba(0, 229, 255, 0.08)',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00e5ff',
            boxShadow: '0 0 12px rgba(0, 229, 255, 0.15)',
            flexShrink: 0
          }}>
            <Wallet size={20} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total Net Worth</div>
            <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '4px', color: '#ffffff' }} className="glow-blue">
              {formatINR(totalValue)}
            </div>
          </div>
        </div>

        {/* Cash Balance Card */}
        <div className="neon-glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px 20px', borderLeft: '3px solid #ff9100' }}>
          <div style={{
            background: 'rgba(255, 145, 0, 0.08)',
            border: '1px solid rgba(255, 145, 0, 0.25)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff9100',
            boxShadow: '0 0 12px rgba(255, 145, 0, 0.15)',
            flexShrink: 0
          }}>
            <IndianRupee size={20} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Available Cash</div>
            <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '4px', color: '#ffffff' }}>
              {formatINR(cash)}
            </div>
          </div>
        </div>

        {/* Holdings Value Card */}
        <div className="neon-glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px 20px', borderLeft: '3px solid #c084fc' }}>
          <div style={{
            background: 'rgba(170, 59, 255, 0.08)',
            border: '1px solid rgba(170, 59, 255, 0.25)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c084fc',
            boxShadow: '0 0 12px rgba(170, 59, 255, 0.15)',
            flexShrink: 0
          }}>
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Crypto Assets</div>
            <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'var(--font-heading)', marginTop: '4px', color: '#ffffff' }}>
              {formatINR(holdingsValue)}
            </div>
          </div>
        </div>

        {/* Total Returns Card */}
        <div className="neon-glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px 20px', borderLeft: totalPnL >= 0 ? '3px solid #39FF14' : '3px solid #FF3B30' }}>
          <div style={{
            background: totalPnL >= 0 ? 'rgba(57, 255, 20, 0.08)' : 'rgba(255, 59, 48, 0.08)',
            border: totalPnL >= 0 ? '1px solid rgba(57, 255, 20, 0.25)' : '1px solid rgba(255, 59, 48, 0.25)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: totalPnL >= 0 ? '#39FF14' : '#FF3B30',
            boxShadow: totalPnL >= 0 ? '0 0 12px rgba(57, 255, 20, 0.15)' : '0 0 12px rgba(255, 59, 48, 0.15)',
            flexShrink: 0
          }}>
            {totalPnL >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Cumulative Returns</div>
            <div style={{
              fontSize: '22px',
              fontWeight: 700,
              fontFamily: 'var(--font-heading)',
              marginTop: '4px',
              color: totalPnL >= 0 ? '#39FF14' : '#FF3B30'
            }} className={totalPnL >= 0 ? 'glow-green' : 'glow-red'}>
              {totalPnL >= 0 ? '+' : ''}
              {totalPnLPercent.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Main Terminal Column Section */}
      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-4 md:gap-6 items-start">
        {/* Left Column - Live Chart and Price Tickers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Active Tickers Bar */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            overflowX: 'auto', 
            paddingBottom: '12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            {DEFAULT_PAIRS.map((sym) => {
              const livePrice = getLivePrice(sym);
              const isSelected = selectedSymbol === sym;
              
              const tickerData = tickers[sym];
              const flashDir = tickerData?.flash || null;

              const priceColor = flashDir === 'up' 
                ? '#39FF14' 
                : flashDir === 'down' 
                  ? '#FF3B30' 
                  : (isSelected ? '#39FF14' : 'rgba(255, 255, 255, 0.7)');

              return (
                <button
                  key={sym}
                  onClick={() => {
                    setSelectedSymbol(sym);
                    setOrderStatus(null);
                  }}
                  className={isSelected ? "neon-glass-panel" : ""}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid rgba(57, 255, 20, 0.3)' : '1px solid transparent',
                    background: isSelected ? 'rgba(57, 255, 20, 0.02)' : 'transparent',
                    minWidth: '120px',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isSelected && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#39FF14', display: 'inline-block', boxShadow: '0 0 6px #39FF14' }} />}
                    <span style={{ 
                      fontSize: '10px', 
                      color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.4)', 
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase'
                    }}>
                      {sym.replace('USDT', '')}/INR
                    </span>
                  </div>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    marginTop: '4px',
                    color: priceColor,
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {formatINR(livePrice, 0, 2)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Chart Panel (Editorial Data Panel) */}
          <div className="neon-glass-panel" style={{ 
            borderRadius: '12px', 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ 
                  fontSize: '10px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.15em', 
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontWeight: 600
                }}>
                  {selectedSymbol.replace('USDT', '')} / INR
                </div>
                <div style={{ 
                  fontSize: '26px', 
                  fontWeight: 700, 
                  color: '#ffffff',
                  marginTop: '4px',
                  letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {formatINR(currentSelectedPrice, 2, 2)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', background: 'rgba(57, 255, 20, 0.08)', border: '1px solid rgba(57, 255, 20, 0.2)', padding: '4px 10px', borderRadius: '20px' }}>
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: '#39FF14', 
                  boxShadow: '0 0 8px #39FF14',
                  display: 'inline-block' 
                }} />
                <span style={{ 
                  fontSize: '9px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.15em', 
                  color: '#39FF14',
                  fontWeight: 700
                }}>
                  LIVE FEED
                </span>
              </div>
            </div>

            <LiveChart symbol={selectedSymbol} initialPrice={getLivePrice(selectedSymbol)} onPriceUpdate={setCurrentSelectedPrice} />
          </div>
        </div>

        {/* Right Column - Order Execution Panel & Live Holdings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Order Board panel */}
          <div className="neon-glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} style={{ color: '#39FF14' }} />
              Quick Transaction Board
            </h3>

            {/* Buy / Sell Tabs Toggle */}
            <div style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '4px',
              marginBottom: '20px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <button
                type="button"
                onClick={() => setTradeType('BUY')}
                style={{
                  flex: 1,
                  background: tradeType === 'BUY' ? '#39FF14' : 'transparent',
                  color: tradeType === 'BUY' ? '#000000' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: tradeType === 'BUY' ? '0 0 12px rgba(57, 255, 20, 0.3)' : 'none'
                }}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setTradeType('SELL')}
                style={{
                  flex: 1,
                  background: tradeType === 'SELL' ? '#FF3B30' : 'transparent',
                  color: tradeType === 'SELL' ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: tradeType === 'SELL' ? '0 0 12px rgba(255, 59, 48, 0.3)' : 'none'
                }}
              >
                SELL
              </button>
            </div>

            <form onSubmit={handleOrderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Selected Ticker</span>
                <strong style={{ color: '#39FF14' }}>{selectedSymbol}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Market Entry Price</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatINR(currentSelectedPrice, 2, 4)}</strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <label style={{ color: 'var(--text-secondary)' }}>Asset Quantity</label>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {tradeType === 'BUY' 
                      ? `Max: ${(cash / currentSelectedPrice).toFixed(4)}`
                      : `Max: ${(portfolio?.holdings.find(h => h.symbol === selectedSymbol)?.quantity || 0).toFixed(6)}`
                    }
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  className="input-stitch-glass"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: '14px' }}
                  disabled={isGuest}
                />
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>Dynamic Estimated Cost</span>
                <strong style={{ color: tradeType === 'BUY' ? '#39FF14' : '#FF3B30' }}>
                  {formatINR(calculatedTotal)}
                </strong>
              </div>

              {/* Status Indicator */}
              {orderStatus && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: orderStatus.type === 'success' ? 'rgba(57, 255, 20, 0.08)' : 'rgba(255, 59, 48, 0.08)',
                  border: `1px solid ${orderStatus.type === 'success' ? '#39FF14' : '#FF3B30'}`,
                  color: orderStatus.type === 'success' ? '#39FF14' : '#FF3B30',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}>
                  {orderStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  <span style={{ wordBreak: 'break-all' }}>{orderStatus.message}</span>
                </div>
              )}

              {isGuest && (
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  marginBottom: '12px'
                }}>
                  Sign in to activate the trading terminal, build a portfolio and see live cash balances.
                </div>
              )}
              <button
                type="submit"
                disabled={isGuest || tradeLoading}
                className={tradeType === 'BUY' ? 'btn-stitch-primary' : ''}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  opacity: tradeLoading || isGuest ? 0.65 : 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: tradeLoading || isGuest ? 'not-allowed' : 'pointer',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  border: 'none',
                  ...(tradeType === 'SELL' ? {
                    backgroundColor: '#FF3B30',
                    color: '#ffffff',
                    fontWeight: 700,
                    boxShadow: '0 0 16px rgba(255, 59, 48, 0.3)'
                  } : {})
                }}
              >
                {tradeLoading ? (
                  <span className="pulsing">Executing order...</span>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    PLACE {tradeType} ORDER
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Premium Portfolio Donut Chart Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: 'var(--accent-blue)' }} />
              Portfolio Asset Allocation
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {/* SVG Donut */}
              <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                  {/* Outer glowing glow circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.02)"
                    strokeWidth="1"
                  />
                  {/* Map active slices */}
                  {(() => {
                    const R = 38;
                    const C = 2 * Math.PI * R; // 238.761
                    let accumulatedPercent = 0;

                    return slices.map((slice, index) => {
                      const dashArray = `${(slice.percent / 100) * C} ${C}`;
                      const strokeOffset = C - (accumulatedPercent / 100) * C;
                      accumulatedPercent += slice.percent;

                      const isHovered = hoveredSlice === index;

                      return (
                        <circle
                          key={index}
                          cx="50"
                          cy="50"
                          r={R}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={isHovered ? '9' : '7'}
                          strokeDasharray={dashArray}
                          strokeDashoffset={strokeOffset}
                          transform="rotate(-90 50 50)"
                          onMouseEnter={() => setHoveredSlice(index)}
                          onMouseLeave={() => setHoveredSlice(null)}
                          style={{
                            transition: 'stroke-width 0.2s ease-in-out, stroke-dashoffset 0.5s ease-in-out',
                            cursor: 'pointer',
                            opacity: hoveredSlice === null || isHovered ? 1 : 0.65
                          }}
                        />
                      );
                    });
                  })()}

                  {/* Inside Text panel */}
                  {hoveredSlice !== null && slices[hoveredSlice] ? (
                    <>
                      <text x="50" y="46" textAnchor="middle" fill="var(--text-secondary)" fontSize="5.5" fontWeight="600">
                        {slices[hoveredSlice].label}
                      </text>
                      <text x="50" y="56" textAnchor="middle" fill="var(--text-primary)" fontSize="8.5" fontWeight="800">
                        {slices[hoveredSlice].percent.toFixed(1)}%
                      </text>
                      <text x="50" y="65" textAnchor="middle" fill="var(--text-muted)" fontSize="4.5">
                        {formatINRShort(slices[hoveredSlice].value)}
                      </text>
                    </>
                  ) : (
                    <>
                      <text x="50" y="44" textAnchor="middle" fill="var(--text-secondary)" fontSize="5" fontWeight="600">
                        NET WORTH
                      </text>
                      <text x="50" y="55" textAnchor="middle" fill="var(--accent-blue)" fontSize="8.5" fontWeight="800" className="glow-blue">
                        {formatINRShort(totalValue)}
                      </text>
                      <text x="50" y="64" textAnchor="middle" fill="var(--text-muted)" fontSize="4" fontWeight="500">
                        Allocation
                      </text>
                    </>
                  )}
                </svg>
              </div>

              {/* Dynamic Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, minWidth: '120px' }}>
                {slices.map((slice, index) => {
                  const isHovered = hoveredSlice === index;
                  return (
                    <div 
                      key={index}
                      onMouseEnter={() => setHoveredSlice(index)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isHovered ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                        transition: 'background 0.2s',
                        borderLeft: isHovered ? `2px solid ${slice.color}` : '2px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: slice.color, display: 'inline-block' }} />
                        <span style={{ color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{slice.label}</span>
                      </div>
                      <span style={{ fontWeight: 'bold' }}>{slice.percent.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current Active Holdings Panel */}
          <div className="glass-panel" style={{ flexGrow: 1 }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: 'var(--accent-blue)' }} />
              Active Trading Positions
            </h3>

            {(!portfolio || portfolio.holdings.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                You do not hold any active crypto positions. Execute a BUY order on the panel above to build a portfolio!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <AnimatePresence mode="popLayout">
                  {portfolio.holdings.map((holding) => {
                    const livePrice = getLivePrice(holding.symbol);
                    const marketValue = holding.quantity * livePrice;
                    const costBasis = holding.quantity * holding.avgBuyPrice;
                    const unrealizedPnL = marketValue - costBasis;
                    const unrealizedPnLPercent = holding.avgBuyPrice > 0 ? (livePrice - holding.avgBuyPrice) * 100 / holding.avgBuyPrice : 0;

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -12, filter: 'blur(3px)' }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        key={holding.symbol}
                        onClick={() => setSelectedSymbol(holding.symbol)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '10px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s, background 0.2s',
                          borderLeft: `4px solid ${unrealizedPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}`
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px' }}>{holding.symbol.replace('USDT', '')}/INR</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Qty: {holding.quantity.toFixed(6)} | Avg: {formatINR(holding.avgBuyPrice)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '15px' }}>
                            {formatINR(marketValue)}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            marginTop: '2px',
                            color: unrealizedPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                          }}>
                            {unrealizedPnL >= 0 ? '+' : ''}
                            {unrealizedPnLPercent.toFixed(2)}%
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>
      </div>
      
    </div>
  );
};
