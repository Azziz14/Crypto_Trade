import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, Users, BarChart3, Zap, Settings, 
  Trash2, RefreshCw, CheckCircle, AlertTriangle, Play 
} from 'lucide-react';

interface PlatformMetrics {
  activeWebSocketSessions: number;
  activeTradingPairs: string[];
  totalVolumeINR: number;
  totalUsers: number;
  totalTrades: number;
}

interface LeaderboardUser {
  userId: number;
  email: string;
  cashBalance: number;
  holdingsValue: number;
  totalPortfolioValue: number;
  totalPnL: number;
  totalPnLPercent: number;
}

export const Admin: React.FC = () => {
  const { user, apiFetch } = useAuth();
  
  // States
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [usersList, setUsersList] = useState<LeaderboardUser[]>([]);
  const [newPairs, setNewPairs] = useState('');
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [pairsSubmitting, setPairsSubmitting] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resettingUserId, setResettingUserId] = useState<number | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await apiFetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        // Pre-fill input
        if (data.activeTradingPairs) {
          setNewPairs(data.activeTradingPairs.join(', '));
        }
      }
    } catch (err) {
      console.error('Failed to fetch platform metrics', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Failed to fetch users list', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchMetrics();
      fetchUsers();
    }
  }, [user]);

  // Access check
  if (user?.role !== 'ADMIN') {
    return (
      <div className="glass-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
        gap: '20px',
        borderTop: '4px solid var(--accent-red)'
      }}>
        <ShieldAlert size={60} style={{ color: 'var(--accent-red)' }} />
        <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px' }}>
          This operations board is private. You must hold an administrator credential to configure exchange settings or reset user accounts.
        </p>
      </div>
    );
  }

  const handleUpdatePairs = async (e: React.FormEvent) => {
    e.preventDefault();
    setPairsSubmitting(true);
    setActionStatus(null);

    // Clean up input into an array
    const pairsArray = newPairs
      .split(',')
      .map(p => p.trim().toUpperCase())
      .filter(p => p.length > 0);

    if (pairsArray.length === 0) {
      setActionStatus({ type: 'error', message: 'Please enter at least one valid trading pair!' });
      setPairsSubmitting(false);
      return;
    }

    try {
      const res = await apiFetch('/api/admin/pairs', {
        method: 'POST',
        body: JSON.stringify(pairsArray)
      });

      const data = await res.json();
      if (res.ok) {
        setActionStatus({ type: 'success', message: 'Successfully updated active Binance WebSocket trading feeds!' });
        fetchMetrics();
      } else {
        setActionStatus({ type: 'error', message: data.error || 'Failed to update trading pairs!' });
      }
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err.message || 'An error occurred.' });
    } finally {
      setPairsSubmitting(false);
    }
  };

  const handleResetUser = async (targetUserId: number, targetEmail: string) => {
    if (!window.confirm(`Are you absolutely sure you want to reset all positions and balance for ${targetEmail}? This action is irreversible.`)) {
      return;
    }

    setResettingUserId(targetUserId);
    setActionStatus(null);

    try {
      const res = await apiFetch(`/api/admin/reset/${targetUserId}`, {
        method: 'POST'
      });

      const data = await res.json();
      if (res.ok) {
        setActionStatus({ type: 'success', message: `Successfully reset virtual balance and purged positions for user: ${targetEmail}` });
        // Refresh
        fetchMetrics();
        fetchUsers();
      } else {
        setActionStatus({ type: 'error', message: data.error || 'Failed to reset user account.' });
      }
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err.message || 'An error occurred during reset.' });
    } finally {
      setResettingUserId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* Page Header */}
      <div className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'linear-gradient(135deg, rgba(13,19,29,0.9) 0%, rgba(20,26,36,0.9) 100%)',
        borderLeft: '4px solid var(--accent-red)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(255, 51, 102, 0.1)',
            border: '1px solid rgba(255, 51, 102, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--accent-red)'
          }}>
            <ShieldAlert size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-heading)' }}>
              System Administration Dashboard
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Control center for real-time WebSocket ingestion feeds, viewing server load metrics, and resetting trading portfolios.
            </p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => {
            fetchMetrics();
            fetchUsers();
          }}
          disabled={loadingMetrics || loadingUsers}
          className="btn-outline"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={loadingMetrics ? 'pulsing' : ''} />
          Refresh Control Board
        </button>
      </div>

      {/* Global Status Banner Alert */}
      {actionStatus && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: actionStatus.type === 'success' ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 51, 102, 0.08)',
          border: `1px solid ${actionStatus.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          color: actionStatus.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
          padding: '14px 18px',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          {actionStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{actionStatus.message}</span>
        </div>
      )}

      {/* Analytics Summary Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {/* Active WS Sessions */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
          <div style={{
            background: 'rgba(0, 230, 118, 0.1)',
            border: '1px solid rgba(0, 230, 118, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--accent-green)'
          }}>
            <Zap size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ACTIVE CLIENT SESSIONS</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'var(--font-heading)', marginTop: '2px' }} className="glow-green">
              {metrics ? metrics.activeWebSocketSessions : '0'} Sessions
            </div>
          </div>
        </div>

        {/* Total Registered Users */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
          <div style={{
            background: 'rgba(0, 176, 255, 0.1)',
            border: '1px solid rgba(0, 176, 255, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--accent-blue)'
          }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOTAL REGISTERED USERS</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'var(--font-heading)', marginTop: '2px' }} className="glow-blue">
              {metrics ? metrics.totalUsers : '0'} Users
            </div>
          </div>
        </div>

        {/* Total Trades Executed */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
          <div style={{
            background: 'rgba(255, 145, 0, 0.1)',
            border: '1px solid rgba(255, 145, 0, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--accent-orange)'
          }}>
            <Settings size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOTAL TRANSACTIONS</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'var(--font-heading)', marginTop: '2px' }}>
              {metrics ? metrics.totalTrades : '0'} Trades
            </div>
          </div>
        </div>

        {/* Total Volume INR */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
          <div style={{
            background: 'rgba(170, 59, 255, 0.1)',
            border: '1px solid rgba(170, 59, 255, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            color: '#c084fc'
          }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PLATFORM TRADING VOLUME</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'var(--font-heading)', marginTop: '2px' }}>
              ₹{metrics && metrics.totalVolumeINR ? metrics.totalVolumeINR.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Admin Panels Column Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 3fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column - WebSocket Pair Manager */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} style={{ color: 'var(--accent-blue)' }} />
            Binance Websocket Feeds
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
            Modify the live cryptocurrency indices that the server connects to and streams. The server dynamically spins down discarded sockets and subscribes to new streams on-the-fly.
          </p>

          <form onSubmit={handleUpdatePairs} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Symbols (Comma-Separated)</label>
              <textarea
                rows={4}
                required
                className="form-input"
                placeholder="BTCUSDT, ETHUSDT, SOLUSDT"
                value={newPairs}
                onChange={(e) => setNewPairs(e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  resize: 'vertical',
                  lineHeight: '1.5',
                  padding: '12px'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Example: BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, ADAUSDT, DOGEUSDT, XRPUSDT
              </span>
            </div>

            <button
              type="submit"
              disabled={pairsSubmitting || loadingMetrics}
              className="btn-green"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                opacity: pairsSubmitting ? 0.7 : 1
              }}
            >
              {pairsSubmitting ? (
                <span className="pulsing">Subscribing feed channels...</span>
              ) : (
                <>
                  <Play size={14} />
                  UPDATE TICKER STREAMS
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column - User Accounts Controller */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: 'var(--accent-red)' }} />
            Trading Portfolio Controller
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
            View system-wide user balances and net worth yields. Force cash balances to reset back to initial virtual funds and clean active position holding records for debug or testing.
          </p>

          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>User Email</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-secondary)', textAlign: 'right' }}>Cash Balance</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-secondary)', textAlign: 'right' }}>Net Worth</th>
                  <th style={{ padding: '12px 14px', color: 'var(--text-secondary)', textAlign: 'center', width: '120px' }}>Purge Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }} className="pulsing">
                      Gathering user directory details...
                    </td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No registered user accounts found.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => (
                    <tr 
                      key={u.userId}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600 }}>{u.email}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2.5px' }}>ID: #{u.userId}</div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace' }}>
                        ${u.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                        ${u.totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          disabled={resettingUserId !== null}
                          onClick={() => handleResetUser(u.userId, u.email)}
                          className="btn-red"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            opacity: resettingUserId !== null ? 0.5 : 1
                          }}
                        >
                          <Trash2 size={12} />
                          {resettingUserId === u.userId ? 'Resetting...' : 'Reset'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};
