"use client"

import { useState } from "react"
import { AlertCircle, BadgeCheck, Building2, Loader2, Phone, QrCode, ShieldCheck, Stethoscope } from "lucide-react"
import { ModalShell } from "./shared"
import { QrCameraScanner } from "./qr-camera-scanner"
import { recognizeOfficialMmcKydQr, getPilotRegistrationId } from "@/lib/store"
import { supabase } from "@/lib/supabase"

export type PractitionerSession = {
  doctorName: string
  registrationNumber: string
  institution: string
  hospitalPhone: string
  previousAccessToken: string | null
  previousRefreshToken: string | null
}

export function PractitionerScan({
  onClose,
  onApproved,
}: {
  onClose: () => void
  onApproved: (session: PractitionerSession, patientCardId: string) => void
}) {
  const [step, setStep] = useState<"credentials" | "otp">("credentials")
  const [mmcId, setMmcId] = useState("")
  const [hospitalPhone, setHospitalPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [qrOpen, setQrOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [previousSession, setPreviousSession] = useState<{ accessToken: string | null; refreshToken: string | null }>({ accessToken: null, refreshToken: null })

  async function sendCode(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const normalizedId = mmcId.trim()
    const normalizedPhone = hospitalPhone.trim()
    if (!normalizedId || !/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setError("Enter an authorized MMC ID and hospital phone in international format (for example, +919876543210).")
      return
    }
    setBusy(true)
    try {
      const { data: authorized, error: allowlistError } = await supabase.rpc("practitioner_is_authorized", {
        p_mmc_id: normalizedId,
        p_phone: normalizedPhone,
      })
      if (allowlistError || !authorized) {
        setError("These practitioner details are not on the authorized clinic list.")
        return
      }
      const { data: sessionData } = await supabase.auth.getSession()
      setPreviousSession({
        accessToken: sessionData.session?.access_token ?? null,
        refreshToken: sessionData.session?.refresh_token ?? null,
      })
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: true },
      })
      if (otpError) {
        setError("We could not send the verification code. Check the hospital phone number and SMS setup, then try again.")
        return
      }
      setHospitalPhone(normalizedPhone)
      setStep("otp")
    } catch {
      setError("Practitioner verification is temporarily unavailable. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!/^\d{4,8}$/.test(otp.trim())) return setError("Enter the verification code from the hospital phone.")
    setBusy(true)
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: hospitalPhone,
        token: otp.trim(),
        type: "sms",
      })
      if (verifyError || !data.session) {
        setError("That verification code is invalid or expired. Request a new code and try again.")
        return
      }
      const clinicName = getClinicName(mmcId.trim())
      onApproved({
        doctorName: "Verified practitioner",
        registrationNumber: mmcId.trim(),
        institution: clinicName,
        hospitalPhone,
        previousAccessToken: previousSession.accessToken,
        previousRefreshToken: previousSession.refreshToken,
      }, "")
    } catch {
      setError("The verification could not be completed. Please request a new code.")
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
        subtitle={step === "credentials" ? "Step 1 of 2 · Verify clinic credentials" : "Step 2 of 2 · Confirm hospital phone"}
        headerAccent
        onClose={onClose}
      >
        {step === "credentials" ? (
          <form onSubmit={sendCode} className="space-y-4 p-5">
            <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">Enter an MMC registration ID and the matching authorized hospital phone. We send an SMS code before any patient record can be searched.</p>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">MMC registration ID</span>
              <div className="flex gap-2">
                <input className={INPUT} autoComplete="off" placeholder="e.g. 2024/06/18402" value={mmcId} onChange={(event) => setMmcId(event.target.value.trim())} />
                <button type="button" onClick={() => setQrOpen(true)} aria-label="Scan official MMC or KYD QR code" className="grid shrink-0 place-items-center rounded-xl bg-primary px-3 text-primary-foreground"><QrCode className="size-5" /></button>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Hospital / clinic phone number</span>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input className={`${INPUT} pl-10`} type="tel" autoComplete="tel" inputMode="tel" placeholder="+919876543210" value={hospitalPhone} onChange={(event) => setHospitalPhone(event.target.value)} />
              </div>
              <span className="mt-1 block text-[11px] text-muted-foreground">Use the phone number registered with the authorized clinic.</span>
            </label>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Stethoscope className="size-4" />}
              {busy ? "Checking details…" : "Verify & Send SMS Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4 p-5">
            <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4">
              <Building2 className="mt-0.5 size-5 shrink-0 text-accent" />
              <p className="text-xs leading-relaxed text-muted-foreground">A one-time code was sent to <span className="font-semibold text-foreground">{hospitalPhone}</span>. Patient search stays locked until this code is verified.</p>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">SMS verification code</span>
              <input className={INPUT} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="Enter code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} />
            </label>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground disabled:opacity-60">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
              {busy ? "Verifying…" : "Verify Code & Continue"}
            </button>
            <button type="button" onClick={() => { setStep("credentials"); setOtp(""); setError(null) }} className="w-full py-2 text-xs font-semibold text-muted-foreground">Change MMC ID or phone number</button>
          </form>
        )}
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
