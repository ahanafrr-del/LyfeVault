"use client"

import { Lock, Unlock, ArrowRight, ShieldCheck, Eye } from "lucide-react"
import { computeAge, isChildProfile, type UserProfile } from "@/lib/store"

export function SegmentationScreen({
  user,
  onProceed,
}: {
  user: UserProfile
  onProceed: () => void
}) {
  const minor = isChildProfile(user)
  const age = computeAge(user.dob)
  const firstName = user.name.split(" ")[0] || "there"

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

        {minor ? (
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
          onClick={onProceed}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
        >
          Continue to {minor ? "Safe Mode" : "Dashboard"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
