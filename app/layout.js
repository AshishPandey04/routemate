import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/components/shared/AuthContext.js'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets:  ['latin'],
})

export const metadata = {
  title:       'RouteMate — Cross-City Car Journeys',
  description: 'Rent cars across cities with en-route boarding and return trips',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors theme="dark" />
        </AuthProvider>
      </body>
    </html>
  )
}