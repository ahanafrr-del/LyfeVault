"use client"

import { useState } from "react"
import { AlertTriangle, Fingerprint, ScanFace, ShieldPlus, ArrowLeft, Mail, Check } from "lucide-react"

type Mode = "login" | "signup" | "forgot"

function Field({
  label,
  type = "text",
  placeholder,
}: {
  label: string
  type?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </label>
  )
}

export function AuthScreen({
  onEmergency,
  onAuthenticated,
}: {
  onEmergency: () => void
  onAuthenticated: () => void
}) {
  const [mode, setMode] = useState<Mode>("login")

  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-sky-50 to-background px-6 pb-8 pt-12">
      {/* Emergency bypass */}
      <button
        onClick={onEmergency}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive py-3 text-sm font-bold text-white shadow-lg shadow-red-300/50 transition hover:brightness-95"
      >
        <AlertTriangle className="h-4 w-4" />
        Emergency Access Mode
      </button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Instant read-only access to critical info — no login required
      </p>

      <div className="mt-6 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldPlus className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold text-foreground">MediTag</span>
      </div>

      {mode !== "forgot" ? (
        <>
          {/* Tabs */}
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-xl py-2 text-sm font-semibold transition ${
                  mode === m ? "bg-card text-primary shadow" : "text-secondary-foreground"
                }`}
              >
                {m === "login" ? "Login" : "Sign Up"}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {mode === "login" ? (
              <>
                <Field label="Patient ID" placeholder="MTG-XXXX-XXXX" />
                <Field label="Password" type="password" placeholder="Enter your password" />
                <button
                  onClick={() => setMode("forgot")}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </button>
                <button
                  onClick={onAuthenticated}
                  className="mt-1 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-sky-300/50 transition hover:bg-primary/90"
                >
                  Login
                </button>
                <div className="flex items-center gap-3 py-1">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">or continue with</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={onAuthenticated}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    <ScanFace className="h-4 w-4 text-primary" /> Face ID
                  </button>
                  <button
                    onClick={onAuthenticated}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    <Fingerprint className="h-4 w-4 text-primary" /> Touch ID
                  </button>
                </div>
              </>
            ) : (
              <>
                <Field label="Full Name" placeholder="Aarav Mehta" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date of Birth" type="date" />
                  <Field label="Primary Email" type="email" placeholder="you@email.com" />
                </div>
                <Field label="Emergency Contact" type="tel" placeholder="+91 XXXXX XXXXX" />
                <Field label="Create Password" type="password" placeholder="Choose a strong password" />
                <div className="flex items-center gap-2 rounded-xl bg-secondary/70 px-3.5 py-2.5">
                  <span className="text-xs text-secondary-foreground">Your MediTag ID</span>
                  <span className="ml-auto font-mono text-sm font-bold text-primary">MTG-4837-2291</span>
                </div>
                <button
                  onClick={onAuthenticated}
                  className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-sky-300/50 transition hover:bg-primary/90"
                >
                  Create MediTag Account
                </button>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex h-4 w-4 items-center justify-center rounded border border-primary bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                  Enable Face ID for faster access
                </label>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="mt-5 space-y-4">
          <button
            onClick={() => setMode("login")}
            className="flex items-center gap-1 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back to login
          </button>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Mail className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Reset your password</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We&apos;ll send a one-time code to your registered email. For minors, the OTP is sent to a verified guardian
            or emergency contact.
          </p>
          <Field label="Patient ID or Email" placeholder="MTG-XXXX-XXXX" />
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                inputMode="numeric"
                maxLength={1}
                className="aspect-square rounded-xl border border-border bg-card text-center text-lg font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            ))}
          </div>
          <button
            onClick={() => setMode("login")}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-sky-300/50 transition hover:bg-primary/90"
          >
            Verify OTP
          </button>
        </div>
      )}
    </div>
  )
}
