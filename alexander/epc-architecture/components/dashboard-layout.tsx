"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Home, ChevronLeft, Building2, Menu, Search } from "lucide-react"
import { SidebarContext } from "@/components/sidebar-context"

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Huizen", href: "/huizen", icon: Building2 },
  { name: "Zoeken", href: "/zoeken", icon: Search },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Sluit mobiel menu bij navigatie
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="flex min-h-[100dvh] h-screen bg-background min-w-0">
        {/* Mobiele menuknop: alleen zichtbaar op kleine schermen */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-10 flex items-center gap-2 px-3 border-b border-border bg-sidebar shrink-0">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setMobileOpen(true)} title="Menu openen" aria-label="Menu openen">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-foreground text-sm truncate">Document Hub</span>
        </div>

        {/* Sidebar: op desktop altijd zichtbaar, op mobiel overlay */}
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-sidebar transition-all duration-300 z-50",
            "md:relative md:flex",
            collapsed ? "w-16" : "w-64",
            mobileOpen ? "fixed inset-y-0 left-0 md:relative" : "hidden md:flex",
          )}
        >
          {/* Logo + toggle bovenaan; op mobiel ook sluitknop */}
          <div className="flex h-10 items-center border-b border-border px-2 gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-0",
                collapsed && "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              )}
              onClick={() => { if (collapsed) setCollapsed(false); setMobileOpen(false); }}
              title={collapsed ? "Sidebar uitklappen" : "Document Hub"}
            >
              <Building2 className={cn("h-4 w-4", collapsed ? "text-primary-foreground" : "text-primary")} />
            </Button>
            {!collapsed && (
              <>
                <span className="font-semibold text-foreground text-sm truncate flex-1">Document Hub</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setCollapsed(true); setMobileOpen(false); }} title="Sidebar inklappen">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href)) ||
                (item.href === "/" && pathname === "/")
              // Op /huizen: klik op "Huizen" in sidebar = terug naar niveau 1 (zelfde pagina, andere state)
              const isHuizenPage = item.href === "/huizen" && pathname === "/huizen"
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    if (isHuizenPage) {
                      e.preventDefault()
                      window.dispatchEvent(new CustomEvent("huizen-reset-level1"))
                    }
                  }}
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
        </aside>

        {/* Overlay op mobiel wanneer sidebar open */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden />
        )}

        {/* Main: op mobiel overflow-auto + touch scroll (iOS); op desktop overflow-hidden */}
        <main
          className="flex-1 min-h-0 min-w-0 overflow-auto md:overflow-hidden pt-10 md:pt-0"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  )
}
