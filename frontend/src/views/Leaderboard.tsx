import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Search, TrendingUp, TrendingDown, RefreshCw, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Typewriter } from '../components/ui/typewriter-text';

interface LeaderboardUser {
  userId: number;
  email: string;
  cashBalance: number;
  holdingsValue: number;
  totalPortfolioValue: number;
  totalPnL: number;
  totalPnLPercent: number;
}

export const Leaderboard: React.FC = () => {
  const { apiFetch } = useAuth();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [headerTyped, setHeaderTyped] = useState(false);
  const [tableTyped, setTableTyped] = useState(false);

  const fetchLeaderboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiFetch('/api/leaderboard');
      if (res.ok) {
        const data: LeaderboardUser[] = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const loadLeaderboard = () => {
      void fetchLeaderboard();
    };
    loadLeaderboard();
  }, [fetchLeaderboard]);

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)',
            color: '#06090e',
            fontWeight: 800,
            boxShadow: '0 0 12px rgba(255, 215, 0, 0.4)'
          }}>
            1
          </div>
        );
      case 2:
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c0c0c0 0%, #808080 100%)',
            color: '#06090e',
            fontWeight: 800,
            boxShadow: '0 0 12px rgba(192, 192, 192, 0.3)'
          }}>
            2
          </div>
        );
      case 3:
        return (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #cd7f32 0%, #8b5a2b 100%)',
            color: '#06090e',
            fontWeight: 800,
            boxShadow: '0 0 12px rgba(205, 127, 50, 0.3)'
          }}>
            3
          </div>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            fontWeight: 600
          }}>
            {rank}
          </span>
        );
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
        borderLeft: '4px solid var(--accent-blue)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(0, 176, 255, 0.1)',
            border: '1px solid rgba(0, 176, 255, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--accent-blue)'
          }}>
            <Trophy size={28} />
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            onViewportEnter={() => setHeaderTyped(true)}
            viewport={{ once: true, margin: '-80px' }}
          >
            <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-heading)', minHeight: '28px' }}>
              {headerTyped ? <Typewriter text="Global Portfolios Leaderboard" speed={60} /> : ''}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Real-time rankings based on users' aggregated cash and live cryptocurrency market values.
            </p>
          </motion.div>
        </div>
        
        <button
          type="button"
          onClick={() => fetchLeaderboard(true)}
          disabled={loading || refreshing}
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
          <RefreshCw size={14} className={refreshing ? 'pulsing' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Podium Cards for Top 3 */}
      {!loading && users.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          alignItems: 'end',
          marginTop: '8px'
        }}>
          {/* 2nd Place */}
          {users[1] && (
            <div className="glass-panel" style={{
              order: window.innerWidth > 768 ? 1 : 2,
              padding: '24px',
              textAlign: 'center',
              borderTop: '3px solid #c0c0c0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              {getRankBadge(2)}
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {users[1].email.split('@')[0]}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {users[1].email}
                </div>
              </div>
              <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>NET WORTH</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'var(--font-heading)', marginTop: '2px' }}>
                  ₹{users[1].totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: users[1].totalPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {users[1].totalPnL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {users[1].totalPnL >= 0 ? '+' : ''}{users[1].totalPnLPercent.toFixed(2)}%
              </div>
            </div>
          )}

          {/* 1st Place */}
          {users[0] && (
            <div className="glass-panel" style={{
              order: 1,
              padding: '32px 24px',
              textAlign: 'center',
              borderTop: '4px solid #ffd700',
              boxShadow: '0 8px 32px rgba(255, 215, 0, 0.05), inset 0 0 12px rgba(255, 215, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              transform: window.innerWidth > 768 ? 'scale(1.05)' : 'none'
            }}>
              <Award size={36} style={{ color: '#ffd700', filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.4))' }} />
              {getRankBadge(1)}
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)', wordBreak: 'break-all' }} className="glow-blue">
                  {users[0].email.split('@')[0]}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {users[0].email}
                </div>
              </div>
              <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>NET WORTH</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'var(--font-heading)', color: '#ffd700', marginTop: '2px' }}>
                  ₹{users[0].totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: 700,
                color: users[0].totalPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '20px',
                background: users[0].totalPnL >= 0 ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 51, 102, 0.08)'
              }}>
                {users[0].totalPnL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {users[0].totalPnL >= 0 ? '+' : ''}{users[0].totalPnLPercent.toFixed(2)}%
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {users[2] && (
            <div className="glass-panel" style={{
              order: 3,
              padding: '24px',
              textAlign: 'center',
              borderTop: '3px solid #cd7f32',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              {getRankBadge(3)}
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {users[2].email.split('@')[0]}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {users[2].email}
                </div>
              </div>
              <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>NET WORTH</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'var(--font-heading)', marginTop: '2px' }}>
                  ₹{users[2].totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: users[2].totalPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {users[2].totalPnL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {users[2].totalPnL >= 0 ? '+' : ''}{users[2].totalPnLPercent.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Leaderboard Table Block */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        
        {/* Search Header Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px'
        }}>
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', minHeight: '28px' }}>
            <Trophy size={18} style={{ color: 'var(--accent-blue)' }} />
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              onViewportEnter={() => setTableTyped(true)}
              viewport={{ once: true, margin: '-80px' }}
            >
              {tableTyped ? <Typewriter text="Rankings Table" speed={80} /> : ''}
            </motion.span>
          </h3>
          <div style={{ position: 'relative', width: '260px' }}>
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
              placeholder="Search user email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '34px', height: '36px' }}
            />
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', width: '70px', textAlign: 'center' }}>Rank</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>Trader Identity</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', textAlign: 'right' }}>Cash Balance</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', textAlign: 'right' }}>Crypto Value</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', textAlign: 'right' }}>Net Worth</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-secondary)', textAlign: 'right', width: '120px' }}>Performance Yield</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }} className="pulsing">
                    Calculating user portfolio net worths...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No traders found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  // Find index in overall users to get accurate rank
                  const rank = users.findIndex((user) => user.userId === u.userId) + 1;
                  return (
                    <tr
                      key={u.userId}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.2s',
                        background: rank <= 3 ? 'rgba(255,255,255,0.01)' : 'none'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = rank <= 3 ? 'rgba(255,255,255,0.01)' : 'none'}
                    >
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {getRankBadge(rank)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{u.email}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>ID: #{u.userId}</div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                        ₹{u.cashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                        ₹{u.holdingsValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }} className="glow-blue">
                        ₹{u.totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700,
                          color: u.totalPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                        }}>
                          {u.totalPnL >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {u.totalPnL >= 0 ? '+' : ''}{u.totalPnLPercent.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
