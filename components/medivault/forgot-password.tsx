"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, Mail, ShieldCheck } from "lucide-react"
import { ModalShell } from "./shared"
import type { StoreApi } from "@/lib/store"

export function ForgotPasswordModal({ store, onClose }: { store: StoreApi; onClose: () => void }) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function sendRecoveryEmail() {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const result = await store.requestPasswordReset(email)
      if (!result.ok) {
        setError(result.error ?? "If an account exists for this email, recovery instructions will be sent.")
        return
      }
      setSent(true)
    } catch {
      setError("If an account exists for this email, recovery instructions will be sent.")
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <ModalShell
      title="Reset Password"
      subtitle={sent ? "Check your inbox" : "Recover access by email"}
      headerAccent
      onClose={onClose}
    >
      {sent ? (
        <div className="space-y-4 p-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold text-foreground">If an account exists for {email}, recovery instructions are on the way.</p>
          <p className="text-xs leading-relaxed text-muted-foreground">Use the secure link in that email to choose a new password. The link expires for your protection.</p>
          <button type="button" onClick={onClose} className="flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110">
            Back to Login
          </button>
        </div>
      ) : (
        <form
          className="space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault()
            void sendRecoveryEmail()
          }}
        >
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">Enter your registered email. If it matches an account, we&apos;ll send a one-time password reset link.</p>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Registered Email ID</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                autoComplete="email"
                className={inputClass}
                placeholder="you@example.com"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setError(null) }}
              />
            </div>
          </label>
          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
            <Mail className="h-5 w-5" />
            {submitting ? "Sending…" : "Send Recovery Email"}
          </button>
        </form>
      )}
    </ModalShell>
  )
}
