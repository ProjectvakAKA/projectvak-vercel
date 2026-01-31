'use client'

import { useParams, useRouter } from 'next/navigation'
import { ContractDetailView } from '@/components/contract-detail-view'

export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const filenameParam = params?.filename
  const filename = filenameParam
    ? typeof filenameParam === 'string'
      ? decodeURIComponent(filenameParam)
      : decodeURIComponent(String(filenameParam))
    : ''

  return (
    <ContractDetailView
      filename={filename}
      onBack={() => router.push('/huizen')}
      embedded={false}
    />
  )
}
