'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search as SearchIcon, FileText, Loader2, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 300

type SearchResult = {
  id: string
  dropbox_path: string
  name: string
  snippet: string
  snippets?: string[]
  created_at: string
}

export default function ZoekenPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setLoading(true)
    setError(null)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Zoeken mislukt.')
          setResults([])
        } else {
          setResults(data.results || [])
          setError(null)
        }
      } catch (err: any) {
        setError(err.message || 'Zoeken mislukt.')
        setResults([])
      } finally {
        setLoading(false)
      }
      debounceRef.current = null
    }, DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

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
                  Resultaten verschijnen terwijl u typt. Zoek in de geëxtraheerde tekst (Supabase).
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Typ om te zoeken..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 h-10 bg-background"
                autoFocus
              />
              {loading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {query.trim() && !loading && (
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
                      <Button variant="outline" size="sm" className="mt-3 gap-2" asChild>
                        <Link
                          href={`/zoeken/document?path=${encodeURIComponent(r.dropbox_path)}&q=${encodeURIComponent(query.trim())}&name=${encodeURIComponent(r.name)}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Bekijk PDF in de site
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {query.trim() && !loading && results.length === 0 && !error && (
            <p className="text-muted-foreground text-center py-8">
              Geen documenten gevonden voor &quot;{query.trim()}&quot;. Probeer een andere zoekterm of controleer of de pipeline al documenten naar Supabase heeft geschreven.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
