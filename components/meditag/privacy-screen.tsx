"use client"

import { useState } from "react"
import { Camera, MapPin, Phone, ShieldCheck, Lock } from "lucide-react"

interface Perm {
  key: string
  icon: typeof Camera
  title: string
  desc: string
}

const PERMISSIONS: Perm[] = [
  { key: "camera", icon: Camera, title: "Camera Access", desc: "Scan doctor NMC license QR codes & documents" },
  { key: "location", icon: MapPin, title: "Location Access", desc: "Auto-detect regional emergency services" },
  { key: "phone", icon: Phone, title: "Phone & Call Access", desc: "Direct-dial your emergency contacts" },
]

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  )
}

export function PrivacyScreen({ onContinue }: { onContinue: () => void }) {
  const [granted, setGranted] = useState<Record<string, boolean>>({
    camera: true,
    location: true,
    phone: false,
  })

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-sky-50 to-background px-6 pb-8 pt-12">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-sky-300/50">
        <ShieldCheck className="h-8 w-8" />
      </div>
      <h1 className="text-balance text-center text-2xl font-bold text-foreground">Welcome to MediTag</h1>
      <p className="mt-2 text-pretty text-center text-sm leading-relaxed text-muted-foreground">
        Your digital medical passport. Grant a few permissions so MediTag can protect you in an emergency.
      </p>

      <div className="mt-7 space-y-3">
        {PERMISSIONS.map((p) => {
          const Icon = p.icon
          const on = granted[p.key]
          return (
            <div
              key={p.key}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-4 backdrop-blur"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{p.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
              <Toggle on={on} onClick={() => setGranted((g) => ({ ...g, [p.key]: !g[p.key] }))} />
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-secondary/70 p-4">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-secondary-foreground">
          Your records are protected with <span className="font-semibold">end-to-end encryption</span> and stored in
          compliance with global health-data regulations. Emergency access is read-only.
        </p>
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={onContinue}
          className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-sky-300/50 transition-colors hover:bg-primary/90"
        >
          Accept &amp; Continue
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms &amp; Privacy Policy.
        </p>
      </div>
    </div>
  )
}
