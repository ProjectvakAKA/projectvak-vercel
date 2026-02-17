'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/error-boundary'
import { cn } from '@/lib/utils'

// PDF viewer alleen client-side; bij falen tonen we fallback (geen app-crash)
const PdfViewerWithSearch = dynamic(
  () =>
    import('./PdfViewerWithSearch')
      .then((m) => m.PdfViewerWithSearch)
      .catch(() => ({
        default: function PdfViewerFallback() {
          return (
            <div className="flex flex-col items-center justify-center h-[500px] gap-2 text-muted-foreground text-sm">
              <AlertCircle className="h-10 w-10" />
              <p>PDF-viewer kon niet geladen worden.</p>
              <p className="text-xs">Probeer de pagina te vernieuwen.</p>
            </div>
          )
        },
      })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

function DocumentPageContent() {
  const searchParams = useSearchParams()
  const path = searchParams.get('path') ?? ''
  const q = searchParams.get('q') ?? ''
  const name = searchParams.get('name') ?? 'Document'

  const [pdfError, setPdfError] = useState<string | null>(null)
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
              — zoekterm &quot;{q}&quot; wordt in de PDF gemarkeerd
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
            <div className="flex-1 min-h-[500px] rounded-lg border border-border bg-muted/20 overflow-hidden flex flex-col [&_.rpv-core__viewer]:min-h-[500px]">
              <ErrorBoundary
                fallback={
                  <div className="flex flex-col items-center justify-center h-[500px] gap-2 text-muted-foreground text-sm p-4">
                    <AlertCircle className="h-10 w-10" />
                    <p>PDF-viewer: er ging iets mis.</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/zoeken">Terug naar zoeken</Link>
                    </Button>
                  </div>
                }
              >
                <PdfViewerWithSearch
                  fileUrl={pdfUrl}
                  keyword={q}
                  onLoadFail={() => setPdfError('PDF kon niet geladen worden.')}
                />
              </ErrorBoundary>
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
