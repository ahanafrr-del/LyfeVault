"use client"

import { AlertTriangle, Phone, HeartPulse, Pill, Activity, UserX } from "lucide-react"
import { ScreenHeader, EmptyState } from "./shared"
import { computeAge, type UserProfile } from "@/lib/store"

export function EmergencyView({
  profile,
  onBack,
}: {
  profile: UserProfile | null
  onBack: () => void
}) {
  const age = profile ? computeAge(profile.dob) : null
  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?"

  return (
    <div className="flex h-full flex-col bg-secondary">
      <ScreenHeader title="Emergency Access" subtitle="Public medical snapshot" onBack={onBack} />

      {!profile ? (
        <EmptyState
          icon={<UserX className="h-7 w-7" />}
          title="No patient record found"
          hint="This MediVault card has not been registered yet. Please sign up to create a profile."
        />
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Identity card */}
          <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/25">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 text-xl font-bold">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold">{profile.name || "Unknown patient"}</p>
                <p className="text-sm text-primary-foreground/80">
                  {age !== null ? `${age} yrs` : "Age N/A"}
                  {profile.gender ? ` \u00b7 ${profile.gender}` : ""}
                </p>
              </div>
              <div className="ml-auto flex flex-col items-center rounded-xl bg-destructive px-3 py-2 text-white">
                <span className="text-[10px] font-semibold uppercase tracking-wide opacity-90">Blood</span>
                <span className="text-lg font-black leading-none">{profile.bloodGroup || "N/A"}</span>
              </div>
            </div>
          </div>

          <SnapshotCard
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Allergies"
            tone="warn"
            items={profile.allergies}
            empty="No known allergies"
          />
          <SnapshotCard
            icon={<HeartPulse className="h-5 w-5" />}
            title="Chronic Conditions"
            tone="primary"
            items={profile.conditions}
            empty="No chronic conditions recorded"
          />
          <SnapshotCard
            icon={<Pill className="h-5 w-5" />}
            title="Current Medications"
            tone="accent"
            items={profile.medications}
            empty="No active medications"
          />

          {/* Emergency contacts */}
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Activity className="h-5 w-5" />
              <h2 className="font-bold text-foreground">Emergency Contacts</h2>
            </div>
            {profile.contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emergency contacts added.</p>
            ) : (
              <ul className="space-y-2">
                {profile.contacts.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.relation} {c.phone ? `\u00b7 ${c.phone}` : ""}
                      </p>
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      aria-label={`Call ${c.name}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-md shadow-accent/30 transition hover:brightness-110"
                    >
                      <Phone className="h-5 w-5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SnapshotCard({
  icon,
  title,
  items,
  empty,
  tone,
}: {
  icon: React.ReactNode
  title: string
  items: string[]
  empty: string
  tone: "warn" | "primary" | "accent"
}) {
  const toneMap = {
    warn: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
  } as const
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className={`mb-3 flex items-center gap-2 ${toneMap[tone].split(" ")[1]}`}>
        {icon}
        <h2 className="font-bold text-foreground">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className={`rounded-full px-3 py-1 text-sm font-medium ${toneMap[tone]}`}
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
