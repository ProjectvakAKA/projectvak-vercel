"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Home, ChevronLeft, Building2 } from "lucide-react"
import { SidebarContext } from "@/components/sidebar-context"

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Huizen", href: "/huizen", icon: Building2 },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-sidebar transition-all duration-300",
            collapsed ? "w-16" : "w-64",
          )}
        >
          {/* Logo + toggle bovenaan: blauwe knop om uit te klappen wanneer ingeklapt */}
          <div className="flex h-10 items-center border-b border-border px-2 gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-0",
                collapsed && "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              )}
              onClick={() => collapsed && setCollapsed(false)}
              title={collapsed ? "Sidebar uitklappen" : "Document Hub"}
            >
              <Building2 className={cn("h-4 w-4", collapsed ? "text-primary-foreground" : "text-primary")} />
            </Button>
            {!collapsed && (
              <>
                <span className="font-semibold text-foreground text-sm truncate flex-1">Document Hub</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setCollapsed(true)} title="Sidebar inklappen">
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

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </SidebarContext.Provider>
  )
}
