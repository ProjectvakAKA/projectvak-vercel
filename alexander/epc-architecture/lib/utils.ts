import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** ISO-datum (YYYY-MM-DD) of ISO-datetime naar Nederlands formaat (DD-MM-YYYY). Anders ongewijzigd. */
export function formatDateForDisplay(value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})/
  const m = s.match(iso)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return s
}
