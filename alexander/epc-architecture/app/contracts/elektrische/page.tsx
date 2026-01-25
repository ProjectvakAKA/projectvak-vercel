'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Zap } from 'lucide-react'

export default function ElektrischePage() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-yellow-500/20 via-yellow-500/10 to-yellow-500/5 border-2 border-yellow-500/20 flex items-center justify-center shrink-0 shadow-sm">
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Elektrische</h1>
              <p className="text-sm text-muted-foreground">Geanalyseerde elektrische certificaten en hun geëxtraheerde data uit Dropbox</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/contracts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Elektrische Certificaten</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Deze functionaliteit wordt binnenkort beschikbaar.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
