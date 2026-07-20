"use client"

import Image from "next/image"
import { AlertTriangle, Phone, Ambulance, Shield, Flame, Droplet } from "lucide-react"
import { PATIENT } from "@/lib/meditag-data"

function ServiceButton({
  icon: Icon,
  label,
  className,
}: {
  icon: typeof Ambulance
  label: string
  className: string
}) {
  return (
    <button
      className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-bold text-white shadow-md transition hover:brightness-95 ${className}`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  )
}

export function EmergencyView() {
  const p = PATIENT
  return (
    <div className="min-h-full bg-background pb-8">
      {/* Alert header */}
      <div className="flex items-center gap-2 bg-destructive px-5 py-3 text-white">
        <AlertTriangle className="h-5 w-5" />
        <div>
          <p className="text-sm font-bold leading-tight">Emergency Medical Profile</p>
          <p className="text-[11px] leading-tight opacity-90">Read-only · Verified by MediTag</p>
        </div>
      </div>

      <div className="space-y-4 px-5 pt-5">
        {/* Identity */}
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <Image
            src={p.photo || "/placeholder.svg"}
            alt={`Portrait of ${p.name}`}
            width={64}
            height={64}
            className="h-16 w-16 rounded-2xl object-cover"
          />
          <div>
            <p className="text-lg font-bold text-foreground">{p.name}</p>
            <p className="text-sm text-muted-foreground">
              {p.age} yrs · {p.gender}
            </p>
          </div>
          <div className="ml-auto flex flex-col items-center rounded-2xl bg-destructive/10 px-3 py-2">
            <Droplet className="h-4 w-4 text-destructive" />
            <span className="text-lg font-extrabold text-destructive">{p.bloodGroup}</span>
          </div>
        </div>

        {/* Allergies */}
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-700">Critical Allergies</p>
          <div className="flex flex-wrap gap-2">
            {p.allergies.map((a) => (
              <span
                key={a.name}
                className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${
                  a.level === "high" ? "bg-destructive" : "bg-amber-500"
                }`}
              >
                {a.name}
              </span>
            ))}
          </div>
        </section>

        {/* Chronic illnesses */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Chronic Conditions</p>
          <div className="flex flex-wrap gap-2">
            {p.chronicIllnesses.map((c) => (
              <span key={c} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* Emergency contacts */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Emergency Contacts</p>
          <div className="space-y-2">
            {p.emergencyContacts.map((c) => (
              <a
                key={c.phone}
                href={`tel:${c.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3 transition hover:bg-secondary"
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.relation} · {c.phone}
                  </p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Phone className="h-4 w-4" />
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Emergency services */}
        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Location-aware Services
          </p>
          <div className="grid grid-cols-3 gap-3">
            <ServiceButton icon={Ambulance} label="Ambulance" className="bg-destructive" />
            <ServiceButton icon={Shield} label="Police" className="bg-primary" />
            <ServiceButton icon={Flame} label="Fire" className="bg-amber-500" />
          </div>
        </section>
      </div>
    </div>
  )
}
