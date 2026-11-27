"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import QRCode from "qrcode"
import {
  Bell,
  Search,
  Users,
  ChevronRight,
  FileText,
  Pill,
  AlertTriangle,
  HeartPulse,
  Ambulance,
  Settings,
  Droplet,
  Phone,
  Lock,
  CreditCard,
} from "lucide-react"
import { computeAge, isChildProfile, type UserProfile } from "@/lib/store"

export type DashboardAction =
  | "dependents"
  | "timeline"
  | "departments"
  | "health-info"
  | "vitals"
  | "emergency"
  | "settings"

const TILES: {
  id: DashboardAction
  label: string
  icon: typeof FileText
  tone: "primary" | "accent"
}[] = [
  { id: "timeline", label: "Medical Reports", icon: FileText, tone: "primary" },
  { id: "departments", label: "Prescriptions", icon: Pill, tone: "accent" },
  { id: "health-info", label: "Allergies & Conditions", icon: AlertTriangle, tone: "primary" },
  { id: "vitals", label: "Vitals & Telemetry", icon: HeartPulse, tone: "accent" },
  { id: "emergency", label: "Emergency Bypass", icon: Ambulance, tone: "primary" },
  { id: "settings", label: "Settings", icon: Settings, tone: "accent" },
]

export function Dashboard({
  user,
  onAction,
  onNotifications,
}: {
  user: UserProfile
  onAction: (action: DashboardAction) => void
  onNotifications: () => void
}) {
  const firstName = user.name.split(" ")[0] || "there"
  const age = computeAge(user.dob)
  const readOnly = isChildProfile(user)
  const initials = user.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U"
  const primaryContact = user.contacts[0]
  const dependentCount = (user.dependents ?? []).length
  const [busyPlan, setBusyPlan] = useState<"monthly" | "yearly" | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!user.trialEndsAt) return
    const timer = window.setTimeout(() => {
      setDaysRemaining(Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86_400_000)))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [user.trialEndsAt])

  async function renew(planType: "monthly" | "yearly") {
    setBusyPlan(planType)
    setBillingError(null)
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType, idempotencyKey: crypto.randomUUID() }),
      })
      const result = await response.json() as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error || "Checkout is unavailable. Please try again.")
      window.location.assign(result.url)
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Checkout is unavailable. Please try again.")
      setBusyPlan(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl bg-secondary pb-10">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-secondary/90 px-4 py-3.5 backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Hello,</p>
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-bold text-foreground">{firstName}</p>
            {readOnly && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                <Lock className="h-3 w-3" />
                View only
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label="Search"
          className="grid h-10 w-10 place-items-center rounded-full bg-card text-primary shadow-sm"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onNotifications}
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-full bg-card text-primary shadow-sm"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </button>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {initials}
        </div>
      </div>

      {/* Emergency widget */}
      <div className="px-4">
        <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/25">
          <div className="mb-3 flex items-center gap-2">
            <Ambulance className="h-5 w-5" />
            <span className="text-sm font-semibold">Emergency Snapshot</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat
              icon={readOnly ? <Lock className="h-4 w-4" /> : <Droplet className="h-4 w-4" />}
              label="Blood"
              value={user.bloodGroup || "N/A"}
            />
            <MiniStat
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Allergies"
              value={user.allergies.length > 0 ? String(user.allergies.length) : "None"}
            />
            <MiniStat
              icon={<Phone className="h-4 w-4" />}
              label="Contact"
              value={primaryContact ? primaryContact.name.split(" ")[0] : "None"}
            />
          </div>
          {age !== null && (
            <p className="mt-3 text-xs text-primary-foreground/80">
              {age} yrs{user.gender ? ` \u00b7 ${user.gender}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 px-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-card px-4 py-3.5 shadow-sm">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CreditCard className="size-5" /></span>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Your LyfeVault Card ID</p><p className="mt-0.5 font-mono text-xl font-black tracking-[0.12em] text-primary">{user.cardId || "Assigning…"}</p><a href={user.cardId ? `/c/${encodeURIComponent(user.cardId)}` : undefined} className="mt-1 inline-block text-xs font-semibold text-primary underline underline-offset-2">View emergency card</a></div>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent">Emergency ready</span>
        </div>
        {user.cardId && <CardQr cardId={user.cardId} />}
      </div>

      {!readOnly && <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm" aria-labelledby="subscription-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="subscription-heading" className="text-sm font-bold text-foreground">{user.subscriptionStatus === "active" ? "Subscription active" : "6-month free trial"}</h2><p className="mt-1 text-xs text-muted-foreground">{user.subscriptionStatus === "active" ? "Manage your LyfeVault renewal below." : daysRemaining === null ? "Your trial is active." : daysRemaining > 0 ? `${daysRemaining} days remaining · trial ends ${user.trialEndsAt.slice(0, 10)}` : "Your free trial has ended."}</p></div>
        </div>
        <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">Monthly reminder: check this dashboard before your trial ends to keep your emergency card active.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => renew("monthly")} disabled={busyPlan !== null} className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60">{busyPlan === "monthly" ? "Opening checkout…" : "Renew Subscription · ₹150/month"}</button>
          <button type="button" onClick={() => renew("yearly")} disabled={busyPlan !== null} className="flex-1 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:opacity-60">{busyPlan === "yearly" ? "Opening checkout…" : "Renew yearly · ₹1,500/year"}</button>
        </div>
        {billingError && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{billingError}</p>}
      </section>}

      {/* Centerpiece — Dependent Profiles hub */}
      <div className="mt-4 px-4">
        <button
          type="button"
          onClick={() => onAction("dependents")}
          className="flex w-full items-center gap-4 rounded-2xl bg-accent p-4 text-left text-accent-foreground shadow-lg shadow-accent/25 transition hover:-translate-y-0.5 hover:brightness-110"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20">
            <Users className="h-7 w-7" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold leading-tight">Dependent Profiles</span>
            <span className="mt-0.5 block text-xs text-accent-foreground/85">
              {dependentCount > 0
                ? `${dependentCount} linked ${dependentCount === 1 ? "profile" : "profiles"} \u00b7 manage family passports`
                : "Manage family passports & MediTags"}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-accent-foreground/80" />
        </button>
      </div>

      {/* Bento grid */}
      <div className="mt-5 px-4">
        <h2 className="mb-3 text-sm font-bold text-foreground">Quick Access</h2>
        <div className="grid grid-cols-2 gap-3">
          {TILES.map((tile) => {
            const Icon = tile.icon
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => onAction(tile.id)}
                className="flex flex-col items-start gap-3 rounded-2xl bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10"
              >
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl ${
                    tile.tone === "primary"
                      ? "bg-primary/10 text-primary"
                      : "bg-accent/10 text-accent"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold leading-tight text-foreground">
                  {tile.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CardQr({ cardId }: { cardId: string }) {
  const [dataUrl, setDataUrl] = useState("")

  useEffect(() => {
    let active = true
    QRCode.toDataURL(`${window.location.origin}/c/${encodeURIComponent(cardId)}`, { width: 180, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => { if (active) setDataUrl(url) })
      .catch(() => { if (active) setDataUrl("") })
    return () => { active = false }
  }, [cardId])

  return <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"><div className="grid size-[92px] shrink-0 place-items-center rounded-xl bg-white p-1">{dataUrl ? <Image src={dataUrl} alt={`QR code linking to emergency card ${cardId}`} width={180} height={180} unoptimized className="size-full" /> : <span className="text-xs text-muted-foreground">Preparing QR…</span>}</div><div className="min-w-0"><p className="text-sm font-bold text-foreground">Emergency QR</p><p className="mt-1 text-xs text-muted-foreground">Scan to open your read-only triage card.</p>{dataUrl && <a href={dataUrl} download={`${cardId}-emergency-qr.png`} className="mt-2 inline-flex rounded-lg bg-accent px-3 py-2 text-xs font-bold text-accent-foreground">Download QR</a>}</div></div>
}

function MiniStat({ 
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-white/12 px-2 py-2 text-center">
      <div className="mb-1 flex justify-center text-primary-foreground/80">{icon}</div>
      <p className="truncate text-sm font-bold leading-none">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-primary-foreground/70">{label}</p>
    </div>
  )
}
