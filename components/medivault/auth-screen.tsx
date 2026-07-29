"use client"

import { useState } from "react"
import { AlertCircle, Ambulance, Lock, Mail, Calendar, User, Droplet, Tag, Stethoscope } from "lucide-react"
import { Logo } from "./shared"
import { PractitionerScan, type PractitionerSession } from "./practitioner-scan"
import { EmergencyLookupModal } from "./emergency-lookup"
import { ForgotPasswordModal } from "./forgot-password"
import { LegalFooter, LegalLinks } from "./legal"
import type { StoreApi, UserProfile } from "@/lib/store"
import { supabase } from "@/lib/sopabase"
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

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

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [cardId, setCardId] = useState("")
  const [name, setName] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("")
  const [bloodGroup, setBloodGroup] = useState("")
  const [signupCardId, setSignupCardId] = useState("")
  /** Mandatory consent to Terms of Service + Privacy Policy required before registration. */
  const [agreeTerms, setAgreeTerms] = useState(false)

  const [scanOpen, setScanOpen] = useState(false)
  const [lookupOpen, setLookupOpen] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === "login") {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) return setError(authError.message)
      const res = store.login(email, password)
      if (!res.ok) return setError(res.error ?? "Login failed.")
      onAuthed("login")
    } else {
      if (!name.trim() || !dob || !bloodGroup) return setError("Please complete all sign-up fields.")
      if (!signupCardId.trim()) return setError("Card/Tag ID Number is required to register.")
      if (!agreeTerms)
        return setError("You must agree to the Terms of Service and Privacy Policy to register.")

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            dob,
            blood_group: bloodGroup,
            gender,
            card_id: signupCardId,
          },
        },
      })

      if (authError) return setError(authError.message)

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            name,
            email,
            dob,
            blood_group: bloodGroup,
            gender,
            card_id: signupCardId,
          }
        ])
        if (profileError) console.error("Profile creation error:", profileError.message)
      }

      store.register({ name, dob, bloodGroup, gender, email, password, cardId: signupCardId })
      onAuthed("signup")
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
            <Field icon={<Tag className="h-4 w-4" />}>
              <input
                className={inputClass}
                placeholder="Card/Tag ID Number (required)"
                value={signupCardId}
                onChange={(e) => setSignupCardId(e.target.value)}
                required
                aria-required="true"
              />
            </Field>
            <p className="-mt-1 pl-1 text-[11px] leading-relaxed text-muted-foreground">
              Enter the Card/Tag ID printed on your physical card. This field is required to register.
            </p>
          </>
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
          <Field icon={<Tag className="h-4 w-4" />}>
            <input
              className={inputClass}
              placeholder="Card/Tag ID Number"
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
            />
          </Field>
        ) : (
          <Field icon={<Mail className="h-4 w-4" />}>
            <input
              type="email"
              className={inputClass}
              placeholder="Email ID"
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

        {mode === "signup" && (
          <label className="mt-1 flex items-start gap-2.5 rounded-xl bg-card px-3 py-2.5 text-xs leading-relaxed text-muted-foreground shadow-sm">
            <input
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
            <span>
              I agree to the <LegalLinks />.
            </span>
          </label>
        )}

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

      {/* Practitioner quick login */}
      <div className="mx-auto mt-5 w-full max-w-sm">
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-card py-3 text-sm font-bold text-primary shadow-sm transition hover:bg-primary/5"
        >
          <Stethoscope className="h-5 w-5" />
          {"\uD83E\uDE7A Doctor / Practitioner Access"}
        </button>
      </div>

      {scanOpen && (
        <PractitionerScan
          store={store}
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
