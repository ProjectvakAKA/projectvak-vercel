'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

/** Markeert de zoekterm in een snippet. */
function HighlightSnippet({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>
  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${q})`, 'gi')
  const parts = text.split(re)
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-primary/30 text-primary-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}

export default function ZoekenDocumentPage() {
  const searchParams = useSearchParams()
  const path = searchParams.get('path') ?? ''
  const q = searchParams.get('q') ?? ''
  const name = searchParams.get('name') ?? 'Document'

  const [snippets, setSnippets] = useState<string[]>([])
  const [loadingSnippets, setLoadingSnippets] = useState(!!path && !!q)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const pdfUrl = useMemo(() => {
    if (!path.trim()) return null
    return `/api/document?path=${encodeURIComponent(path)}`
  }, [path])

  // Haal snippets op (waar de zoekterm gevonden is)
  useEffect(() => {
    if (!path || !q.trim()) {
      setLoadingSnippets(false)
      return
    }
    let cancelled = false
    setLoadingSnippets(true)
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const hit = (data.results || []).find((r: { dropbox_path: string }) => r.dropbox_path === path)
        setSnippets(hit?.snippets ?? hit?.snippet ? [hit.snippet] : [])
      })
      .catch(() => {
        if (!cancelled) setSnippets([])
      })
      .finally(() => {
        if (!cancelled) setLoadingSnippets(false)
      })
    return () => { cancelled = true }
  }, [path, q])

  return (
    <div className="flex flex-col h-full">
      {/* Header: terug naar zoeken + titel */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-background shrink-0">
        <Button variant="ghost" size="sm" asChild>
          <Link href={q ? `/zoeken?q=${encodeURIComponent(q)}` : '/zoeken'} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Terug naar zoeken
          </Link>
        </Button>
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <span className="font-medium text-foreground truncate" title={name}>
            {name}
          </span>
        </div>
      </div>

      {/* Venster boven de PDF: vindplaatsen */}
      <div className="shrink-0 border-b border-border bg-muted/40">
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Gevonden voor &quot;{q}&quot;
          </span>
          {snippets.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {snippets.length} vindplaats{snippets.length !== 1 ? 'en' : ''}
            </span>
          )}
        </div>
        <ScrollArea className="max-h-[180px] w-full">
          <div className="px-4 pb-3 space-y-2">
            {loadingSnippets ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Vindplaatsen laden…
              </div>
            ) : snippets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Geen vindplaatsen of zoekterm niet meegegeven.
              </p>
            ) : (
              snippets.map((snippet, i) => (
                <div
                  key={i}
                  className="text-sm text-foreground/90 bg-background border border-border rounded-lg px-3 py-2"
                >
                  <HighlightSnippet text={snippet} query={q} />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* PDF binnen de website: iframe naar eigen API */}
      <div className="flex-1 min-h-0 flex flex-col p-4">
        {!pdfUrl ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Geen document geselecteerd. Ga terug naar Zoeken en klik op &quot;Bekijk PDF&quot;.
          </div>
        ) : (
          <>
            {pdfError && (
              <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {pdfError}
              </div>
            )}
            <div className="relative flex-1 min-h-0 rounded-lg border border-border bg-muted/20 overflow-hidden">
              <iframe
                src={pdfUrl}
                title={name}
                className={cn(
                  "w-full h-full min-h-[400px]",
                  pdfLoading && "opacity-0"
                )}
                onLoad={() => {
                  setPdfLoading(false)
                  setPdfError(null)
                }}
                onError={() => {
                  setPdfLoading(false)
                  setPdfError("PDF kon niet geladen worden.")
                }}
              />
              {pdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
