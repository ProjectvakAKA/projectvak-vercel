import type { Metadata, Viewport } from 'next'
import { DashboardLayout } from '@/components/dashboard-layout'
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
        <DashboardLayout>
          {children}
        </DashboardLayout>
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
