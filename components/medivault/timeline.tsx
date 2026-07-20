"use client"

import { useMemo, useState } from "react"
import { FileText, Stethoscope, MapPin, CalendarDays, FileX } from "lucide-react"
import { ScreenHeader, Chip, EmptyState, ModalShell } from "./shared"
import type { MedicalReport, UserProfile } from "@/lib/store"

const FILTERS = ["All", "Cardiologist", "Dentist", "General Physician", "Dermatologist", "Orthopedic"]

export function Timeline({
  user,
  onBack,
  showBack = true,
}: {
  user: UserProfile
  onBack?: () => void
  showBack?: boolean
}) {
  const [filter, setFilter] = useState("All")
  const [selected, setSelected] = useState<MedicalReport | null>(null)

  const reports = useMemo(() => {
    const sorted = [...user.reports].sort((a, b) => b.createdAt - a.createdAt)
    if (filter === "All") return sorted
    return sorted.filter((r) => r.specialization.toLowerCase().includes(filter.toLowerCase().split(" ")[0]))
  }, [user.reports, filter])

  return (
    <div className="flex h-full flex-col bg-secondary">
      <ScreenHeader
        title="Medical Timeline"
        subtitle={`${user.reports.length} report${user.reports.length === 1 ? "" : "s"}`}
        onBack={showBack ? onBack : undefined}
      />

      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {FILTERS.map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={<FileX className="h-7 w-7" />}
          title="No reports yet"
          hint="Tap the + button to add a medical report through a verified doctor."
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <ol className="relative border-l-2 border-border pl-5">
            {reports.map((r) => (
              <li key={r.id} className="mb-4 last:mb-0">
                <span className="absolute -left-[9px] mt-4 h-4 w-4 rounded-full border-2 border-card bg-accent" />
                <button
                  type="button"
                  onClick={() => setSelected(r)}
                  className="w-full rounded-2xl bg-card p-4 text-left shadow-sm transition hover:shadow-md hover:shadow-primary/10"
                >
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-accent">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {r.date}
                    {r.time ? ` \u00b7 ${r.time}` : ""}
                  </div>
                  <p className="font-bold text-foreground">{r.doctorName}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-primary">
                    <Stethoscope className="h-4 w-4" />
                    {r.specialization}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {r.clinic || "Clinic not specified"}
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {selected && (
        <ModalShell
          title="View Report"
          subtitle={`${selected.specialization} \u00b7 ${selected.date}`}
          onClose={() => setSelected(null)}
        >
          <ReportView report={selected} patient={user.name} />
        </ModalShell>
      )}
    </div>
  )
}

function ReportView({ report, patient }: { report: MedicalReport; patient: string }) {
  return (
    <div className="p-5">
      {/* Simulated PDF page */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-inner">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            <span className="font-bold">Medical Report</span>
          </div>
          <span className="text-xs text-muted-foreground">PDF</span>
        </div>
        <dl className="mt-4 space-y-2.5 text-sm">
          <Row label="Patient" value={patient} />
          <Row label="Attending Doctor" value={report.doctorName} />
          <Row label="Specialization" value={report.specialization} />
          <Row label="Clinic / Hospital" value={report.clinic || "—"} />
          <Row label="Date & Time" value={`${report.date}${report.time ? ` ${report.time}` : ""}`} />
          <Row label="License No." value={report.licenseNumber || "—"} />
          <Row label="Document" value={report.fileName || "report.pdf"} />
        </dl>
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Clinical Notes
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {report.notes || "No additional notes were provided with this report."}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-xs font-medium text-accent">
          <Stethoscope className="h-4 w-4" />
          Verified upload from licensed provider
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  )
}
