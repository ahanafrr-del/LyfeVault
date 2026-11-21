"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, Mail, ShieldCheck, Tag } from "lucide-react"
import { ModalShell } from "./shared"
import type { StoreApi } from "@/lib/store"

type Step = "identity" | "done"

export function ForgotPasswordModal({ store, onClose }: { store: StoreApi; onClose: () => void }) {
  const [step, setStep] = useState<Step>("identity")
  const [email, setEmail] = useState("")
  const [cardId, setCardId] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function verifyIdentity() {
    setError(null)
    const result = await store.verifyResetIdentity(email, cardId)
    if (!result.ok) return setError(result.error ?? "Identity verification failed.")
    setStep("done")
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <ModalShell
      title="Reset Password"
      subtitle={step === "identity" ? "Verify your identity" : "Check your inbox"}
      headerAccent
      onClose={onClose}
    >
      {step === "identity" ? (
        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Enter the email and Card/Tag ID registered to your account. We&apos;ll send a secure password reset link to your inbox.
            </p>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Registered Email ID</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="email" className={inputClass} placeholder="you@example.com" value={email} onChange={(event) => { setEmail(event.target.value); setError(null) }} />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Card/Tag ID Number</span>
            <div className="relative">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className={`${inputClass} uppercase tracking-wider`} placeholder="e.g. LV-8H3N2" value={cardId} onChange={(event) => { setCardId(event.target.value); setError(null) }} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void verifyIdentity() } }} />
            </div>
          </label>
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button type="button" onClick={() => void verifyIdentity()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110">
            <ShieldCheck className="h-5 w-5" />
            Verify &amp; Send Reset Link
          </button>
        </div>
      ) : (
        <div className="space-y-4 p-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold text-foreground">If the account can be verified, a password reset link has been sent to {email}.</p>
          <p className="text-xs text-muted-foreground">Follow the link from Firebase to choose a new password. The link expires for your protection.</p>
          <button type="button" onClick={onClose} className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110">
            Back to Login
          </button>
        </div>
      )}
    </ModalShell>
  )
}
