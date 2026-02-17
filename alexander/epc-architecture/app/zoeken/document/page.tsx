'use client'

import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PdfViewerWithSearch } from './PdfViewerWithSearch'

// Markeert de zoekterm in een snippet (geel).
function HighlightSnippet({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>
  const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${q})`, 'gi')
  const parts = text.split(re)
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-amber-300/80 dark:bg-amber-500/50 text-amber-950 dark:text-amber-100 rounded px-0.5 font-medium">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}

function DocumentPageContent() {
  const searchParams = useSearchParams()
  const path = searchParams.get('path') ?? ''
  const q = searchParams.get('q') ?? ''
  const name = searchParams.get('name') ?? 'Document'

  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [snippetsOpen, setSnippetsOpen] = useState(true) // standaard open zodat je direct ziet waar de zoekterm staat
  const [snippets, setSnippets] = useState<string[]>([])
  const blobUrlRef = useRef<string | null>(null)

  const apiUrl = useMemo(() => {
    if (!path.trim()) return null
    return `/api/document?path=${encodeURIComponent(path)}`
  }, [path])

  // PDF ophalen via fetch: bij fout tonen we de melding in de UI (niet JSON in iframe)
  useEffect(() => {
    if (!apiUrl || !path.trim()) {
      setPdfBlobUrl(null)
      setPdfError(null)
      setPdfLoading(false)
      return
    }
    setPdfLoading(true)
    setPdfError(null)
    let cancelled = false
    fetch(apiUrl)
      .then((res) => {
        if (cancelled) return
        if (!res.ok) {
          return res.json().then((data: { error?: string }) => {
            setPdfError(data?.error ?? 'PDF kon niet geladen worden.')
            setPdfBlobUrl(null)
          })
        }
        return res.blob().then((blob) => {
          if (cancelled) return
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current)
            blobUrlRef.current = null
          }
          const url = URL.createObjectURL(blob)
          blobUrlRef.current = url
          setPdfBlobUrl(url)
          setPdfError(null)
        })
      })
      .catch(() => {
        if (!cancelled) {
          setPdfError('PDF kon niet geladen worden.')
          setPdfBlobUrl(null)
        }
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false)
      })
    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      setPdfBlobUrl(null)
    }
  }, [apiUrl, path])

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
              — &quot;{q}&quot; wordt in de PDF-viewer en in de vindplaatsen gemarkeerd
            </span>
          )}
        </div>
      </div>

      {/* Waar je zoekterm in de PDF staat: altijd zichtbaar, zoekterm gemarkeerd */}
      {q.trim() && (
        <div className="shrink-0 border-b border-border bg-muted/40">
          <button
            type="button"
            onClick={() => setSnippetsOpen((o) => !o)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-foreground hover:bg-muted/50"
          >
            <span>Waar &quot;{q}&quot; in dit document voorkomt{snippets.length > 0 ? ` (${snippets.length} vindplaats${snippets.length !== 1 ? 'en' : ''})` : ''}</span>
            {snippetsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {snippetsOpen && (
            <div className="px-4 pb-4 max-h-52 overflow-auto space-y-3">
              {snippets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Bezig met zoeken…</p>
              ) : (
                snippets.map((snippet, i) => (
                  <div key={i} className="text-sm text-foreground/90 bg-background border border-border rounded-lg px-3 py-2 shadow-sm">
                    <HighlightSnippet text={snippet} query={q} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* PDF: viewer met zoekterm-gemarkeerd in de PDF zelf */}
      <div className="flex-1 min-h-0 flex flex-col p-4">
        {!apiUrl ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Geen document geselecteerd. Ga terug naar Zoeken en klik op &quot;Bekijk PDF&quot;.
          </div>
        ) : (
          <>
            {pdfError && (
              <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {pdfError}
                {path && (
                  <span className="text-xs opacity-80 block mt-1" title={path}>
                    Pad: {path.length > 60 ? path.slice(0, 60) + '…' : path}
                  </span>
                )}
              </div>
            )}
            <div className="relative flex-1 min-h-[500px] rounded-lg border border-border bg-muted/20 overflow-hidden flex flex-col">
              {pdfLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {!pdfLoading && pdfBlobUrl && (
                <div className="flex-1 min-h-[500px] overflow-auto">
                  <PdfViewerWithSearch
                    fileUrl={pdfBlobUrl}
                    keyword={q}
                    onLoadFail={() => setPdfError('PDF kon niet weergegeven worden.')}
                  />
                </div>
              )}
              {!pdfLoading && !pdfBlobUrl && !pdfError && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Geen PDF beschikbaar.
                </div>
              )}
              {pdfBlobUrl && (
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={pdfBlobUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                      PDF in nieuw tabblad openen
                    </a>
                  </Button>
                </div>
              )}
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
