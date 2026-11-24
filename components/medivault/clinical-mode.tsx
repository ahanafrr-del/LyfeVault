"use client"

import { useRef, useState } from "react"
import {
  Stethoscope,
  LogOut,
  BadgeCheck,
  Tag,
  Search,
  UserCheck,
  UploadCloud,
  FileCheck2,
  PenLine,
  AlertCircle,
  CheckCircle2,
  Building2,
  Droplet,
} from "lucide-react"
import { computeAge, SPECIALIZATIONS, type StoreApi, type UserProfile } from "@/lib/store"
import type { PractitionerSession } from "./practitioner-scan"
import { supabase } from "@/lib/supabase"

/**
 * Approved Clinical Mode. Only reachable after a practitioner's medical license is
 * verified. The doctor looks up a patient/minor by Card/Tag ID, then attaches and signs
 * a clinical report that is written directly to that record's feed.
 */
export function ClinicalMode({
  store,
  session,
  onExit,
}: {
  store: StoreApi
  session: PractitionerSession
  onExit: () => void
}) {
  const [cardId, setCardId] = useState("")
  const [patient, setPatient] = useState<UserProfile | null>(null)
  const [showRecords, setShowRecords] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)

  const [specialization, setSpecialization] = useState("")
  const [clinic, setClinic] = useState(session.institution)
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [notes, setNotes] = useState("")
  const [fileName, setFileName] = useState("")
  const [dragging, setDragging] = useState(false)
  const [signed, setSigned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function findPatient() {
    setLookupError(null)
    const id = cardId.trim()
    if (!id) return setLookupError("Enter the patient's Card/Tag ID.")
    const { data, error } = await supabase.rpc("practitioner_lookup_patient", { p_card_id: id })
    if (error || !data) return setLookupError("No patient found for this Card/Tag ID.")
    const record = data as Record<string, unknown>
    const reportRows = Array.isArray(record.reports) ? record.reports as Record<string, unknown>[] : []
    const reports = await Promise.all(reportRows.map(async (report) => {
      const filePath = typeof report.file_path === "string" ? report.file_path : undefined
      const { data: signed } = filePath
        ? await supabase.storage.from("medical-reports").createSignedUrl(filePath, 900)
        : { data: null }
      return {
        id: String(report.id ?? ""), doctorName: String(report.doctor_name ?? ""),
        specialization: String(report.specialization ?? ""), clinic: String(report.clinic ?? ""),
        date: String(report.date ?? ""), time: String(report.time ?? ""),
        licenseNumber: String(report.license_number ?? ""), fileName: String(report.file_name ?? ""),
        notes: String(report.notes ?? ""), createdAt: Number(report.created_at ?? 0), filePath, fileUrl: signed?.signedUrl,
        uploadedByRole: report.uploaded_by_role === "practitioner" ? "practitioner" as const : "patient" as const,
        doctorMmcId: typeof report.doctor_mmc_id === "string" ? report.doctor_mmc_id : undefined,
      }
    }))
    setPatient({
      name: String(record.name ?? ""), dob: String(record.dob ?? ""), bloodGroup: String(record.blood_group ?? ""),
      gender: String(record.gender ?? ""), email: String(record.email ?? ""), password: "",
      cardId: String(record.card_id ?? ""), allergies: Array.isArray(record.allergies) ? record.allergies.map(String) : [],
      conditions: Array.isArray(record.conditions) ? record.conditions.map(String) : [],
      medications: Array.isArray(record.medications) ? record.medications.map(String) : [],
      contacts: Array.isArray(record.contacts) ? record.contacts as UserProfile["contacts"] : [], reports,
      dependents: [],
    })
    setShowRecords(false)
  }

  async function replaceOwnReport(reportId: string, filePath: string, file: File) {
    setError(null)
    if (!( ["application/pdf", "image/jpeg", "image/png"] as string[]).includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError("Choose a PDF, JPG, or PNG file smaller than 10 MB.")
      return
    }
    const { error: replaceError } = await supabase.storage.from("medical-reports").update(filePath, file, { contentType: file.type })
    if (replaceError) return setError("You can only update files uploaded under your own MMC registration.")
    const { error: metadataError } = await supabase.from("medical_reports").update({ file_name: file.name }).eq("id", reportId).eq("doctor_mmc_id", session.registrationNumber)
    if (metadataError) return setError("The file was replaced, but its label could not be updated.")
    await findPatient()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!patient) return
    if (!selectedFile) return setError("Choose a report file to upload.")
    if (!( ["application/pdf", "image/jpeg", "image/png"] as string[]).includes(selectedFile.type) || selectedFile.size > 10 * 1024 * 1024) {
      return setError("Choose a PDF, JPG, or PNG file smaller than 10 MB.")
    }
    if (!specialization || !date) return setError("Select a specialization and date.")
    if (!signed) return setError("Sign the report before attaching it to the patient feed.")
    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const mmcFolder = session.registrationNumber.replaceAll("/", "_")
    const filePath = `${mmcFolder}/${crypto.randomUUID()}/${safeName}`
    const { error: uploadError } = await supabase.storage.from("medical-reports").upload(filePath, selectedFile, {
      contentType: selectedFile.type,
      upsert: false,
    })
    if (uploadError) return setError("The file could not be uploaded. Check that PDF, JPG, or PNG files are under 10 MB.")
    const res = await store.addReportToCard(patient.cardId, {
      doctorName: session.doctorName,
      specialization,
      clinic: clinic.trim(),
      date,
      time,
      licenseNumber: session.registrationNumber,
      fileName: selectedFile.name,
      notes: notes.trim(),
      filePath,
      uploadedByRole: "practitioner",
      doctorMmcId: session.registrationNumber,
    }, {
      doctorName: session.doctorName,
      registrationNumber: session.registrationNumber,
      institution: session.institution,
      hospitalPhone: session.hospitalPhone,
    })
    if (!res.ok) {
      await supabase.storage.from("medical-reports").remove([filePath])
      return setError(res.error ?? "Could not attach the report.")
    }
    setSelectedFile(null)
    await findPatient()
    setSpecialization("")
    setDate("")
    setTime("")
    setNotes("")
    setFileName("")
    setSigned(false)
    setFlash(true)
    setTimeout(() => setFlash(false), 2500)
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <div className="flex h-full flex-col bg-secondary">
      {/* Clinical mode header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-primary px-4 py-3.5 text-primary-foreground">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
          <Stethoscope className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-base font-bold leading-tight">Approved Clinical Mode</h1>
            <BadgeCheck className="h-4 w-4 shrink-0 text-accent" />
          </div>
          <p className="truncate text-xs text-primary-foreground/80">
            {`${session.doctorName || "Verified practitioner"} \u00b7 ${session.registrationNumber}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit clinical mode"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-10">
        {/* Verified banner */}
        <div className="flex items-center gap-2 rounded-2xl border border-accent/20 bg-accent/5 p-3 text-accent">
          <BadgeCheck className="h-5 w-5 shrink-0" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            License verified against{" "}
            <span className="font-semibold text-foreground">{session.institution}</span>. You may
            attach and sign clinical reports on any patient or minor profile.
          </p>
        </div>

        {/* Patient lookup */}
        <div className="mt-4 rounded-2xl bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Search className="h-5 w-5" />
            <h2 className="font-bold text-foreground">Find Target Profile</h2>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Tag className="h-4 w-4" />
              </span>
              <input
                className={`${inputClass} pl-10 uppercase tracking-wider`}
                placeholder="Patient Card/Tag ID"
                value={cardId}
                onChange={(e) => {
                  setCardId(e.target.value)
                  setLookupError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) findPatient()
                }}
              />
            </div>
            <button
              type="button"
              onClick={findPatient}
              className="shrink-0 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:brightness-110"
            >
              Find
            </button>
          </div>
          {lookupError && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}
        </div>

        {patient && (
          <>
            {/* Patient identity */}
            <div className="mt-4 rounded-2xl bg-foreground p-4 text-background shadow-lg">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background/15">
                  <UserCheck className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold">{patient.name || "Patient"}</p>
                  <p className="truncate text-xs text-background/70">
                    {computeAge(patient.dob) !== null ? `${computeAge(patient.dob)} yrs` : "Age N/A"}
                    {` \u00b7 ${patient.cardId}`}
                    {` \u00b7 ${patient.reports.length} report(s)`}
                  </p>
                </div>
                <span className="flex flex-col items-center rounded-lg bg-background/15 px-2.5 py-1">
                  <Droplet className="h-3.5 w-3.5" />
                  <span className="text-sm font-black leading-none">{patient.bloodGroup || "N/A"}</span>
                </span>
              </div>
            </div>

            {flash && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-accent/10 px-3 py-2.5 text-sm font-semibold text-accent">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                Signed report attached to {patient.name.split(" ")[0] || "patient"}&apos;s feed.
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowRecords((current) => !current)}
              aria-expanded={showRecords}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-card py-3 text-sm font-bold text-primary"
            >
              <BadgeCheck className="size-4" />
              {showRecords ? "Hide Patient Records" : "View Patient Records · Read Only"}
            </button>

            {showRecords && (
              <section aria-label="Read-only patient records" className="mt-4 space-y-3">
                <ReadOnlySection title="Allergies" values={patient.allergies} />
                <ReadOnlySection title="Conditions" values={patient.conditions} />
                <ReadOnlySection title="Prescriptions & medications" values={patient.medications} />
                <ReadOnlySection title="Emergency contacts" values={patient.contacts.map((contact) => `${contact.name} · ${contact.relation} · ${contact.phone}`)} />
                <div className="rounded-2xl bg-card p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground">Medical timeline & files</h3>
                  {patient.reports.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">No medical reports are available for this profile.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {patient.reports.map((report) => (
                        <li key={report.id} className="rounded-xl border border-border p-3">
                          <p className="text-sm font-semibold text-foreground">{report.specialization || "Medical report"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{report.date} · {report.doctorName}{report.uploadedByRole === "practitioner" ? ` · MMC ${report.doctorMmcId}` : " · Patient upload"}</p>
                          {report.notes && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{report.notes}</p>}
                          {report.fileUrl && <a href={report.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-primary underline">View / download {report.fileName || "file"}</a>}
                          {report.uploadedByRole === "practitioner" && report.doctorMmcId === session.registrationNumber && report.filePath && (
                            <label className="mt-3 flex w-fit cursor-pointer items-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground">
                              Replace your file
                              <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" aria-label={`Replace ${report.fileName || "report"}`} onChange={(event) => {
                                const replacement = event.target.files?.[0]
                                if (replacement) void replaceOwnReport(report.id, report.filePath!, replacement)
                                event.currentTarget.value = ""
                              }} />
                            </label>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <ReadOnlySection title="Vitals & telemetry" values={[]} emptyText="No vitals are available for this profile." />
              </section>
            )}

            {/* Report form */}
            <form onSubmit={submit} className="mt-4 space-y-4 rounded-2xl bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-primary">
                <PenLine className="h-5 w-5" />
                <h2 className="font-bold text-foreground">Attach Clinical Report</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Specialization</Label>
                  <select
                    className={`${inputClass} appearance-none`}
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  >
                    <option value="">Select</option>
                    {SPECIALIZATIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Clinic / Hospital</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <input
                      className={`${inputClass} pl-9`}
                      value={clinic}
                      onChange={(e) => setClinic(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label>Time</Label>
                  <input type="time" className={inputClass} value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Report File</Label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    const f = e.dataTransfer.files?.[0]
                    if (f) {
                      setSelectedFile(f)
                      setFileName(f.name)
                    }
                  }}
                  className={`flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition ${
                    dragging ? "border-accent bg-accent/5" : "border-border bg-input"
                  }`}
                >
                  {fileName ? (
                    <>
                      <FileCheck2 className="h-6 w-6 text-accent" />
                      <span className="text-sm font-medium text-foreground">{fileName}</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-6 w-6 text-primary" />
                      <span className="text-sm font-medium text-foreground">Drag &amp; drop or tap to upload</span>
                      <span className="text-xs text-muted-foreground">PDF, JPG or PNG</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      setSelectedFile(f)
                      setFileName(f.name)
                    }
                  }}
                />
              </div>

              <div>
                <Label>Clinical Notes</Label>
                <textarea
                  className={`${inputClass} min-h-20 resize-none`}
                  placeholder="Diagnosis, prescription, follow-up..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Digital signature toggle */}
              <button
                type="button"
                onClick={() => setSigned((s) => !s)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                  signed
                    ? "border-accent/40 bg-accent/10"
                    : "border-border bg-input hover:border-primary/40"
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                    signed ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <PenLine className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {signed ? "Signed" : "Sign this report"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {signed ? `${session.doctorName} \u00b7 ${session.registrationNumber}` : "Tap to add your verified e-signature"}
                  </span>
                </span>
                {signed && <BadgeCheck className="h-5 w-5 shrink-0 text-accent" />}
              </button>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/25 transition hover:brightness-110"
              >
                <FileCheck2 className="h-5 w-5" />
                Attach &amp; Sign to Feed
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function ReadOnlySection({ title, values, emptyText }: { title: string; values: string[]; emptyText?: string }) {
  return (
    <section className="rounded-2xl bg-card p-4 shadow-sm">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {values.length ? (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {values.map((value, index) => <li key={`${title}-${index}`}>{value}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{emptyText ?? "None recorded."}</p>
      )}
    </section>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{children}</p>
}
