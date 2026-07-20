"use client"

import { Sparkles } from "lucide-react"
import { REPORTS, type Severity } from "@/lib/meditag-data"

const SEVERITY_STYLE: Record<Severity, { dot: string; label: string; text: string; ring: string }> = {
  green: { dot: "bg-emerald-500", label: "Normal", text: "text-emerald-700", ring: "border-emerald-200 bg-emerald-50" },
  yellow: { dot: "bg-amber-500", label: "Monitor", text: "text-amber-700", ring: "border-amber-200 bg-amber-50" },
  red: { dot: "bg-destructive", label: "Attention", text: "text-red-700", ring: "border-red-200 bg-red-50" },
}

export function AIHealthSummary() {
  return (
    <div className="min-h-full bg-background pb-8">
      <div className="rounded-b-[2rem] bg-gradient-to-b from-primary to-sky-400 px-5 pb-6 pt-12 text-primary-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <h1 className="text-xl font-bold">AI Health Summary</h1>
        </div>
        <p className="mt-1 text-sm opacity-90">Your reports explained in plain language</p>
      </div>

      <div className="space-y-3 px-5 pt-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm leading-relaxed text-foreground">
            Overall you&apos;re doing well. A few numbers — blood sugar, cholesterol and blood pressure — are slightly
            above target and worth keeping an eye on. Nothing here is urgent.
          </p>
        </div>

        {REPORTS.map((r) => {
          const sev = SEVERITY_STYLE[r.aiSeverity]
          return (
            <div key={r.id} className={`rounded-2xl border p-4 ${sev.ring}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{r.title}</p>
                <span className={`flex items-center gap-1 text-xs font-bold ${sev.text}`}>
                  <span className={`h-2 w-2 rounded-full ${sev.dot}`} />
                  {sev.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(r.date).toLocaleDateString()} · {r.specialty}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{r.aiExplanation}</p>
            </div>
          )
        })}

        <p className="px-1 pt-1 text-[11px] leading-relaxed text-muted-foreground">
          AI summaries are for understanding only and don&apos;t replace advice from your doctor.
        </p>
      </div>
    </div>
  )
}
