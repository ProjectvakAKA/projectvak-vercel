'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, FileText, Check, Pencil, Loader2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

type Finding = { path: string; label: string; value: string | number | null; status: 'pending' | 'approved' | 'edited' }

const SECTION_LABELS: Record<string, string> = {
  partijen: 'Partijen',
  verhuurder: 'Verhuurder',
  huurder: 'Huurder',
  naam: 'Naam',
  pand: 'Pand',
  adres: 'Adres',
  type: 'Type',
  financieel: 'Financieel',
  huurprijs: 'Huurprijs',
  contract_data: 'Contract',
}

function pathToLabel(path: string): string {
  const parts = path.replace(/^contract_data\./, '').split('.')
  return parts.map((p) => SECTION_LABELS[p] || p).join(' · ')
}

function flattenContractData(obj: unknown, prefix = ''): Finding[] {
  const out: Finding[] = []
  if (obj === null || obj === undefined) return out
  if (typeof obj !== 'object') {
    out.push({ path: prefix, label: pathToLabel(prefix), value: obj as string | number, status: 'pending' })
    return out
  }
  const rec = obj as Record<string, unknown>
  for (const key of Object.keys(rec)) {
    const val = rec[key]
    const p = prefix ? `${prefix}.${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      out.push(...flattenContractData(val, p))
    } else if (Array.isArray(val)) {
      continue
    } else {
      const display = val === null || val === undefined ? '' : String(val)
      out.push({ path: p, label: pathToLabel(p), value: display, status: 'pending' })
    }
  }
  return out
}

function setByPath(data: Record<string, unknown>, path: string, value: string | number): void {
  const parts = path.split('.')
  let cur: Record<string, unknown> = data
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (!(p in cur) || typeof cur[p] !== 'object') cur[p] = {}
    cur = cur[p] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

export default function AIGoedkeuringDetailPage() {
  const params = useParams()
  const filename = typeof params?.filename === 'string' ? decodeURIComponent(params.filename) : ''
  const [contract, setContract] = useState<Record<string, unknown> | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filename) {
      setLoading(false)
      setError('Geen document geselecteerd')
      return
    }
    let cancelled = false
    async function fetchContract() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/contracts/${encodeURIComponent(filename)}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || `HTTP ${res.status}`)
        }
        const data = await res.json()
        if (cancelled) return
        setContract(data)
        const cd = data.contract_data || data
        const flat = flattenContractData(cd, 'contract_data').filter((f) => f.value !== '' && f.value != null)
        setFindings(flat)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Laden mislukt')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchContract()
    return () => { cancelled = true }
  }, [filename])

  const handleApprove = (path: string) => {
    setFindings((prev) => prev.map((f) => (f.path === path ? { ...f, status: 'approved' as const } : f)))
    setEditingPath(null)
  }

  const startEdit = (f: Finding) => {
    setEditingPath(f.path)
    setEditValue(String(f.value ?? ''))
  }

  const applyEdit = () => {
    if (editingPath === null) return
    setFindings((prev) =>
      prev.map((f) =>
        f.path === editingPath ? { ...f, value: editValue, status: 'edited' as const } : f
      )
    )
    setEditingPath(null)
    setEditValue('')
  }

  const handleSave = async () => {
    if (!contract || !filename) return
    setSaving(true)
    try {
      const existing = (contract.contract_data as Record<string, unknown>) || {}
      const contractData = JSON.parse(JSON.stringify(existing)) as Record<string, unknown>
      for (const f of findings) {
        const path = f.path.replace(/^contract_data\./, '')
        setByPath(contractData, path, f.value as string)
      }
      const res = await fetch(`/api/contracts/${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_data: contractData }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Opslaan mislukt')
      }
      setFindings((prev) => prev.map((f) => ({ ...f, status: 'approved' as const })))
      setEditingPath(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        Document laden…
      </div>
    )
  }

  if (error && !contract) {
    return (
      <div className="flex flex-col h-full p-6">
        <div className="rounded-lg bg-destructive/10 text-destructive p-4">{error}</div>
        <Button variant="outline" className="mt-4 gap-2" asChild>
          <Link href="/ai-goedkeuring">
            <ArrowLeft className="h-4 w-4" />
            Terug naar overzicht
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/ai-goedkeuring" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Terug
              </Link>
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="font-medium truncate" title={filename}>
                {filename.replace(/^data_/, '').replace(/_\d{8}_\d{6}\.json$/i, '')}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Dit is wat de AI in het document heeft gevonden. Keur elk punt goed of pas het aan, en sla daarna op.
          </p>

          {error && (
            <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {findings.map((f) => (
              <Card key={f.path} className="border-border">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">{f.label}</p>
                      {editingPath === f.path ? (
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="max-w-xs"
                            autoFocus
                          />
                          <Button size="sm" onClick={applyEdit}>
                            Toepassen
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingPath(null); setEditValue('') }}>
                            Annuleren
                          </Button>
                        </div>
                      ) : (
                        <p className="text-foreground font-medium break-words">{String(f.value ?? '—')}</p>
                      )}
                    </div>
                    {editingPath !== f.path && (
                      <div className="flex items-center gap-2 shrink-0">
                        {f.status === 'approved' && (
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" />
                            Goedgekeurd
                          </span>
                        )}
                        {f.status === 'edited' && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">Aangepast</span>
                        )}
                        <Button
                          size="sm"
                          variant={f.status === 'approved' ? 'outline' : 'default'}
                          className="gap-1"
                          onClick={() => handleApprove(f.path)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Goedkeuren
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => startEdit(f)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Aanpassen
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {findings.length > 0 && (
            <div className="mt-8 flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Wijzigingen opslaan
              </Button>
            </div>
          )}

          {findings.length === 0 && !loading && (
            <p className="text-muted-foreground text-center py-8">
              Geen AI-bevindingen in dit document (of document heeft geen contract_data).
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
