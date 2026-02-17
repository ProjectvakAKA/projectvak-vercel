'use client'

import { useMemo } from 'react'
import { Worker, Viewer } from '@react-pdf-viewer/core'
import { searchPlugin } from '@react-pdf-viewer/search'
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/search/lib/styles/index.css'

const PDF_WORKER_URL = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'

/** Eenvoudige viewer zonder zoekplugin — fallback als viewer met zoek crasht. */
type SimpleProps = { fileUrl: string; onLoadFail?: () => void }
export function PdfViewerSimple({ fileUrl, onLoadFail }: SimpleProps) {
  return (
    <Worker workerUrl={PDF_WORKER_URL}>
      <Viewer fileUrl={fileUrl} onDocumentLoadFail={onLoadFail} />
    </Worker>
  )
}

type Props = {
  fileUrl: string
  keyword: string
  onLoadFail?: () => void
}

/** Fluo in PDF: plugin krijgt keyword bij aanmaken; remount bij keyword-wijziging (key in parent). */
export function PdfViewerWithSearch({ fileUrl, keyword, onLoadFail }: Props) {
  const k = typeof keyword === 'string' ? keyword.trim() : ''
  const searchPluginInstance = useMemo(
    () =>
      searchPlugin({
        keyword: k,
        onHighlightKeyword: (props) => {
          props.highlightEle.style.backgroundColor = 'rgba(234, 179, 8, 0.4)'
          props.highlightEle.style.borderRadius = '2px'
        },
      }),
    [k]
  )

  return (
    <Worker workerUrl={PDF_WORKER_URL}>
      <Viewer
        fileUrl={fileUrl}
        plugins={[searchPluginInstance]}
        onDocumentLoadFail={onLoadFail}
      />
    </Worker>
  )
}
