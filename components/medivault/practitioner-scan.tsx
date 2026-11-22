"use client"

import { useEffect, useRef, useState } from "react"
import {
  Stethoscope,
  Camera,
  UploadCloud,
  ScanLine,
  BadgeCheck,
  AlertCircle,
  Loader2,
  FileCheck2,
  X,
  ShieldCheck,
  IdCard,
  Building2,
  User,
  Tag,
  Search,
  UserCheck,
  QrCode,
} from "lucide-react"
import { ModalShell } from "./shared"
import { QrCameraScanner } from "./qr-camera-scanner"
import {
  PILOT_CLINICS,
  getPilotRegistrationId,
  recognizeOfficialMmcKydQr,
  validateMedicalLicense,
  type StoreApi,
} from "@/lib/store"

export type PractitionerSession = {
  doctorName: string
  registrationNumber: string
  institution: string
}

/**
 * Doctor Quick Scan modal. Simulates a document scanner via the device camera or an
 * image upload dropzone, extracts credential fields, then runs them through the
 * validateMedicalLicense heuristic. On approval it hands back a verified session so the
 * parent can enter Approved Clinical Mode.
 */
export function PractitionerScan({
  store,
  onClose,
  onApproved,
}: {
  store: StoreApi
  onClose: () => void
  /** Hands back the verified session plus the Step-1 patient Card/Tag ID to unlock edits for. */
  onApproved: (session: PractitionerSession, patientCardId: string) => void
}) {
  // Two-step workflow: "patient" = verify patient Card/Tag ID exists, then
  // "capture" = choose camera or upload, "review" = confirm/edit extracted license fields.
  const [step, setStep] = useState<"patient" | "capture" | "review">("patient")
  const [cameraOn, setCameraOn] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Step 1 — patient Card/Tag ID lookup state.
  const [patientCardId, setPatientCardId] = useState("")
  const [patientName, setPatientName] = useState("")
  const [resolvedCardId, setResolvedCardId] = useState("")
  const [patientError, setPatientError] = useState<string | null>(null)

  const [doctorName, setDoctorName] = useState("")
  const [registrationNumber, setRegistrationNumber] = useState("")
  const [institution, setInstitution] = useState("")
  const [scannerOpen, setScannerOpen] = useState(false)
  const [officialQrUrl, setOfficialQrUrl] = useState<string | null>(null)
  const [officialQrConfirmed, setOfficialQrConfirmed] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  useEffect(() => () => stopCamera(), [])

  async function startCamera() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      setCameraOn(true)
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch(() => {})
        }
      })
    } catch {
      setError("Camera unavailable. Please upload a photo of your credential instead.")
    }
  }

  // Simulated OCR: derives plausible-looking credential fields from the captured document.
  function extractCredentials(): PractitionerSession {
    const councils = ["NMC", "MCI", "SMC"]
    const council = councils[Math.floor(Math.random() * councils.length)]
    const number = Math.floor(100000 + Math.random() * 900000)
    return {
      doctorName: "Dr. ",
      registrationNumber: `${council}-${number}`,
      institution: "State Medical Council",
    }
  }

  // Step 1: block unless the patient Card/Tag ID exists in usersDb or a dependent profile.
  async function verifyPatient() {
    setPatientError(null)
    const id = patientCardId.trim()
    if (!id) return setPatientError("Enter the patient's Card/Tag ID.")
    const match = await store.findPatientByCardId(id)
    if (!match) return setPatientError("\u26D4 Error: Patient Card/Tag ID not found.")
    setPatientName(match.name)
    setResolvedCardId(match.cardId)
    setStep("capture")
  }

  function runScan() {
    setScanning(true)
    setError(null)
    setTimeout(() => {
      const extracted = extractCredentials()
      setDoctorName(extracted.doctorName)
      setRegistrationNumber(extracted.registrationNumber)
      setInstitution(extracted.institution)
      setScanning(false)
      stopCamera()
      setStep("review")
    }, 2200)
  }

  function verifyAndEnter() {
    setError(null)
    if (officialQrUrl) {
      if (!officialQrConfirmed) {
        setError("Open the official MMC/KYD record and confirm the active registration before continuing.")
        return
      }
      if (!doctorName.trim() || !registrationNumber.trim()) {
        setError("Enter the practitioner name and registration ID shown on the official record.")
        return
      }
    } else {
      const result = validateMedicalLicense({ doctorName, registrationNumber, institution })
      if (!result.ok) {
        setError(result.error ?? "Approval denied.")
        return
      }
    }
    onApproved(
      {
        doctorName: doctorName.trim(),
        registrationNumber: registrationNumber.trim(),
        institution: officialQrUrl ? "Maharashtra Medical Council" : institution.trim(),
      },
      resolvedCardId,
    )
  }

  function handlePractitionerQr(value: string) {
    const recognition = recognizeOfficialMmcKydQr(value)
    if (!recognition.official || !recognition.url) {
      setError("This QR is not from an official KYD or Maharashtra Medical Council domain.")
      setOfficialQrUrl(null)
      setOfficialQrConfirmed(false)
      return
    }
    setOfficialQrUrl(recognition.url)
    setRegistrationNumber(recognition.registrationNumber ?? "")
    setOfficialQrConfirmed(false)
    setError(null)
    setScannerOpen(false)
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <>
    <ModalShell
      title="Practitioner Verification"
      subtitle={
        step === "patient"
          ? "Step 1 of 2 · Find the patient"
          : "Step 2 of 2 · Verify your MMC registration"
      }
      headerAccent
      onClose={() => {
        stopCamera()
        onClose()
      }}
    >
      {scanning && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-foreground/85 text-white">
          <div className="relative h-52 w-52 overflow-hidden rounded-2xl border-2 border-accent/70">
            <div className="mv-scan absolute left-0 right-0 top-0 h-1 bg-accent shadow-[0_0_16px_4px] shadow-accent" />
            <IdCard className="absolute inset-0 m-auto h-24 w-24 text-white/30" />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <ScanLine className="h-4 w-4 animate-pulse" />
            Analyzing medical credentials...
          </div>
        </div>
      )}

      {step === "patient" ? (
        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-primary">
            <Search className="h-6 w-6 shrink-0" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Enter the patient&apos;s Card/Tag ID to locate their record. We check registered
              accounts and linked dependent profiles before you verify your license in the next step.
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Patient Card/Tag ID
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Tag className="h-4 w-4" />
              </span>
              <input
                className={`${inputClass} uppercase tracking-wider`}
                placeholder="e.g. LV-8H3N2"
                value={patientCardId}
                onChange={(e) => {
                  setPatientCardId(e.target.value)
                  setPatientError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    verifyPatient()
                  }
                }}
              />
            </div>
          </label>

          {patientError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{patientError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={verifyPatient}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
          >
            <UserCheck className="h-5 w-5" />
            Find Patient &amp; Continue
          </button>
        </div>
      ) : step === "capture" ? (
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-2 rounded-2xl border border-accent/20 bg-accent/5 p-3 text-accent">
            <UserCheck className="h-5 w-5 shrink-0" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Patient located:{" "}
              <span className="font-semibold text-foreground">{patientName || "Verified patient"}</span>
              {resolvedCardId ? ` \u00b7 ${resolvedCardId}` : ""}. Now verify your credentials.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-primary">
            <Stethoscope className="h-6 w-6 shrink-0" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Scan your Medical License, Council Registration (NMC / State Medical Council), or
              Hospital Credentials. We verify the registration number and institution before granting
              clinical edit access.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Practitioner / MMC registration ID</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Enter your ID and clinic, or scan an official KYD / Maharashtra Medical Council QR code.
              </p>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Practitioner name</span>
              <input
                className={inputClass}
                autoComplete="name"
                placeholder="Dr. Jane Smith"
                value={doctorName}
                onChange={(event) => {
                  setDoctorName(event.target.value)
                  setError(null)
                }}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">MMC registration ID</span>
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="e.g. 2024/06/18402"
                  value={registrationNumber}
                  onChange={(event) => {
                    setRegistrationNumber(event.target.value.trim())
                    setOfficialQrUrl(null)
                    setOfficialQrConfirmed(false)
                    setError(null)
                  }}
                />
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  aria-label="Scan official practitioner QR code"
                  className="grid shrink-0 place-items-center rounded-xl bg-primary px-3 text-primary-foreground transition hover:brightness-110"
                >
                  <QrCode className="size-5" />
                </button>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Pilot clinic / hospital</span>
              <select
                className={`${inputClass} appearance-none`}
                value={institution}
                onChange={(event) => {
                  setInstitution(event.target.value)
                  setOfficialQrUrl(null)
                  setOfficialQrConfirmed(false)
                  setError(null)
                }}
              >
                <option value="">Select a Navi Mumbai / Seawoods clinic</option>
                {PILOT_CLINICS.map((clinic) => <option key={clinic} value={clinic}>{clinic}</option>)}
              </select>
            </label>
            {officialQrUrl ? (
              <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <a href={officialQrUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary underline underline-offset-2">
                  Open official MMC/KYD record
                </a>
                <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={officialQrConfirmed}
                    onChange={(event) => setOfficialQrConfirmed(event.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  I checked the official record and confirmed the practitioner name and active registration.
                </label>
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {institution ? `Pilot reference ID for ${institution}: ${getPilotRegistrationId(institution) ?? "not listed"}. ` : "Select a clinic to view its pilot reference ID. "}
                This fallback is not a live council lookup.
              </p>
            )}
            <button
              type="button"
              onClick={verifyAndEnter}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/25 transition hover:brightness-110"
            >
              <BadgeCheck className="size-4" />
              Verify registration &amp; continue
            </button>
          </div>

          {cameraOn ? (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-foreground">
                <video ref={videoRef} playsInline muted className="h-56 w-full object-cover" />
                <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-dashed border-white/70" />
                <button
                  type="button"
                  onClick={stopCamera}
                  aria-label="Stop camera"
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={runScan}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/25 transition hover:brightness-110"
              >
                <ScanLine className="h-5 w-5" />
                Capture &amp; Analyze
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={startCamera}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-input py-6 text-center transition hover:border-primary hover:bg-primary/5"
              >
                <Camera className="h-7 w-7 text-primary" />
                <span className="text-sm font-semibold text-foreground">Use Camera</span>
                <span className="text-[11px] text-muted-foreground">Scan live document</span>
              </button>
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
                    setFileName(f.name)
                    runScan()
                  }
                }}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-6 text-center transition ${
                  dragging ? "border-accent bg-accent/5" : "border-border bg-input hover:border-primary"
                }`}
              >
                {fileName ? (
                  <FileCheck2 className="h-7 w-7 text-accent" />
                ) : (
                  <UploadCloud className="h-7 w-7 text-primary" />
                )}
                <span className="text-sm font-semibold text-foreground">Upload Image</span>
                <span className="max-w-[8rem] truncate text-[11px] text-muted-foreground">
                  {fileName || "JPG, PNG or PDF"}
                </span>
              </button>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                setFileName(f.name)
                runScan()
              }
            }}
          />

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-2 rounded-2xl border border-accent/20 bg-accent/5 p-4 text-accent">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Credentials extracted from the scan. Review and correct them, then run the registry
              verification.
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Practitioner Name
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <User className="h-4 w-4" />
              </span>
              <input
                className={inputClass}
                placeholder="Dr. Jane Smith"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              License / Registration Number
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <IdCard className="h-4 w-4" />
              </span>
              <input
                className={inputClass}
                placeholder="e.g. NMC-482913"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Medical Council / Hospital
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
              </span>
              <input
                className={inputClass}
                placeholder="e.g. State Medical Council"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setStep("capture")
                setError(null)
              }}
              className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              Re-scan
            </button>
            <button
              type="button"
              onClick={verifyAndEnter}
              className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/25 transition hover:brightness-110"
            >
              <BadgeCheck className="h-4 w-4" />
              Verify &amp; Approve Access
            </button>
          </div>
        </div>
      )}
    </ModalShell>
    {scannerOpen && (
      <QrCameraScanner
        onClose={() => setScannerOpen(false)}
        onDetected={handlePractitionerQr}
      />
    )}
    </>
  )
}

/** Small helper icon re-used for the scanning overlay + loading states. */
export function ScanningSpinner() {
  return <Loader2 className="h-4 w-4 animate-spin" />
}
