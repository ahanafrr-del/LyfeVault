"use client"

import { useState } from "react"
import { MapPin, Phone, Ambulance, Shield, Flame, Loader2, AlertCircle, Siren } from "lucide-react"

type LocaleServices = {
  region: string
  numbers: { label: string; number: string; icon: "siren" | "ambulance" | "police" | "fire" }[]
}

/**
 * Resolves a rough locale from the user's coordinates to localized emergency numbers.
 * This is a lightweight offline heuristic (no reverse-geocoding API): it buckets by
 * broad longitude/latitude bands and always includes the global 112 fallback.
 */
function resolveServices(lat: number, lng: number): LocaleServices {
  // India-ish band
  if (lat >= 6 && lat <= 37 && lng >= 68 && lng <= 97) {
    return {
      region: "India",
      numbers: [
        { label: "All-in-one Emergency", number: "112", icon: "siren" },
        { label: "Ambulance", number: "102", icon: "ambulance" },
        { label: "Police", number: "100", icon: "police" },
        { label: "Fire", number: "101", icon: "fire" },
      ],
    }
  }
  // North America band
  if (lat >= 15 && lat <= 72 && lng >= -168 && lng <= -52) {
    return {
      region: "North America",
      numbers: [
        { label: "All-in-one Emergency", number: "911", icon: "siren" },
        { label: "Ambulance", number: "911", icon: "ambulance" },
        { label: "Police", number: "911", icon: "police" },
        { label: "Fire", number: "911", icon: "fire" },
      ],
    }
  }
  // Europe / default
  return {
    region: "International",
    numbers: [
      { label: "All-in-one Emergency", number: "112", icon: "siren" },
      { label: "Ambulance", number: "112", icon: "ambulance" },
      { label: "Police", number: "112", icon: "police" },
      { label: "Fire", number: "112", icon: "fire" },
    ],
  }
}

const ICONS = {
  siren: Siren,
  ambulance: Ambulance,
  police: Shield,
  fire: Flame,
} as const

/**
 * "Call Emergency Services / Local Help" block. Requests browser geolocation, then shows
 * localized one-tap emergency dispatch numbers for the resolved region.
 */
export function EmergencyServices() {
  const [status, setStatus] = useState<"idle" | "locating" | "ready" | "error">("idle")
  const [services, setServices] = useState<LocaleServices | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function requestLocation() {
    setError(null)
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      // Graceful fallback to international numbers when geolocation is unavailable.
      setServices(resolveServices(0, 0))
      setStatus("ready")
      return
    }
    setStatus("locating")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lng: longitude })
        setServices(resolveServices(latitude, longitude))
        setStatus("ready")
      },
      () => {
        // Permission denied or failed — still surface the international defaults.
        setServices(resolveServices(0, 0))
        setStatus("ready")
        setError("Location unavailable. Showing international emergency numbers.")
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  if (status === "idle") {
    return (
      <button
        type="button"
        onClick={requestLocation}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive py-3.5 text-sm font-bold text-white shadow-lg shadow-destructive/30 transition hover:brightness-105"
      >
        <Siren className="h-5 w-5" />
        Call Emergency Services / Local Help
      </button>
    )
  }

  if (status === "locating") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-card py-4 text-sm font-semibold text-primary shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Detecting your location...
      </div>
    )
  }

  return (
    <section className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-destructive">
        <MapPin className="h-5 w-5" />
        <h2 className="font-bold text-foreground">Local Emergency Services</h2>
        {services && (
          <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {services.region}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {coords && (
        <p className="mb-3 text-[11px] text-muted-foreground">
          Approx. location: {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {services?.numbers.map((s) => {
          const Icon = ICONS[s.icon]
          return (
            <a
              key={s.label}
              href={`tel:${s.number}`}
              className="flex items-center gap-2.5 rounded-xl bg-destructive p-3 text-white shadow-md shadow-destructive/25 transition hover:brightness-105"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-medium text-white/80">{s.label}</span>
                <span className="flex items-center gap-1 text-base font-black leading-tight">
                  <Phone className="h-3.5 w-3.5" />
                  {s.number}
                </span>
              </span>
            </a>
          )
        })}
      </div>
    </section>
  )
}
