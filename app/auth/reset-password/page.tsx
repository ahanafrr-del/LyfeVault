"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, ShieldCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (password.length < 8) return setError("Use at least 8 characters for your new password.")
    if (password !== confirmPassword) return setError("The passwords do not match.")

    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updateError) {
      setError("This reset link is invalid or expired. Request a new one and try again.")
      return
    }
    setSaved(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <section className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Choose a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Reset links are one-time and expire automatically.</p>
        {saved ? (
          <div className="mt-6 space-y-4">
            <p role="status" className="text-sm text-foreground">Your password has been updated. You can now return to sign in.</p>
            <button type="button" onClick={() => router.push("/")} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">Return to LyfeVault</button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={(event) => void updatePassword(event)}>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">New password</span>
              <span className="relative block">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Confirm new password</span>
              <span className="relative block">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </span>
            </label>
            {error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={saving} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">{saving ? "Saving…" : "Update password"}</button>
          </form>
        )}
      </section>
    </main>
  )
}
