"use client"

import { ShieldPlus, Nfc, ScanLine, RotateCcw } from "lucide-react"

export function SplashScreen({
  onEnter,
  onReset,
}: {
  onEnter: () => void
  onReset: () => void
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-primary text-primary-foreground">
      {/* Full-screen tap area simulates the physical NFC tap */}
      <button
        type="button"
        onClick={onEnter}
        aria-label="Tap NFC card or scan QR to enter"
        className="absolute inset-0 flex flex-col items-center justify-between px-6 py-16 text-center"
      >
        {/* subtle glow accents */}
        <span className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
        <span className="pointer-events-none absolute -right-16 bottom-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        <span className="relative flex flex-1 flex-col items-center justify-center gap-6">
          <span className="relative grid place-items-center">
            <span className="absolute h-32 w-32 animate-ping rounded-full bg-white/10" />
            <span className="grid h-24 w-24 place-items-center rounded-[2rem] bg-white/15 shadow-2xl shadow-black/20 backdrop-blur-sm">
              <ShieldPlus className="h-12 w-12" strokeWidth={2.2} />
            </span>
          </span>
          <span className="block">
            <span className="block text-5xl font-black tracking-tight drop-shadow-sm">
              Medi<span className="text-accent">Vault</span>
            </span>
            <span className="mt-3 block text-sm font-medium text-primary-foreground/80">
              Your health records, secured and always with you.
            </span>
          </span>
        </span>

        <span className="relative flex flex-col items-center gap-4">
          <span className="relative grid place-items-center">
            <span className="absolute h-20 w-20 animate-ping rounded-full bg-accent/40" />
            <span
              className="absolute h-16 w-16 animate-pulse rounded-full bg-accent/30"
              style={{ animationDelay: "0.4s" }}
            />
            <span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/40">
              <Nfc className="h-7 w-7" />
            </span>
          </span>
          <span className="animate-pulse text-sm font-semibold">Tap NFC Card or Scan QR</span>
          <span className="flex items-center gap-1.5 text-xs text-primary-foreground/70">
            <ScanLine className="h-4 w-4" />
            Tap anywhere to continue
          </span>
        </span>
      </button>

      {/* Demo reset utility sits above the tap area so it can be clicked independently */}
      <button
        type="button"
        onClick={onReset}
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-primary-foreground/50 transition hover:text-primary-foreground/80"
      >
        <RotateCcw className="h-3 w-3" />
        Reset Demo App
      </button>
    </div>
  )
}
