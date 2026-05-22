export default function ShareLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          fontFamily: 'Syne',
          fontWeight: 800,
          fontSize: '18px',
        }}
      >
        Route<span style={{ color: 'var(--amber)' }}>Mate</span>
        <span style={{ fontWeight: 400, fontSize: '13px', color: 'var(--muted)', marginLeft: '12px' }}>
          Live trip (shared)
        </span>
      </header>
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>{children}</main>
    </div>
  )
}
