import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '24px',
        textAlign: 'center',
        color: '#f8fafc',
        background: '#05070f',
      }}
    >
      <h1 style={{ fontSize: '2rem', margin: 0 }}>Page not found</h1>
      <p style={{ color: '#94a3b8', margin: 0 }}>
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '8px',
          padding: '10px 20px',
          borderRadius: '999px',
          background: '#7342E2',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Back to home
      </Link>
    </div>
  )
}
