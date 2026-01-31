'use client'

import { createContext, useContext } from 'react'

export type SidebarContextValue = {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

export const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  return ctx
}
