"use client"

import { useState } from "react"
import { AlertCircle, Loader2, QrCode, ShieldCheck, Stethoscope } from "lucide-react"
import { ModalShell } from "./shared"
import { QrCameraScanner } from "./qr-camera-scanner"
import { recognizeOfficialMmcKydQr, getPilotRegistrationId } from "@/lib/store"
import { supabase } from "@/lib/supabase"

export type PractitionerSession = {
  doctorName: string
  registrationNumber: string
  institution: string
}

export function PractitionerScan({
  onClose,
  onApproved,
}: {
  onClose: () => void
  onApproved: (session: PractitionerSession, patientCardId: string) => void
}) {
  const [mmcId, setMmcId] = useState("")
  const [qrOpen, setQrOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function verifyPractitioner(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const normalizedId = mmcId.trim()
    if (!normalizedId) {
      setError("Provide your LyfeVault Medical ID.")
      return
    }
    setBusy(true)
    try {
      const { data: authorized, error: allowlistError } = await supabase.rpc("practitioner_is_authorized_by_mmc", {
        p_mmc_id: normalizedId,
      })
      if (allowlistError || !authorized) {
        setError("This LyfeVault Medical ID is not on the authorized clinic list.")
        return
      }
      onApproved({
        doctorName: "Verified practitioner",
        registrationNumber: normalizedId,
        institution: getClinicName(normalizedId),
      }, "")
    } catch {
      setError("Practitioner verification is temporarily unavailable. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  function handleQr(value: string) {
    const result = recognizeOfficialMmcKydQr(value)
    if (!result.official || !result.registrationNumber) {
      setError("Use a QR code from kyd.co.in or maharashtramedicalcouncil.org.in.")
      return
    }
    setMmcId(result.registrationNumber)
    setError(null)
    setQrOpen(false)
  }

  return (
    <>
      <ModalShell
        title="Practitioner Verification"
        subtitle="Verify your LyfeVault Medical ID"
        headerAccent
        onClose={onClose}
      >
        <form onSubmit={verifyPractitioner} className="space-y-4 p-5">
            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">Verify and continue using your LyfeVault Medical ID. No phone number or SMS code is required.</p>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">LyfeVault Medical MMC</span>
              <div className="flex gap-2">
                <input className={INPUT} autoComplete="off" aria-label="LyfeVault Medical ID" placeholder="Provide your LyfeVault Medical ID" value={mmcId} onChange={(event) => setMmcId(event.target.value.trim())} />
                <button type="button" onClick={() => setQrOpen(true)} aria-label="Scan official MMC or KYD QR code" className="grid shrink-0 place-items-center rounded-xl bg-primary px-3 text-primary-foreground"><QrCode className="size-5" /></button>
              </div>
            </label>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Stethoscope className="size-4" />}
              {busy ? "Checking ID…" : "Verify & Continue"}
            </button>
          </form>
      </ModalShell>
      {qrOpen && <QrCameraScanner onClose={() => setQrOpen(false)} onDetected={handleQr} />}
    </>
  )
}

function getClinicName(mmcId: string) {
  const clinics = ["Der-med Clinic", "Apollo Hospitals", "Seawoods Hospital", "Terna Speciality Hospital", "D Y Patil Hospital", "Fortis Hiranandani Hospital", "MGM Hospital"]
  return clinics.find((clinic) => getPilotRegistrationId(clinic) === mmcId) ?? "Authorized medical clinic"
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" /><span>{children}</span></div>
}

const INPUT = "w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
