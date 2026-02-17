'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Eenvoudige iframe-viewer: betrouwbaar, geen externe Worker/CORS. Zoekterm staat in "Waar gevonden" hierboven.

function DocumentPageContent() {
  const searchParams = useSearchParams()
  const path = searchParams.get('path') ?? ''
  const q = searchParams.get('q') ?? ''
  const name = searchParams.get('name') ?? 'Document'

  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [snippetsOpen, setSnippetsOpen] = useState(false)
  const [snippets, setSnippets] = useState<string[]>([])

  const pdfUrl = useMemo(() => {
    if (!path.trim()) return null
    return `/api/document?path=${encodeURIComponent(path)}`
  }, [path])

  // Optioneel: snippets ophalen voor uitklapbare "Waar gevonden" (klein)
  useEffect(() => {
    if (!path || !q.trim()) return
    let cancelled = false
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const hit = (data.results || []).find((r: { dropbox_path: string }) => r.dropbox_path === path)
        setSnippets(hit?.snippets ?? hit?.snippet ? [hit.snippet] : [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [path, q])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
          {q.trim() && (
            <span className="text-xs text-muted-foreground shrink-0">
              — zoekterm &quot;{q}&quot; zie je in &quot;Waar gevonden&quot; hieronder
            </span>
          )}
        </div>
      </div>

      {/* Optioneel: uitklapbare sectie met vindplaatsen (tekst) */}
      {snippets.length > 0 && (
        <div className="shrink-0 border-b border-border bg-muted/30">
          <button
            type="button"
            onClick={() => setSnippetsOpen((o) => !o)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-foreground hover:bg-muted/50"
          >
            <span>Waar &quot;{q}&quot; in de tekst voorkomt ({snippets.length})</span>
            {snippetsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {snippetsOpen && (
            <div className="px-4 pb-3 max-h-40 overflow-auto space-y-2">
              {snippets.map((snippet, i) => (
                <p key={i} className="text-sm text-muted-foreground bg-background rounded px-2 py-1">
                  …{snippet}…
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PDF: viewer met highlight in de pagina zelf */}
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
            <div className="relative flex-1 min-h-[500px] rounded-lg border border-border bg-muted/20 overflow-hidden flex flex-col">
              <iframe
                src={pdfUrl}
                title={name}
                className={cn(
                  'w-full flex-1 min-h-[500px] rounded-lg',
                  pdfLoading && 'opacity-0'
                )}
                onLoad={() => { setPdfLoading(false); setPdfError(null) }}
                onError={() => { setPdfLoading(false); setPdfError('PDF kon niet geladen worden.') }}
              />
              {pdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" asChild>
                  <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                    <ExternalLink className="h-3.5 w-3.5" />
                    PDF in nieuw tabblad openen
                  </a>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ZoekenDocumentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <DocumentPageContent />
    </Suspense>
  )
}
