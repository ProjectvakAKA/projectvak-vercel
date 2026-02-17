'use client'

import { useMemo } from 'react'
import { Worker, Viewer } from '@react-pdf-viewer/core'
import { searchPlugin } from '@react-pdf-viewer/search'
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/search/lib/styles/index.css'

const PDF_WORKER_URL = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'

type Props = {
  fileUrl: string
  keyword: string
  onLoadFail?: () => void
}

export function PdfViewerWithSearch({ fileUrl, keyword, onLoadFail }: Props) {
  const searchPluginInstance = useMemo(() => {
    return searchPlugin({
      keyword: keyword.trim() || undefined,
      onHighlightKeyword: (props) => {
        props.highlightEle.style.backgroundColor = 'rgba(234, 179, 8, 0.4)'
        props.highlightEle.style.borderRadius = '2px'
      },
    })
  }, [keyword])

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
