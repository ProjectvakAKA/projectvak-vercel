'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Building2, ArrowRight, Loader2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Kantoor = { id: string; naam: string; slug: string }

export default function AdminKantorenPage() {
  const router = useRouter()
  const [kantoren, setKantoren] = useState<Kantoor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabaseBrowser.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data: profiel, error: profielError } = await supabaseBrowser
        .from('profielen')
        .select('role')
        .eq('user_id', user.id)
        .single()
      if (profielError || !profiel || profiel.role !== 'admin') {
        router.replace('/')
        return
      }
      const { data: list, error: kantorenError } = await supabaseBrowser
        .from('kantoren')
        .select('id, naam, slug')
        .order('naam')
      if (cancelled) return
      if (kantorenError) {
        setError(kantorenError.message)
        setLoading(false)
        return
      }
      setKantoren(list ?? [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Kantoren laden…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <p className="text-destructive mb-4">{error}</p>
        <Link href="/">
          <Button variant="outline">Terug naar home</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="h-7 w-7 text-primary" />
          Kantoren
        </h1>
        <p className="text-muted-foreground mt-1">
          Kies een kantoor om naar Document Hub te gaan.
        </p>
      </div>
      <ul className="space-y-2">
        {kantoren.map((k) => (
          <li key={k.id}>
            <Link
              href="/"
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm hover:bg-accent/50 transition-colors"
            >
              <span className="font-medium">{k.naam}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
      {kantoren.length === 0 && (
        <p className="text-muted-foreground">Er zijn nog geen kantoren.</p>
      )}
    </div>
  )
}
