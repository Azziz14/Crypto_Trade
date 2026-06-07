'use client'

import dynamic from 'next/dynamic'

const App = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        background: '#05070f',
        color: '#94a3b8',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '3px solid rgba(96, 165, 250, 0.2)',
          borderTopColor: '#60a5fa',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ margin: 0, fontSize: '15px' }}>Loading crypto trading desk…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
})

export default function Page() {
  return <App />
}
