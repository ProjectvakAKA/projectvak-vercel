import type { Metadata, Viewport } from 'next'
import { AuthGuard } from '@/components/auth-guard'
import { ErrorBoundary } from '@/components/error-boundary'
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
        <ErrorBoundary>
          <AuthGuard>
            {children}
          </AuthGuard>
        </ErrorBoundary>
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
