import type { Metadata, Viewport } from 'next'
import { DashboardLayout } from '@/components/dashboard-layout'
import { AuthGuard } from '@/components/auth-guard'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Document Hub',
  description: 'Automatische analyse en extractie van huurcontracten uit Dropbox',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl">
      <body className={`font-sans antialiased`}>
        <AuthGuard>
          {children}
        </AuthGuard>
        <Toaster 
          position="bottom-right" 
          richColors 
          toastOptions={{
            duration: 3000,
          }}
        />
      </body>
    </html>
  )
}
