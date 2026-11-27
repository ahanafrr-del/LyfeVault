"use client"

import { useRef, useState } from "react"
import {
  UploadCloud,
  FileCheck2,
  AlertCircle,
} from "lucide-react"
import { ModalShell } from "./shared"
import { supabase } from "@/lib/supabase"
import { SPECIALIZATIONS, type StoreApi } from "@/lib/store"

export function DoctorUpload({
  store,
  onClose,
  onDone,
  dependentId,
}: {
  store: StoreApi
  onClose: () => void
  onDone: () => void
  dependentId?: string
}) {
  const [doctorName, setDoctorName] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [clinic, setClinic] = useState("")
  const [notes, setNotes] = useState("")
  const [fileName, setFileName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)


  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!doctorName.trim() || !specialization || !date) {
      setError("Please fill in the doctor name, specialization, and date.")
      return
    }
    if (!selectedFile) {
      setError("Choose a medical report file to upload.")
      return
    }
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(selectedFile.type) || selectedFile.size > 52_428_800) {
      setError("Choose a PDF, JPG, PNG, or WEBP file no larger than 50 MB.")
      return
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      setError("Sign in again before uploading a report.")
      return
    }
    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filePath = `patients/${user.id}/${crypto.randomUUID()}/${safeName}`
    const { error: uploadError } = await supabase.storage.from("medical-reports").upload(filePath, selectedFile, {
      contentType: selectedFile.type,
      upsert: false,
    })
    if (uploadError) {
      setError("The file could not be uploaded. Choose a supported file no larger than 50 MB.")
      return
    }

    try {
      await store.addReport({
        doctorName: doctorName.trim(),
        specialization,
        clinic: clinic.trim(),
        date,
        time,
        licenseNumber: "",
        fileName: fileName || "report.pdf",
        notes: notes.trim(),
        filePath,
        dependentId,
      })
      onDone()
    } catch {
      await supabase.storage.from("medical-reports").remove([filePath])
      setError("The report details could not be saved. The uploaded file was removed.")
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <>
      <ModalShell title="Add Medical Report" subtitle="Add a report from your care team" onClose={onClose} headerAccent>
      <form onSubmit={submit} className="space-y-4 p-5">
        <div>
          <Label>Doctor&apos;s Full Name</Label>
          <input
            className={inputClass}
            placeholder="Dr. Jane Smith"
            value={doctorName}
            onChange={(e) => {
              setDoctorName(e.target.value)
            }}
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
              onChange={(e) => {
                setClinic(e.target.value)
              }}
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
              if (f) {
                setSelectedFile(f)
                setFileName(f.name)
              }
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
                <span className="text-xs text-muted-foreground">PDF, JPG, PNG, or WEBP · up to 50 MB</span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            aria-label="Choose medical report file"
            className="sr-only"
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
          <Label>Clinical Notes (optional)</Label>
          <textarea
            className={`${inputClass} min-h-20 resize-none`}
            placeholder="Diagnosis, prescription, follow-up..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
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
          Upload Report
        </button>
      </form>
      </ModalShell>

    </>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{children}</p>
}
