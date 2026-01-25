"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { StatusBadge, type DocumentStatus } from "@/components/status-badge"
import { documentTypes, type Property } from "@/lib/document-types"
import { Search, Eye, RefreshCw, Filter, Building2, FileText, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

const mockProperties: Property[] = [
  {
    id: "1",
    address: "Kerkstraat 123",
    city: "Gent",
    postalCode: "9000",
    yearOfConstruction: 1965,
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T14:30:00Z",
    documents: [
      { key: "eigendomstitel", status: "pushed", fileName: "Akte_Kerkstraat_123.pdf", confidence: 98 },
      { key: "epc", status: "needs_review", fileName: "EPC_Kerkstraat_123.pdf", confidence: 87 },
      { key: "elektrische_keuring", status: "parsed", fileName: "AREI_Kerkstraat_123.pdf", confidence: 92 },
      { key: "bodemattest", status: "pushed", fileName: "Bodemattest_Kerkstraat_123.pdf", confidence: 95 },
      { key: "asbestattest", status: "pending", fileName: "Asbest_Kerkstraat_123.pdf" },
      { key: "stedenbouwkundig_uittreksel", status: "missing" },
      { key: "kadastraal_uittreksel", status: "missing" },
      { key: "pid", status: "missing" },
      { key: "watertoets", status: "parsed", fileName: "Watertoets_Kerkstraat_123.pdf", confidence: 89 },
      { key: "stookolietankattest", status: "missing" },
    ],
  },
  {
    id: "2",
    address: "Veldstraat 45",
    city: "Gent",
    postalCode: "9000",
    yearOfConstruction: 2015,
    createdAt: "2024-01-15T09:15:00Z",
    updatedAt: "2024-01-15T09:15:00Z",
    documents: [
      { key: "eigendomstitel", status: "pushed", fileName: "Akte_Veldstraat_45.pdf", confidence: 99 },
      { key: "epc", status: "pushed", fileName: "EPC_Veldstraat_45.pdf", confidence: 95 },
      { key: "elektrische_keuring", status: "pushed", fileName: "AREI_Veldstraat_45.pdf", confidence: 97 },
      { key: "bodemattest", status: "pushed", fileName: "Bodemattest_Veldstraat_45.pdf", confidence: 94 },
      { key: "asbestattest", status: "missing" }, // Not needed - built after 2001
      { key: "stedenbouwkundig_uittreksel", status: "pushed", fileName: "Steden_Veldstraat_45.pdf", confidence: 96 },
      { key: "kadastraal_uittreksel", status: "pushed", fileName: "Kadaster_Veldstraat_45.pdf", confidence: 98 },
      { key: "pid", status: "pushed", fileName: "PID_Veldstraat_45.pdf", confidence: 91 },
      { key: "watertoets", status: "pushed", fileName: "Watertoets_Veldstraat_45.pdf", confidence: 93 },
      { key: "stookolietankattest", status: "missing" },
    ],
  },
  {
    id: "3",
    address: "Brugstraat 78",
    city: "Gent",
    postalCode: "9000",
    yearOfConstruction: 1985,
    createdAt: "2024-01-14T16:45:00Z",
    updatedAt: "2024-01-14T18:00:00Z",
    documents: [
      { key: "eigendomstitel", status: "parsed", fileName: "Akte_Brugstraat_78.pdf", confidence: 94 },
      { key: "epc", status: "error", fileName: "EPC_Brugstraat_78.pdf", confidence: 45 },
      { key: "elektrische_keuring", status: "needs_review", fileName: "AREI_Brugstraat_78.pdf", confidence: 72 },
      { key: "bodemattest", status: "pending", fileName: "Bodemattest_Brugstraat_78.pdf" },
      { key: "asbestattest", status: "pending", fileName: "Asbest_Brugstraat_78.pdf" },
      { key: "stedenbouwkundig_uittreksel", status: "missing" },
      { key: "kadastraal_uittreksel", status: "missing" },
      { key: "pid", status: "missing" },
      { key: "watertoets", status: "missing" },
      { key: "stookolietankattest", status: "missing" },
    ],
  },
  {
    id: "4",
    address: "Korenmarkt 12",
    city: "Gent",
    postalCode: "9000",
    yearOfConstruction: 1920,
    createdAt: "2024-01-14T14:20:00Z",
    updatedAt: "2024-01-14T14:20:00Z",
    documents: [
      { key: "eigendomstitel", status: "missing" },
      { key: "epc", status: "pending", fileName: "EPC_Korenmarkt_12.pdf" },
      { key: "elektrische_keuring", status: "missing" },
      { key: "bodemattest", status: "missing" },
      { key: "asbestattest", status: "missing" },
      { key: "stedenbouwkundig_uittreksel", status: "missing" },
      { key: "kadastraal_uittreksel", status: "missing" },
      { key: "pid", status: "missing" },
      { key: "watertoets", status: "missing" },
      { key: "stookolietankattest", status: "missing" },
    ],
  },
  {
    id: "5",
    address: "Graslei 8",
    city: "Gent",
    postalCode: "9000",
    yearOfConstruction: 1890,
    createdAt: "2024-01-15T11:00:00Z",
    updatedAt: "2024-01-15T11:00:00Z",
    documents: [
      { key: "eigendomstitel", status: "parsed", fileName: "Akte_Graslei_8.pdf", confidence: 96 },
      { key: "epc", status: "parsed", fileName: "EPC_Graslei_8.pdf", confidence: 91 },
      { key: "elektrische_keuring", status: "parsed", fileName: "AREI_Graslei_8.pdf", confidence: 88 },
      { key: "bodemattest", status: "needs_review", fileName: "Bodemattest_Graslei_8.pdf", confidence: 76 },
      { key: "asbestattest", status: "needs_review", fileName: "Asbest_Graslei_8.pdf", confidence: 79 },
      { key: "stedenbouwkundig_uittreksel", status: "parsed", fileName: "Steden_Graslei_8.pdf", confidence: 94 },
      { key: "kadastraal_uittreksel", status: "missing" },
      { key: "pid", status: "missing" },
      { key: "watertoets", status: "parsed", fileName: "Watertoets_Graslei_8.pdf", confidence: 90 },
      { key: "stookolietankattest", status: "pending", fileName: "Stookolie_Graslei_8.pdf" },
    ],
  },
]

function getPropertyStats(property: Property) {
  const total = documentTypes.filter((dt) => dt.required).length
  const docs = property.documents

  const pushed = docs.filter((d) => d.status === "pushed").length
  const parsed = docs.filter((d) => d.status === "parsed").length
  const needsReview = docs.filter((d) => d.status === "needs_review").length
  const pending = docs.filter((d) => d.status === "pending").length
  const error = docs.filter((d) => d.status === "error").length
  const missing = docs.filter((d) => d.status === "missing").length

  const complete = pushed
  const ready = pushed + parsed
  const requiresAction = needsReview + error

  return { total, pushed, parsed, needsReview, pending, error, missing, complete, ready, requiresAction }
}

function getPropertyStatus(property: Property): DocumentStatus {
  const stats = getPropertyStats(property)
  if (stats.error > 0) return "error"
  if (stats.needsReview > 0) return "needs_review"
  if (stats.pending > 0) return "pending"
  if (stats.missing > 0) return "parsed"
  return "pushed"
}

export function InboxPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filteredProperties = mockProperties.filter((property) => {
    const matchesSearch =
      property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase())
    const status = getPropertyStatus(property)
    const matchesStatus = statusFilter === "all" || status === statusFilter
    return matchesSearch && matchesStatus
  })

  const allDocs = mockProperties.flatMap((p) => p.documents)
  const statusCounts = {
    properties: mockProperties.length,
    pushed: allDocs.filter((d) => d.status === "pushed").length,
    parsed: allDocs.filter((d) => d.status === "parsed").length,
    needs_review: allDocs.filter((d) => d.status === "needs_review").length,
    pending: allDocs.filter((d) => d.status === "pending").length,
    error: allDocs.filter((d) => d.status === "error").length,
    missing: allDocs.filter((d) => d.status === "missing").length,
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Inbox</h1>
            <p className="text-sm text-muted-foreground">Properties and their legal documents from Dropbox</p>
          </div>
          <Button size="sm" variant="outline" className="gap-2 bg-transparent">
            <RefreshCw className="h-4 w-4" />
            Sync Now
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 p-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{statusCounts.properties}</div>
            <div className="text-xs text-muted-foreground">Properties</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{statusCounts.pushed}</div>
            <div className="text-xs text-muted-foreground">Pushed</div>
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
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-muted-foreground">{statusCounts.missing}</div>
            <div className="text-xs text-muted-foreground">Missing</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by address or city..."
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

      {/* Property Cards */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        <div className="grid gap-4">
          {filteredProperties.map((property) => {
            const stats = getPropertyStats(property)
            const status = getPropertyStatus(property)
            const completionPercent = Math.round((stats.pushed / documentTypes.length) * 100)

            return (
              <Card key={property.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Property Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">{property.address}</h3>
                            <StatusBadge status={status} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {property.postalCode} {property.city}
                            {property.yearOfConstruction && ` • Built ${property.yearOfConstruction}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Document Status Summary */}
                    <div className="flex items-center gap-6 lg:gap-8">
                      {/* Mini document status indicators */}
                      <div className="flex items-center gap-4 text-sm">
                        {stats.pushed > 0 && (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">{stats.pushed}</span>
                          </div>
                        )}
                        {stats.parsed > 0 && (
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-status-success" />
                            <span className="text-muted-foreground">{stats.parsed}</span>
                          </div>
                        )}
                        {stats.needsReview > 0 && (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4 text-status-warning" />
                            <span className="text-muted-foreground">{stats.needsReview}</span>
                          </div>
                        )}
                        {stats.error > 0 && (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4 text-status-error" />
                            <span className="text-muted-foreground">{stats.error}</span>
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="w-32 space-y-1">
                        <Progress value={completionPercent} className="h-2" />
                        <p className="text-xs text-muted-foreground text-right">{completionPercent}% complete</p>
                      </div>

                      {/* View button */}
                      <Button variant="outline" size="sm" asChild className="bg-transparent shrink-0">
                        <Link href={`/property/${property.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Document type pills */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex flex-wrap gap-2">
                      {property.documents.map((doc) => {
                        const docType = documentTypes.find((dt) => dt.key === doc.key)
                        if (!docType) return null

                        return (
                          <Badge
                            key={doc.key}
                            variant="outline"
                            className={cn(
                              "text-xs font-normal",
                              doc.status === "pushed" && "bg-primary/10 text-primary border-primary/30",
                              doc.status === "parsed" &&
                                "bg-status-success/10 text-status-success border-status-success/30",
                              doc.status === "needs_review" &&
                                "bg-status-warning/10 text-status-warning border-status-warning/30",
                              doc.status === "pending" &&
                                "bg-status-pending/10 text-status-pending border-status-pending/30",
                              doc.status === "error" && "bg-status-error/10 text-status-error border-status-error/30",
                              doc.status === "missing" && "bg-secondary text-muted-foreground border-border",
                            )}
                          >
                            {docType.nameNL.split(" ")[0]}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
