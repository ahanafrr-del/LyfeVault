"use client"

import { useRef, useState } from "react"
import {
  UploadCloud,
  FileCheck2,
  QrCode,
  ScanLine,
  BadgeCheck,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { ModalShell } from "./shared"
import { SPECIALIZATIONS, type StoreApi } from "@/lib/store"

export function DoctorUpload({
  store,
  onClose,
  onDone,
}: {
  store: StoreApi
  onClose: () => void
  onDone: () => void
}) {
  const [doctorName, setDoctorName] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [clinic, setClinic] = useState("")
  const [notes, setNotes] = useState("")
  const [fileName, setFileName] = useState("")
  const [license, setLicense] = useState("")
  const [verified, setVerified] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function startScan() {
    setScanning(true)
    setError(null)
    setTimeout(() => {
      const generated = "MED-" + Math.floor(100000 + Math.random() * 900000)
      setLicense(generated)
      setVerified(true)
      setScanning(false)
    }, 2200)
  }

  function verifyTyped() {
    if (license.trim().length < 4) {
      setError("Enter a valid license number (min 4 characters) or scan the QR code.")
      return
    }
    setVerified(true)
    setError(null)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!doctorName.trim() || !specialization || !date) {
      setError("Please fill in the doctor name, specialization, and date.")
      return
    }
    if (!verified) {
      setError("The doctor's medical license must be verified before uploading.")
      return
    }
    store.addReport({
      doctorName: doctorName.trim(),
      specialization,
      clinic: clinic.trim(),
      date,
      time,
      licenseNumber: license,
      fileName: fileName || "report.pdf",
      notes: notes.trim(),
    })
    onDone()
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <ModalShell title="Add Medical Report" subtitle="Verified doctor upload" onClose={onClose} headerAccent>
      {scanning && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-foreground/80 text-white">
          <div className="relative h-52 w-52 overflow-hidden rounded-2xl border-2 border-accent/70">
            <div className="mv-scan absolute left-0 right-0 top-0 h-1 bg-accent shadow-[0_0_16px_4px] shadow-accent" />
            <QrCode className="absolute inset-0 m-auto h-24 w-24 text-white/30" />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <ScanLine className="h-4 w-4 animate-pulse" />
            Scanning license QR code...
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <Label>Doctor&apos;s Full Name</Label>
          <input
            className={inputClass}
            placeholder="Dr. Jane Smith"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
          />
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
            <input
              className={inputClass}
              placeholder="City Hospital"
              value={clinic}
              onChange={(e) => setClinic(e.target.value)}
            />
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

        {/* File drop zone */}
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
              if (f) setFileName(f.name)
            }}
            className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
              dragging ? "border-accent bg-accent/5" : "border-border bg-input"
            }`}
          >
            {fileName ? (
              <>
                <FileCheck2 className="h-7 w-7 text-accent" />
                <span className="text-sm font-medium text-foreground">{fileName}</span>
                <span className="text-xs text-muted-foreground">Tap to replace</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-7 w-7 text-primary" />
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
              if (f) setFileName(f.name)
            }}
          />
        </div>

        <div>
          <Label>Clinical Notes (optional)</Label>
          <textarea
            className={`${inputClass} min-h-20 resize-none`}
            placeholder="Diagnosis, prescription, follow-up..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Authentication gate */}
        <div className="rounded-xl bg-secondary p-3">
          <Label>Medical License Number</Label>
          <div className="flex gap-2">
            <input
              className={inputClass}
              placeholder="e.g. MED-482913"
              value={license}
              onChange={(e) => {
                setLicense(e.target.value)
                setVerified(false)
              }}
            />
            <button
              type="button"
              onClick={startScan}
              aria-label="Scan QR code"
              className="grid shrink-0 place-items-center rounded-xl bg-primary px-3 text-primary-foreground transition hover:brightness-110"
            >
              <QrCode className="h-5 w-5" />
            </button>
          </div>
          {verified ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
              <BadgeCheck className="h-4 w-4" />
              License verified
            </div>
          ) : (
            <button
              type="button"
              onClick={verifyTyped}
              className="mt-2 text-xs font-semibold text-primary underline-offset-2 hover:underline"
            >
              Verify entered number
            </button>
          )}
        </div>

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
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Upload Report
        </button>
      </form>
    </ModalShell>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{children}</p>
}
