import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Search, Award, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface Trade {
  id: number;
  userId: number;
  symbol: string;
  tradeType: string;
  quantity: number;
  price: number;
  totalValue: number;
  executedAt: string;
}

export const History: React.FC = () => {
  const { apiFetch } = useAuth();
  
  // History Paginated State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  // Filters
  const [symbol, setSymbol] = useState('');
  const [tradeType, setTradeType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // PnL map
  const [pnlMap, setPnlMap] = useState<Record<string, number>>({});
  
  const [loading, setLoading] = useState(true);

  const fetchTradeHistory = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      let url = `/api/trades?page=${targetPage}&size=10&sort=executedAt,desc`;
      if (symbol.trim()) url += `&symbol=${symbol.trim()}`;
      if (tradeType) url += `&tradeType=${tradeType}`;
      
      // Convert HTML input dates to full ISO timestamp string for backend parser
      if (startDate) url += `&startDate=${startDate}T00:00:00`;
      if (endDate) url += `&endDate=${endDate}T23:59:59`;

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setTrades(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
        setPage(targetPage);
      }
    } catch (error) {
      console.error('Failed to fetch trade history', error);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, symbol, tradeType, startDate, endDate]);

  const fetchRealizedPnL = useCallback(async () => {
    try {
      const res = await apiFetch('/api/analytics/pnl');
      if (res.ok) {
        const data = await res.json();
        setPnlMap(data);
      }
    } catch (error) {
      console.error('Failed to calculate realized PnLs', error);
    }
  }, [apiFetch]);

  useEffect(() => {
    const loadHistory = () => {
      void fetchTradeHistory(0);
      void fetchRealizedPnL();
    };
    loadHistory();
  }, [fetchTradeHistory, fetchRealizedPnL]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      fetchTradeHistory(newPage);
    }
  };

  const clearFilters = () => {
    setSymbol('');
    setTradeType('');
    setStartDate('');
    setEndDate('');
  };

  const calculateTotalRealizedPnL = () => {
    return Object.values(pnlMap).reduce((sum, val) => sum + val, 0);
  };

  const totalRealized = calculateTotalRealizedPnL();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* Realized FIFO PnL Widget Bar */}
      <div className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        background: 'linear-gradient(135deg, rgba(13,19,29,0.9) 0%, rgba(20,26,36,0.9) 100%)',
        borderLeft: `4px solid ${totalRealized >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: totalRealized >= 0 ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 51, 102, 0.1)',
            border: totalRealized >= 0 ? '1px solid rgba(0, 230, 118, 0.2)' : '1px solid rgba(255, 51, 102, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            color: totalRealized >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
          }}>
            <Award size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-heading)' }}>
              First-In-First-Out Cost Basis Analytics
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Cumulative realized profit/loss calculated chronologically by matching BUY and SELL blocks
            </p>
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOTAL REALIZED PNL (FIFO)</div>
          <div style={{
            fontSize: '26px',
            fontWeight: 'bold',
            fontFamily: 'var(--font-heading)',
            color: totalRealized >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            marginTop: '2px'
          }} className={totalRealized >= 0 ? 'glow-green' : 'glow-red'}>
            {totalRealized >= 0 ? '+' : ''}
            ₹{totalRealized.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Breakdown per Asset */}
      {Object.keys(pnlMap).length > 0 && (
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', letterSpacing: '0.5px' }}>
            REALIZED ASSET SPLIT
          </h4>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
            {Object.entries(pnlMap).map(([sym, val]) => (
              <div
                key={sym}
                style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  minWidth: '130px',
                  flexShrink: 0
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{sym}</span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: val >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                }}>
                  {val >= 0 ? '+' : ''}${val.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Filter Table Block */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        
        {/* Filters Header Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px',
          marginBottom: '20px'
        }}>
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} style={{ color: 'var(--accent-blue)' }} />
            Transaction Log & Filter Board
          </h3>
          <button
            type="button"
            onClick={clearFilters}
            className="btn-outline"
            style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
          >
            Clear Filters
          </button>
        </div>

        {/* Filters Form Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Symbol Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Crypto Symbol</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="text"
                className="form-input"
                placeholder="BTCUSDT"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                style={{ width: '100%', paddingLeft: '34px', height: '40px' }}
              />
            </div>
          </div>

          {/* Type Select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Order Type</label>
            <select
              className="form-input"
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value)}
              style={{ width: '100%', cursor: 'pointer', height: '40px' }}
            >
              <option value="" style={{ background: '#0d131d' }}>ALL TYPES</option>
              <option value="BUY" style={{ background: '#0d131d' }}>BUY ORDERS</option>
              <option value="SELL" style={{ background: '#0d131d' }}>SELL ORDERS</option>
            </select>
          </div>

          {/* Start Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Start Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', paddingLeft: '34px', height: '40px', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* End Date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>End Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }} />
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', paddingLeft: '34px', height: '40px', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>Order ID</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>Symbol</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>Type</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', textAlign: 'right' }}>Fill Price</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', textAlign: 'right' }}>Total Value</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', textAlign: 'right' }}>Execution Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }} className="pulsing">
                    Loading historical trades data...
                  </td>
                </tr>
              ) : trades.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No trades executed matching the active filters.
                  </td>
                </tr>
              ) : (
                trades.map((trade) => (
                  <tr
                    key={trade.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>#{trade.id}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{trade.symbol}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: trade.tradeType === 'BUY' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 51, 102, 0.1)',
                        color: trade.tradeType === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)'
                      }}>
                        {trade.tradeType}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                      {trade.quantity.toFixed(6)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                      ₹{trade.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                      ₹{trade.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {new Date(trade.executedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            fontSize: '13px',
            color: 'var(--text-secondary)'
          }}>
            <span>Showing Page {page + 1} of {totalPages} ({totalElements} total executions)</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-outline"
                disabled={page === 0}
                onClick={() => handlePageChange(page - 1)}
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', opacity: page === 0 ? 0.4 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }}
              >
                <ChevronLeft size={16} />
                Prev
              </button>
              <button
                type="button"
                className="btn-outline"
                disabled={page === totalPages - 1}
                onClick={() => handlePageChange(page + 1)}
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', opacity: page === totalPages - 1 ? 0.4 : 1, cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer' }}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
