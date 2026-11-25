"use client"

import { useState } from "react"
import { Lock, Unlock, ArrowRight, ShieldCheck, Eye } from "lucide-react"
import { computeAge, isChildProfile, type StoreApi, type UserProfile } from "@/lib/store"

export function SegmentationScreen({
  user,
  store,
  onProceed,
}: {
  user: UserProfile
  store: StoreApi
  onProceed: () => void
}) {
  const [dob, setDob] = useState(user.dob)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const needsBirthDate = !user.dob
  const age = computeAge(user.dob || dob)
  const minor = isChildProfile(user) || (!user.dob && age !== null && age < 18)
  const firstName = user.name.split(" ")[0] || "there"

  async function continueToDashboard() {
    if (needsBirthDate) {
      const selectedAge = computeAge(dob)
      if (selectedAge === null || selectedAge < 0) {
        setError("Enter a valid date of birth so we can apply the right account protections.")
        return
      }
      setSaving(true)
      try {
        await store.updateProfile({ dob })
      } catch {
        setError("Your birth date could not be saved. Please try again.")
        setSaving(false)
        return
      }
    }
    onProceed()
  }

  return (
    <div className="flex h-full flex-col items-center justify-center bg-primary px-6 text-center text-primary-foreground">
      {/* glow accents */}
      <div className="pointer-events-none absolute -left-16 top-16 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

      <div className="mv-slide-up relative w-full max-w-sm rounded-3xl bg-card p-6 text-foreground shadow-2xl">
        <div
          className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${
            minor ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"
          }`}
        >
          {minor ? <Lock className="h-8 w-8" /> : <Unlock className="h-8 w-8" />}
        </div>

        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Account verified, {firstName}
        </p>
        {user.cardId && (
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Your LyfeVault Card ID</p>
            <p className="mt-1 text-2xl font-black tracking-[0.16em] text-primary">{user.cardId}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Keep this ID for quick access to your health passport.</p>
          </div>
        )}

        {needsBirthDate ? (
          <>
            <h1 className="mt-2 text-xl font-black text-foreground text-balance">Set up age-appropriate access</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Add your date of birth so LyfeVault can apply adult or guardian protections to this health profile.</p>
            <label className="mt-4 block text-left text-xs font-semibold text-muted-foreground">Date of birth<input type="date" required max={new Date().toISOString().slice(0, 10)} value={dob} onChange={(event) => { setDob(event.target.value); setError(null) }} className="mt-1.5 w-full rounded-xl border border-border bg-input px-3 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
            {error && <p role="alert" className="mt-3 text-left text-xs text-destructive">{error}</p>}
          </>
        ) : minor ? (
          <>
            <h1 className="mt-1 text-xl font-black text-foreground text-balance">
              Minor Security Profile Activated
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">
              <Eye className="h-4 w-4" />
              Routing to View-Only Safe Mode
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You&apos;re registered as under 18{age !== null ? ` (${age} yrs)` : ""}. Records are
              protected and read-only. A guardian or verified doctor manages your medical data.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-1 text-xl font-black text-foreground text-balance">
              Full Privilege Account Activated
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              Routing to Author Dashboard
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You have full editing access{age !== null ? ` (${age} yrs)` : ""}. Add reports, manage
              medications, and keep your health passport up to date.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => void continueToDashboard()}
          disabled={saving || (needsBirthDate && !dob)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : needsBirthDate ? "Save and continue" : `Continue to ${minor ? "Safe Mode" : "Dashboard"}`}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
