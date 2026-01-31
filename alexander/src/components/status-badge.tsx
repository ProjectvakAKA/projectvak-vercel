import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export type DocumentStatus = "parsed" | "needs_review" | "pushed" | "error" | "pending" | "missing"

const statusConfig: Record<DocumentStatus, { label: string; className: string }> = {
  missing: {
    label: "Missing",
    className: "bg-muted text-muted-foreground border-muted",
  },
  parsed: {
    label: "Parsed",
    className: "bg-status-success/20 text-status-success border-status-success/30",
  },
  needs_review: {
    label: "Needs Review",
    className: "bg-status-warning/20 text-status-warning border-status-warning/30",
  },
  pushed: {
    label: "Pushed",
    className: "bg-primary/20 text-primary border-primary/30",
  },
  error: {
    label: "Error",
    className: "bg-status-error/20 text-status-error border-status-error/30",
  },
  pending: {
    label: "Pending",
    className: "bg-status-pending/20 text-status-pending border-status-pending/30",
  },
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  )
}
