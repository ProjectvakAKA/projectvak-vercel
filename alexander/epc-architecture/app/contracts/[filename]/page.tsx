'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Upload,
  Edit,
  Save,
  X,
  Droplets,
  Fuel,
} from 'lucide-react'
import { cn, formatDateForDisplay } from '@/lib/utils'
import { toast } from 'sonner'

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
  // Check if contract was manually edited
  if ((contract as any).edited?.timestamp || (contract as any).manually_edited) {
    return 'manually_edited'
  }
  if (!contract.confidence) return 'pending'
  
  // Only "pushed" if confidence >= 95 (fully processed and approved)
  if (contract.confidence.score >= 95) return 'pushed'
  
  // Everything below 95% needs review (even if parsed, it needs manual check)
  if (contract.confidence.score >= 60) return 'needs_review'
  
  // Below 60% is error or pending
  if (contract.confidence.score > 0) return 'error'
  return 'pending'
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
  const pathname = usePathname()
  const router = useRouter()
  const [contract, setContract] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<SectionKey>('partijen')
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<ContractData | null>(null)
  const [pushingToWhise, setPushingToWhise] = useState(false)
  const [whiseStatus, setWhiseStatus] = useState<{ pushed: boolean; message?: string } | null>(null)

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

      // Only update contract if not currently editing (to prevent losing edits)
      if (!isEditing) {
        setContract(data)
      }
    } catch (err: any) {
      console.error('Error loading contract:', err)
      setError(err.message || 'Failed to load contract')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (params && params.filename) {
      fetchContract()
    } else {
      setLoading(false)
      setError('URL parameter ontbreekt')
    }
  }, [params])

  // Auto-refresh every 30 seconds, but pause if user is editing. Geen refresh op login/account-aanvragen.
  useEffect(() => {
    if (pathname === '/login' || pathname?.startsWith('/login/')) return
    if (isEditing) return // Don't auto-refresh while editing

    let intervalId: NodeJS.Timeout | null = null

    intervalId = setInterval(() => {
      if (!isEditing &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') {
        fetchContract()
      }
    }, 30000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [isEditing, params, pathname])

  // Check if contract was pushed to Whise (auto or manual) (check on load)
  useEffect(() => {
    if (contract) {
      const confidence = contract.confidence?.score || 0
      const wasPushed = (contract as any).whise_pushed === true
      const wasManualPush = (contract as any).whise_push_manual === true

      if (wasPushed) {
        setWhiseStatus({
          pushed: true,
          message: wasManualPush ? 'Handmatig gepusht naar Whise' : 'Automatisch gepusht naar Whise (confidence >= 95%)'
        })
      } else if (confidence >= 95) {
        setWhiseStatus({
          pushed: false,
          message: 'Klaar voor automatische push (wordt automatisch gepusht bij confidence >= 95%)'
        })
      }
    }
  }, [contract])

  const handlePushToWhise = async (autoPush = false) => {
    if (!contract) return

    // Show info message that this feature is coming soon (bottom right, won't block)
    toast.info('Whise Integratie', {
      description: 'De Whise API integratie wordt momenteel ontwikkeld. Deze functionaliteit komt binnenkort beschikbaar!',
      duration: 4000,
    })
    
    // For now, don't make the API call
    return

    // TODO: Uncomment when Whise API is ready
    /*
    try {
      setPushingToWhise(true)
      const filenameParam = params?.filename
      const filename = filenameParam
        ? typeof filenameParam === 'string'
          ? decodeURIComponent(filenameParam)
          : decodeURIComponent(String(filenameParam))
        : null

      if (!filename) {
        throw new Error('Filename not found')
      }

      const response = await fetch(`/api/contracts/${encodeURIComponent(filename)}/whise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual: !autoPush }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to push to Whise')
      }

      // Check if it was actually pushed or just ready
      if (data.success && data.whiseId) {
        setWhiseStatus({
          pushed: true,
          message: autoPush ? 'Automatisch gepusht naar Whise' : 'Handmatig gepusht naar Whise'
        })
        toast.success('Gepusht naar Whise', {
          description: `Contract "${contract.filename}" is succesvol naar Whise gepusht.`,
        })
      } else if (data.note) {
        // API not configured yet
        setWhiseStatus({
          pushed: false,
          message: 'Klaar voor push (Whise API nog niet geconfigureerd)'
        })
        toast.info('Whise API niet geconfigureerd', {
          description: 'Configureer WHISE_API_ENDPOINT en WHISE_API_TOKEN om te pushen.',
        })
      } else {
        setWhiseStatus({
          pushed: true,
          message: data.message || 'Gepusht naar Whise'
        })
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setWhiseStatus({
        pushed: false,
        message: `Fout: ${errorMessage}`
      })
      toast.error('Fout bij pushen', {
        description: errorMessage,
      })
    } finally {
      setPushingToWhise(false)
    }
    */
  }

  const handleSave = async () => {
    if (!editedData || !contract) {
      toast.error('Geen data om op te slaan', {
        description: 'Er zijn geen wijzigingen om op te slaan.',
      })
      return
    }

    try {
      const filenameParam = params?.filename
      const filename = filenameParam
        ? typeof filenameParam === 'string'
          ? decodeURIComponent(filenameParam)
          : decodeURIComponent(String(filenameParam))
        : null

      if (!filename || filename === 'undefined') {
        throw new Error('Bestandsnaam niet gevonden')
      }

      // Ensure contract_data exists
      if (!editedData.contract_data) {
        editedData.contract_data = {}
      }

      // Save to API
      const response = await fetch(`/api/contracts/${encodeURIComponent(filename)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Fout bij opslaan van wijzigingen')
      }

      const result = await response.json()
      
      // Refresh contract data to get latest from server (with manually_edited flag)
      const refreshResponse = await fetch(`/api/contracts/${encodeURIComponent(filename)}`)
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json()
        setContract(refreshedData)
        // Status will automatically update to 'manually_edited' via getContractStatus
      } else {
        // Fallback: update local state with manually_edited flag
        setContract({
          ...editedData,
          manually_edited: true,
          edited: {
            timestamp: new Date().toISOString(),
            edited_by: 'user',
          },
        })
      }
      
      setIsEditing(false)
      setEditedData(null)
      
      // Show beautiful success toast (bottom right, won't block buttons)
      const contractName = editedData.contract_data?.pand?.adres || editedData.filename || contract.filename || 'Contract'
      toast.success('Wijzigingen opgeslagen! ✨', {
        description: `Je wijzigingen aan "${contractName}" zijn opgeslagen in Dropbox. De JSON file is bijgewerkt en alle aanpassingen zijn behouden.`,
        duration: 4000,
      })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Onbekende fout'
      toast.error('Fout bij opslaan', {
        description: `Er is een fout opgetreden: ${errorMessage}`,
        duration: 5000,
      })
    }
  }

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

  const displayContract = isEditing && editedData ? editedData : contract
  const contractData = displayContract?.contract_data || {}
  const pand = contractData.pand || {}
  const status = getContractStatus(displayContract || contract)
  const confidenceScore = displayContract?.confidence?.score || contract?.confidence?.score || 0

  const sections: { key: SectionKey; label: string; icon: any }[] = [
    { key: 'partijen', label: 'Partijen', icon: User },
    { key: 'pand', label: 'Pand', icon: Building2 },
    { key: 'financieel', label: 'Financieel', icon: Euro },
    { key: 'periodes', label: 'Periodes', icon: Calendar },
    { key: 'voorwaarden', label: 'Voorwaarden', icon: FileText },
    { key: 'juridisch', label: 'Juridisch', icon: Shield },
  ]

  // Get section data from editedData if editing, otherwise from contractData
  const sourceData = isEditing && editedData ? (editedData.contract_data || {}) : contractData
  const selectedSectionData = sourceData[selectedSection] || {}
  const selectedSectionLabels = sectionLabels[selectedSection] || {}
  
  // Debug log
  if (isEditing) {
    console.log('Section data check:', {
      selectedSection,
      isEditing,
      hasEditedData: !!editedData,
      hasSourceData: !!sourceData,
      hasSectionData: !!selectedSectionData,
      sectionKeys: Object.keys(selectedSectionData),
      sectionLabelsKeys: Object.keys(selectedSectionLabels),
    })
  }

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
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-semibold text-foreground truncate">
                    {pand.adres || contract.filename || 'Contract Details'}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={status} />
                    <span className="text-xs text-muted-foreground">
                      {contract.document_type || 'Huurcontract'}
                    </span>
                  </div>
                </div>
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
          <div className="flex items-center gap-2">
            {!isEditing ? (
              (confidenceScore >= 95 || whiseStatus?.pushed) ? (
                <Badge variant="outline" className="border-status-success text-status-success gap-1.5 px-3 py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {(contract as any)?.whise_push_manual === true ? 'Handmatig gepusht naar Whise' : (confidenceScore >= 95 ? 'Automatisch gepusht naar Whise' : 'Gepusht naar Whise')}
                </Badge>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!contract) {
                        toast.error('Contract niet geladen', {
                          description: 'Het contract kon niet worden geladen. Probeer de pagina te verversen.',
                        })
                        return
                      }
                      try {
                        const clonedContract = JSON.parse(JSON.stringify(contract))
                        setEditedData(clonedContract)
                        setIsEditing(true)
                      } catch (err) {
                        console.error('Error activating edit mode:', err)
                        toast.error('Fout bij activeren edit mode', {
                          description: 'Kon contract data niet kopiëren. Probeer opnieuw.',
                        })
                      }
                    }}
                    className="gap-2"
                    disabled={!contract || loading}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handlePushToWhise(false)}
                    disabled={pushingToWhise || !contract}
                    className="gap-2"
                  >
                    <Upload className={cn("h-4 w-4", pushingToWhise && "animate-spin")} />
                    {pushingToWhise ? 'Pushen...' : 'Push naar Whise'}
                  </Button>
                </>
              )
            ) : (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false)
                    setEditedData(null)
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            )}
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
                  <CardTitle className="text-foreground text-base">
                    Extracted Fields
                    {isEditing && (
                      <span className="ml-2 text-xs text-primary font-normal">
                        (Edit Mode)
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(selectedSectionLabels).map(([key, label]) => {
                      // Get value from editedData if editing, otherwise from contractData
                      const currentData = isEditing && editedData ? (editedData.contract_data || {}) : contractData
                      const value = getFieldValue(selectedSection, key, currentData)
                      const displayValue = formatFieldValue(value)
                      const isEmpty = value === null || value === undefined || displayValue === 'N/A'
                      const needsReview = confidenceScore < 80

                      // Get raw value for input (not formatted)
                      // Use a state-based value if we're editing this specific field
                      const rawValue = value === null || value === undefined ? '' : String(value)

                      return (
                        <div
                          key={key}
                          className={cn(
                            'rounded-lg border p-4 transition-colors',
                            isEditing ? 'cursor-default' : 'cursor-pointer',
                            needsReview && isEmpty
                              ? 'border-status-warning/50 bg-status-warning/5'
                              : 'border-border bg-secondary/30',
                            selectedField === key && !isEditing && 'ring-2 ring-primary',
                            isEditing && 'ring-2 ring-primary border-primary/50',
                          )}
                          onClick={(e) => {
                            // Only handle click if not editing and not clicking on input
                            if (!isEditing && !(e.target as HTMLElement).closest('input')) {
                              setSelectedField(key)
                            }
                          }}
                          onMouseDown={(e) => {
                            // Prevent parent click when clicking on input area
                            if (isEditing && (e.target as HTMLElement).tagName === 'INPUT') {
                              e.stopPropagation()
                            }
                          }}
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
                              {isEditing && editedData ? (
                                <input
                                  type="text"
                                  defaultValue={rawValue}
                                  key={`${key}-${selectedSection}`}
                                  onInput={(e) => {
                                    const inputValue = (e.target as HTMLInputElement).value
                                    
                                    if (!editedData) return
                                    
                                    const newData = JSON.parse(JSON.stringify(editedData))
                                    if (!newData.contract_data) newData.contract_data = {}
                                    if (!newData.contract_data[selectedSection]) {
                                      newData.contract_data[selectedSection] = {}
                                    }
                                    
                                    const sectionData = newData.contract_data[selectedSection]
                                    
                                    if (key.includes('_')) {
                                      const [parent, child] = key.split('_', 2)
                                      if (selectedSection === 'partijen') {
                                        if (!sectionData[parent]) sectionData[parent] = {}
                                        sectionData[parent][child] = inputValue
                                      } else if (selectedSection === 'financieel' && parent === 'waarborg') {
                                        if (!sectionData.waarborg) sectionData.waarborg = {}
                                        sectionData.waarborg[child] = inputValue
                                      } else if (selectedSection === 'pand' && parent === 'kadaster') {
                                        if (!sectionData.kadaster) sectionData.kadaster = {}
                                        sectionData.kadaster[child] = inputValue
                                      } else if (selectedSection === 'pand' && parent === 'epc') {
                                        if (!sectionData.epc) sectionData.epc = {}
                                        sectionData.epc[child] = inputValue
                                      } else {
                                        if (!sectionData[parent]) sectionData[parent] = {}
                                        sectionData[parent][child] = inputValue
                                      }
                                    } else {
                                      sectionData[key] = inputValue
                                    }
                                    
                                    setEditedData(newData)
                                  }}
                                  onBlur={(e) => {
                                    // Trim on blur
                                    const inputValue = e.target.value.trim() || null
                                    if (!editedData) return
                                    
                                    const newData = JSON.parse(JSON.stringify(editedData))
                                    if (!newData.contract_data) newData.contract_data = {}
                                    if (!newData.contract_data[selectedSection]) {
                                      newData.contract_data[selectedSection] = {}
                                    }
                                    
                                    const sectionData = newData.contract_data[selectedSection]
                                    
                                    if (key.includes('_')) {
                                      const [parent, child] = key.split('_', 2)
                                      if (selectedSection === 'partijen') {
                                        if (!sectionData[parent]) sectionData[parent] = {}
                                        sectionData[parent][child] = inputValue
                                      } else if (selectedSection === 'financieel' && parent === 'waarborg') {
                                        if (!sectionData.waarborg) sectionData.waarborg = {}
                                        sectionData.waarborg[child] = inputValue
                                      } else if (selectedSection === 'pand' && parent === 'kadaster') {
                                        if (!sectionData.kadaster) sectionData.kadaster = {}
                                        sectionData.kadaster[child] = inputValue
                                      } else if (selectedSection === 'pand' && parent === 'epc') {
                                        if (!sectionData.epc) sectionData.epc = {}
                                        sectionData.epc[child] = inputValue
                                      } else {
                                        if (!sectionData[parent]) sectionData[parent] = {}
                                        sectionData[parent][child] = inputValue
                                      }
                                    } else {
                                      sectionData[key] = inputValue
                                    }
                                    
                                    setEditedData(newData)
                                  }}
                                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  placeholder="Enter value..."
                                />
                              ) : (
                                <p className="text-foreground font-medium">{displayValue}</p>
                              )}
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
            {/* Contract Type Navigation */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground text-sm font-medium">Document Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <Link 
                  href="/contracts"
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-primary font-medium text-sm hover:bg-primary/15 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Huurcontracten
                </Link>
                <Link 
                  href="/contracts/eigendomstitel"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Eigendomstitel
                </Link>
                <Link 
                  href="/contracts/epc"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  Energieprestatiecertificaat
                </Link>
                <Link 
                  href="/contracts/elektrische"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  <Zap className="h-4 w-4" />
                  Elektrische
                </Link>
                <Link 
                  href="/contracts/bodemattest"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Bodemattest
                </Link>
                <Link 
                  href="/contracts/asbestattest"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  Asbestattest
                </Link>
                <Link 
                  href="/contracts/stedenbouwkundig"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  Stedenbouwkundig
                </Link>
                <Link 
                  href="/contracts/kadastraal"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  Kadastraal
                </Link>
                <Link 
                  href="/contracts/post-interventiedossier"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Post-interventiedossier
                </Link>
                <Link 
                  href="/contracts/watertoets"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  <Droplets className="h-4 w-4" />
                  Watertoets
                </Link>
                <Link 
                  href="/contracts/stookolietankattest"
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  <Fuel className="h-4 w-4" />
                  Stookolietankattest
                </Link>
              </CardContent>
            </Card>
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
                {contractData.financieel?.huurprijs != null && contractData.financieel.huurprijs !== '' && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rent</span>
                      <span className="text-foreground font-semibold">
                        €{(() => {
                          const v = contractData.financieel!.huurprijs
                          const n = typeof v === 'number' ? v : Number(v)
                          return Number.isFinite(n) ? n.toFixed(2) : String(v ?? '')
                        })()}/month
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
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Start Date</span>
                      <span className="text-foreground">{formatDateForDisplay(contractData.periodes.ingangsdatum)}</span>
                    </div>
                    <Separator className="bg-border" />
                  </>
                )}
                
                {/* Whise Status */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Whise Status</span>
                    {whiseStatus?.pushed ? (
                      <Badge className="bg-status-success text-white">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Gepusht
                      </Badge>
                    ) : confidenceScore >= 95 ? (
                      <Badge variant="outline" className="border-status-success text-status-success">
                        Klaar
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-muted text-muted-foreground">
                        Wachtend
                      </Badge>
                    )}
                  </div>
                  {whiseStatus?.message && (
                    <p className="text-xs text-muted-foreground mt-1">{whiseStatus.message}</p>
                  )}
                  {confidenceScore >= 95 && !whiseStatus?.pushed && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Wordt automatisch gepusht bij confidence &gt;= 95%
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Generated Summary */}
            {displayContract.summary && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <Quote className="h-4 w-4" />
                    AI Samenvatting
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {displayContract.summary}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Edit History */}
            {(displayContract as any).edit_history && Array.isArray((displayContract as any).edit_history) && (displayContract as any).edit_history.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground text-base">
                    <Clock className="h-4 w-4" />
                    Wijzigingsgeschiedenis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(displayContract as any).edit_history.slice().reverse().map((edit: any, index: number) => (
                      <div key={index} className="text-sm border-l-2 border-primary/30 pl-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">
                            {new Date(edit.timestamp).toLocaleString('nl-NL')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            door {edit.edited_by || 'gebruiker'}
                          </span>
                        </div>
                        {edit.changes && Object.keys(edit.changes).length > 0 && (
                          <div className="mt-2 space-y-1 text-xs">
                            {Object.entries(edit.changes).slice(0, 3).map(([field, change]: [string, any]) => (
                              <div key={field} className="text-muted-foreground">
                                <span className="font-medium">{field}:</span>{' '}
                                <span className="line-through text-red-500/70">{String(change.from || 'leeg')}</span>
                                {' → '}
                                <span className="text-green-500/70">{String(change.to || 'leeg')}</span>
                              </div>
                            ))}
                            {Object.keys(edit.changes).length > 3 && (
                              <div className="text-muted-foreground">
                                +{Object.keys(edit.changes).length - 3} meer wijzigingen
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
