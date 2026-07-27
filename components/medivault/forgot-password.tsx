"use client"

import { useState } from "react"
import {
  Mail,
  Tag,
  Lock,
  AlertCircle,
  MailCheck,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
} from "lucide-react"
import { ModalShell } from "./shared"
import type { StoreApi } from "@/lib/store"

type Step = "identity" | "approval" | "done"

/**
 * Forgot / Reset Password workflow modal.
 *  Step 1 (Identity Check): match Email ID + Card/Tag ID against usersDb.
 *  Step 2 (Simulated Email Approval): user clicks to "approve" a verification email,
 *          which unlocks the Create New Password inputs and commits the change.
 */
export function ForgotPasswordModal({ store, onClose }: { store: StoreApi; onClose: () => void }) {
  const [step, setStep] = useState<Step>("identity")
  const [email, setEmail] = useState("")
  const [cardId, setCardId] = useState("")
  const [approved, setApproved] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  function verifyIdentity() {
    setError(null)
    const res = store.verifyResetIdentity(email, cardId)
    if (!res.ok) return setError(res.error ?? "Identity verification failed.")
    setStep("approval")
  }

  function submitNewPassword() {
    setError(null)
    if (!newPassword) return setError("Enter a new password.")
    if (newPassword.length < 4) return setError("Password must be at least 4 characters.")
    if (newPassword !== confirmPassword) return setError("Passwords do not match.")
    const res = store.resetPassword(email, newPassword)
    if (!res.ok) return setError(res.error ?? "Could not update password.")
    setStep("done")
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <ModalShell
      title="Reset Password"
      subtitle={
        step === "identity"
          ? "Step 1 of 2 \u00b7 Verify your identity"
          : step === "approval"
            ? "Step 2 of 2 \u00b7 Approve & reset"
            : "Password updated"
      }
      headerAccent
      onClose={onClose}
    >
      {step === "identity" && (
        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Enter the Email ID and Card/Tag ID Number registered to your account. Both must match
              the same account exactly.
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Registered Email ID</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                className={inputClass}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Card/Tag ID Number</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Tag className="h-4 w-4" />
              </span>
              <input
                className={`${inputClass} uppercase tracking-wider`}
                placeholder="e.g. LV-8H3N2"
                value={cardId}
                onChange={(e) => {
                  setCardId(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    verifyIdentity()
                  }
                }}
              />
            </div>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={verifyIdentity}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
          >
            <ShieldCheck className="h-5 w-5" />
            Verify Identity
          </button>
        </div>
      )}

      {step === "approval" && (
        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4">
            <MailCheck className="h-6 w-6 shrink-0 text-accent" />
            <p className="text-xs font-semibold leading-relaxed text-foreground">
              {"\uD83D\uDCE9 Verification Authorization Email Sent to Registered Inbox."}
            </p>
          </div>

          {!approved ? (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                We sent a verification link to <span className="font-semibold text-foreground">{email}</span>.
                Simulate the account owner approving that link to unlock a new password.
              </p>
              <button
                type="button"
                onClick={() => setApproved(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/25 transition hover:brightness-110"
              >
                <CheckCircle2 className="h-5 w-5" />
                Simulate Email Approval (Click to Verify)
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Email approved. Create your new password below.
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">New Password</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setError(null)
                    }}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Confirm Password</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    className={inputClass}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setError(null)
                    }}
                  />
                </div>
              </label>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={submitNewPassword}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
              >
                <KeyRound className="h-5 w-5" />
                Update Password
              </button>
            </>
          )}
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4 p-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {"\u2705 Password updated successfully. You can now log in."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
          >
            Back to Login
          </button>
        </div>
      )}
    </ModalShell>
  )
}
