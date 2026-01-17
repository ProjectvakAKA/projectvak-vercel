"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckCircle2,
  Link2,
  FolderOpen,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Folder,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mock Dropbox data
const mockFolders = [
  {
    id: "1",
    name: "Immodôme",
    path: "/Immodôme",
    children: [
      {
        id: "1-1",
        name: "Properties",
        path: "/Immodôme/Properties",
        children: [
          { id: "1-1-1", name: "Kerkstraat 123", path: "/Immodôme/Properties/Kerkstraat 123", children: [] },
          { id: "1-1-2", name: "Veldstraat 45", path: "/Immodôme/Properties/Veldstraat 45", children: [] },
          { id: "1-1-3", name: "Brugstraat 78", path: "/Immodôme/Properties/Brugstraat 78", children: [] },
        ],
      },
      {
        id: "1-2",
        name: "Archive",
        path: "/Immodôme/Archive",
        children: [],
      },
    ],
  },
  {
    id: "2",
    name: "Shared Folders",
    path: "/Shared Folders",
    children: [
      {
        id: "2-1",
        name: "Team Documents",
        path: "/Shared Folders/Team Documents",
        children: [],
      },
    ],
  },
]

interface FolderNode {
  id: string
  name: string
  path: string
  children: FolderNode[]
}

function FolderTree({
  folders,
  selectedFolders,
  onToggle,
  level = 0,
}: {
  folders: FolderNode[]
  selectedFolders: Set<string>
  onToggle: (path: string) => void
  level?: number
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["1", "1-1"]))

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpanded(newExpanded)
  }

  return (
    <div className="space-y-1">
      {folders.map((folder) => (
        <div key={folder.id}>
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/50 transition-colors",
              level > 0 && "ml-4",
            )}
          >
            {folder.children.length > 0 ? (
              <button onClick={() => toggleExpand(folder.id)} className="p-0.5 hover:bg-secondary rounded">
                {expanded.has(folder.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}
            <Checkbox
              checked={selectedFolders.has(folder.path)}
              onCheckedChange={() => onToggle(folder.path)}
              id={folder.id}
            />
            <Folder className="h-4 w-4 text-muted-foreground" />
            <label htmlFor={folder.id} className="text-sm text-foreground cursor-pointer flex-1">
              {folder.name}
            </label>
          </div>
          {expanded.has(folder.id) && folder.children.length > 0 && (
            <FolderTree
              folders={folder.children}
              selectedFolders={selectedFolders}
              onToggle={onToggle}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function ConnectionsPage() {
  const [isConnected, setIsConnected] = useState(true)
  const [showFolderDialog, setShowFolderDialog] = useState(false)
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set(["/Immodôme/Properties"]))
  const [lastSync, setLastSync] = useState(new Date("2024-01-15T10:30:00Z"))

  const toggleFolder = (path: string) => {
    const newSelected = new Set(selectedFolders)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    setSelectedFolders(newSelected)
  }

  const handleConnect = () => {
    // In real app, this would trigger OAuth flow
    setIsConnected(true)
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setSelectedFolders(new Set())
  }

  const handleSync = () => {
    setLastSync(new Date())
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Connections</h1>
          <p className="text-sm text-muted-foreground">Manage your Dropbox integration and watched folders</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl space-y-6">
          {/* Dropbox Connection Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0061FF]/20">
                    <svg viewBox="0 0 43 40" className="h-6 w-6" fill="#0061FF">
                      <path d="M12.5 0L0 8.1l8.6 6.9 12.5-7.7L12.5 0zM0 22l12.5 8.1 8.6-7.2-12.5-7.7L0 22zm21.1.9l8.6 7.2L42.2 22l-8.6-6.9-12.5 7.8zm21.1-14.8L29.7 0l-8.6 7.3 12.5 7.7 8.6-6.9zM21.2 24.5L12.5 31.6 8.6 28.9V32l12.6 7.6 12.5-7.6v-3.1l-3.9 2.7-8.6-7.1z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-foreground">Dropbox</CardTitle>
                    <CardDescription>Sync EPC documents from your Dropbox folders</CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1",
                    isConnected
                      ? "bg-status-success/20 text-status-success border-status-success/30"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {isConnected ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </>
                  ) : (
                    "Not Connected"
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConnected ? (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                        <span className="text-sm font-semibold text-foreground">ID</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">immodome@example.com</div>
                        <div className="text-xs text-muted-foreground">
                          Last synced: {lastSync.toLocaleString("nl-BE")}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleSync} className="gap-2 bg-transparent">
                        <RefreshCw className="h-4 w-4" />
                        Sync
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnect}
                        className="text-destructive hover:text-destructive bg-transparent"
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                    <Link2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">Connect your Dropbox</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
                    Connect your Dropbox account to automatically discover and sync EPC documents
                  </p>
                  <Button onClick={handleConnect} className="gap-2">
                    <svg viewBox="0 0 43 40" className="h-4 w-4" fill="currentColor">
                      <path d="M12.5 0L0 8.1l8.6 6.9 12.5-7.7L12.5 0zM0 22l12.5 8.1 8.6-7.2-12.5-7.7L0 22zm21.1.9l8.6 7.2L42.2 22l-8.6-6.9-12.5 7.8zm21.1-14.8L29.7 0l-8.6 7.3 12.5 7.7 8.6-6.9zM21.2 24.5L12.5 31.6 8.6 28.9V32l12.6 7.6 12.5-7.6v-3.1l-3.9 2.7-8.6-7.1z" />
                    </svg>
                    Connect Dropbox
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Watched Folders */}
          {isConnected && (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <FolderOpen className="h-5 w-5" />
                      Watched Folders
                    </CardTitle>
                    <CardDescription>Select folders to monitor for EPC documents</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFolderDialog(true)}
                    className="bg-transparent"
                  >
                    Configure
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedFolders.size > 0 ? (
                  <div className="space-y-2">
                    {Array.from(selectedFolders).map((path) => (
                      <div key={path} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-4 py-3">
                        <Folder className="h-4 w-4 text-primary" />
                        <span className="text-sm font-mono text-foreground">{path}</span>
                        <Badge variant="secondary" className="ml-auto">
                          Watching
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-10 w-10 text-status-warning mb-3" />
                    <h3 className="text-sm font-medium text-foreground">No folders selected</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select folders to start monitoring for EPC documents
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 bg-transparent"
                      onClick={() => setShowFolderDialog(true)}
                    >
                      Select Folders
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Whise Connection Preview */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                    <span className="text-lg font-bold text-primary">W</span>
                  </div>
                  <div>
                    <CardTitle className="text-foreground">Whise CRM</CardTitle>
                    <CardDescription>Push extracted EPC data to Whise</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-status-pending/20 text-status-pending border-status-pending/30">
                  Coming Soon
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Whise integration will be configured once API credentials are available. Extracted EPC data will be
                automatically pushed to matching property records.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Folder Selection Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Watched Folders</DialogTitle>
            <DialogDescription>
              Choose which Dropbox folders to monitor for EPC documents. Subfolders will be included automatically.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px] rounded-lg border border-border p-4">
            <FolderTree folders={mockFolders} selectedFolders={selectedFolders} onToggle={toggleFolder} />
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowFolderDialog(false)}>Save Selection</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
