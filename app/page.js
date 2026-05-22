import Link from 'next/link'
import { Car, MapPin, ArrowRight, Users, Navigation, RotateCcw } from 'lucide-react'

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Navbar */}
      <nav style={{
        padding:        '20px 40px',
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        borderBottom:   '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'var(--amber)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Car size={18} color="#000" />
          </div>
          <span style={{
            fontFamily: 'Syne', fontWeight: 800, fontSize: '20px'
          }}>
            Route<span style={{ color: 'var(--amber)' }}>Mate</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/login">
            <button className="btn-secondary" style={{ width: 'auto', padding: '10px 24px' }}>
              Login
            </button>
          </Link>
          <Link href="/signup">
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}>
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        maxWidth: '1200px',
        margin:   '0 auto',
        padding:  '80px 40px',
        textAlign: 'center',
      }}>
        <div className="badge badge-amber" style={{ marginBottom: '24px' }}>
          🚗 Cross-city car travel, reimagined
        </div>

        <h1 style={{
          fontFamily:  'Syne',
          fontSize:    'clamp(40px, 7vw, 80px)',
          fontWeight:  800,
          lineHeight:  1.05,
          marginBottom: '24px',
          letterSpacing: '-2px',
        }}>
          Travel between cities.<br />
          <span style={{ color: 'var(--amber)' }}>Share the journey.</span>
        </h1>

        <p style={{
          fontSize:    '18px',
          color:       'var(--muted)',
          maxWidth:    '560px',
          margin:      '0 auto 40px',
          lineHeight:  1.6,
        }}>
          Rent cars across states. Board mid-route from your city.
          See return trips before they happen.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/search">
            <button className="btn-primary" style={{
              width: 'auto', padding: '14px 32px', fontSize: '16px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              Find a Ride <ArrowRight size={18} />
            </button>
          </Link>
          <Link href="/signup">
            <button className="btn-secondary" style={{ width: 'auto', padding: '14px 32px', fontSize: '16px' }}>
              List Your Car
            </button>
          </Link>
        </div>

        {/* Route Preview */}
        <div style={{
          marginTop:     '80px',
          background:    'var(--bg-card)',
          border:        '1px solid var(--border)',
          borderRadius:  '16px',
          padding:       '32px',
          maxWidth:      '600px',
          margin:        '80px auto 0',
        }}>
          <div style={{
            display:       'flex',
            alignItems:    'center',
            gap:           '12px',
            marginBottom:  '16px',
          }}>
            <MapPin size={16} color="var(--amber)" />
            <span style={{ fontFamily: 'Syne', fontWeight: 600 }}>Jaipur</span>
            <div style={{
              flex: 1,
              borderTop: '2px dashed var(--border)',
              position: 'relative',
            }}>
              <div style={{
                position:   'absolute',
                top:        '-8px',
                left:       '50%',
                transform:  'translateX(-50%)',
                background: 'var(--bg-card)',
                padding:    '0 8px',
              }}>
                <span className="badge badge-amber" style={{ fontSize: '11px' }}>
                  En-route boarding
                </span>
              </div>
            </div>
            <MapPin size={16} color="var(--muted)" />
            <span style={{ fontFamily: 'Syne', fontWeight: 600 }}>Mumbai</span>
          </div>

          <div style={{
            display: 'flex',
            gap:     '8px',
            flexWrap: 'wrap',
          }}>
            {['Jaipur', 'Ajmer', 'Udaipur', 'Ahmedabad', 'Surat', 'Mumbai'].map((city, i) => (
              <div key={city} style={{
                display:    'flex',
                alignItems: 'center',
                gap:        '6px',
              }}>
                <span style={{
                  background:   i === 0 || i === 5 ? 'var(--amber)' : 'var(--bg-input)',
                  color:        i === 0 || i === 5 ? '#000' : 'var(--text)',
                  padding:      '6px 12px',
                  borderRadius: '100px',
                  fontSize:     '13px',
                  fontFamily:   'Syne',
                  fontWeight:   600,
                }}>
                  {city}
                </span>
                {i < 5 && <ArrowRight size={12} color="var(--muted)" />}
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{
          display:      'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap:          '24px',
          marginTop:    '80px',
        }}>
          {[
            {
              icon:  <Navigation size={24} color="var(--amber)" />,
              title: 'En-route Boarding',
              desc:  'Sitting in Ajmer? Board a car passing through from Jaipur to Mumbai.',
            },
            {
              icon:  <RotateCcw size={24} color="var(--amber)" />,
              title: 'Return Trip Visibility',
              desc:  'See cars at their destination that will return to your city.',
            },
            {
              icon:  <Users size={24} color="var(--amber)" />,
              title: 'Seat Sharing',
              desc:  'Multiple riders can share the same car on different segments.',
            },
          ].map((feature) => (
            <div key={feature.title} className="card" style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '16px' }}>{feature.icon}</div>
              <h3 style={{
                fontFamily:   'Syne',
                fontWeight:   700,
                fontSize:     '18px',
                marginBottom: '8px',
              }}>
                {feature.title}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}