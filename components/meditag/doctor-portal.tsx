"use client"

import { useState } from "react"
import { Stethoscope, QrCode, ScanLine, BadgeCheck, Loader2, FileUp } from "lucide-react"

type Stage = "verify" | "verifying" | "verified"

export function DoctorPortal({ onManageRecords }: { onManageRecords: () => void }) {
  const [stage, setStage] = useState<Stage>("verify")

  function verify() {
    setStage("verifying")
    setTimeout(() => setStage("verified"), 1800)
  }

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-sky-50 to-background px-6 pb-8 pt-12">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-sky-300/50">
        <Stethoscope className="h-8 w-8" />
      </div>
      <h1 className="text-center text-2xl font-bold text-foreground">Provider Access Portal</h1>
      <p className="mt-2 text-pretty text-center text-sm leading-relaxed text-muted-foreground">
        Verify your medical registration to view and amend records under your own license.
      </p>

      {stage === "verified" ? (
        <div className="mt-8 space-y-5">
          <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <BadgeCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">Dr. Sanjay Rao — Verified</p>
              <p className="text-xs text-muted-foreground">NMC-CAR-88213 · Cardiology</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              You can now add reports for this patient. You may only edit or amend records created under your own
              license ID.
            </p>
          </div>
          <button
            onClick={onManageRecords}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-sky-300/50 transition hover:bg-primary/90"
          >
            <FileUp className="h-4 w-4" /> Add a Medical Report
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">NMC Registration Number</span>
            <input
              defaultValue="NMC-CAR-88213"
              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-mono text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or scan QR</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Simulated scanner viewfinder */}
          <div className="relative mx-auto flex aspect-square w-48 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-primary/50 bg-secondary/50">
            <QrCode className="h-20 w-20 text-primary/40" />
            {stage === "verifying" && (
              <div className="absolute inset-x-0 top-0 h-1 animate-[scan_1.5s_ease-in-out_infinite] bg-primary shadow-[0_0_12px_2px] shadow-primary" />
            )}
            <ScanLine className="absolute bottom-3 right-3 h-5 w-5 text-primary/60" />
          </div>

          <button
            onClick={verify}
            disabled={stage === "verifying"}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-sky-300/50 transition hover:bg-primary/90 disabled:opacity-70"
          >
            {stage === "verifying" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying license…
              </>
            ) : (
              "Verify Provider"
            )}
          </button>
        </div>
      )}
    </div>
  )
}
