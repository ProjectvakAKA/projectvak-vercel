'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClipboardCheck, FileText, ArrowRight, Search, Loader2, Building2 } from 'lucide-react'
import { ContractFile, ContractsResponse } from '@/lib/types'

function groupContractsByHuis(contracts: ContractFile[]): Map<string, ContractFile[]> {
  const map = new Map<string, ContractFile[]>()
  for (const c of contracts) {
    const key = (c.pand_adres && c.pand_adres.trim()) || c.name.replace(/^data_/, '').replace(/_\d{8}_\d{6}\.json$/i, '') || c.name
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(c)
  }
  return map
}

export default function AIGoedkeuringPage() {
  const [contracts, setContracts] = useState<ContractFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    async function fetchList() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/contracts')
        if (!res.ok) throw new Error('Kon documenten niet laden')
        const data: ContractsResponse = await res.json()
        if (!cancelled) setContracts(data.contracts || [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Fout bij laden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchList()
    return () => { cancelled = true }
  }, [])

  const huisMap = useMemo(() => groupContractsByHuis(contracts), [contracts])
  const huizenList = useMemo(
    () =>
      Array.from(huisMap.entries())
        .map(([key, list]) => ({ key, label: list[0]?.pand_adres || key, contracts: list }))
        .filter(
          (h) =>
            !searchQuery.trim() ||
            h.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            h.contracts.some(
              (c) =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.verhuurder_naam?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
        .sort((a, b) => a.label.localeCompare(b.label)),
    [huisMap, searchQuery]
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header + uitleg */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI Goedkeuring</h1>
                <p className="text-sm text-muted-foreground">
                  Toekomst: geen automatische parsing meer — AI toont wat het vindt, jij keurt goed of past aan.
                </p>
              </div>
            </div>
            <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Hoe het werkt (toekomst)</p>
              <ul className="list-disc list-inside space-y-1">
                <li>De AI kijkt door het document en zegt wat het heeft gevonden.</li>
                <li>Jij keurt elk punt goed of past het aan.</li>
                <li>Sneller dan alles zelf invullen, maar wel gegarandeerd correct.</li>
              </ul>
            </div>
          </div>

          {/* Zoekbalk */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Zoek op documentnaam, adres of verhuurder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Documenten laden…
            </div>
          ) : (
            <div className="space-y-8">
              {huizenList.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {searchQuery.trim() ? 'Geen huizen of documenten gevonden voor je zoekopdracht.' : 'Nog geen documenten om goed te keuren.'}
                </p>
              ) : (
                huizenList.map(({ key, label, contracts: houseContracts }) => (
                  <section key={key}>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-lg font-semibold text-foreground">{label}</h2>
                      <span className="text-sm text-muted-foreground">({houseContracts.length} document{houseContracts.length !== 1 ? 'en' : ''})</span>
                    </div>
                    <div className="space-y-3">
                      {houseContracts.map((contract) => (
                        <Card key={contract.name} className="border-border overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="min-w-0 flex-1 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-muted shrink-0">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate" title={contract.name}>
                                    {contract.name.replace(/^data_/, '').replace(/_\d{8}_\d{6}\.json$/i, '')}
                                  </p>
                                  {contract.verhuurder_naam && (
                                    <p className="text-xs text-muted-foreground truncate">{contract.verhuurder_naam}</p>
                                  )}
                                </div>
                              </div>
                              <Button variant="outline" size="sm" className="shrink-0 gap-2" asChild>
                                <Link href={`/ai-goedkeuring/${encodeURIComponent(contract.name)}`}>
                                  Bevindingen goedkeuren
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
