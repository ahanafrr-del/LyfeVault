"use client"

import { useState } from "react"
import { AlertCircle, Ambulance, Lock, Mail, Calendar, User, Droplet } from "lucide-react"
import { Logo } from "./shared"
import type { StoreApi } from "@/lib/store"

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export function AuthScreen({
  store,
  onAuthed,
  onEmergency,
}: {
  store: StoreApi
  /** mode tells the parent whether to route to the segmentation interstitial (signup) or straight in (login). */
  onAuthed: (mode: "login" | "signup") => void
  onEmergency: () => void
}) {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("")
  const [bloodGroup, setBloodGroup] = useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (mode === "login") {
      const res = store.login(email, password)
      if (!res.ok) return setError(res.error ?? "Login failed.")
      onAuthed("login")
    } else {
      if (!name.trim() || !dob || !bloodGroup) return setError("Please complete all sign-up fields.")
      const res = store.register({ name, dob, bloodGroup, gender, email, password })
      if (!res.ok) return setError(res.error ?? "Sign up failed.")
      onAuthed("signup")
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-input py-3 pl-11 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-secondary px-6 pb-8 pt-12">
      <div className="flex flex-col items-center gap-2">
        <Logo size="lg" />
        <p className="text-sm text-muted-foreground">
          {mode === "login" ? "Welcome back. Sign in to continue." : "Create your secure health passport."}
        </p>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-sm rounded-full bg-card p-1 shadow-sm">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize transition-colors ${
              mode === m ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
            }`}
          >
            {m === "login" ? "Login" : "Sign up"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-3">
        {mode === "signup" && (
          <>
            <Field icon={<User className="h-4 w-4" />}>
              <input
                className={inputClass}
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field icon={<Calendar className="h-4 w-4" />}>
                <input
                  type="date"
                  className={inputClass}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </Field>
              <Field icon={<Droplet className="h-4 w-4" />}>
                <select
                  className={`${inputClass} appearance-none`}
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                >
                  <option value="">Blood</option>
                  {BLOOD_GROUPS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field icon={<User className="h-4 w-4" />}>
              <select
                className={`${inputClass} appearance-none`}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </Field>
          </>
        )}

        <Field icon={<Mail className="h-4 w-4" />}>
          <input
            type="email"
            className={inputClass}
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field icon={<Lock className="h-4 w-4" />}>
          <input
            type="password"
            className={inputClass}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="mt-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
        >
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="mx-auto mt-auto w-full max-w-sm pt-8">
        <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          In an emergency?
          <span className="h-px flex-1 bg-border" />
        </div>
        <button
          type="button"
          onClick={onEmergency}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3.5 text-sm font-bold text-white shadow-lg shadow-destructive/30 transition hover:brightness-105"
        >
          <Ambulance className="h-5 w-5" />
          Emergency Access
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          View critical info without logging in
        </p>
      </div>
    </div>
  )
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      {children}
    </div>
  )
}
