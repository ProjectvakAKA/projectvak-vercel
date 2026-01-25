"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Inbox, Home, ChevronLeft, ChevronRight, FileText, Building2, Zap, Shield, MapPin, Droplets, Fuel } from "lucide-react"

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Huurcontracten", href: "/contracts", icon: FileText },
  { name: "Eigendomstitel", href: "/contracts/eigendomstitel", icon: FileText },
  { name: "Energieprestatiecertificaat", href: "/contracts/epc", icon: Zap },
  { name: "Elektrische", href: "/contracts/elektrische", icon: Zap },
  { name: "Bodemattest", href: "/contracts/bodemattest", icon: FileText },
  { name: "Asbestattest", href: "/contracts/asbestattest", icon: Shield },
  { name: "Stedenbouwkundig", href: "/contracts/stedenbouwkundig", icon: MapPin },
  { name: "Kadastraal", href: "/contracts/kadastraal", icon: MapPin },
  { name: "Post-interventiedossier", href: "/contracts/post-interventiedossier", icon: FileText },
  { name: "Watertoets", href: "/contracts/watertoets", icon: Droplets },
  { name: "Stookolietankattest", href: "/contracts/stookolietankattest", icon: Fuel },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-border px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-foreground text-sm">Document Hub</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href)) ||
              (item.href === "/" && pathname === "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
