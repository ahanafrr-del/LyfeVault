"use client"

import { useState } from "react"
import {
  Tag,
  Search,
  AlertCircle,
  AlertTriangle,
  HeartPulse,
  Droplet,
  Phone,
  UserX,
  ChevronLeft,
} from "lucide-react"
import { ModalShell } from "./shared"
import { EmergencyServices } from "./emergency-services"
import { computeAge, type StoreApi, type UserProfile } from "@/lib/store"

/**
 * Top-bar Emergency Access modal. Prompts for a Card/Tag ID, looks it up in the local
 * users DB, and renders a critical emergency snapshot (name, blood group, allergies,
 * conditions, primary emergency phone) plus proximity-based emergency dispatch numbers.
 */
export function EmergencyLookupModal({ store, onClose }: { store: StoreApi; onClose: () => void }) {
  const [cardId, setCardId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [match, setMatch] = useState<UserProfile | null>(null)

  function lookup() {
    setError(null)
    const id = cardId.trim()
    if (!id) return setError("Enter the target Card/Tag ID number.")
    const found = store.getUserByCardId(id)
    if (!found) {
      setMatch(null)
      return setError("No registered profile found for this Card/Tag ID.")
    }
    setMatch(found)
  }

  return (
    <ModalShell
      title="Emergency Access"
      subtitle={match ? "Critical medical snapshot" : "Enter a physical Card/Tag ID"}
      headerAccent
      onClose={onClose}
    >
      {!match ? (
        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Enter the Card/Tag ID printed on the patient&apos;s physical card to retrieve their
              critical health information. No login required.
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Card/Tag ID Number
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Tag className="h-4 w-4" />
              </span>
              <input
                autoFocus
                className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-3 text-sm font-semibold uppercase tracking-wider text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. LV-8H3N2"
                value={cardId}
                onChange={(e) => {
                  setCardId(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) lookup()
                }}
              />
            </div>
          </label>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <UserX className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={lookup}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-bold text-white shadow-lg shadow-destructive/30 transition hover:brightness-105"
          >
            <Search className="h-5 w-5" />
            Retrieve Emergency Snapshot
          </button>
        </div>
      ) : (
        <EmergencySnapshot profile={match} onReset={() => setMatch(null)} />
      )}
    </ModalShell>
  )
}

function EmergencySnapshot({ profile, onReset }: { profile: UserProfile; onReset: () => void }) {
  const age = computeAge(profile.dob)
  const primaryPhone = profile.contacts[0]?.phone ?? ""

  return (
    <div className="space-y-4 bg-secondary p-4">
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1 text-xs font-semibold text-primary transition hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Look up another card
      </button>

      {/* Identity + blood group */}
      <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/25">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{profile.name || "Unknown patient"}</p>
            <p className="text-xs text-primary-foreground/80">
              {age !== null ? `${age} yrs` : "Age N/A"}
              {profile.gender ? ` \u00b7 ${profile.gender}` : ""}
              {` \u00b7 ${profile.cardId}`}
            </p>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-destructive px-3 py-2 text-white">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-90">
              <Droplet className="h-3 w-3" /> Blood
            </span>
            <span className="text-lg font-black leading-none">{profile.bloodGroup || "N/A"}</span>
          </div>
        </div>
      </div>

      <SnapshotBlock
        icon={<AlertTriangle className="h-5 w-5" />}
        tone="warn"
        title="Critical Allergies"
        items={profile.allergies}
        empty="No known allergies"
      />
      <SnapshotBlock
        icon={<HeartPulse className="h-5 w-5" />}
        tone="primary"
        title="Chronic Conditions"
        items={profile.conditions}
        empty="No chronic conditions recorded"
      />

      {/* Primary emergency phone */}
      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-destructive">
          <Phone className="h-5 w-5" />
          <h2 className="font-bold text-foreground">Primary Emergency Contact</h2>
        </div>
        {primaryPhone ? (
          <a
            href={`tel:${primaryPhone}`}
            className="flex items-center gap-3 rounded-2xl bg-destructive p-3.5 text-white shadow-lg shadow-destructive/25 transition hover:brightness-105"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20">
              <Phone className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-bold leading-tight">
                {profile.contacts[0]?.name || "Emergency contact"}
              </span>
              <span className="block truncate text-xs text-white/80">{primaryPhone}</span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide">Call</span>
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">No emergency contact on record.</p>
        )}
      </div>

      <EmergencyServices />
    </div>
  )
}

function SnapshotBlock({
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
  tone: "warn" | "primary"
}) {
  const toneMap = {
    warn: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
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
            <span key={item} className={`rounded-full px-3 py-1 text-sm font-medium ${toneMap[tone]}`}>
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
