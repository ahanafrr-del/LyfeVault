"use client"

import { useState } from "react"
import { ShieldCheck, QrCode, UploadCloud, Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react"

type Step = "doctor" | "upload" | "authenticating" | "success" | "failed"

export function AddReportScanner() {
  const [step, setStep] = useState<Step>("doctor")
  const [fileName, setFileName] = useState<string | null>(null)

  function authenticate(valid: boolean) {
    setStep("authenticating")
    setTimeout(() => setStep(valid ? "success" : "failed"), 2200)
  }

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-sky-50 to-background px-6 pb-8 pt-12">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <UploadCloud className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Add Medical Report</h1>
      </div>

      {/* Step indicator */}
      <div className="mt-5 flex items-center gap-2">
        {["Verify Doctor", "Upload & AI Check"].map((label, i) => {
          const activeIdx = step === "doctor" ? 0 : 1
          const done = i < activeIdx
          const current = i === activeIdx
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  done || current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-xs font-semibold ${current ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Step 1: Doctor verification */}
      {step === "doctor" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">NMC License Number</span>
              <input
                defaultValue="NMC-CAR-88213"
                className="w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 font-mono text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-secondary/40 p-6">
            <QrCode className="h-16 w-16 text-primary/40" />
            <p className="text-xs text-muted-foreground">Or scan your verification QR code</p>
          </div>
          <button
            onClick={() => setStep("upload")}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-sky-300/50 transition hover:bg-primary/90"
          >
            Continue to Upload
          </button>
        </div>
      )}

      {/* Step 2: Upload */}
      {step === "upload" && (
        <div className="mt-6 space-y-4">
          <button
            onClick={() => setStep("doctor")}
            className="flex items-center gap-1 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-secondary/40 p-8 text-center">
            <UploadCloud className="h-12 w-12 text-primary/60" />
            <div>
              <p className="text-sm font-semibold text-foreground">Drag &amp; drop your report</p>
              <p className="text-xs text-muted-foreground">PDF, JPG or PNG up to 20MB</p>
            </div>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "medical-report.pdf")}
            />
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {fileName ?? "Browse files"}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => authenticate(true)}
              className="rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-sky-300/50 transition hover:bg-primary/90"
            >
              Submit (Valid Demo)
            </button>
            <button
              onClick={() => authenticate(false)}
              className="rounded-2xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              Submit (Invalid Demo)
            </button>
          </div>
        </div>
      )}

      {/* Authenticating */}
      {step === "authenticating" && (
        <div className="mt-16 flex flex-col items-center gap-5 text-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">Authenticating digital signature…</p>
          <p className="max-w-[15rem] text-xs leading-relaxed text-muted-foreground">
            Verifying NMC doctor license and document authenticity with MediTag AI.
          </p>
        </div>
      )}

      {/* Success */}
      {step === "success" && (
        <div className="mt-16 flex flex-col items-center gap-5 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-14 w-14 text-emerald-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">Report Verified &amp; Added</p>
            <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
              License authenticated. The report is now attached to the patient timeline under your ownership.
            </p>
          </div>
          <button
            onClick={() => {
              setFileName(null)
              setStep("doctor")
            }}
            className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-sky-300/50 transition hover:bg-primary/90"
          >
            Add Another
          </button>
        </div>
      )}

      {/* Failed */}
      {step === "failed" && (
        <div className="mt-16 flex flex-col items-center gap-5 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-14 w-14 text-destructive" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">Upload Discarded</p>
            <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
              Invalid doctor license. The digital signature could not be authenticated, so the upload was rejected.
            </p>
          </div>
          <button
            onClick={() => setStep("upload")}
            className="rounded-2xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            Try Again
          </button>
        </div>
      )}

      {step === "doctor" && (
        <div className="mt-auto flex items-center justify-center gap-2 pt-6 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Only license-verified providers can add records
        </div>
      )}
    </div>
  )
}
