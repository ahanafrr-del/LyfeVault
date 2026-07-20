"use client"

import {
  Bell,
  Search,
  Bot,
  Sparkles,
  FileText,
  Pill,
  AlertTriangle,
  HeartPulse,
  Ambulance,
  Settings,
  Droplet,
  Phone,
  Lock,
} from "lucide-react"
import { computeAge, isChildProfile, type UserProfile } from "@/lib/store"

export type DashboardAction =
  | "chatbot"
  | "summary"
  | "timeline"
  | "departments"
  | "health-info"
  | "vitals"
  | "emergency"
  | "settings"

const TILES: {
  id: DashboardAction
  label: string
  icon: typeof Bot
  tone: "primary" | "accent"
}[] = [
  { id: "chatbot", label: "AI Chatbot", icon: Bot, tone: "primary" },
  { id: "summary", label: "AI Health Summary", icon: Sparkles, tone: "accent" },
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

  return (
    <div className="w-full bg-secondary pb-10">
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
