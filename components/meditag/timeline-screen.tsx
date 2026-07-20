"use client"

import { useMemo, useState } from "react"
import { ArrowUpDown, Lock, X, MapPin, Stethoscope, FileText } from "lucide-react"
import { REPORTS, SPECIALTIES, type MedicalReport, type Specialty, type Severity } from "@/lib/meditag-data"

const SEVERITY_STYLE: Record<Severity, { dot: string; label: string; text: string; bg: string }> = {
  green: { dot: "bg-emerald-500", label: "Normal", text: "text-emerald-700", bg: "bg-emerald-50" },
  yellow: { dot: "bg-amber-500", label: "Monitor", text: "text-amber-700", bg: "bg-amber-50" },
  red: { dot: "bg-destructive", label: "Attention", text: "text-red-700", bg: "bg-red-50" },
}

function ReportModal({ report, onClose }: { report: MedicalReport; onClose: () => void }) {
  const sev = SEVERITY_STYLE[report.aiSeverity]
  return (
    <div className="absolute inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85%] w-full overflow-y-auto rounded-t-[2rem] bg-card p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold text-foreground">{report.title}</p>
            <p className="text-xs text-muted-foreground">{new Date(report.date).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-secondary p-2 text-secondary-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" /> {report.hospital}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Stethoscope className="h-4 w-4 text-primary" /> {report.doctor} · {report.specialty}
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-primary" /> {report.licenseId}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-secondary/60 p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Clinical Findings</p>
          <p className="text-sm leading-relaxed text-foreground">{report.summary}</p>
        </div>

        <div className={`mt-3 rounded-2xl p-4 ${sev.bg}`}>
          <div className="mb-1 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${sev.dot}`} />
            <p className={`text-xs font-bold uppercase tracking-wide ${sev.text}`}>AI Summary · {sev.label}</p>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{report.aiExplanation}</p>
        </div>
      </div>
    </div>
  )
}

export function TimelineScreen() {
  const [specialty, setSpecialty] = useState<Specialty>("All")
  const [newestFirst, setNewestFirst] = useState(true)
  const [active, setActive] = useState<MedicalReport | null>(null)

  const filtered = useMemo(() => {
    const list = REPORTS.filter((r) => specialty === "All" || r.specialty === specialty)
    return [...list].sort((a, b) =>
      newestFirst ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
    )
  }, [specialty, newestFirst])

  return (
    <div className="relative min-h-full bg-background pb-8">
      <div className="sticky top-0 z-20 bg-background/90 px-5 pb-3 pt-12 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Medical Timeline</h1>
          <button
            onClick={() => setNewestFirst((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
            {newestFirst ? "Newest" : "Oldest"}
          </button>
        </div>

        {/* Specialty filter tabs */}
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SPECIALTIES.map((s) => (
            <button
              key={s}
              onClick={() => setSpecialty(s)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                specialty === s
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative mt-2 px-5">
        <div className="absolute bottom-2 left-[2.15rem] top-2 w-px bg-border" />
        <div className="space-y-4">
          {filtered.map((r) => {
            const sev = SEVERITY_STYLE[r.aiSeverity]
            return (
              <div key={r.id} className="relative pl-9">
                <span className={`absolute left-2 top-4 h-3.5 w-3.5 rounded-full border-2 border-background ${sev.dot}`} />
                <button
                  onClick={() => setActive(r)}
                  className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sev.bg} ${sev.text}`}>
                      {sev.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.hospital}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Stethoscope className="h-3.5 w-3.5 text-primary" /> {r.doctor}
                    <Lock className="ml-auto h-3.5 w-3.5" />
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <FileText className="h-3.5 w-3.5" /> View Full Report
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {active && <ReportModal report={active} onClose={() => setActive(null)} />}
    </div>
  )
}
