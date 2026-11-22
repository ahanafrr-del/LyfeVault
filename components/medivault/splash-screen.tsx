"use client"

import { ShieldPlus } from "lucide-react"

export function SplashScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden bg-primary px-6 py-16 text-center text-primary-foreground">
      <span className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
      <span className="pointer-events-none absolute -right-16 bottom-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex flex-1 flex-col items-center justify-center gap-6">
        <span className="grid size-24 place-items-center rounded-[2rem] bg-white/15 shadow-2xl shadow-black/20 backdrop-blur-sm">
          <ShieldPlus className="size-12" strokeWidth={2.2} />
        </span>
        <div>
          <h1 className="text-5xl font-black tracking-tight drop-shadow-sm">
            Lyfe<span className="text-accent">Vault</span>
          </h1>
          <p className="mt-3 text-sm font-medium text-primary-foreground/80">
            Your health records, secured and always with you.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onEnter}
        className="relative rounded-xl bg-accent px-8 py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
      >
        Continue to sign in
      </button>
    </div>
  )
}
