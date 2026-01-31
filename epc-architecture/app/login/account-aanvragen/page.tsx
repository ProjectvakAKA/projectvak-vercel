'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Loader2, ArrowLeft } from 'lucide-react'

export default function AccountAanvragenPage() {
  const [mounted, setMounted] = useState(false)
  const [naam, setNaam] = useState('')
  const [email, setEmail] = useState('')
  const [naamKantoor, setNaamKantoor] = useState('')
  const [reden, setReden] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/account-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naam: naam.trim(),
          email: email.trim(),
          naamKantoor: naamKantoor.trim(),
          reden: reden.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Versturen mislukt.')
        setLoading(false)
        return
      }
      setSuccess(true)
    } catch {
      setError('Versturen mislukt. Probeer later opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto p-6 max-w-md mx-auto w-full">
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-4 mb-6">
            <p className="text-sm text-green-800 dark:text-green-200">
              Uw aanvraag is ontvangen. We nemen zo snel mogelijk contact met u op.
            </p>
          </div>
          <Link href="/login">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Terug naar inloggen
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Form pas na mount renderen om hydratatiefout door browserextensies (bv. DuckDuckGo) te vermijden
  if (!mounted) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto p-6 max-w-md mx-auto w-full">
          <div className="mb-8">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/20 flex items-center justify-center shrink-0 mb-4">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Account aanvragen</h1>
            <p className="text-muted-foreground mt-1">Formulier laden…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6 max-w-md mx-auto w-full">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Terug naar inloggen
        </Link>
        <div className="mb-8">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/20 flex items-center justify-center shrink-0 mb-4">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Account aanvragen</h1>
          <p className="text-muted-foreground mt-1">
            Kantoren kunnen hier een account voor Document Hub aanvragen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="naam">Naam</Label>
            <Input
              id="naam"
              type="text"
              placeholder="Uw naam"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              required
              autoComplete="name"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres</Label>
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
            <Label htmlFor="naamKantoor">Naam kantoor</Label>
            <Input
              id="naamKantoor"
              type="text"
              placeholder="Naam van uw kantoor"
              value={naamKantoor}
              onChange={(e) => setNaamKantoor(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reden">Korte reden waarom u toegang wilt</Label>
            <textarea
              id="reden"
              placeholder="Bijv. we willen onze huurcontracten centraal beheren en naar Whise pushen."
              value={reden}
              onChange={(e) => setReden(e.target.value)}
              required
              disabled={loading}
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Aanvraag versturen
          </Button>
        </form>
      </div>
    </div>
  )
}
