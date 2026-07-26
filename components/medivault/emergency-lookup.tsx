"use client"

import { useState } from "react"
import { Tag, ShieldAlert, AlertCircle, UserX } from "lucide-react"
import { ModalShell } from "./shared"
import type { StoreApi, UserProfile } from "@/lib/store"

/**
 * Top-bar Emergency Access modal. Prompts a responder for a physical Card/Tag ID, looks it up in
 * the local users DB, and — on an exact match — hands the resolved profile back to the parent so
 * it can open Screen 2 (the read-only Emergency Profile View). No login required.
 */
export function EmergencyLookupModal({
  store,
  onClose,
  onFound,
}: {
  store: StoreApi
  onClose: () => void
  /** Called with the resolved record so the parent can open the Emergency Read-Only Profile View. */
  onFound: (profile: UserProfile) => void
}) {
  const [cardId, setCardId] = useState("")
  const [error, setError] = useState<string | null>(null)

  function lookup() {
    setError(null)
    const id = cardId.trim()
    if (!id) return setError("\u26D4 Invalid or Unregistered Card/Tag ID.")
    const found = store.getUserByCardId(id)
    if (!found) return setError("\u26D4 Invalid or Unregistered Card/Tag ID.")
    onFound(found)
  }

  return (
    <ModalShell
      title="Emergency Access"
      subtitle="Enter a physical Card/Tag ID"
      headerAccent
      onClose={onClose}
    >
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          <ShieldAlert className="h-6 w-6 shrink-0" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Enter the Card/Tag ID printed on the patient&apos;s physical card to open their critical
            emergency profile. No login required.
          </p>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">
            Enter Card/Tag ID Number
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
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            <UserX className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={lookup}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-bold text-white shadow-lg shadow-destructive/30 transition hover:brightness-105"
        >
          <AlertCircle className="h-5 w-5" />
          Access Emergency Profile
        </button>
      </div>
    </ModalShell>
  )
}
