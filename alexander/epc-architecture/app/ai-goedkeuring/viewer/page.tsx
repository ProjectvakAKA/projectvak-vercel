'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { PdfViewerWithSearch } from '@/app/zoeken/document/PdfViewerWithSearch'
import { ErrorBoundary } from '@/components/error-boundary'

/**
 * Pagina om in een iframe te laden: toont PDF met fluo voor één keyword.
 * Query: path (Dropbox-pad), keyword (te markeren tekst).
 * Bij crash toont ErrorBoundary fallback; parent (luik 4) blijft intact.
 */
export default function AIGoedkeuringViewerPage() {
  const searchParams = useSearchParams()
  const path = searchParams.get('path') ?? ''
  const keyword = searchParams.get('keyword') ?? ''
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!path.trim()) {
      setLoading(false)
      setError('Geen pad')
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const url = `/api/document?path=${encodeURIComponent(path)}`
    fetch(url)
      .then((res) => {
        if (cancelled) return
        if (!res.ok) return res.json().then((d: { error?: string }) => { setError(d?.error ?? 'PDF kon niet geladen worden'); return null })
        return res.blob()
      })
      .then((blob) => {
        if (cancelled || !blob) return
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
        }
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url
        setBlobUrl(url)
      })
      .catch(() => {
        if (!cancelled) setError('PDF kon niet geladen worden')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      setBlobUrl(null)
    }
  }, [path])

  if (loading) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        PDF laden…
      </div>
    )
  }
  if (error || !blobUrl) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center p-4 text-center text-sm text-muted-foreground">
        {error ?? 'Geen PDF'}
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto">
      <ErrorBoundary
        fallback={
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center p-4 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Fluo in PDF kon niet getoond worden.</p>
            <p className="mt-1">Waarde wordt rechts in de lijst gemarkeerd.</p>
          </div>
        }
      >
        <PdfViewerWithSearch
          key={`${blobUrl}-${keyword}`}
          fileUrl={blobUrl}
          keyword={keyword}
        />
      </ErrorBoundary>
    </div>
  )
}
