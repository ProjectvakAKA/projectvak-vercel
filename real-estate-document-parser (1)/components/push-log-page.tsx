"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  Copy,
} from "lucide-react"
import { cn } from "@/lib/utils"

type PushStatus = "success" | "error" | "pending" | "partial"

interface PushLogEntry {
  id: string
  propertyAddress: string
  propertyId: string
  status: PushStatus
  timestamp: string
  duration: number // in ms
  fieldsUpdated: number
  fieldsFailed: number
  whisePropertyId: string | null
  errorMessage: string | null
  errorCode: string | null
  payload: Record<string, unknown>
  response: Record<string, unknown> | null
  retryCount: number
}

// Mock push log data
const mockPushLogs: PushLogEntry[] = [
  {
    id: "push-001",
    propertyAddress: "Veldstraat 45, 9000 Gent",
    propertyId: "2",
    status: "success",
    timestamp: "2024-01-15T11:45:00Z",
    duration: 1234,
    fieldsUpdated: 8,
    fieldsFailed: 0,
    whisePropertyId: "WHS-2024-0045",
    errorMessage: null,
    errorCode: null,
    payload: {
      energyClass: "A",
      energyScore: 95,
      usableFloorArea: 220,
      yearOfConstruction: 1998,
      certificateId: "20240112-004567",
    },
    response: { success: true, propertyId: "WHS-2024-0045", updatedAt: "2024-01-15T11:45:01Z" },
    retryCount: 0,
  },
  {
    id: "push-002",
    propertyAddress: "Brugstraat 78, 9000 Gent",
    propertyId: "3",
    status: "success",
    timestamp: "2024-01-15T10:30:00Z",
    duration: 987,
    fieldsUpdated: 8,
    fieldsFailed: 0,
    whisePropertyId: "WHS-2024-0078",
    errorMessage: null,
    errorCode: null,
    payload: {
      energyClass: "C",
      energyScore: 210,
      usableFloorArea: 145,
      yearOfConstruction: 1975,
      certificateId: "20240110-003456",
    },
    response: { success: true, propertyId: "WHS-2024-0078", updatedAt: "2024-01-15T10:30:01Z" },
    retryCount: 0,
  },
  {
    id: "push-003",
    propertyAddress: "Korenmarkt 12, 9000 Gent",
    propertyId: "4",
    status: "error",
    timestamp: "2024-01-15T09:15:00Z",
    duration: 5432,
    fieldsUpdated: 0,
    fieldsFailed: 8,
    whisePropertyId: null,
    errorMessage: "Property not found in Whise. Please create the property first or check the address mapping.",
    errorCode: "WHISE_404_PROPERTY_NOT_FOUND",
    payload: {
      energyClass: "D",
      energyScore: 280,
      usableFloorArea: 95,
      yearOfConstruction: 1960,
      certificateId: "20240108-002345",
    },
    response: { error: "Property not found", code: "404", details: "No matching property for address" },
    retryCount: 2,
  },
  {
    id: "push-004",
    propertyAddress: "Graslei 8, 9000 Gent",
    propertyId: "5",
    status: "partial",
    timestamp: "2024-01-14T16:20:00Z",
    duration: 2156,
    fieldsUpdated: 5,
    fieldsFailed: 3,
    whisePropertyId: "WHS-2024-0008",
    errorMessage: "Some fields could not be mapped to Whise schema.",
    errorCode: "WHISE_PARTIAL_UPDATE",
    payload: {
      energyClass: "B",
      energyScore: 165,
      usableFloorArea: 310,
      yearOfConstruction: 1920,
      certificateId: "20240106-001234",
      insulation: "Complex value - unmapped",
    },
    response: {
      success: true,
      partial: true,
      propertyId: "WHS-2024-0008",
      failedFields: ["insulation", "renewableEnergy", "primaryHeating"],
    },
    retryCount: 0,
  },
  {
    id: "push-005",
    propertyAddress: "Hoogstraat 56, 9000 Gent",
    propertyId: "6",
    status: "pending",
    timestamp: "2024-01-15T12:00:00Z",
    duration: 0,
    fieldsUpdated: 0,
    fieldsFailed: 0,
    whisePropertyId: null,
    errorMessage: null,
    errorCode: null,
    payload: {
      energyClass: "A+",
      energyScore: 45,
      usableFloorArea: 180,
      yearOfConstruction: 2022,
      certificateId: "20240115-005678",
    },
    response: null,
    retryCount: 0,
  },
]

const statusConfig: Record<PushStatus, { label: string; icon: React.ElementType; className: string }> = {
  success: {
    label: "Success",
    icon: CheckCircle2,
    className: "bg-status-success/20 text-status-success border-status-success/30",
  },
  error: {
    label: "Failed",
    icon: XCircle,
    className: "bg-status-error/20 text-status-error border-status-error/30",
  },
  partial: {
    label: "Partial",
    icon: AlertTriangle,
    className: "bg-status-warning/20 text-status-warning border-status-warning/30",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-status-pending/20 text-status-pending border-status-pending/30",
  },
}

function StatusBadge({ status }: { status: PushStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

function JsonViewer({ data, title }: { data: unknown; title: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
          <Copy className="h-3 w-3 mr-1" />
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <ScrollArea className="h-[150px]">
        <pre className="rounded-lg bg-secondary/50 p-3 text-xs font-mono text-foreground overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </ScrollArea>
    </div>
  )
}

export function PushLogPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const filteredLogs = mockPushLogs.filter((log) => {
    const matchesSearch = log.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || log.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: mockPushLogs.length,
    success: mockPushLogs.filter((l) => l.status === "success").length,
    error: mockPushLogs.filter((l) => l.status === "error").length,
    partial: mockPushLogs.filter((l) => l.status === "partial").length,
    pending: mockPushLogs.filter((l) => l.status === "pending").length,
  }

  const handleRetry = (logId: string) => {
    // In real app, this would trigger retry
    alert(`Retrying push for log ${logId}`)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Push Log</h1>
          <p className="text-sm text-muted-foreground">History of Whise CRM push attempts and their results</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Pushes</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-success">{stats.success}</div>
            <div className="text-xs text-muted-foreground">Successful</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-error">{stats.error}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-warning">{stats.partial}</div>
            <div className="text-xs text-muted-foreground">Partial</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-status-pending">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="px-6 pb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by address..."
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
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Failed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        <Card className="bg-card border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-8"></TableHead>
                <TableHead className="text-muted-foreground">Property</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Fields</TableHead>
                <TableHead className="text-muted-foreground">Whise ID</TableHead>
                <TableHead className="text-muted-foreground">Duration</TableHead>
                <TableHead className="text-muted-foreground">Timestamp</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <>
                  <TableRow key={log.id} className="border-border hover:bg-secondary/50">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            expandedRow === log.id && "transform rotate-180",
                          )}
                        />
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{log.propertyAddress}</TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-status-success">{log.fieldsUpdated}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className={log.fieldsFailed > 0 ? "text-status-error" : "text-muted-foreground"}>
                          {log.fieldsFailed}
                        </span>
                        <span className="text-xs text-muted-foreground">updated/failed</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.whisePropertyId ? (
                        <code className="text-xs bg-secondary px-2 py-1 rounded font-mono">{log.whisePropertyId}</code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.duration > 0 ? `${log.duration}ms` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(log.timestamp).toLocaleDateString("nl-BE", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.status === "error" && (
                        <Button variant="ghost" size="sm" onClick={() => handleRetry(log.id)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Push Details</DialogTitle>
                            <DialogDescription>{log.propertyAddress}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4">
                              <StatusBadge status={log.status} />
                              <span className="text-sm text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString("nl-BE")}
                              </span>
                              {log.retryCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {log.retryCount} retries
                                </Badge>
                              )}
                            </div>

                            {log.errorMessage && (
                              <Card className="bg-status-error/10 border-status-error/30">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm flex items-center gap-2 text-status-error">
                                    <XCircle className="h-4 w-4" />
                                    Error
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-foreground">{log.errorMessage}</p>
                                  {log.errorCode && (
                                    <code className="text-xs text-muted-foreground mt-2 block">{log.errorCode}</code>
                                  )}
                                </CardContent>
                              </Card>
                            )}

                            <JsonViewer data={log.payload} title="Request Payload" />
                            {log.response && <JsonViewer data={log.response} title="Response" />}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                  {expandedRow === log.id && (
                    <TableRow
                      key={`${log.id}-expanded`}
                      className="bg-secondary/30 hover:bg-secondary/30 border-border"
                    >
                      <TableCell colSpan={8} className="py-4">
                        <div className="space-y-4 px-4">
                          {log.errorMessage && (
                            <div className="rounded-lg bg-status-error/10 border border-status-error/30 p-4">
                              <div className="flex items-start gap-2">
                                <XCircle className="h-4 w-4 text-status-error mt-0.5" />
                                <div>
                                  <p className="text-sm text-foreground">{log.errorMessage}</p>
                                  {log.errorCode && (
                                    <code className="text-xs text-muted-foreground mt-1 block">{log.errorCode}</code>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">Request Payload</span>
                              <pre className="mt-1 rounded-lg bg-secondary p-3 text-xs font-mono text-foreground overflow-x-auto max-h-[150px] overflow-y-auto">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">Response</span>
                              <pre className="mt-1 rounded-lg bg-secondary p-3 text-xs font-mono text-foreground overflow-x-auto max-h-[150px] overflow-y-auto">
                                {log.response ? JSON.stringify(log.response, null, 2) : "No response yet"}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  )
}
