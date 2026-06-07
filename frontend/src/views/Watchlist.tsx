import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Star, Trash2, Plus, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

interface WatchlistItem {
  id: number;
  symbol: string;
  addedAt: string;
}

export const Watchlist: React.FC = () => {
  const { apiFetch } = useAuth();
  const { prices, priceDirections, subscribeToTopic } = useWebSocket();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSymbol, setNewSymbol] = useState('BTCUSDT');
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const AVAILABLE_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT'];

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await apiFetch('/api/watchlist');
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data);
      }
    } catch (error) {
      console.error('Failed to load watchlist', error);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const loadWatchlist = () => {
      void fetchWatchlist();
    };
    loadWatchlist();
  }, [fetchWatchlist]);

  // Subscribe to all watched symbols topics
  useEffect(() => {
    if (watchlist.length === 0) return;
    const unsubscribes = watchlist.map((item) => 
      subscribeToTopic(`/topic/prices/${item.symbol}`, () => {})
    );
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [watchlist, subscribeToTopic]);

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionStatus(null);

    if (watchlist.some((item) => item.symbol === newSymbol)) {
      setActionStatus('Symbol is already in your watchlist!');
      return;
    }

    try {
      const res = await apiFetch(`/api/watchlist/${newSymbol}`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchWatchlist();
      } else {
        const data = await res.json();
        setActionStatus(data.error || 'Failed to add symbol.');
      }
    } catch (error) {
      setActionStatus('Connection error.');
    }
  };

  const handleRemoveSymbol = async (symbol: string) => {
    setActionStatus(null);
    try {
      const res = await apiFetch(`/api/watchlist/${symbol}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
      } else {
        const data = await res.json();
        setActionStatus(data.error || 'Failed to remove symbol.');
      }
    } catch (error) {
      setActionStatus('Connection error.');
    }
  };

  const getLivePrice = (sym: string): number => {
    return prices[sym] || (sym === 'BTCUSDT' ? 67200.00 : sym === 'ETHUSDT' ? 3500.00 : sym === 'SOLUSDT' ? 165.00 : sym === 'BNBUSDT' ? 585.00 : 0.45);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="pulsing" style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
          Loading your personal watchlist...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Search and Add Ticker Bar */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <form onSubmit={handleAddSymbol} style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ flexGrow: 1, minWidth: '200px' }}>
            <h3 style={{ fontSize: '16px', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Star size={16} style={{ color: 'var(--accent-orange)' }} />
              Add Symbol to Watchlist
            </h3>
            <select
              className="form-input"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              style={{ width: '100%', cursor: 'pointer' }}
            >
              {AVAILABLE_SYMBOLS.map((sym) => (
                <option key={sym} value={sym} style={{ background: '#0d131d', color: 'white' }}>
                  {sym.replace('USDT', '')} / USDT
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="btn-primary"
            style={{
              marginTop: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '44px',
              padding: '0 20px'
            }}
          >
            <Plus size={16} />
            ADD TICKER
          </button>
        </form>

        {actionStatus && (
          <div style={{
            marginTop: '12px',
            fontSize: '13px',
            color: 'var(--accent-red)',
            fontWeight: 500
          }}>
            {actionStatus}
          </div>
        )}
      </div>

      {/* Watchlist Grid */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Star size={20} style={{ color: 'var(--accent-orange)', fill: 'var(--accent-orange)' }} />
          My Live Watchlist Feed
        </h2>

        {watchlist.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
            Your watchlist is currently empty. Choose a cryptocurrency in the drop-down selector above to begin monitoring live price streams!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {watchlist.map((item) => {
              const livePrice = getLivePrice(item.symbol);
              const flashDir = priceDirections[item.symbol] || 'flat';
              const flashClass = flashDir === 'up' ? 'tick-up' : flashDir === 'down' ? 'tick-down' : '';

              return (
                <div
                  key={item.symbol}
                  className={`glass-panel ${flashClass}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.01)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      background: 'rgba(255, 145, 0, 0.1)',
                      borderRadius: '8px',
                      padding: '8px',
                      color: 'var(--accent-orange)'
                    }}>
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 700 }}>
                        {item.symbol.replace('USDT', '')} / USDT
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Added on {new Date(item.addedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    {/* Live Ticker */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        fontFamily: 'var(--font-heading)',
                        color: flashDir === 'up' ? 'var(--accent-green)' : flashDir === 'down' ? 'var(--accent-red)' : 'var(--text-primary)',
                        transition: 'color 0.2s'
                      }} className={flashDir === 'up' ? 'glow-green' : flashDir === 'down' ? 'glow-red' : ''}>
                        ${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        fontSize: '11px',
                        color: flashDir === 'up' ? 'var(--accent-green)' : flashDir === 'down' ? 'var(--accent-red)' : 'var(--text-muted)',
                        marginTop: '2px',
                        fontWeight: 600
                      }}>
                        {flashDir === 'up' ? (
                          <>
                            <ArrowUpRight size={12} />
                            +Tick Rise
                          </>
                        ) : flashDir === 'down' ? (
                          <>
                            <ArrowDownRight size={12} />
                            -Tick Fall
                          </>
                        ) : (
                          'Active Stream'
                        )}
                      </div>
                    </div>

                    {/* Delete action */}
                    <button
                      type="button"
                      onClick={() => handleRemoveSymbol(item.symbol)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--accent-red)';
                        e.currentTarget.style.background = 'var(--accent-red-bg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.background = 'none';
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
