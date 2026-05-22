import Navbar from '@/components/shared/Navbar.js'

export default function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      <main style={{
        maxWidth: '1200px',
        margin:   '0 auto',
        padding:  '32px 24px',
        flex:     1,
      }}>
        {children}
      </main>
    </>
  )
}