"use client"

import { ShieldPlus, Nfc, ScanLine } from "lucide-react"

export function SplashScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <button
      type="button"
      onClick={onEnter}
      aria-label="Tap NFC card or scan QR to enter"
      className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden bg-primary px-6 py-16 text-center text-primary-foreground"
    >
      {/* subtle glow accents */}
      <div className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex flex-1 flex-col items-center justify-center gap-6">
        <div className="relative grid place-items-center">
          <span className="absolute h-32 w-32 animate-ping rounded-full bg-white/10" />
          <div className="grid h-24 w-24 place-items-center rounded-[2rem] bg-white/15 shadow-2xl shadow-black/20 backdrop-blur-sm">
            <ShieldPlus className="h-12 w-12" strokeWidth={2.2} />
          </div>
        </div>
        <div>
          <h1 className="text-5xl font-black tracking-tight drop-shadow-sm">
            Medi<span className="text-accent">Vault</span>
          </h1>
          <p className="mt-3 text-sm font-medium text-primary-foreground/80">
            Your health records, secured and always with you.
          </p>
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-4">
        <div className="relative grid place-items-center">
          <span className="absolute h-20 w-20 animate-ping rounded-full bg-accent/40" />
          <span
            className="absolute h-16 w-16 animate-pulse rounded-full bg-accent/30"
            style={{ animationDelay: "0.4s" }}
          />
          <div className="grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/40">
            <Nfc className="h-7 w-7" />
          </div>
        </div>
        <p className="animate-pulse text-sm font-semibold">Tap NFC Card or Scan QR</p>
        <div className="flex items-center gap-1.5 text-xs text-primary-foreground/70">
          <ScanLine className="h-4 w-4" />
          <span>Tap anywhere to continue</span>
        </div>
      </div>
    </button>
  )
}
