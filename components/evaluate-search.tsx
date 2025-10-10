"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart } from "lucide-react"

export function EvaluateSearch() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">Evaluate Search</h2>
        <p className="text-muted-foreground">Analyze and evaluate search performance</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Search Evaluation
          </CardTitle>
          <CardDescription>
            Evaluate your search results and measure performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BarChart className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Evaluation tools coming soon</p>
            <p className="text-sm mt-2">This feature will allow you to evaluate and score search results</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
