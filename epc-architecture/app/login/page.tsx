'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { User, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6 max-w-md mx-auto w-full">
        <div className="mb-8">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/20 flex items-center justify-center shrink-0 shadow-sm mb-4">
            <User className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Account</h1>
          <p className="text-muted-foreground mt-1">
            Hier kun je later inloggen om je kantoor te bekijken. Het inlogsysteem wordt nog toegevoegd.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Terug naar home
          </Button>
        </Link>
      </div>
    </div>
  )
}
