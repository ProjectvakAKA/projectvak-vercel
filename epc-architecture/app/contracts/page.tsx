'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { StatusBadge, type DocumentStatus } from '@/components/status-badge'
import { Search, Eye, RefreshCw, Filter, Building2, FileText, AlertCircle, CheckCircle2, MapPin, User, Euro, Clock, ChevronDown, ChevronUp, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContractFile, ContractsResponse } from '@/lib/types'
import { logger } from '@/lib/logger'

function getContractStatus(contract: ContractFile): DocumentStatus {
  // Check if contract was manually edited (highest priority)
  if ((contract as any).edited?.timestamp || (contract as any).manually_edited) {
    return 'manually_edited'
  }
  
  if (!contract.confidence) return 'pending'
  
  // Only "pushed" if confidence >= 95 (fully processed and approved)
  if (contract.confidence >= 95) return 'pushed'
  
  // Everything below 95% needs review (even if parsed, it needs manual check)
  if (contract.confidence >= 60) return 'needs_review'
  
  // Below 60% is error or pending
  if (contract.confidence > 0) return 'error'
  return 'pending'
}

export default function ContractsPage() {
  const pathname = usePathname()
  const [contracts, setContracts] = useState<ContractFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [priceMin, setPriceMin] = useState<string>('')
  const [priceMax, setPriceMax] = useState<string>('')

  const fetchContracts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/contracts')
      if (!response.ok) {
        throw new Error('Failed to fetch contracts')
      }
      const data: ContractsResponse = await response.json()
      const contractsList: ContractFile[] = data.contracts || []
      logger.info('Fetched contracts', { count: contractsList.length })
      setContracts(contractsList)
    } catch (err: unknown) {
      logger.error('Error fetching contracts', err)
      setError(err instanceof Error ? err.message : 'Failed to load contracts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [])

  // Auto-refresh every 30 seconds, but pause if user is interacting. Geen refresh op login/account-aanvragen.
  useEffect(() => {
    if (pathname === '/login' || pathname?.startsWith('/login/')) return
    let intervalId: NodeJS.Timeout | null = null
    let timeoutId: NodeJS.Timeout | null = null

    const setupAutoRefresh = () => {
      if (intervalId) clearInterval(intervalId)
      if (!loading && !error) {
        intervalId = setInterval(() => {
          if (document.activeElement?.tagName === 'INPUT' ||
              document.activeElement?.tagName === 'TEXTAREA' ||
              document.activeElement?.tagName === 'SELECT') return
          fetchContracts()
        }, 30000)
      }
    }
    setupAutoRefresh()
    return () => {
      if (intervalId) clearInterval(intervalId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [loading, error, pathname])

  const filteredContracts = contracts.filter((contract) => {
    // Basic search
    const matchesSearch =
      contract.pand_adres?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.verhuurder_naam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Status filter
    const status = getContractStatus(contract)
    const matchesStatus = statusFilter === 'all' || status === statusFilter
    
    // Date range filter
    let matchesDate = true
    if (dateFrom || dateTo) {
      const contractDate = new Date(contract.modified)
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (contractDate < fromDate) matchesDate = false
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (contractDate > toDate) matchesDate = false
      }
    }
    
    // Price range filter
    let matchesPrice = true
    if (priceMin || priceMax) {
      const price = contract.huurprijs || 0
      if (priceMin && price < parseFloat(priceMin)) matchesPrice = false
      if (priceMax && price > parseFloat(priceMax)) matchesPrice = false
    }
    
    return matchesSearch && matchesStatus && matchesDate && matchesPrice
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
      manually_edited: number
    } = {
      total: contracts.length,
      pushed: 0,
      parsed: 0,
      needs_review: 0,
      pending: 0,
      error: 0,
      manually_edited: 0,
    }

    contracts.forEach((contract) => {
      const status = getContractStatus(contract)
      if (status === 'manually_edited') counts.manually_edited++
      else if (status === 'pushed') counts.pushed++
      else if (status === 'parsed') counts.parsed++
      else if (status === 'needs_review') counts.needs_review++
      else if (status === 'pending') counts.pending++
      else if (status === 'error') counts.error++
    })

    // Debug logging
    if (contracts.length > 0) {
      logger.debug('Status breakdown', {
        total: counts.total,
        manually_edited: counts.manually_edited,
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
          <div className="flex items-center gap-4">
            {/* Image/Icon */}
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Huurcontracten</h1>
              <p className="text-sm text-muted-foreground">Geanalyseerde huurcontracten en hun geëxtraheerde data uit Dropbox</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-2 bg-transparent" onClick={fetchContracts} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Sync Now
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 p-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{statusCounts.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{statusCounts.manually_edited}</div>
            <div className="text-xs text-muted-foreground">Manueel Aangepast</div>
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
            <div className="text-2xl font-bold text-primary">{statusCounts.pushed}</div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border opacity-50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-success">{statusCounts.parsed}</div>
            <div className="text-xs text-muted-foreground">Parsed (≥80%)</div>
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
      <div className="px-6 pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
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
            <SelectItem value="manually_edited">Manueel Aangepast</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="parsed">Ready</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
            <SelectItem value="pushed">Complete</SelectItem>
            <SelectItem value="error">Has Errors</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="bg-secondary border-border"
        >
          {showAdvancedFilters ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
          Advanced Filters
        </Button>
        {(dateFrom || dateTo || priceMin || priceMax) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom('')
              setDateTo('')
              setPriceMin('')
              setPriceMax('')
            }}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
        </div>
        
        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg border border-border">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Price (€)</label>
              <Input
                type="number"
                placeholder="0"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Price (€)</label>
              <Input
                type="number"
                placeholder="∞"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <div className="px-6 pb-2">
          <p className="text-sm text-muted-foreground">
            {filteredContracts.length} van {contracts.length} contracten
            {(dateFrom || dateTo || priceMin || priceMax) && ' (gefilterd)'}
          </p>
        </div>
      )}

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
                logger.debug('Rendering contract card', {
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
                <Link 
                  key={contract.path} 
                  href={`/contracts/${encodeURIComponent(contract.name)}`}
                  className="block"
                >
                  <Card className="bg-card border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
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
                              {contract.huurprijs != null && contract.huurprijs !== '' ? (
                                <span className="flex items-center gap-1">
                                  <Euro className="h-3 w-3" />
                                  €{(() => {
                                    const v = contract.huurprijs
                                    const n = typeof v === 'number' ? v : Number(v)
                                    return Number.isFinite(n) ? n.toFixed(2) : String(v ?? '')
                                  })()}/maand
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

                        {/* View indicator - card is now fully clickable */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                          <Eye className="h-4 w-4" />
                          <span>Bekijken</span>
                          <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
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
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
