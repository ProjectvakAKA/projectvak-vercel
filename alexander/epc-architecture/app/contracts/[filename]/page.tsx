'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatusBadge, type DocumentStatus } from '@/components/status-badge'
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Building2,
  Zap,
  Clock,
  Info,
  User,
  Euro,
  Calendar,
  Shield,
  Quote,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContractData {
  filename: string
  document_type: string
  processed: string
  confidence?: {
    score: number
    needs_review: boolean
    details?: string
  }
  contract_data?: {
    contract_type?: string
    datum_contract?: string
    partijen?: {
      verhuurder?: {
        naam?: string
        adres?: string
        telefoon?: string
        email?: string
      }
      huurder?: {
        naam?: string
        adres?: string
        telefoon?: string
        email?: string
      }
    }
    pand?: {
      adres?: string
      type?: string
      oppervlakte?: number
      aantal_kamers?: number
      verdieping?: string
      epc?: {
        energielabel?: string
        certificaatnummer?: string
      }
      kadaster?: {
        afdeling?: string
        sectie?: string
        nummer?: string
        kadastraal_inkomen?: number
      }
    }
    financieel?: {
      huurprijs?: number
      waarborg?: {
        bedrag?: number
        waar_gedeponeerd?: string
      }
      kosten?: string
      indexatie?: boolean
    }
    periodes?: {
      ingangsdatum?: string
      einddatum?: string
      duur?: string
      opzegtermijn_huurder?: string
      opzegtermijn_verhuurder?: string
    }
    voorwaarden?: {
      huisdieren?: boolean
      onderverhuur?: boolean
      werken?: string
    }
    juridisch?: {
      toepasselijk_recht?: string
      bevoegde_rechtbank?: string
    }
  }
  summary?: string
}

type SectionKey = 'partijen' | 'pand' | 'financieel' | 'periodes' | 'voorwaarden' | 'juridisch'

const sectionLabels: Record<SectionKey, Record<string, string>> = {
  partijen: {
    verhuurder_naam: 'Verhuurder Naam',
    verhuurder_adres: 'Verhuurder Adres',
    verhuurder_telefoon: 'Verhuurder Telefoon',
    verhuurder_email: 'Verhuurder E-mail',
    huurder_naam: 'Huurder Naam',
    huurder_adres: 'Huurder Adres',
    huurder_telefoon: 'Huurder Telefoon',
    huurder_email: 'Huurder E-mail',
  },
  pand: {
    adres: 'Adres',
    type: 'Type',
    oppervlakte: 'Oppervlakte (m²)',
    aantal_kamers: 'Aantal Kamers',
    verdieping: 'Verdieping',
    energielabel: 'EPC Energielabel',
    certificaatnummer: 'EPC Certificaatnummer',
    kadaster_afdeling: 'Kadaster Afdeling',
    kadaster_sectie: 'Kadaster Sectie',
    kadaster_nummer: 'Kadaster Nummer',
    kadastraal_inkomen: 'Kadastraal Inkomen (EUR)',
  },
  financieel: {
    huurprijs: 'Huurprijs (EUR/maand)',
    waarborg_bedrag: 'Waarborg (EUR)',
    waarborg_waar_gedeponeerd: 'Waarborg Gedeponeerd Bij',
    kosten: 'Kosten en Lasten',
    indexatie: 'Indexatie',
  },
  periodes: {
    ingangsdatum: 'Ingangsdatum',
    einddatum: 'Einddatum',
    duur: 'Duur',
    opzegtermijn_huurder: 'Opzegtermijn Huurder',
    opzegtermijn_verhuurder: 'Opzegtermijn Verhuurder',
  },
  voorwaarden: {
    huisdieren: 'Huisdieren',
    onderverhuur: 'Onderverhuur',
    werken: 'Bijzondere Voorwaarden en Werken',
  },
  juridisch: {
    toepasselijk_recht: 'Toepasselijk Recht',
    bevoegde_rechtbank: 'Bevoegde Rechtbank',
  },
}

function getContractStatus(contract: ContractData): DocumentStatus {
  if (!contract.confidence) return 'pending'
  if (contract.confidence.score >= 95) return 'pushed'
  if (contract.confidence.score >= 80) return 'parsed'
  if (contract.confidence.score >= 60) return 'needs_review'
  return 'error'
}

function getFieldValue(section: SectionKey, key: string, contractData: any): any {
  const data = contractData[section] || {}
  
  if (key.includes('_')) {
    const [parent, child] = key.split('_', 2)
    if (section === 'partijen') {
      const partij = data[parent] || {}
      return partij[child] || null
    } else if (section === 'financieel' && parent === 'waarborg') {
      return data.waarborg?.[child] || null
    } else if (section === 'pand' && parent === 'kadaster') {
      return data.kadaster?.[child] || null
    } else if (section === 'pand' && parent === 'epc') {
      return data.epc?.[child] || null
    } else if (section === 'periodes' && parent === 'opzegtermijn') {
      return data[`opzegtermijn_${child}`] || null
    }
  }
  
  return data[key] || null
}

function formatFieldValue(value: any): string {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nee'
  if (typeof value === 'number') {
    if (value % 1 === 0) return value.toString()
    return value.toFixed(2)
  }
  return String(value)
}

export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<SectionKey>('partijen')
  const [selectedField, setSelectedField] = useState<string | null>(null)

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true)
        setError(null)

        const filenameParam = params?.filename
        if (!filenameParam) {
          setError('Bestandsnaam ontbreekt in de URL')
          setLoading(false)
          return
        }

        const filename = typeof filenameParam === 'string'
          ? decodeURIComponent(filenameParam)
          : decodeURIComponent(String(filenameParam))

        if (!filename || filename === 'undefined') {
          throw new Error('Ongeldige bestandsnaam')
        }

        const response = await fetch(`/api/contracts/${encodeURIComponent(filename)}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        setContract(data)
      } catch (err: any) {
        console.error('Error loading contract:', err)
        setError(err.message || 'Failed to load contract')
      } finally {
        setLoading(false)
      }
    }

    if (params && params.filename) {
      fetchContract()
    } else {
      setLoading(false)
      setError('URL parameter ontbreekt')
    }
  }, [params])

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading contract...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !contract) {
    const filenameParam = params?.filename
    const displayFilename = filenameParam
      ? typeof filenameParam === 'string'
        ? decodeURIComponent(filenameParam)
        : decodeURIComponent(String(filenameParam))
      : null

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 mb-4">
              <h2 className="text-xl font-bold text-destructive mb-2">Error Loading Contract</h2>
              <p className="text-destructive mb-2">{error || 'Contract not found'}</p>
              {displayFilename && (
                <p className="text-sm text-muted-foreground mt-2">File: {displayFilename}</p>
              )}
            </div>
            <Button onClick={() => router.push('/contracts')} variant="outline">
              Back to Overview
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const contractData = contract.contract_data || {}
  const pand = contractData.pand || {}
  const status = getContractStatus(contract)
  const confidenceScore = contract.confidence?.score || 0

  const sections: { key: SectionKey; label: string; icon: any }[] = [
    { key: 'partijen', label: 'Partijen', icon: User },
    { key: 'pand', label: 'Pand', icon: Building2 },
    { key: 'financieel', label: 'Financieel', icon: Euro },
    { key: 'periodes', label: 'Periodes', icon: Calendar },
    { key: 'voorwaarden', label: 'Voorwaarden', icon: FileText },
    { key: 'juridisch', label: 'Juridisch', icon: Shield },
  ]

  const selectedSectionData = contractData[selectedSection] || {}
  const selectedSectionLabels = sectionLabels[selectedSection] || {}

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="sm" asChild className="mt-1">
              <Link href="/contracts">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">
                  {pand.adres || contract.filename || 'Contract Details'}
                </h1>
                <StatusBadge status={status} />
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {pand.type && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {pand.type}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {contract.document_type || 'Huurcontract'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {contract.processed
                    ? new Date(contract.processed).toLocaleDateString('nl-NL')
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Extracted Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section Selector Tabs */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Zap className="h-5 w-5 text-primary" />
                  Contract Data
                </CardTitle>
                <CardDescription>Select a section to view extracted fields</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-4">
                    {sections.map((section) => {
                      const hasData = contractData[section.key]
                      return (
                        <Button
                          key={section.key}
                          variant={selectedSection === section.key ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setSelectedSection(section.key)
                            setSelectedField(null)
                          }}
                          className={cn('shrink-0', selectedSection !== section.key && 'bg-transparent')}
                          disabled={!hasData}
                        >
                          <section.icon className="h-4 w-4 mr-2" />
                          {section.label}
                        </Button>
                      )
                    })}
                  </div>
                </ScrollArea>

                {/* Selected Section Info */}
                {selectedSectionData && Object.keys(selectedSectionData).length > 0 && (
                  <div className="mt-2 p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{sections.find(s => s.key === selectedSection)?.label}</h4>
                        <p className="text-xs text-muted-foreground">
                          {Object.keys(selectedSectionLabels).length} fields available
                        </p>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fields for selected section */}
            {selectedSectionData && Object.keys(selectedSectionData).length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground text-base">Extracted Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(selectedSectionLabels).map(([key, label]) => {
                      const value = getFieldValue(selectedSection, key, contractData)
                      const displayValue = formatFieldValue(value)
                      const isEmpty = value === null || value === undefined || displayValue === 'N/A'
                      const needsReview = confidenceScore < 80

                      return (
                        <div
                          key={key}
                          className={cn(
                            'rounded-lg border p-4 transition-colors cursor-pointer',
                            needsReview && isEmpty
                              ? 'border-status-warning/50 bg-status-warning/5'
                              : 'border-border bg-secondary/30',
                            selectedField === key && 'ring-2 ring-primary',
                          )}
                          onClick={() => setSelectedField(key)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                                {needsReview && isEmpty && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-status-warning/20 text-status-warning border-status-warning/30"
                                  >
                                    Review
                                  </Badge>
                                )}
                              </div>
                              <p className="text-foreground font-medium">{displayValue}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="flex items-center gap-1">
                                  <div className="h-2 w-12 rounded-full bg-secondary">
                                    <div
                                      className={cn(
                                        'h-full rounded-full',
                                        confidenceScore >= 90
                                          ? 'bg-status-success'
                                          : confidenceScore >= 80
                                            ? 'bg-status-warning'
                                            : 'bg-status-error',
                                      )}
                                      style={{ width: `${confidenceScore}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-8">{confidenceScore}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No data state */}
            {(!selectedSectionData || Object.keys(selectedSectionData).length === 0) && (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-foreground mb-1">No Data Available</h3>
                  <p className="text-sm text-muted-foreground">
                    This section has no extracted data available.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contract Summary */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <Info className="h-4 w-4" />
                  Contract Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pand.adres && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Address</span>
                      <span className="text-foreground text-right">{pand.adres}</span>
                    </div>
                    <Separator className="bg-border" />
                  </>
                )}
                {pand.type && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className="text-foreground">{pand.type}</span>
                    </div>
                    <Separator className="bg-border" />
                  </>
                )}
                {contractData.financieel?.huurprijs && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rent</span>
                      <span className="text-foreground font-semibold">
                        €{contractData.financieel.huurprijs.toFixed(2)}/month
                      </span>
                    </div>
                    <Separator className="bg-border" />
                  </>
                )}
                {contractData.partijen?.verhuurder?.naam && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Landlord</span>
                      <span className="text-foreground">{contractData.partijen.verhuurder.naam}</span>
                    </div>
                    <Separator className="bg-border" />
                  </>
                )}
                {contractData.periodes?.ingangsdatum && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="text-foreground">{contractData.periodes.ingangsdatum}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Confidence Info */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <Shield className="h-4 w-4" />
                  Confidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Overall Score</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        confidenceScore >= 95
                          ? 'bg-status-success/10 text-status-success border-status-success/30'
                          : confidenceScore >= 80
                            ? 'bg-status-warning/10 text-status-warning border-status-warning/30'
                            : 'bg-status-error/10 text-status-error border-status-error/30',
                      )}
                    >
                      {confidenceScore}%
                    </Badge>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        confidenceScore >= 90
                          ? 'bg-status-success'
                          : confidenceScore >= 80
                            ? 'bg-status-warning'
                            : 'bg-status-error',
                      )}
                      style={{ width: `${confidenceScore}%` }}
                    />
                  </div>
                  {contract.confidence?.needs_review && (
                    <p className="text-xs text-status-warning">
                      This contract needs manual review
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Document Info */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <FileText className="h-4 w-4" />
                  Document Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Filename</span>
                  <span className="text-foreground text-right text-xs">{contract.filename}</span>
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-foreground">{contract.document_type || 'N/A'}</span>
                </div>
                <Separator className="bg-border" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Processed</span>
                  <span className="text-foreground">
                    {contract.processed
                      ? new Date(contract.processed).toLocaleDateString('nl-NL')
                      : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Evidence Panel (if we have evidence in the future) */}
            {selectedField && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <Quote className="h-4 w-4" />
                    Field Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Badge variant="outline" className="text-xs">
                      {selectedSectionLabels[selectedField] || selectedField}
                    </Badge>
                    <ScrollArea className="h-[120px]">
                      <div className="rounded-lg bg-secondary/50 p-3 font-mono text-sm text-foreground">
                        {formatFieldValue(getFieldValue(selectedSection, selectedField, contractData))}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
