'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { StatusBadge, type DocumentStatus } from '@/components/status-badge'
import { Search, Eye, RefreshCw, Filter, Building2, FileText, AlertCircle, CheckCircle2, MapPin, User, Euro, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContractFile {
  name: string
  path: string
  size: number
  modified: string
  pand_adres?: string | null
  pand_type?: string | null
  verhuurder_naam?: string | null
  huurprijs?: number | null
  confidence?: number | null
  processed?: string
}

function getContractStatus(contract: ContractFile): DocumentStatus {
  if (!contract.confidence) return 'pending'
  if (contract.confidence >= 95) return 'pushed'
  if (contract.confidence >= 80) return 'parsed'
  if (contract.confidence >= 60) return 'needs_review'
  return 'error'
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchContracts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/contracts')
      if (!response.ok) {
        throw new Error('Failed to fetch contracts')
      }
      const data = await response.json()
      const contractsList = data.contracts || []
      console.log('📥 Fetched contracts:', contractsList.length)
      console.log('📋 Sample contract data:', contractsList.slice(0, 2).map((c: any) => ({
        name: c.name,
        pand_adres: c.pand_adres,
        pand_type: c.pand_type,
        verhuurder_naam: c.verhuurder_naam,
        huurprijs: c.huurprijs,
        confidence: c.confidence
      })))
      setContracts(contractsList)
    } catch (err: any) {
      console.error('❌ Error fetching contracts:', err)
      setError(err.message || 'Failed to load contracts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [])

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.pand_adres?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.verhuurder_naam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.name.toLowerCase().includes(searchQuery.toLowerCase())
    const status = getContractStatus(contract)
    const matchesStatus = statusFilter === 'all' || status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Calculate status counts from contracts using useMemo for performance
  const statusCounts = useMemo(() => {
    const counts: {
      total: number
      pushed: number
      parsed: number
      needs_review: number
      pending: number
      error: number
    } = {
      total: contracts.length,
      pushed: 0,
      parsed: 0,
      needs_review: 0,
      pending: 0,
      error: 0,
    }

    contracts.forEach((contract) => {
      const status = getContractStatus(contract)
      if (status === 'pushed') counts.pushed++
      else if (status === 'parsed') counts.parsed++
      else if (status === 'needs_review') counts.needs_review++
      else if (status === 'pending') counts.pending++
      else if (status === 'error') counts.error++
    })

    // Debug logging
    if (contracts.length > 0) {
      console.log('📊 Status breakdown:', {
        total: counts.total,
        pushed: counts.pushed,
        parsed: counts.parsed,
        needs_review: counts.needs_review,
        pending: counts.pending,
        error: counts.error,
      })
      console.log('📋 Sample contracts:', contracts.slice(0, 3).map(c => ({
        name: c.name,
        confidence: c.confidence,
        status: getContractStatus(c)
      })))
    }

    return counts
  }, [contracts])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Contracts</h1>
            <p className="text-sm text-muted-foreground">Rental contracts and their extracted data from Dropbox</p>
          </div>
          <Button size="sm" variant="outline" className="gap-2 bg-transparent" onClick={fetchContracts} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Sync Now
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{statusCounts.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{statusCounts.pushed}</div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-success">{statusCounts.parsed}</div>
            <div className="text-xs text-muted-foreground">Parsed</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-warning">{statusCounts.needs_review}</div>
            <div className="text-xs text-muted-foreground">Needs Review</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-pending">{statusCounts.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-error">{statusCounts.error}</div>
            <div className="text-xs text-muted-foreground">Errors</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by address or landlord..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-secondary border-border">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="parsed">Ready</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
            <SelectItem value="pushed">Complete</SelectItem>
            <SelectItem value="error">Has Errors</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contract Cards */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        {loading && contracts.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading contracts...</p>
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No contracts found' : 'No contracts available'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredContracts.map((contract) => {
              const status = getContractStatus(contract)
              const completionPercent = contract.confidence || 0

              // Debug: log contract data
              if (filteredContracts.indexOf(contract) < 2) {
                console.log('📄 Rendering contract card:', {
                  name: contract.name,
                  pand_adres: contract.pand_adres,
                  pand_type: contract.pand_type,
                  verhuurder_naam: contract.verhuurder_naam,
                  huurprijs: contract.huurprijs,
                  confidence: contract.confidence,
                  status: status
                })
              }

              return (
                <Card key={contract.path} className="bg-card border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Contract Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-foreground truncate">
                                {contract.pand_adres || contract.name.replace('data_', '').replace('.json', '').replace(/_/g, ' ')}
                              </h3>
                              <StatusBadge status={status} />
                            </div>
                            <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
                              {contract.pand_type ? (
                                <span>{contract.pand_type}</span>
                              ) : (
                                <span className="text-muted-foreground/50">Type: N/A</span>
                              )}
                              {contract.verhuurder_naam ? (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {contract.verhuurder_naam}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-muted-foreground/50">
                                  <User className="h-3 w-3" />
                                  Verhuurder: N/A
                                </span>
                              )}
                              {contract.huurprijs ? (
                                <span className="flex items-center gap-1">
                                  <Euro className="h-3 w-3" />
                                  €{contract.huurprijs.toFixed(2)}/maand
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-muted-foreground/50">
                                  <Euro className="h-3 w-3" />
                                  Huurprijs: N/A
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status Summary */}
                      <div className="flex items-center gap-6 lg:gap-8">
                        {/* Confidence indicator */}
                        <div className="flex items-center gap-2 text-sm">
                          {contract.confidence !== null ? (
                            <>
                              {contract.confidence >= 95 ? (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              ) : contract.confidence >= 80 ? (
                                <FileText className="h-4 w-4 text-status-success" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-status-warning" />
                              )}
                              <span className="text-muted-foreground">{contract.confidence}%</span>
                            </>
                          ) : (
                            <>
                              <Clock className="h-4 w-4 text-status-pending" />
                              <span className="text-muted-foreground">Pending</span>
                            </>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="w-32 space-y-1">
                          <Progress value={completionPercent} className="h-2" />
                          <p className="text-xs text-muted-foreground text-right">
                            {contract.confidence !== null ? `${completionPercent}% confidence` : 'No confidence score'}
                          </p>
                        </div>

                        {/* View button */}
                        <Button variant="outline" size="sm" asChild className="bg-transparent shrink-0">
                          <Link href={`/contracts/${encodeURIComponent(contract.name)}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Contract metadata */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {contract.name}
                        </span>
                        <span>•</span>
                        <span>Modified: {new Date(contract.modified).toLocaleDateString('nl-NL')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
