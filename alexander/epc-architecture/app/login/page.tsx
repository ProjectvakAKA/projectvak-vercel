'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, ArrowLeft, Loader2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabaseBrowser.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError) {
        setError(authError.message === 'Invalid login credentials' ? 'Ongeldig e-mailadres of wachtwoord.' : authError.message)
        setLoading(false)
        return
      }
      if (!authData.user?.id) {
        setError('Inloggen mislukt.')
        setLoading(false)
        return
      }
      const { data: profiel } = await supabaseBrowser
        .from('profielen')
        .select('role')
        .eq('user_id', authData.user.id)
        .single()
      if (profiel?.role === 'admin') {
        router.push('/admin/kantoren')
      } else {
        router.push('/')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is iets misgegaan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6 max-w-md mx-auto w-full">
        <div className="mb-8">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/20 flex items-center justify-center shrink-0 mb-4">
            <User className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Inloggen</h1>
          <p className="text-muted-foreground mt-1">
            Log in met je account om Document Hub te gebruiken.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="naam@kantoor.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Wachtwoord</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Inloggen
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          Geen account?{' '}
          <Link href="/login/account-aanvragen" className="font-medium text-primary hover:underline">
            Account aanvragen voor uw kantoor
          </Link>
        </p>
      </div>
    </div>
  )
}
