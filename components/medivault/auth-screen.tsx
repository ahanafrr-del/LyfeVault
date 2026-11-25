"use client"

import { useState } from "react"
import { AlertCircle, Ambulance, Lock, Mail, User, Tag, Stethoscope, Fingerprint } from "lucide-react"
import { Logo } from "./shared"
import { PractitionerScan, type PractitionerSession } from "./practitioner-scan"
import { EmergencyLookupModal } from "./emergency-lookup"
import { ForgotPasswordModal } from "./forgot-password"
import { LegalFooter, LegalLinks } from "./legal"
import type { StoreApi, UserProfile } from "@/lib/store"

export function AuthScreen({
  store,
  onAuthed,
  onEmergency,
  onPractitioner,
}: {
  store: StoreApi
  /** mode tells the parent whether to route to the segmentation interstitial (signup) or straight in (login). */
  onAuthed: (mode: "login" | "signup") => void
  /** Opens the read-only Emergency Profile View. Receives the profile resolved from a Card/Tag ID lookup. */
  onEmergency: (profile?: UserProfile | null) => void
  /** Called with a verified practitioner session + the Step-1 patient Card/Tag ID to enter Approved Clinical Mode. */
  onPractitioner: (session: PractitionerSession, patientCardId: string) => void
}) {
  const [mode, setMode] = useState<"login" | "signup">("login")
  /** Login can authenticate by email+password or by physical Card/Tag ID + password. */
  const [loginMethod, setLoginMethod] = useState<"email" | "card">("email")
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [cardId, setCardId] = useState("")
  const [name, setName] = useState("")
  /** Required health-data consent is submitted to Supabase with the account registration. */
  const [agreeTerms, setAgreeTerms] = useState(false)

  const [scanOpen, setScanOpen] = useState(false)
  const [lookupOpen, setLookupOpen] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    setError(null)
    setStatusMessage(null)
    setIsSubmitting(true)
    try {
      if (mode === "login") {
        const res = loginMethod === "card"
          ? await store.loginByCard(`LV-${cardId.trim()}`, password)
          : await store.login(email, password)
        if (!res.ok) return setError(res.error ?? "Login failed.")
        onAuthed("login")
      } else {
        if (!name.trim() || !email.trim() || !password) return setError("Enter your name, email, and password.")
        if (!agreeTerms)
          return setError("Consent to the Privacy Policy and health-data processing is required to register.")
        const res = await store.register({ name: name.trim(), email: email.trim(), password })
        if (!res.ok) return setError(res.error ?? "Sign up failed.")
        if (res.pendingConfirmation) {
          setStatusMessage(res.message ?? "Confirm your email before signing in.")
          return
        }
        onAuthed("signup")
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : null
      setError(message || (mode === "signup" ? "Account creation could not be completed. Try again." : "Login could not be completed. Try again."))
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-input py-3 pl-11 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-secondary px-6 pb-8 pt-8">
      {/* Top title bar with app logo + top-right Emergency Access trigger */}
      <div className="flex items-center justify-between gap-2">
        <Logo size="md" />
        <button
          type="button"
          onClick={() => setLookupOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-destructive px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-destructive/30 transition hover:brightness-105"
        >
          <Ambulance className="h-4 w-4" />
          Emergency Access
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? "Welcome back. Sign in to continue." : "Create your secure health passport."}
      </p>

      <div className="mx-auto mt-5 flex w-full max-w-sm rounded-full bg-card p-1 shadow-sm">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setError(null)
              setStatusMessage(null)
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
          <Field icon={<User className="h-4 w-4" />}>
            <input
              className={inputClass}
              placeholder="Full name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        )}

        {/* Login method toggle (email vs Card/Tag ID) */}
        {mode === "login" && (
          <div className="flex rounded-xl bg-card p-1 shadow-sm">
            {(["email", "card"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setLoginMethod(m)
                  setError(null)
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  loginMethod === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "email" ? <Mail className="h-3.5 w-3.5" /> : <Tag className="h-3.5 w-3.5" />}
                {m === "email" ? "Email" : "Card ID"}
              </button>
            ))}
          </div>
        )}

        {mode === "login" && loginMethod === "card" ? (
          <div className="flex items-center overflow-hidden rounded-xl border border-border bg-input focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <span className="border-r border-border px-4 py-3 text-sm font-bold tracking-wide text-primary">LV-</span>
            <input
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm tracking-[0.18em] text-foreground outline-none"
              aria-label="Four-digit Card ID"
              autoComplete="username"
              inputMode="numeric"
              pattern="(1000|1[0-9]{3}|2[0-9]{3}|3000)"
              maxLength={4}
              placeholder="1000"
              required
              value={cardId}
              onChange={(e) => setCardId(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
        ) : (
          <Field icon={<Mail className="h-4 w-4" />}>
            <input
              type="email"
              className={inputClass}
              placeholder="Email ID"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        )}

        <Field icon={<Lock className="h-4 w-4" />}>
          <input
            type="password"
            className={inputClass}
            placeholder="Password"
            required
            minLength={mode === "signup" ? 6 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {mode === "login" && (
          <div className="-mt-1 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setForgotOpen(true)
                setError(null)
              }}
              className="text-xs font-semibold text-primary underline-offset-2 transition hover:underline"
            >
              Forgot Password?
            </button>
          </div>
        )}

        {mode === "login" && (
          <button
            type="button"
            onClick={async () => {
              setError(null)
              setIsSubmitting(true)
              const result = await store.loginWithPasskey()
              setIsSubmitting(false)
              if (!result.ok) setError(result.error ?? "Passkey sign-in failed.")
              else onAuthed("login")
            }}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-card py-3 text-sm font-semibold text-primary transition hover:bg-primary/5 disabled:opacity-60"
          >
            <Fingerprint className="h-5 w-5" />
            Sign in with a passkey
          </button>
        )}

        {mode === "signup" && (
          <div className="mt-1 rounded-xl bg-card px-3 py-2.5 text-xs leading-relaxed text-muted-foreground shadow-sm">
            <div className="flex items-start gap-2.5">
              <input
                id="health-data-consent"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked)
                  setError(null)
                }}
                required
                aria-required="true"
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <label htmlFor="health-data-consent">
                I have read the Terms of Service and Privacy Policy and consent to LyfeVault processing my health data to provide my medical passport and emergency access.
              </label>
            </div>
            <div className="ml-6 mt-2 flex flex-wrap items-center gap-2">
              <span>Read:</span>
              <LegalLinks />
            </div>
          </div>
        )}

        {statusMessage && (
          <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
            {statusMessage}
          </p>
        )}

        {error && (
          <div role="alert" aria-live="polite" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="mt-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      {/* Practitioner quick login */}
      <div className="mx-auto mt-5 w-full max-w-sm">
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-card py-3 text-sm font-bold text-primary shadow-sm transition hover:bg-primary/5"
        >
          <Stethoscope className="h-5 w-5" />
          Doctor / Practitioner Access
        </button>
      </div>

      {scanOpen && (
        <PractitionerScan
          onClose={() => setScanOpen(false)}
          onApproved={(session, patientCardId) => {
            setScanOpen(false)
            onPractitioner(session, patientCardId)
          }}
        />
      )}

      {lookupOpen && (
        <EmergencyLookupModal
          store={store}
          onClose={() => setLookupOpen(false)}
          onFound={(profile) => {
            setLookupOpen(false)
            onEmergency(profile)
          }}
        />
      )}

      {forgotOpen && <ForgotPasswordModal store={store} onClose={() => setForgotOpen(false)} />}

      <LegalFooter className="mt-auto pt-6" />
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
