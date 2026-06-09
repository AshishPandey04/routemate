import Navbar from '@/components/shared/Navbar.js'

export default function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      <main style={{
        maxWidth: '1400px',
        margin:   '0 auto',
        padding:  '40px 24px',
        flex:     1,
        minHeight: 'calc(100vh - 68px)',
      }}>
        {children}
      </main>
    </>
  )
}