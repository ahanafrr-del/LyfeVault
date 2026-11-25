"use client"

import { useState } from "react"
import { KeyRound, Lock, Unlock } from "lucide-react"
import type { StoreApi } from "@/lib/store"
import { ModalShell } from "./shared"

export function ParentalMasterAccess({ store, unlocked, onChange }: { store: StoreApi; unlocked: boolean; onChange: (value: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function unlock() {
    const valid = await store.verifyParentalMasterKey(key)
    if (!valid) {
      setError("That key is not valid. The account remains read-only.")
      return
    }
    setError(null)
    setKey("")
    setOpen(false)
    onChange(true)
  }

  return (
    <>
      <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-card px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Parental Master Key</p>
          <p className="text-xs text-muted-foreground">{unlocked ? "Temporary access is active" : "Minor account is read-only"}</p>
        </div>
        {unlocked ? (
          <button type="button" onClick={() => onChange(false)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-foreground px-3 py-2 text-xs font-bold text-background">
            <Lock className="size-4" /> Lock now
          </button>
        ) : (
          <button type="button" onClick={() => { setError(null); setOpen(true) }} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
            <Unlock className="size-4" /> Unlock
          </button>
        )}
      </div>
      {open && (
        <ModalShell title="Parental Master Key" subtitle="Enter the key created during sign-up" onClose={() => { setOpen(false); setKey(""); setError(null) }}>
          <form className="flex flex-col gap-4 p-5" onSubmit={(event) => { event.preventDefault(); void unlock() }}>
            <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
              Master Key
              <span className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input type="password" autoComplete="current-password" autoFocus required value={key} onChange={(event) => { setKey(event.target.value); setError(null) }} className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </span>
            </label>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <button type="submit" className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">Unlock temporary access</button>
            <p className="text-xs leading-relaxed text-muted-foreground">Unlocking is temporary for this signed-in session. Lock the profile when finished.</p>
          </form>
        </ModalShell>
      )}
    </>
  )
}
