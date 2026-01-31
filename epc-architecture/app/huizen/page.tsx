'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, Building2, FileText, Zap, Shield, MapPin, Droplets, Fuel, ArrowLeft, CheckCircle2, Search, AlertCircle, Clock, User, Euro, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContractFile, ContractsResponse } from '@/lib/types'
import { logger } from '@/lib/logger'
import { useSidebar } from '@/components/sidebar-context'
import { ContractDetailView } from '@/components/contract-detail-view'

const STORAGE_KEY = 'huizen-panel-widths'
const DEFAULTS = { level1Left: 50, left: 20, right: 10 }
const MIN_PANEL = 12
const MAX_LEFT = 50
const MAX_RIGHT = 35

type SortOption = 'label-asc' | 'label-desc' | 'key-asc' | 'key-desc' | 'contracts-desc' | 'contracts-asc'
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'label-asc', label: 'Label A → Z' },
  { value: 'label-desc', label: 'Label Z → A' },
  { value: 'key-asc', label: 'Sleutel A → Z' },
  { value: 'key-desc', label: 'Sleutel Z → A' },
  { value: 'contracts-desc', label: 'Meeste contracten eerst' },
  { value: 'contracts-asc', label: 'Minste contracten eerst' },
]

type StatusFilter = 'all' | 'pushed' | 'needs_review' | 'error' | 'pending' | 'manually_edited'
const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Alle huizen' },
  { value: 'needs_review', label: 'Heeft review nodig' },
  { value: 'error', label: 'Heeft errors' },
  { value: 'pushed', label: 'Alles gepusht' },
  { value: 'pending', label: 'Heeft pending' },
  { value: 'manually_edited', label: 'Manueel bewerkt' },
]

// 10 categorieën per huis
const CATEGORIES = [
  { id: 'huurcontracten', label: 'Huurcontracten', icon: FileText },
  { id: 'eigendomstitel', label: 'Eigendomstitel', icon: FileText },
  { id: 'epc', label: 'Energieprestatiecertificaat', icon: Zap },
  { id: 'elektrische', label: 'Elektrische', icon: Zap },
  { id: 'bodemattest', label: 'Bodemattest', icon: FileText },
  { id: 'asbestattest', label: 'Asbestattest', icon: Shield },
  { id: 'stedenbouwkundig', label: 'Stedenbouwkundig', icon: MapPin },
  { id: 'kadastraal', label: 'Kadastraal', icon: MapPin },
  { id: 'post-interventiedossier', label: 'Post-interventiedossier', icon: FileText },
  { id: 'watertoets', label: 'Watertoets', icon: Droplets },
  { id: 'stookolietankattest', label: 'Stookolietankattest', icon: Fuel },
] as const

type CategoryId = typeof CATEGORIES[number]['id']

// Korte labels alleen in de linkerlijst bij niveau 3
function getCategoryLabelLeft(cat: (typeof CATEGORIES)[number]): string {
  if (cat.id === 'epc') return 'Energieprestatie'
  if (cat.id === 'post-interventiedossier') return 'Post-interventie'
  return cat.label
}

// Groepeer contracten per huis (property). Nu: alle contracten zijn huurcontracten, key = pand_adres of filename.
function groupContractsByHuis(contracts: ContractFile[]): Map<string, ContractFile[]> {
  const map = new Map<string, ContractFile[]>()
  for (const c of contracts) {
    const key = (c.pand_adres && c.pand_adres.trim()) || c.name.replace(/^data_/, '').replace(/_\d{8}_\d{6}\.json$/i, '') || c.name
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(c)
  }
  return map
}

// Voor nu: alleen huurcontracten hebben data; document_type niet in API, dus alles = huurcontracten
function getContractsForCategory(contracts: ContractFile[], _categoryId: CategoryId): ContractFile[] {
  // Later: filter op document_type. Nu alle contracten zijn huurcontracten.
  if (_categoryId === 'huurcontracten') return contracts
  return []
}

// Aantal categorieën met minstens één document voor dit huis
function countCategoriesFulfilled(contracts: ContractFile[]): number {
  return CATEGORIES.filter((cat) => getContractsForCategory(contracts, cat.id).length > 0).length
}

type ContractStatus = 'pushed' | 'needs_review' | 'error' | 'pending' | 'manually_edited'
function getContractStatus(c: ContractFile): ContractStatus {
  if ((c as any).edited?.timestamp || (c as any).manually_edited) return 'manually_edited'
  if (!c.confidence) return 'pending'
  if (c.confidence >= 95) return 'pushed'
  if (c.confidence >= 60) return 'needs_review'
  return 'error'
}

// Slechtste status van een huis (voor kleur). Gepusht (auto/manueel) telt als opgelost → groen.
function getHouseStatus(contracts: ContractFile[], pushedToWhiseDocNames?: Set<string>): ContractStatus {
  const effectiveStatus = (c: ContractFile): ContractStatus =>
    pushedToWhiseDocNames?.has(c.name) ? 'pushed' : getContractStatus(c)
  const statuses = contracts.map(effectiveStatus)
  if (statuses.some((s) => s === 'error')) return 'error'
  if (statuses.some((s) => s === 'needs_review')) return 'needs_review'
  if (statuses.some((s) => s === 'pending')) return 'pending'
  if (statuses.some((s) => s === 'manually_edited')) return 'manually_edited'
  return 'pushed'
}

// Bepaalt de 'werkelijke' status van een contract, rekening houdend met manuele/auto pushes
function getEffectiveContractStatus(contract: ContractFile, pushedToWhiseDocNames: Set<string>): ContractStatus {
  if (pushedToWhiseDocNames.has(contract.name)) {
    return 'pushed';
  }
  return getContractStatus(contract);
}

function houseMatchesStatusFilter(contracts: ContractFile[], filter: StatusFilter, pushedToWhiseDocNames: Set<string>): boolean {
  if (filter === 'all') return true
  const effective = (c: ContractFile) => getEffectiveContractStatus(c, pushedToWhiseDocNames)
  // "Alles gepusht" = alle contracten effectief gepusht (na manuele push telt mee)
  if (filter === 'pushed') return contracts.length > 0 && contracts.every((c) => effective(c) === 'pushed')
  // Overige filters op effectieve status: na push niet meer als error/review
  return contracts.some((c) => effective(c) === filter)
}

export default function HuizenPage() {
  const [contracts, setContracts] = useState<ContractFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedHuisKey, setSelectedHuisKey] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<CategoryId | null>(null)
  const [editingDocName, setEditingDocName] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('label-asc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [pushedToWhiseDocNames, setPushedToWhiseDocNames] = useState<Set<string>>(() => new Set())
  const [level2HuizenCollapsed, setLevel2HuizenCollapsed] = useState(false)
  const sidebar = useSidebar()

  const contentRef = useRef<HTMLDivElement>(null)
  const refPrevLevel = useRef<1 | 2 | 3>(1)
  const [panelWidths, setPanelWidths] = useState(() => {
    if (typeof window === 'undefined') return DEFAULTS
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      if (!s) return DEFAULTS
      const parsed = JSON.parse(s) as { level1Left?: number; left?: number; right?: number }
      return {
        level1Left: Math.min(MAX_LEFT, Math.max(MIN_PANEL, parsed.level1Left ?? DEFAULTS.level1Left)),
        left: Math.min(MAX_LEFT, Math.max(MIN_PANEL, parsed.left ?? DEFAULTS.left)),
        right: Math.min(MAX_RIGHT, Math.max(5, parsed.right ?? DEFAULTS.right)),
      }
    } catch {
      return DEFAULTS
    }
  })
  const [resizing, setResizing] = useState<'level1' | 'left' | 'right' | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, left: 0, right: 0 })

  const saveWidths = useCallback((w: typeof panelWidths) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(w)) } catch {}
  }, [])

  useEffect(() => {
    if (!resizing || !contentRef.current) return
    const el = contentRef.current
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.x) / el.offsetWidth * 100
      if (resizing === 'level1') {
        const next = Math.min(MAX_LEFT, Math.max(MIN_PANEL, resizeStart.left + dx))
        setPanelWidths((p) => {
          const nextP = { ...p, level1Left: next }
          saveWidths(nextP)
          return nextP
        })
      } else if (resizing === 'left') {
        const next = Math.min(MAX_LEFT, Math.max(MIN_PANEL, resizeStart.left + dx))
        setPanelWidths((p) => {
          const nextP = { ...p, left: next }
          saveWidths(nextP)
          return nextP
        })
      } else if (resizing === 'right') {
        const next = Math.min(MAX_RIGHT, Math.max(5, resizeStart.right - dx))
        setPanelWidths((p) => {
          const nextP = { ...p, right: next }
          saveWidths(nextP)
          return nextP
        })
      }
    }
    const onUp = () => setResizing(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizing, resizeStart, saveWidths])

  const startResize = (which: 'level1' | 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault()
    setResizeStart({
      x: e.clientX,
      left: which === 'level1' ? panelWidths.level1Left : panelWidths.left,
      right: panelWidths.right,
    })
    setResizing(which)
  }

  const level = selectedCategoryId ? 3 : selectedHuisKey ? 2 : 1
  const prevLevelForAnimation = refPrevLevel.current
  useEffect(() => {
    refPrevLevel.current = level
  }, [level])
  // Auto-inklappen sidebar wanneer je naar niveau 2 of 3 gaat (huis/categorie geselecteerd)
  useEffect(() => {
    if (level >= 2 && sidebar?.setCollapsed) sidebar.setCollapsed(true)
  }, [level, sidebar?.setCollapsed])

  useEffect(() => {
    if (!resizing) return
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [resizing])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/contracts')
      if (!response.ok) throw new Error('Failed to fetch contracts')
      const data: ContractsResponse = await response.json()
      setContracts(data.contracts || [])
      // Auto-push ready contracts naar Whise; update UI met gepushte bestanden zodat niv2/3 direct updaten
      fetch('/api/huizen/auto-push-complete', { method: 'POST' })
        .then((r) => r.json())
        .then((data) => {
          if (data?.pushedFiles?.length) {
            setPushedToWhiseDocNames((prev) => new Set([...prev, ...data.pushedFiles]));
          }
        })
        .catch(() => {})
    } catch (err: unknown) {
      logger.error('Error fetching contracts', err)
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchContracts() }, [])

  // Klik op "Huizen" in de linkerbalk (sidebar) terwijl je op /huizen bent → terug naar niveau 1
  useEffect(() => {
    const goToLevel1 = () => {
      setSelectedHuisKey(null)
      setSelectedCategoryId(null)
      setEditingDocName(null)
    }
    window.addEventListener('huizen-reset-level1', goToLevel1)
    return () => window.removeEventListener('huizen-reset-level1', goToLevel1)
  }, [])

  // Auto-refresh elke 30 seconden (zoals op contracts page)
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null
    if (!loading && !error) {
      intervalId = setInterval(() => {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          fetchContracts()
        }
      }, 30000)
    }
    return () => { if (intervalId) clearInterval(intervalId) }
  }, [loading, error])

  const huisMap = useMemo(() => groupContractsByHuis(contracts), [contracts])
  const huizenList = useMemo(() => Array.from(huisMap.entries()).map(([key, list]) => ({ key, label: list[0]?.pand_adres || key, contracts: list })), [huisMap])

  const filteredAndSortedHuizen = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = huizenList.filter((h) => houseMatchesStatusFilter(h.contracts, statusFilter, pushedToWhiseDocNames))
    if (q) list = list.filter((h) =>
      h.label.toLowerCase().includes(q) ||
      h.key.toLowerCase().includes(q) ||
      h.contracts.some((c) => c.verhuurder_naam?.toLowerCase().includes(q))
    )
    const cmp = sortBy
    if (cmp === 'label-asc') list.sort((a, b) => a.label.localeCompare(b.label))
    else if (cmp === 'label-desc') list.sort((a, b) => b.label.localeCompare(a.label))
    else if (cmp === 'key-asc') list.sort((a, b) => a.key.localeCompare(b.key))
    else if (cmp === 'key-desc') list.sort((a, b) => b.key.localeCompare(a.key))
    else if (cmp === 'contracts-desc') list.sort((a, b) => b.contracts.length - a.contracts.length)
    else if (cmp === 'contracts-asc') list.sort((a, b) => a.contracts.length - b.contracts.length)
    return list
  }, [huizenList, searchQuery, sortBy, statusFilter, pushedToWhiseDocNames])

  const selectedHuis = selectedHuisKey ? huizenList.find(h => h.key === selectedHuisKey) : null
  const categoryContracts = selectedHuis && selectedCategoryId
    ? getContractsForCategory(selectedHuis.contracts, selectedCategoryId)
    : []

  // Stats op effectieve status: na manuele push telt een huis niet meer als error/review
  const stats = useMemo(() => {
    const total = huizenList.length
    let pushed = 0, needs_review = 0, manually_edited = 0, error = 0, pending = 0
    huizenList.forEach((h) => {
      const effective = (c: ContractFile) => getEffectiveContractStatus(c, pushedToWhiseDocNames)
      if (h.contracts.length > 0 && h.contracts.every((c) => effective(c) === 'pushed')) pushed++
      if (h.contracts.some((c) => effective(c) === 'manually_edited')) manually_edited++
      if (h.contracts.some((c) => effective(c) === 'needs_review')) needs_review++
      if (h.contracts.some((c) => effective(c) === 'error')) error++
      if (h.contracts.some((c) => effective(c) === 'pending')) pending++
    })
    return { total, pushed, needs_review, manually_edited, error, pending }
  }, [huizenList, pushedToWhiseDocNames])

  if (error) {
    return (
      <div className="flex flex-col h-full p-6">
        <div className="text-destructive font-medium">{error}</div>
        <Button className="mt-4" onClick={fetchContracts}>Opnieuw proberen</Button>
      </div>
    )
  }

  return (
    <div className="block md:flex md:flex-col md:min-h-full md:h-full md:min-h-0">
      {/* Boven: stats alleen op niveau 1 en 2 — op niveau 3 verborgen voor meer ruimte aan velden */}
      {level !== 3 && (
        <div className="border-b border-border bg-card/50 px-3 py-1.5 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
                <Building2 className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground leading-tight">Huizen</h1>
                <p className="text-sm text-muted-foreground leading-tight">Overzicht per pand en documentcategorie</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={fetchContracts} disabled={loading} className="h-7 text-sm px-2">
              <RefreshCw className={cn('h-4 w-4 mr-1.5', loading && 'animate-spin')} />
              Vernieuwen
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-1.5">
            <Card
              className={cn('bg-card border-border shrink-0 w-[10rem] cursor-pointer transition-colors hover:bg-muted/50', statusFilter === 'all' && 'ring-2 ring-primary')}
              onClick={() => setStatusFilter('all')}
            >
              <CardContent className="px-2 py-1.5"><div className="text-xl font-bold text-foreground leading-tight">{stats.total}</div><div className="text-sm text-muted-foreground leading-tight">Totaal</div></CardContent>
            </Card>
            <Card
              className={cn('bg-card border-border shrink-0 w-[10rem] cursor-pointer transition-colors hover:bg-muted/50', statusFilter === 'pushed' && 'ring-2 ring-green-600')}
              onClick={() => setStatusFilter('pushed')}
            >
              <CardContent className="px-2 py-1.5"><div className="text-xl font-bold text-green-600 leading-tight">{stats.pushed}</div><div className="text-sm text-muted-foreground leading-tight">Compleet</div></CardContent>
            </Card>
            <Card
              className={cn('bg-card border-border shrink-0 w-[10rem] cursor-pointer transition-colors hover:bg-muted/50', statusFilter === 'needs_review' && 'ring-2 ring-yellow-600')}
              onClick={() => setStatusFilter('needs_review')}
            >
              <CardContent className="px-2 py-1.5"><div className="text-xl font-bold text-yellow-600 leading-tight">{stats.needs_review}</div><div className="text-sm text-muted-foreground leading-tight">Review</div></CardContent>
            </Card>
            <Card
              className={cn('bg-card border-border shrink-0 w-[10rem] cursor-pointer transition-colors hover:bg-muted/50', statusFilter === 'pending' && 'ring-2 ring-status-pending')}
              onClick={() => setStatusFilter('pending')}
            >
              <CardContent className="px-2 py-1.5"><div className="text-xl font-bold text-status-pending leading-tight">{stats.pending}</div><div className="text-sm text-muted-foreground leading-tight">Pending</div></CardContent>
            </Card>
            <Card
              className={cn('bg-card border-border shrink-0 w-[10rem] cursor-pointer transition-colors hover:bg-muted/50', statusFilter === 'error' && 'ring-2 ring-red-600')}
              onClick={() => setStatusFilter('error')}
            >
              <CardContent className="px-2 py-1.5"><div className="text-xl font-bold text-red-600 leading-tight">{stats.error}</div><div className="text-sm text-muted-foreground leading-tight">Errors</div></CardContent>
            </Card>
            <Card
              className={cn('bg-card border-border shrink-0 w-[10rem] cursor-pointer transition-colors hover:bg-muted/50', statusFilter === 'manually_edited' && 'ring-2 ring-blue-500')}
              onClick={() => setStatusFilter('manually_edited')}
            >
              <CardContent className="px-2 py-1.5"><div className="text-xl font-bold text-blue-500 leading-tight">{stats.manually_edited}</div><div className="text-sm text-muted-foreground leading-tight">Manueel</div></CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Content: op mobiel block-flow (geen flex, lijst kan niet inkrimpen); op desktop flex */}
      <div
        ref={contentRef}
        className="block md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden md:overflow-x-hidden"
      >
        {(level === 1 || level === 2) && (
          <>
            {/* Niveau 2 ingeklapt: alleen smalle strip met knop om uit te klappen */}
            {level === 2 && level2HuizenCollapsed && (
              <div className="flex flex-col shrink-0 min-h-0 w-10 border-r border-border bg-muted/30 items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setLevel2HuizenCollapsed(false)}
                  title="Huizenlijst tonen"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              </div>
            )}
            {(level === 1 || (level === 2 && !level2HuizenCollapsed)) && (
            <div
              className={cn(
                'block md:flex md:flex-col min-h-0 transition-[width] duration-300 ease-out',
                level === 1 ? 'border-0 min-w-0 w-full md:flex-1' : 'shrink-0 border-r border-border min-w-[120px]'
              )}
              style={level === 1 ? undefined : { width: `${panelWidths.left}%` }}
            >
              {/* Header: niv1 = titel + uitleg, niv2 = terug + Huizen + (in/uitklappen) + Filters wissen */}
              <div className={cn('shrink-0 border-b border-border', level === 1 ? 'px-6 pt-4 pb-2' : '')}>
                <div className={cn('flex items-center gap-2', level === 1 ? 'flex-wrap' : 'h-10 px-3')}>
                  {level === 2 && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedHuisKey(null)} title="Terug naar lijst"><ArrowLeft className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setLevel2HuizenCollapsed(true)} title="Huizenlijst inklappen"><PanelLeftClose className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                  {level === 1 ? (
                    <>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold text-foreground">Lijst huizen</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Overzicht per pand. Klik op een huis om de 10 documentcategorieën te bekijken en documenten te openen. Gebruik de filters om te zoeken of te sorteren.
                        </p>
                      </div>
                      {(searchQuery.trim() || sortBy !== 'label-asc' || statusFilter !== 'all') && (
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => { setSearchQuery(''); setSortBy('label-asc'); setStatusFilter('all') }}>
                          Filters wissen
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-medium text-muted-foreground">Huizen</span>
                      {(searchQuery.trim() || sortBy !== 'label-asc' || statusFilter !== 'all') && (
                        <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => { setSearchQuery(''); setSortBy('label-asc'); setStatusFilter('all') }}>
                          Filters wissen
                        </Button>
                      )}
                    </>
                  )}
                </div>
                {/* Filters: niv1 naast elkaar, niv2 onder elkaar */}
                <div className={cn('flex gap-2', level === 1 ? 'flex-row flex-wrap mt-4' : 'flex-col px-2 pb-2 mt-0')}>
                  <div className={cn('relative', level === 1 ? 'flex-1 min-w-[200px] max-w-md' : 'w-full')}>
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Zoeken op adres, sleutel of naam client..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn('pl-8 h-8 w-full', level === 1 ? 'bg-secondary border-border' : 'text-sm')}
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger size="sm" className={cn('h-8', level === 1 ? 'w-[180px] bg-secondary border-border' : 'w-full text-xs')}>
                      <SelectValue placeholder="Sorteren" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger size="sm" className={cn('h-8', level === 1 ? 'w-[180px] bg-secondary border-border' : 'w-full text-xs')}>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FILTER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Resultaat teller alleen op niv1 */}
              {level === 1 && !loading && (
                <div className="px-6 py-2 border-b border-border">
                  <p className="text-sm text-muted-foreground">
                    {filteredAndSortedHuizen.length} van {huizenList.length} huizen
                    {(searchQuery.trim() || statusFilter !== 'all') && ' (gefilterd)'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 md:hidden">Scroll naar beneden voor de lijst met panden.</p>
                </div>
              )}
              {/* Op mobiel: block met min-h, geen flex (lijst altijd zichtbaar); op desktop: scroll-container */}
              <div
                className="block min-h-[60vh] md:min-h-0 md:flex-1 md:overflow-y-auto md:overflow-x-hidden md:overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
              >
                <div className={cn('space-y-1', level === 1 ? 'p-6' : 'p-2')}>
                  {loading ? (
                    <div className="p-4 text-muted-foreground text-sm">Laden...</div>
                  ) : filteredAndSortedHuizen.length === 0 ? (
                    <div className="p-4 text-muted-foreground text-sm">
                      {searchQuery.trim() || statusFilter !== 'all' ? 'Geen huizen voor deze zoek- of filtercriteria.' : 'Geen huizen.'}
                    </div>
                  ) : level === 1 ? (
                    <div className="grid gap-4">
                      {filteredAndSortedHuizen.map(({ key, label, contracts: houseContracts }) => {
                        const houseStatus = getHouseStatus(houseContracts, pushedToWhiseDocNames)
                        const pushedCount = houseContracts.filter(c => getContractStatus(c) === 'pushed' || pushedToWhiseDocNames.has(c.name)).length
                        const avgConf = houseContracts.length ? Math.round(houseContracts.reduce((a, c) => a + (c.confidence ?? 0), 0) / houseContracts.length) : 0
                        const catsFulfilled = countCategoriesFulfilled(houseContracts)
                        const statusBadgeClass = {
                          error: 'border-status-error/50 bg-status-error/10 text-status-error',
                          needs_review: 'border-status-warning/50 bg-status-warning/10 text-status-warning',
                          pending: 'border-status-pending/50 bg-status-pending/10 text-status-pending',
                          manually_edited: 'border-blue-500/50 bg-blue-500/10 text-blue-600',
                          pushed: 'border-status-success/50 bg-status-success/10 text-status-success',
                        }
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedHuisKey(key)}
                            className="w-full text-left"
                          >
                            <Card className="bg-card border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group h-full">
                              <CardContent className="p-5">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-3">
                                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <Building2 className="h-5 w-5 text-primary" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h3 className="font-semibold text-foreground truncate">{label}</h3>
                                          <Badge variant="outline" className={cn('text-xs', statusBadgeClass[houseStatus])}>
                                            {houseStatus === 'pushed' ? 'Compleet' : houseStatus === 'needs_review' ? 'Review' : houseStatus === 'manually_edited' ? 'Manueel' : houseStatus === 'error' ? 'Errors' : 'Pending'}
                                          </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground truncate mt-0.5">{key}</div>
                                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                                          {houseContracts[0]?.pand_type ? (
                                            <span>{houseContracts[0].pand_type}</span>
                                          ) : (
                                            <span className="text-muted-foreground/50">Type: —</span>
                                          )}
                                          {houseContracts[0]?.verhuurder_naam ? (
                                            <span className="flex items-center gap-1">
                                              <User className="h-3 w-3" />
                                              {houseContracts[0].verhuurder_naam}
                                            </span>
                                          ) : (
                                            <span className="flex items-center gap-1 text-muted-foreground/50">
                                              <User className="h-3 w-3" />
                                              Naam: —
                                            </span>
                                          )}
                                          {houseContracts[0]?.huurprijs != null && houseContracts[0].huurprijs !== '' ? (
                                            <span className="flex items-center gap-1">
                                              <Euro className="h-3 w-3" />
                                              {(() => {
                                                const v = houseContracts[0].huurprijs
                                                const n = typeof v === 'number' ? v : Number(v)
                                                return Number.isFinite(n) ? n.toFixed(2) : String(v ?? '')
                                              })()}/maand
                                            </span>
                                          ) : (
                                            <span className="flex items-center gap-1 text-muted-foreground/50">
                                              <Euro className="h-3 w-3" />
                                              Huur: —
                                            </span>
                                          )}
                                          <span>{houseContracts.length} contracten</span>
                                          <span className="flex items-center gap-1" title="Categorieën met minstens één document">
                                            {catsFulfilled}/{CATEGORIES.length} categorieën voldaan
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3 text-status-success" />
                                            {pushedCount} naar Whise
                                          </span>
                                          {houseContracts.length > 0 && (
                                            <span className="flex items-center gap-1">
                                              {avgConf >= 95 ? <CheckCircle2 className="h-3 w-3 text-primary" /> : avgConf >= 60 ? <AlertCircle className="h-3 w-3 text-status-warning" /> : <Clock className="h-3 w-3 text-status-pending" />}
                                              Gem. {avgConf}%
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 lg:gap-6">
                                    <div className="w-32 space-y-1">
                                      <Progress value={avgConf} className="h-2" />
                                      <p className="text-xs text-muted-foreground text-right">{avgConf}%</p>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredAndSortedHuizen.map(({ key, label, contracts: houseContracts }) => {
                        const houseStatus = getHouseStatus(houseContracts, pushedToWhiseDocNames)
                        const catsFulfilled = countCategoriesFulfilled(houseContracts)
                        const statusStyles = {
                          error: 'border-l-4 border-l-status-error bg-status-error/5 hover:bg-status-error/10',
                          needs_review: 'border-l-4 border-l-status-warning bg-status-warning/5 hover:bg-status-warning/10',
                          pending: 'border-l-4 border-l-status-pending bg-status-pending/5 hover:bg-status-pending/10',
                          manually_edited: 'border-l-4 border-l-blue-500 bg-blue-500/5 hover:bg-blue-500/10',
                          pushed: 'border-l-4 border-l-status-success bg-status-success/5 hover:bg-status-success/10',
                        }
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedHuisKey(key)}
                            className={cn(
                              'w-full text-left rounded-lg border border-border transition-colors px-3 py-2 text-sm',
                              statusStyles[houseStatus],
                              key === selectedHuisKey && 'ring-2 ring-primary/50 font-medium'
                            )}
                          >
                            <span className="truncate block">{label}</span>
                            <span className="text-xs text-muted-foreground block mt-0.5">{catsFulfilled}/{CATEGORIES.length} categorieën voldaan</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
            {level === 2 && !level2HuizenCollapsed && (
              <div
                role="separator"
                aria-label="Resize linker paneel"
                className={cn('w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/30 transition-colors', (resizing === 'level1' || resizing === 'left') && 'bg-primary/50')}
                onMouseDown={startResize('left')}
              />
            )}
            {level === 1 ? null : selectedHuis ? (
              <div className={cn('flex flex-1 min-w-0 min-h-0', prevLevelForAnimation === 3 ? 'huizen-level-back' : 'huizen-level-in')}>
                <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-border">
                  <div className="h-10 px-4 flex items-center shrink-0 border-b border-border font-medium text-foreground">Categorieën — {selectedHuis.label}</div>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-4 grid gap-3">
                      {CATEGORIES.map((cat) => {
                        const docs = getContractsForCategory(selectedHuis.contracts, cat.id)
                        const count = docs.length
                        const avgConf = count ? docs.reduce((a, d) => a + (d.confidence ?? 0), 0) / count : 0
                        const pushedCount = count ? docs.filter(d => getContractStatus(d) === 'pushed' || pushedToWhiseDocNames.has(d.name)).length : 0
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => { setSelectedCategoryId(cat.id); setEditingDocName(null) }}
                            className="flex items-center gap-4 w-full text-left p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <cat.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground">{cat.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {count > 0 ? `${count} doc. · gem. confidence ${Math.round(avgConf)}% · ${pushedCount} naar Whise` : 'Geen documenten'}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
                <div
                  role="separator"
                  aria-label="Resize rechter paneel"
                  className={cn('w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/30 transition-colors', resizing === 'right' && 'bg-primary/50')}
                  onMouseDown={startResize('right')}
                />
                <div className="p-3 border-border bg-muted/20 shrink-0 min-w-[100px]" style={{ width: `${panelWidths.right}%` }}>
                  <div className="text-sm font-medium text-foreground mb-2">Overzicht pand</div>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div>
                      <div className="text-foreground font-medium">Categorieën</div>
                      <div className="text-base font-semibold tabular-nums">{CATEGORIES.filter(c => getContractsForCategory(selectedHuis.contracts, c.id).length > 0).length} / 10</div>
                    </div>
                    <div>
                      <div className="text-foreground font-medium">Whise</div>
                      <div className="text-base font-semibold tabular-nums">{selectedHuis.contracts.filter(c => getContractStatus(c) === 'pushed' || pushedToWhiseDocNames.has(c.name)).length}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}

        {/* ——— Niveau 3: categorieën | documenten + detail — terug naar niveau 1 via sidebar "Huizen" ——— */}
        {level === 3 && selectedHuis && selectedCategoryId && (
          <div className="huizen-level3-in flex flex-1 min-w-0 min-h-0">
            <div className="flex flex-col shrink-0 min-h-0 border-r border-border min-w-[100px]" style={{ width: `${panelWidths.left * 0.5}%` }}>
              <div className="h-10 px-3 flex items-center gap-2 shrink-0 border-b border-border">
                <Button variant="ghost" size="sm" onClick={() => setSelectedCategoryId(null)}><ArrowLeft className="h-4 w-4" /></Button>
                <span className="text-xs font-medium text-muted-foreground">Categorieën</span>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setSelectedCategoryId(cat.id); setEditingDocName(null) }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                        cat.id === selectedCategoryId ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-accent text-foreground'
                      )}
                    >
                      <span className="truncate block">{getCategoryLabelLeft(cat)}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div
              role="separator"
              aria-label="Resize linker paneel"
              className={cn('w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/30 transition-colors', resizing === 'left' && 'bg-primary/50')}
              onMouseDown={startResize('left')}
            />
            <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-border overflow-hidden">
              <div className="h-10 px-4 flex items-center shrink-0 border-b border-border font-medium text-foreground">
                {editingDocName ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditingDocName(null)}><ArrowLeft className="h-4 w-4 mr-1" /> Terug naar lijst</Button>
                ) : (
                  <>
                    {CATEGORIES.find(c => c.id === selectedCategoryId)?.label} — {selectedHuis.label}
                  </>
                )}
              </div>
              {editingDocName ? (
                <div className="flex-1 min-h-0 overflow-auto">
                  <ContractDetailView
                    filename={editingDocName}
                    onBack={() => setEditingDocName(null)}
                    embedded
                    onPushedToWhise={(name) => setPushedToWhiseDocNames((prev) => new Set(prev).add(name))}
                    onContractUpdated={(name) => {
                      setContracts((prev) => prev.map((c) => c.name === name ? { ...c, manually_edited: true, edited: { timestamp: new Date().toISOString(), edited_by: 'user' } } : c))
                    }}
                  />
                </div>
              ) : (
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-4">
                    {categoryContracts.length === 0 ? (
                      <p className="text-muted-foreground">Geen documenten in deze categorie.</p>
                    ) : (
                      <div className="space-y-2">
                        {categoryContracts.map((doc) => {
                          const effectiveStatus = getEffectiveContractStatus(doc, pushedToWhiseDocNames)
                          const isManual = (doc as any).edited?.timestamp || (doc as any).manually_edited
                          const isPushedToWhise = effectiveStatus === 'pushed'
                          return (
                            <Card
                              key={doc.name}
                              className={cn(
                                'border-border cursor-pointer transition-colors hover:bg-accent/50 hover:border-primary/30',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                              )}
                              onClick={() => setEditingDocName(doc.name)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingDocName(doc.name)}
                            >
                              <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-foreground truncate">{doc.pand_adres || doc.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{doc.name}</div>
                                  {isPushedToWhise && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Reeds {(doc as any)?.whise_push_manual === true ? 'handmatig' : 'automatisch'} naar Whise gepusht
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 shrink-0 text-right">
                                  <span className="text-sm font-medium tabular-nums">{doc.confidence ?? '—'}%</span>
                                  {isManual && (
                                    <span className="text-blue-600 text-xs font-medium">Manueel</span>
                                  )}
                                  {isPushedToWhise ? (
                                    <span className="text-status-success flex items-center gap-1 text-xs font-medium" title="Gepusht naar Whise">
                                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                                      Whise
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">Niet gepusht</span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
