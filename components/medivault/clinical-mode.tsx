"use client"

import { useState } from "react"
import { Activity, BadgeCheck, CalendarDays, Droplet, FileClock, HeartPulse, Home, LogOut, Phone, Search, ShieldCheck } from "lucide-react"
import { computeAge, type MedicalReport, type UserProfile } from "@/lib/store"
import type { PractitionerSession } from "./practitioner-scan"
import { FileViewer } from "./file-viewer"

type InsuranceSummary = {
  provider_name: string
  plan_name: string
  plan_type: string
  policy_number: string
  member_id: string
  group_number: string
  helpline_phone: string
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
}

type ClinicalTab = "home" | "timeline"
type PractitionerLookupResponse = { error?: string; patient?: Record<string, unknown>; insurance?: unknown }

async function requestPractitionerLookup(cardId: string, mmcId: string) {
  const response = await fetch("/api/practitioner/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId, mmcId }),
  })
  const result = await response.json() as PractitionerLookupResponse
  return { response, result }
}

export function ClinicalMode({
  session,
  onExit,
}: {
  session: PractitionerSession
  onExit: () => void
}) {
  const [cardId, setCardId] = useState("")
  const [patient, setPatient] = useState<UserProfile | null>(null)
  const [insurance, setInsurance] = useState<InsuranceSummary | null>(null)
  const [tab, setTab] = useState<ClinicalTab>("home")
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [viewer, setViewer] = useState<{ url: string; name: string } | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  async function findPatient(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const id = cardId.trim().toUpperCase()
    if (!id) {
      setLookupError("Enter the patient's Card ID.")
      return
    }
    setLoading(true)
    setLookupError(null)
    setPatient(null)
    setInsurance(null)

    try {
      const { response, result } = await requestPractitionerLookup(id, session.registrationNumber)
      if (!response.ok || !result.patient) {
        setLookupError(result.error ?? "No patient found, or practitioner access could not be verified.")
        return
      }

      const record = result.patient
      const reportRows = Array.isArray(record.reports) ? record.reports as Record<string, unknown>[] : []
      const reports: MedicalReport[] = reportRows.map((report) => ({
        id: String(report.id ?? ""),
        doctorName: String(report.doctor_name ?? ""),
        specialization: String(report.specialization ?? ""),
        clinic: String(report.clinic ?? ""),
        date: String(report.date ?? ""),
        time: String(report.time ?? ""),
        licenseNumber: String(report.license_number ?? ""),
        fileName: String(report.file_name ?? ""),
        notes: String(report.notes ?? ""),
        createdAt: Number(report.created_at ?? 0),
        fileUrl: typeof report.fileUrl === "string" ? report.fileUrl : undefined,
        uploadedByRole: report.uploaded_by_role === "practitioner" ? "practitioner" : "patient",
        doctorMmcId: typeof report.doctor_mmc_id === "string" ? report.doctor_mmc_id : undefined,
      }))
      setPatient({
        name: String(record.name ?? ""),
        dob: String(record.dob ?? ""),
        bloodGroup: String(record.blood_group ?? ""),
        gender: String(record.gender ?? ""),
        email: "",
        password: "",
        cardId: String(record.card_id ?? id),
        mainProfileId: "",
        trialEndsAt: "",
        subscriptionStatus: "",
        subscriptionPlan: "",
        allergies: Array.isArray(record.allergies) ? record.allergies.map(String) : [],
        conditions: Array.isArray(record.conditions) ? record.conditions.map(String) : [],
        medications: Array.isArray(record.medications) ? record.medications.map(String) : [],
        contacts: Array.isArray(record.contacts) ? record.contacts as UserProfile["contacts"] : [],
        reports,
        dependents: [],
      })
      setInsurance(result.insurance && typeof result.insurance === "object" ? result.insurance as InsuranceSummary : null)
      setTab("home")
    } catch {
      setLookupError("Practitioner lookup is temporarily unavailable. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function openReportFile(report: MedicalReport) {
    setFileError(null)
    if (!patient) return
    try {
      const { response, result } = await requestPractitionerLookup(patient.cardId, session.registrationNumber)
      if (!response.ok || !result.patient) {
        setFileError("Practitioner access could not be refreshed. Search for the patient again.")
        return
      }
      const reports = Array.isArray(result.patient.reports) ? result.patient.reports as Record<string, unknown>[] : []
      const refreshedReport = reports.find((item) => String(item.id ?? "") === report.id)
      const fileUrl = typeof refreshedReport?.fileUrl === "string" ? refreshedReport.fileUrl : null
      if (!fileUrl) {
        setFileError("The private report is unavailable. Please try again.")
        return
      }
      setViewer({ url: fileUrl, name: report.fileName || "Medical report" })
    } catch {
      setFileError("The private report could not be opened. Please try again.")
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-4 sm:px-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><ShieldCheck className="size-5" /></span>
        <div className="min-w-0 flex-1"><h1 className="text-base font-bold text-foreground">Practitioner portal</h1><p className="truncate text-xs text-muted-foreground">{session.doctorName || "Verified practitioner"} · MMC {session.registrationNumber}</p></div>
        <button type="button" onClick={onExit} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground"><LogOut className="size-4" /> Exit</button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="rounded-3xl border border-accent/20 bg-accent/5 p-4"><div className="flex items-start gap-3"><BadgeCheck className="mt-0.5 size-5 shrink-0 text-accent" /><div><p className="text-sm font-bold text-foreground">Verified, read-only access</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Patient records can only be viewed. This portal has no add, edit, upload, or delete actions.</p></div></div></div>

          <form onSubmit={(event) => void findPatient(event)} className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs font-semibold text-muted-foreground">Patient Card ID<input value={cardId} onChange={(event) => { setCardId(event.target.value.toUpperCase()); setLookupError(null) }} placeholder="LV-1000" autoComplete="off" className="mt-1.5 w-full rounded-xl border border-border bg-input px-3 py-3 text-sm font-semibold tracking-wide text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"><Search className="size-4" />{loading ? "Searching…" : "Find patient"}</button>
          </form>
          {lookupError && <p role="alert" className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{lookupError}</p>}

          {patient && <>
            <div className="mt-6 flex flex-col gap-4 border-b border-border sm:flex-row sm:items-end sm:justify-between">
              <div className="pb-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Patient record</p><h2 className="mt-1 text-2xl font-bold text-foreground">{patient.name || "Patient"}</h2><p className="mt-1 text-sm text-muted-foreground">{patient.cardId} · {computeAge(patient.dob) ?? "Age not recorded"}{computeAge(patient.dob) !== null ? " years" : ""}</p></div>
              <div role="tablist" aria-label="Patient record sections" className="flex gap-1">
                <ClinicalTabButton active={tab === "home"} onClick={() => setTab("home")}><Home className="size-4" />Home</ClinicalTabButton>
                <ClinicalTabButton active={tab === "timeline"} onClick={() => setTab("timeline")}><FileClock className="size-4" />Medical Timeline</ClinicalTabButton>
              </div>
            </div>

            {tab === "home" ? <section role="tabpanel" className="grid gap-4 py-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex items-center gap-2"><Activity className="size-5 text-primary" /><h3 className="font-bold text-foreground">Critical health details</h3></div><div className="grid grid-cols-2 gap-3"><ClinicalValue icon={<Droplet className="size-4" />} label="Blood group" value={patient.bloodGroup || "Not recorded"} /><ClinicalValue icon={<CalendarDays className="size-4" />} label="Date of birth" value={patient.dob || "Not recorded"} /></div><ClinicalList title="Vitals & telemetry" values={[]} /><ClinicalList title="Allergies" values={patient.allergies} /><ClinicalList title="Conditions" values={patient.conditions} /><ClinicalList title="Current medications" values={patient.medications} /></div>
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-border bg-card p-5"><div className="mb-3 flex items-center gap-2"><Phone className="size-5 text-primary" /><h3 className="font-bold text-foreground">Emergency contacts</h3></div>{patient.contacts.length ? <ul className="flex flex-col gap-2">{patient.contacts.map((contact) => <li key={contact.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{contact.name}</p><p className="text-xs text-muted-foreground">{contact.relation}</p></div><a href={`tel:${contact.phone}`} aria-label={`Call ${contact.name}`} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">{contact.phone || "Call"}</a></li>)}</ul> : <p className="text-sm text-muted-foreground">No emergency contacts recorded.</p>}</div>
                {insurance && <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5"><div className="mb-3 flex items-center gap-2"><HeartPulse className="size-5 text-accent" /><h3 className="font-bold text-foreground">Active health insurance</h3></div><p className="text-sm font-bold text-foreground">{insurance.provider_name}</p><p className="mt-0.5 text-xs text-muted-foreground">{insurance.plan_name || insurance.plan_type} · {insurance.plan_type}</p><dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">{insurance.policy_number && <SafeCoverageValue label="Policy" value={insurance.policy_number} />}{insurance.member_id && <SafeCoverageValue label="Member" value={insurance.member_id} />}{insurance.group_number && <SafeCoverageValue label="Group" value={insurance.group_number} />}{insurance.valid_until && <SafeCoverageValue label="Valid until" value={insurance.valid_until} />}</dl>{insurance.helpline_phone && <a href={`tel:${insurance.helpline_phone}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary underline"><Phone className="size-4" />Call insurance helpline</a>}</div>}
              </div>
            </section> : <section role="tabpanel" className="py-5"><div className="rounded-2xl border border-border bg-card p-5"><div className="mb-4 flex items-center gap-2"><FileClock className="size-5 text-primary" /><h3 className="font-bold text-foreground">Medical Timeline</h3></div>{fileError && <p role="alert" className="mb-3 text-sm text-destructive">{fileError}</p>}{patient.reports.length ? <ol className="flex flex-col gap-3">{patient.reports.map((report) => <li key={report.id} className="rounded-xl bg-secondary p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-foreground">{report.specialization || "Medical report"}</p><p className="mt-1 text-xs text-muted-foreground">{report.date || "Date not recorded"}{report.doctorName ? ` · ${report.doctorName}` : ""}{report.clinic ? ` · ${report.clinic}` : ""}</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">{report.uploadedByRole === "practitioner" ? "Practitioner record" : "Patient record"}</span></div>{report.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{report.notes}</p>}{report.fileUrl && <button type="button" onClick={() => void openReportFile(report)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-primary"><FileClock className="size-4" />View {report.fileName || "attached file"}</button>}</li>)}</ol> : <p className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">No medical timeline records are available.</p>}</div></section>}
          </>}
        </div>
      </div>
      {viewer && <FileViewer fileName={viewer.name} fileUrl={viewer.url} onClose={() => setViewer(null)} />}
    </div>
  )
}

function ClinicalTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`flex items-center gap-2 rounded-t-xl px-3 py-3 text-xs font-semibold sm:text-sm ${active ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>{children}</button>
}

function ClinicalValue({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl bg-secondary p-3"><div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span></div><p className="mt-2 text-lg font-bold text-foreground">{value}</p></div>
}

function ClinicalList({ title, values }: { title: string; values: string[] }) {
  return <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>{values.length ? <ul className="mt-2 flex flex-wrap gap-2">{values.map((value) => <li key={value} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{value}</li>)}</ul> : <p className="mt-1 text-sm text-foreground">None recorded</p>}</div>
}

function SafeCoverageValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-muted-foreground">{label}</dt><dd className="mt-0.5 font-semibold text-foreground">{value}</dd></div>
}

