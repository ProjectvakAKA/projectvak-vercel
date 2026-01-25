"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { StatusBadge, type DocumentStatus } from "@/components/status-badge"
import { documentTypes, type DocumentKey } from "@/lib/document-types"
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  X,
  Upload,
  Quote,
  MapPin,
  Building2,
  Zap,
  Clock,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"

const mockProperty = {
  id: "1",
  address: "Kerkstraat 123",
  city: "Gent",
  postalCode: "9000",
  yearOfConstruction: 1965,
  status: "needs_review" as DocumentStatus,
  documents: [
    {
      key: "eigendomstitel",
      status: "pushed" as DocumentStatus,
      fileName: "Akte_Kerkstraat_123.pdf",
      uploadedAt: "2024-01-10T08:00:00Z",
      confidence: 98,
    },
    {
      key: "epc",
      status: "needs_review" as DocumentStatus,
      fileName: "EPC_Kerkstraat_123.pdf",
      uploadedAt: "2024-01-15T10:30:00Z",
      confidence: 87,
    },
    {
      key: "elektrische_keuring",
      status: "parsed" as DocumentStatus,
      fileName: "AREI_Kerkstraat_123.pdf",
      uploadedAt: "2024-01-12T14:00:00Z",
      confidence: 92,
    },
    {
      key: "bodemattest",
      status: "pushed" as DocumentStatus,
      fileName: "Bodemattest_Kerkstraat_123.pdf",
      uploadedAt: "2024-01-08T09:30:00Z",
      confidence: 95,
    },
    {
      key: "asbestattest",
      status: "pending" as DocumentStatus,
      fileName: "Asbest_Kerkstraat_123.pdf",
      uploadedAt: "2024-01-15T11:00:00Z",
    },
    { key: "stedenbouwkundig_uittreksel", status: "missing" as DocumentStatus },
    { key: "kadastraal_uittreksel", status: "missing" as DocumentStatus },
    { key: "pid", status: "missing" as DocumentStatus },
    {
      key: "watertoets",
      status: "parsed" as DocumentStatus,
      fileName: "Watertoets_Kerkstraat_123.pdf",
      uploadedAt: "2024-01-14T16:00:00Z",
      confidence: 89,
    },
    { key: "stookolietankattest", status: "missing" as DocumentStatus },
  ],
  extractedData: {
    epc: {
      certificateId: { value: "20240115-001234", confidence: 98, evidence: "Certificaatnummer: 20240115-001234" },
      energyClass: { value: "B", confidence: 95, evidence: "Energieklasse: B (score 150 kWh/m²jaar)" },
      energyScore: { value: "150", confidence: 92, evidence: "score 150 kWh/m²jaar" },
      usableFloorArea: {
        value: "185",
        confidence: 87,
        evidence: "Bruikbare vloeroppervlakte: 185 m²",
        needsReview: true,
      },
      yearOfConstruction: { value: "1965", confidence: 78, evidence: "Bouwjaar (geschat): 1965", needsReview: true },
      validUntil: { value: "2034-01-15", confidence: 96, evidence: "Geldig tot: 15/01/2034" },
      primaryHeating: {
        value: "Aardgas condensatieketel",
        confidence: 89,
        evidence: "Verwarming: Aardgas condensatieketel (2018)",
      },
      insulation: {
        value: "Dak: goed, Muren: matig, Vloer: geen",
        confidence: 72,
        evidence: "Isolatie - Dak: aanwezig en goed geïsoleerd",
        needsReview: true,
      },
      renewableEnergy: { value: "Geen", confidence: 94, evidence: "Hernieuwbare energie: niet aanwezig" },
    },
    eigendomstitel: {
      ownerName: { value: "Van der Berg, Johan", confidence: 98, evidence: "Eigenaar: Van der Berg, Johan" },
      purchaseDate: { value: "2018-05-12", confidence: 96, evidence: "Datum akte: 12/05/2018" },
      notary: { value: "Notaris De Smedt, Gent", confidence: 94, evidence: "Notaris: De Smedt, Gent" },
    },
    elektrische_keuring: {
      inspectionDate: { value: "2024-01-05", confidence: 97, evidence: "Keuringsdatum: 05/01/2024" },
      result: { value: "Conform", confidence: 92, evidence: "Resultaat: Conform - geen inbreuken vastgesteld" },
      validUntil: { value: "2049-01-05", confidence: 95, evidence: "Geldig tot: 05/01/2049" },
      inspector: { value: "ACEG Keuringen", confidence: 90, evidence: "Keuringsinstelling: ACEG Keuringen" },
    },
    bodemattest: {
      certificateNumber: { value: "OVAM-2024-123456", confidence: 98, evidence: "Attestnummer: OVAM-2024-123456" },
      status: { value: "Geen verontreiniging", confidence: 95, evidence: "Status: Geen bodemverontreiniging gekend" },
      issueDate: { value: "2024-01-02", confidence: 97, evidence: "Afgifte: 02/01/2024" },
    },
    watertoets: {
      floodRisk: {
        value: "Niet overstromingsgevoelig",
        confidence: 89,
        evidence: "Overstromingsgevoeligheid: Niet gelegen in overstromingsgebied",
      },
      waterTestDate: { value: "2024-01-10", confidence: 91, evidence: "Datum watertoets: 10/01/2024" },
    },
  },
}

const fieldLabels: Record<string, Record<string, string>> = {
  epc: {
    certificateId: "Certificate ID",
    energyClass: "Energy Class",
    energyScore: "Energy Score (kWh/m²/year)",
    usableFloorArea: "Usable Floor Area (m²)",
    yearOfConstruction: "Year of Construction",
    validUntil: "Valid Until",
    primaryHeating: "Primary Heating",
    insulation: "Insulation",
    renewableEnergy: "Renewable Energy",
  },
  eigendomstitel: {
    ownerName: "Owner Name",
    purchaseDate: "Purchase Date",
    notary: "Notary",
  },
  elektrische_keuring: {
    inspectionDate: "Inspection Date",
    result: "Result",
    validUntil: "Valid Until",
    inspector: "Inspector",
  },
  bodemattest: {
    certificateNumber: "Certificate Number",
    status: "Contamination Status",
    issueDate: "Issue Date",
  },
  watertoets: {
    floodRisk: "Flood Risk",
    waterTestDate: "Assessment Date",
  },
}

interface EditedValues {
  [docKey: string]: { [fieldKey: string]: string }
}

export function PropertyViewPage({ propertyId }: { propertyId: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedValues, setEditedValues] = useState<EditedValues>({})
  const [selectedDoc, setSelectedDoc] = useState<DocumentKey>("epc")
  const [selectedField, setSelectedField] = useState<string | null>(null)

  const property = mockProperty

  const handleSave = () => {
    setIsEditing(false)
    setEditedValues({})
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedValues({})
  }

  const handlePushToWhise = () => {
    alert("Push to Whise functionality will be implemented with Whise API integration")
  }

  const getFieldValue = (docKey: string, fieldKey: string) => {
    return editedValues[docKey]?.[fieldKey] ?? (property.extractedData as any)[docKey]?.[fieldKey]?.value
  }

  const selectedDocData = (property.extractedData as any)[selectedDoc]
  const selectedDocInfo = property.documents.find((d) => d.key === selectedDoc)
  const selectedDocType = documentTypes.find((dt) => dt.key === selectedDoc)
  const fieldsNeedingReview = selectedDocData
    ? Object.values(selectedDocData).filter((f: any) => f.needsReview).length
    : 0

  const docsWithData = property.documents.filter((d) => d.status !== "missing")
  const docsPushed = property.documents.filter((d) => d.status === "pushed").length
  const docsReady = property.documents.filter((d) => d.status === "parsed" || d.status === "pushed").length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="sm" asChild className="mt-1">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">{property.address}</h1>
                <StatusBadge status={property.status} />
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {property.postalCode} {property.city}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Built {property.yearOfConstruction}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {docsPushed}/{documentTypes.length} documents pushed
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel} className="bg-transparent">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="bg-transparent">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button size="sm" onClick={handlePushToWhise}>
                  <Upload className="h-4 w-4 mr-2" />
                  Push to Whise
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
            {/* Document Selector Tabs */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Zap className="h-5 w-5 text-primary" />
                  Document Data
                </CardTitle>
                <CardDescription>Select a document to view and edit extracted fields</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="flex gap-2 pb-4">
                    {property.documents
                      .filter((d) => d.status !== "missing")
                      .map((doc) => {
                        const docType = documentTypes.find((dt) => dt.key === doc.key)
                        const hasData = (property.extractedData as any)[doc.key]

                        return (
                          <Button
                            key={doc.key}
                            variant={selectedDoc === doc.key ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setSelectedDoc(doc.key as DocumentKey)
                              setSelectedField(null)
                            }}
                            className={cn("shrink-0", selectedDoc !== doc.key && "bg-transparent")}
                            disabled={!hasData}
                          >
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full mr-2",
                                doc.status === "pushed" && "bg-primary",
                                doc.status === "parsed" && "bg-status-success",
                                doc.status === "needs_review" && "bg-status-warning",
                                doc.status === "pending" && "bg-status-pending",
                                doc.status === "error" && "bg-status-error",
                              )}
                            />
                            {docType?.nameNL.split(" ")[0] || doc.key}
                          </Button>
                        )
                      })}
                  </div>
                </ScrollArea>

                {/* Selected Document Info */}
                {selectedDocInfo && selectedDocType && (
                  <div className="mt-2 p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{selectedDocType.nameNL}</h4>
                        <p className="text-xs text-muted-foreground">{selectedDocType.description}</p>
                      </div>
                      <StatusBadge status={selectedDocInfo.status} />
                    </div>
                    {selectedDocInfo.fileName && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {selectedDocInfo.fileName}
                        {selectedDocInfo.uploadedAt && (
                          <>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            {new Date(selectedDocInfo.uploadedAt).toLocaleDateString("nl-BE")}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fields for selected document */}
            {selectedDocData && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-foreground text-base">Extracted Fields</CardTitle>
                    {fieldsNeedingReview > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-status-warning/20 text-status-warning border-status-warning/30"
                      >
                        {fieldsNeedingReview} need review
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="all">All Fields</TabsTrigger>
                      {fieldsNeedingReview > 0 && (
                        <TabsTrigger value="review">Needs Review ({fieldsNeedingReview})</TabsTrigger>
                      )}
                    </TabsList>

                    <TabsContent value="all" className="space-y-4">
                      {Object.entries(selectedDocData).map(([key, field]: [string, any]) => (
                        <div
                          key={key}
                          className={cn(
                            "rounded-lg border p-4 transition-colors cursor-pointer",
                            field.needsReview
                              ? "border-status-warning/50 bg-status-warning/5"
                              : "border-border bg-secondary/30",
                            selectedField === key && "ring-2 ring-primary",
                          )}
                          onClick={() => setSelectedField(key)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium text-muted-foreground">
                                  {fieldLabels[selectedDoc]?.[key] || key}
                                </Label>
                                {field.needsReview && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-status-warning/20 text-status-warning border-status-warning/30"
                                  >
                                    Review
                                  </Badge>
                                )}
                              </div>
                              {isEditing ? (
                                <Input
                                  value={getFieldValue(selectedDoc, key)}
                                  onChange={(e) =>
                                    setEditedValues({
                                      ...editedValues,
                                      [selectedDoc]: {
                                        ...editedValues[selectedDoc],
                                        [key]: e.target.value,
                                      },
                                    })
                                  }
                                  className="bg-background border-border"
                                />
                              ) : (
                                <p className="text-foreground font-medium">{field.value}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="flex items-center gap-1">
                                  <div className="h-2 w-12 rounded-full bg-secondary">
                                    <div
                                      className={cn(
                                        "h-full rounded-full",
                                        field.confidence >= 90
                                          ? "bg-status-success"
                                          : field.confidence >= 80
                                            ? "bg-status-warning"
                                            : "bg-status-error",
                                      )}
                                      style={{ width: `${field.confidence}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-8">{field.confidence}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="review" className="space-y-4">
                      {Object.entries(selectedDocData)
                        .filter(([, field]: [string, any]) => field.needsReview)
                        .map(([key, field]: [string, any]) => (
                          <div
                            key={key}
                            className={cn(
                              "rounded-lg border border-status-warning/50 bg-status-warning/5 p-4 transition-colors cursor-pointer",
                              selectedField === key && "ring-2 ring-primary",
                            )}
                            onClick={() => setSelectedField(key)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm font-medium text-muted-foreground">
                                    {fieldLabels[selectedDoc]?.[key] || key}
                                  </Label>
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-status-warning/20 text-status-warning border-status-warning/30"
                                  >
                                    Review
                                  </Badge>
                                </div>
                                {isEditing ? (
                                  <Input
                                    value={getFieldValue(selectedDoc, key)}
                                    onChange={(e) =>
                                      setEditedValues({
                                        ...editedValues,
                                        [selectedDoc]: {
                                          ...editedValues[selectedDoc],
                                          [key]: e.target.value,
                                        },
                                      })
                                    }
                                    className="bg-background border-border"
                                  />
                                ) : (
                                  <p className="text-foreground font-medium">{field.value}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="flex items-center gap-1">
                                    <div className="h-2 w-12 rounded-full bg-secondary">
                                      <div
                                        className={cn(
                                          "h-full rounded-full",
                                          field.confidence >= 90
                                            ? "bg-status-success"
                                            : field.confidence >= 80
                                              ? "bg-status-warning"
                                              : "bg-status-error",
                                        )}
                                        style={{ width: `${field.confidence}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-8">{field.confidence}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* No data state */}
            {!selectedDocData && selectedDocInfo?.status !== "missing" && (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-foreground mb-1">Processing Document</h3>
                  <p className="text-sm text-muted-foreground">
                    This document is being processed. Extracted data will appear here once complete.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Document Checklist - All 10 document types */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <FileText className="h-4 w-4" />
                  Document Checklist
                </CardTitle>
                <CardDescription className="text-xs">
                  {docsReady}/{documentTypes.length} ready • {docsPushed} pushed to Whise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[320px] pr-4">
                  <div className="space-y-2">
                    {documentTypes.map((docType) => {
                      const doc = property.documents.find((d) => d.key === docType.key)
                      const status = doc?.status || "missing"
                      const isSelected = selectedDoc === docType.key
                      const hasData = (property.extractedData as any)[docType.key]

                      return (
                        <div
                          key={docType.key}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors cursor-pointer",
                            status === "pushed" && "bg-primary/10 hover:bg-primary/15",
                            status === "parsed" && "bg-status-success/10 hover:bg-status-success/15",
                            status === "needs_review" && "bg-status-warning/10 hover:bg-status-warning/15",
                            status === "pending" && "bg-status-pending/10 hover:bg-status-pending/15",
                            status === "error" && "bg-status-error/10 hover:bg-status-error/15",
                            status === "missing" && "bg-secondary/50 hover:bg-secondary",
                            isSelected && "ring-2 ring-primary",
                          )}
                          onClick={() => hasData && setSelectedDoc(docType.key as DocumentKey)}
                        >
                          {status === "pushed" ? (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          ) : status === "parsed" ? (
                            <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
                          ) : status === "needs_review" ? (
                            <AlertCircle className="h-4 w-4 text-status-warning shrink-0" />
                          ) : status === "error" ? (
                            <AlertCircle className="h-4 w-4 text-status-error shrink-0" />
                          ) : status === "pending" ? (
                            <Clock className="h-4 w-4 text-status-pending shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span
                              className={cn(
                                "text-sm block truncate",
                                status !== "missing" ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {docType.nameNL.split("(")[0].trim()}
                            </span>
                            {docType.conditional && (
                              <span className="text-xs text-muted-foreground">{docType.conditional}</span>
                            )}
                          </div>
                          {status !== "missing" && <StatusBadge status={status as DocumentStatus} />}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Evidence Panel */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <Quote className="h-4 w-4" />
                  Evidence
                </CardTitle>
                <CardDescription className="text-xs">Source text from document</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedField && selectedDocData?.[selectedField] ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {fieldLabels[selectedDoc]?.[selectedField] || selectedField}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {selectedDocData[selectedField].confidence}% confidence
                      </span>
                    </div>
                    <ScrollArea className="h-[120px]">
                      <div className="rounded-lg bg-secondary/50 p-3 font-mono text-sm text-foreground">
                        &quot;{selectedDocData[selectedField].evidence}&quot;
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Select a field to view its source evidence
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground text-base">
                  <Info className="h-4 w-4" />
                  Property Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(property.extractedData as any).epc?.energyClass && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Energy Class</span>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/20 font-semibold text-primary">
                        {(property.extractedData as any).epc.energyClass.value}
                      </span>
                    </div>
                    <Separator className="bg-border" />
                  </>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Year Built</span>
                  <span className="text-foreground">{property.yearOfConstruction}</span>
                </div>
                <Separator className="bg-border" />
                {(property.extractedData as any).bodemattest?.status && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Soil Status</span>
                      <Badge
                        variant="outline"
                        className="bg-status-success/10 text-status-success border-status-success/30 text-xs"
                      >
                        Clean
                      </Badge>
                    </div>
                    <Separator className="bg-border" />
                  </>
                )}
                {(property.extractedData as any).elektrische_keuring?.result && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Electrical</span>
                    <Badge
                      variant="outline"
                      className="bg-status-success/10 text-status-success border-status-success/30 text-xs"
                    >
                      Conform
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
