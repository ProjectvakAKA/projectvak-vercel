'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabaseBrowser, hasSupabaseEnv } from '@/lib/supabase-browser'
import { DashboardLayout } from '@/components/dashboard-layout'

const isLoginRoute = (path: string | null) =>
  path === '/login' || path?.startsWith('/login/') || path?.startsWith('/auth')

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setChecking(false)
      return
    }
    if (isLoginRoute(pathname)) {
      supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.replace('/')
          return
        }
        setChecking(false)
      })
      return
    }
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
        return
      }
      setChecking(false)
    })
  }, [pathname, router])

  if (!hasSupabaseEnv) {
    return <>{children}</>
  }
  // Login/signup: alleen de pagina, geen DashboardLayout (geen sidebar, geen autorefresh van andere pagina’s)
  if (isLoginRoute(pathname)) {
    return <>{children}</>
  }
  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <p className="text-muted-foreground">Bezig met controleren…</p>
      </div>
    )
  }
  return <DashboardLayout>{children}</DashboardLayout>
}
