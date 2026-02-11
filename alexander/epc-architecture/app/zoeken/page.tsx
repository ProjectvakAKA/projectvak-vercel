'use client'

import { useState } from 'react'
import { Search as SearchIcon, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type SearchResult = {
  id: string
  dropbox_path: string
  name: string
  snippet: string
  created_at: string
}

export default function ZoekenPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q || q.length < 2) {
      setError('Voer minstens 2 tekens in.')
      return
    }
    setError(null)
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Zoeken mislukt.')
        setResults([])
        return
      }
      setResults(data.results || [])
    } catch (err: any) {
      setError(err.message || 'Zoeken mislukt.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
                <SearchIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Zoeken in documenten</h1>
                <p className="text-sm text-muted-foreground">
                  Zoek in de geëxtraheerde tekst van alle documenten (Supabase). Geen zoekactie in Dropbox.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Zoekterm (min. 2 tekens)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-10 bg-background"
                disabled={loading}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading} className="h-10">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <SearchIcon className="h-4 w-4 mr-2" />
                  Zoeken
                </>
              )}
            </Button>
          </form>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {searched && !loading && (
            <p className="text-sm text-muted-foreground mb-4">
              {results.length} resultaat{results.length !== 1 ? 'en' : ''} gevonden.
            </p>
          )}

          <div className="space-y-3">
            {results.map((r) => (
              <Card key={r.id} className="border-border overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted shrink-0">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate" title={r.name}>
                        {r.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5" title={r.dropbox_path}>
                        {r.dropbox_path}
                      </p>
                      {r.snippet && (
                        <p className={cn("text-sm text-muted-foreground mt-2 line-clamp-2")}>
                          {r.snippet}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {searched && !loading && results.length === 0 && !error && (
            <p className="text-muted-foreground text-center py-8">
              Geen documenten gevonden voor &quot;{query}&quot;. Probeer een andere zoekterm of controleer of de pipeline al documenten naar Supabase heeft geschreven.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
