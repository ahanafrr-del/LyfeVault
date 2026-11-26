"use client"

import { useState } from "react"
import { AlertTriangle, Baby, Edit2, KeyRound, Lock, Mail, Tag, Trash2, User, UserPlus, Users } from "lucide-react"
import { ScreenHeader, ModalShell, EmptyState } from "./shared"
import { computeAge, validateParentalCode, type DependentProfile, type EmergencyContact, type StoreApi, type UserProfile } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { InsuranceSection } from "./insurance-section"
import { Timeline } from "./timeline"
import { DoctorUpload } from "./doctor-upload"

type FormState = {
  name: string
  email: string
  dob: string
  bloodGroup: string
  relationship: string
  dependentType: "child" | "adult"
  secretCode: string
  otp: string
}

const EMPTY_FORM: FormState = { name: "", email: "", dob: "", bloodGroup: "", relationship: "Child", dependentType: "child", secretCode: "", otp: "" }

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function DependentsDirectory({ store, user, onBack }: { store: StoreApi; user: UserProfile; onBack: () => void }) {
  const dependents = user.dependents ?? []
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DependentProfile | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [step, setStep] = useState<"details" | "approval">("details")
  const [requestId, setRequestId] = useState<string | null>(null)
  const [guardianSession, setGuardianSession] = useState<{ accessToken: string; refreshToken: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [verifyDependent, setVerifyDependent] = useState<DependentProfile | null>(null)
  const [guardianView, setGuardianView] = useState<DependentProfile | null>(null)
  const [guardianKey, setGuardianKey] = useState("")
  const [guardianDraft, setGuardianDraft] = useState<{ name: string; dob: string; bloodGroup: string; allergies: string; conditions: string; medications: string; contacts: EmergencyContact[] }>({ name: "", dob: "", bloodGroup: "", allergies: "", conditions: "", medications: "", contacts: [] })
  const [reportUploadOpen, setReportUploadOpen] = useState(false)

  function closeModal() {
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setEditing(null)
    setStep("details")
    setRequestId(null)
    setGuardianSession(null)
    setError(null)
    setBusy(false)
  }

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setError(null); setModalOpen(true) }

  function openEdit(dep: DependentProfile) {
    setEditing(dep)
    setForm({ ...EMPTY_FORM, name: dep.name, dob: dep.dob, email: dep.assignedEmail, relationship: dep.relationship })
    setError(null)
    setModalOpen(true)
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function beginEmailApproval() {
    setError(null)
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Enter the dependent's name and a valid email address.")
      return
    }
    const secret = validateParentalCode(form.secretCode)
    if (!secret.ok) { setError(secret.error ?? "Choose a valid secret access code."); return }
    setBusy(true)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session) throw new Error("Sign in again before linking a dependent.")
      setGuardianSession({ accessToken: sessionData.session.access_token, refreshToken: sessionData.session.refresh_token })
      const { data: request, error: requestError } = await supabase.rpc("create_dependent_link_request", {
        p_email: form.email.trim().toLowerCase(),
        p_type: form.dependentType,
        p_relationship: form.relationship,
        p_name: form.name.trim(),
        p_dob: form.dob,
        p_blood_group: form.bloodGroup,
      })
      if (requestError || !request) throw new Error("Could not create a dependent link request. Please try again.")
      setRequestId(String(request))
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: form.email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      })
      if (otpError) throw new Error("We could not send the email verification code. Please try again.")
      setStep("approval")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send the dependent verification code.")
    } finally {
      setBusy(false)
    }
  }

  async function completeEmailApproval() {
    if (!requestId || !guardianSession) return setError("Your approval session expired. Restart the request.")
    if (!/^\d{6}$/.test(form.otp)) return setError("Enter the six-digit Gmail verification code.")
    const validation = validateParentalCode(form.secretCode)
    if (!validation.ok) return setError(validation.error ?? "Choose a valid secret access code.")
    setBusy(true)
    setError(null)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: form.email.trim().toLowerCase(), token: form.otp, type: "email" })
      if (verifyError) throw new Error("The email code is invalid or expired. Request a new code.")
      const { data: dependentId, error: linkError } = await supabase.rpc("complete_dependent_link", {
        p_request_id: requestId,
        p_secret_code: form.secretCode,
      })
      if (linkError || !dependentId) throw new Error("The dependent could not be linked. Verify that the code belongs to this request.")
      const { error: restoreError } = await supabase.auth.setSession({ access_token: guardianSession.accessToken, refresh_token: guardianSession.refreshToken })
      if (restoreError) throw new Error("Restore your guardian session and retry the access key setup.")
      const { error: keyError } = await supabase.rpc("set_guardian_access_key", {
        p_dependent_id: String(dependentId),
        p_key_sha256: await sha256Hex(form.secretCode),
      })
      if (keyError) throw new Error("The account was linked, but guardian access key setup did not complete. Edit the dependent to retry.")
      await supabase.auth.setSession({ access_token: guardianSession.accessToken, refresh_token: guardianSession.refreshToken })
      closeModal()
      window.location.reload()
    } catch (caught) {
      await supabase.auth.setSession({ access_token: guardianSession.accessToken, refresh_token: guardianSession.refreshToken })
      setError(caught instanceof Error ? caught.message : "Dependent verification could not be completed.")
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit() {
    if (!editing) return
    if (!form.name.trim()) return setError("Enter the dependent's name.")
    if (form.secretCode) {
      const validation = validateParentalCode(form.secretCode)
      if (!validation.ok) return setError(validation.error ?? "Choose a valid secret access code.")
    }
    setBusy(true)
    setError(null)
    try {
      await store.updateDependent(editing.id, { name: form.name.trim(), dob: form.dob, bloodGroup: form.bloodGroup, relationship: form.relationship })
      if (form.secretCode) {
        const { error: secretError } = await supabase.rpc("update_dependent_secret_code", { p_dependent_id: editing.id, p_secret_code: form.secretCode })
        if (secretError) throw new Error("The Guardian Master Access Key could not be updated.")
        const { error: guardianKeyError } = await supabase.rpc("set_guardian_access_key", { p_dependent_id: editing.id, p_key_sha256: await sha256Hex(form.secretCode) })
        if (guardianKeyError) throw new Error("The Guardian Master Access Key could not be updated.")
      }
      closeModal()
      window.location.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update this dependent.")
    } finally { setBusy(false) }
  }

  async function removeDependent() {
    if (!editing) return
    setBusy(true)
    try { await store.removeDependent(editing.id); closeModal(); window.location.reload() }
    catch { setError("Could not remove this dependent.") }
    finally { setBusy(false) }
  }

  async function verifyGuardianAccess() {
    if (!verifyDependent || !guardianKey) return
    setBusy(true)
    setError(null)
    try {
      const { data, error: verifyError } = await supabase.rpc("verify_guardian_access_key", {
        p_dependent_id: verifyDependent.id,
        p_key_sha256: await sha256Hex(guardianKey),
      })
      if (verifyError || data !== true) throw new Error("The Guardian Master Access Key is invalid.")
      setGuardianDraft({ name: verifyDependent.name, dob: verifyDependent.dob, bloodGroup: verifyDependent.bloodGroup, allergies: verifyDependent.allergies.join(", "), conditions: verifyDependent.conditions.join(", "), medications: verifyDependent.medications.join(", "), contacts: verifyDependent.contacts.map((contact) => ({ ...contact })) })
      setGuardianView(verifyDependent)
      setVerifyDependent(null)
      setGuardianKey("")
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Guardian access could not be verified.") }
    finally { setBusy(false) }
  }

  async function saveGuardianMedicalRecord() {
    if (!guardianView) return
    setBusy(true)
    setError(null)
    try {
      await store.updateDependent(guardianView.id, {
        name: guardianDraft.name,
        dob: guardianDraft.dob,
        bloodGroup: guardianDraft.bloodGroup,
        allergies: guardianDraft.allergies.split(",").map((item) => item.trim()).filter(Boolean),
        conditions: guardianDraft.conditions.split(",").map((item) => item.trim()).filter(Boolean),
        medications: guardianDraft.medications.split(",").map((item) => item.trim()).filter(Boolean),
        contacts: guardianDraft.contacts,
      })
      await supabase.rpc("end_guardian_access_session", { p_dependent_id: guardianView.id })
      window.location.reload()
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The dependent record could not be updated.") }
    finally { setBusy(false) }
  }

  async function exitGuardianView() {
    const dependentId = guardianView?.id
    setGuardianView(null)
    setReportUploadOpen(false)
    if (dependentId) await supabase.rpc("end_guardian_access_session", { p_dependent_id: dependentId })
  }

  const guardianMedicalProfile: UserProfile | null = guardianView ? {
    ...user,
    name: guardianView.name,
    dob: guardianView.dob,
    bloodGroup: guardianView.bloodGroup,
    allergies: guardianView.allergies,
    conditions: guardianView.conditions,
    medications: guardianView.medications,
    contacts: guardianView.contacts,
    reports: user.reports.filter((report) => report.dependentId === guardianView.id),
    dependents: [],
  } : null

  return (
    <div className="flex h-full flex-col bg-secondary">
      <ScreenHeader title="Dependent Profiles" subtitle="Family medical directory" onBack={onBack} right={<button type="button" onClick={openAdd} aria-label="Add a dependent" className="grid size-9 place-items-center rounded-full bg-accent text-accent-foreground"><UserPlus className="size-5" /></button>} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-10">
        <div className="rounded-2xl bg-foreground p-4 text-background shadow-lg">
          <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-background/15"><Lock className="size-5" /></span><span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-foreground">Guardian Master Access Active</span></div>
          <p className="mt-3 text-xs leading-relaxed text-background/75">Dependent links require verification from the dependent&apos;s Gmail. Adult dependents must personally share their one-time approval code. Secret access codes are hashed in the database.</p>
        </div>
        <button type="button" onClick={openAdd} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground"><UserPlus className="size-5" /> Add a New Dependent</button>
        <div className="mt-5 flex items-center gap-2"><Users className="size-4 text-primary" /><h2 className="text-sm font-bold text-foreground">Linked Profiles</h2><span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">{dependents.length}</span></div>
        {dependents.length === 0 ? <EmptyState icon={<Users className="size-7" />} title="No dependents linked yet" hint="Add a child or adult family member to link their verified Gmail and MediTag." /> : <div className="mt-3 grid gap-3">{dependents.map((dep) => <DependentCard key={dep.id} dependent={dep} onEdit={() => openEdit(dep)} onView={() => { setVerifyDependent(dep); setGuardianKey(""); setError(null) }} />)}</div>}
      </div>
      {modalOpen && (
        <ModalShell title={editing ? "Edit Dependent Profile" : "Add a New Dependent"} subtitle={editing ? "Update linked family passport" : step === "details" ? "Verify email ownership to link this profile" : "Enter the code from the dependent's Gmail"} headerAccent onClose={closeModal}>
          <div className="space-y-4 p-5">
            {step === "details" ? <>
              {!editing && <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">Dependent type</span><select className={INPUT} value={form.dependentType} onChange={(event) => {
                const dependentType = event.target.value as FormState["dependentType"]
                setForm((current) => ({ ...current, dependentType, relationship: dependentType === "adult" ? "Adult" : "Child" }))
              }}><option value="child">Child dependent</option><option value="adult">Adult dependent</option></select></label>}
              <FormField label="Full name" icon={<User className="size-4" />}><input className={INPUT} value={form.name} onChange={(event) => set("name", event.target.value)} /></FormField>
              {!editing && <FormField label="Dependent email" icon={<Mail className="size-4" />}><input type="email" className={INPUT} autoComplete="email" placeholder="name@gmail.com" value={form.email} onChange={(event) => set("email", event.target.value)} /></FormField>}
              <div className="grid grid-cols-2 gap-3"><FormField label="Date of birth" icon={<Baby className="size-4" />}><input type="date" className={INPUT} value={form.dob} onChange={(event) => set("dob", event.target.value)} /></FormField><FormField label="Blood group" icon={<KeyRound className="size-4" />}><select className={INPUT} value={form.bloodGroup} onChange={(event) => set("bloodGroup", event.target.value)}><option value="">Select</option>{["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((group) => <option key={group}>{group}</option>)}</select></FormField></div>
              <FormField label="Relationship" icon={<Users className="size-4" />}><input className={INPUT} value={form.relationship} onChange={(event) => set("relationship", event.target.value)} /></FormField>
              <FormField label={editing ? "Reset Guardian Master Access Key (optional)" : "Guardian Master Access Key"} icon={<Lock className="size-4" />}><input type="password" autoComplete="new-password" maxLength={12} className={INPUT} placeholder="5–12 characters with uppercase, number & symbol" value={form.secretCode} onChange={(event) => set("secretCode", event.target.value)} /></FormField>
              {editing && <button type="button" disabled={busy} onClick={saveEdit} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground">Save Profile</button>}
              {!editing && <button type="button" disabled={busy} onClick={beginEmailApproval} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground">{busy ? "Sending…" : form.dependentType === "adult" ? "Send Adult Approval Code" : "Send Child Verification Code"}</button>}
            </> : <>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">A six-digit code was sent to <span className="font-semibold text-foreground">{form.email}</span>. For an adult dependent, ask them to review the link request and personally provide their code.</div>
              <FormField label="Gmail verification code" icon={<KeyRound className="size-4" />}><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={INPUT} value={form.otp} onChange={(event) => set("otp", event.target.value.replace(/\D/g, ""))} /></FormField>
              <FormField label="Guardian Master Access Key" icon={<Lock className="size-4" />}><input type="password" autoComplete="new-password" maxLength={12} className={INPUT} value={form.secretCode} onChange={(event) => set("secretCode", event.target.value)} /></FormField>
              <button type="button" disabled={busy} onClick={completeEmailApproval} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground">{busy ? "Verifying…" : "Verify Gmail & Link Dependent"}</button>
            </>}
            {error && <div role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"><AlertTriangle className="size-4 shrink-0" /><span>{error}</span></div>}
            {editing && <button type="button" disabled={busy} onClick={removeDependent} className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-2.5 text-sm font-semibold text-destructive"><Trash2 className="size-4" /> Remove Dependent</button>}
          </div>
        </ModalShell>
      )}
      {verifyDependent && <ModalShell title="Guardian Access Verification" subtitle={`Verify access for ${verifyDependent.name}`} onClose={() => setVerifyDependent(null)}><div className="flex flex-col gap-4 p-5"><label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">Guardian Master Access Key<input autoComplete="current-password" type="password" className={INPUT} value={guardianKey} onChange={(event) => setGuardianKey(event.target.value)} /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<button type="button" disabled={busy || !guardianKey} onClick={() => void verifyGuardianAccess()} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "Verifying…" : "Verify and view profile"}</button></div></ModalShell>}
      {guardianView && <ModalShell title="Guardian Edit Mode" subtitle={`${guardianView.name} · ${guardianView.assignedEmail}`} onClose={() => void exitGuardianView()}><div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto p-5"><div className="rounded-xl bg-accent/10 p-3 text-sm text-foreground"><p className="font-semibold">Guardian access verified</p><p className="mt-1 text-xs text-muted-foreground">Updates save directly to the linked dependent medical record.</p></div><label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">Full name<input className={INPUT} value={guardianDraft.name} onChange={(event) => setGuardianDraft((draft) => ({ ...draft, name: event.target.value }))} /></label><label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">Date of birth<input type="date" className={INPUT} value={guardianDraft.dob} onChange={(event) => setGuardianDraft((draft) => ({ ...draft, dob: event.target.value }))} /></label>{([ ["bloodGroup", "Blood group"], ["allergies", "Allergies"], ["conditions", "Conditions"], ["medications", "Medications"] ] as const).map(([key, label]) => <label key={key} className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">{label}<input className={INPUT} value={guardianDraft[key]} onChange={(event) => setGuardianDraft((draft) => ({ ...draft, [key]: event.target.value }))} /></label>)}<section className="rounded-xl bg-secondary p-3"><h3 className="mb-3 text-sm font-bold text-foreground">Emergency contacts</h3>{guardianDraft.contacts.map((contact, index) => <div key={contact.id || index} className="mb-3 grid gap-2 rounded-lg bg-card p-3"><input aria-label="Contact name" className={INPUT} placeholder="Contact name" value={contact.name} onChange={(event) => setGuardianDraft((draft) => ({ ...draft, contacts: draft.contacts.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /><input aria-label="Relationship" className={INPUT} placeholder="Relationship" value={contact.relation} onChange={(event) => setGuardianDraft((draft) => ({ ...draft, contacts: draft.contacts.map((item, itemIndex) => itemIndex === index ? { ...item, relation: event.target.value } : item) }))} /><input aria-label="Contact phone" type="tel" className={INPUT} placeholder="Phone" value={contact.phone} onChange={(event) => setGuardianDraft((draft) => ({ ...draft, contacts: draft.contacts.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item) }))} /><button type="button" onClick={() => setGuardianDraft((draft) => ({ ...draft, contacts: draft.contacts.filter((_, itemIndex) => itemIndex !== index) }))} className="justify-self-end text-xs font-semibold text-destructive">Remove contact</button></div>)}<button type="button" onClick={() => setGuardianDraft((draft) => ({ ...draft, contacts: [...draft.contacts, { id: crypto.randomUUID(), name: "", relation: "", phone: "" }] }))} className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold text-primary">Add contact</button></section><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-foreground">Medical reports</h3><button type="button" onClick={() => setReportUploadOpen(true)} className="rounded-xl bg-accent px-3 py-2 text-xs font-bold text-accent-foreground">+ Add Medical Report</button></div>{guardianMedicalProfile && <div className="max-h-64 overflow-y-auto rounded-xl border border-border"><Timeline user={guardianMedicalProfile} showBack={false} /></div>}<InsuranceSection guardianDependentId={guardianView.id} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<button type="button" disabled={busy} onClick={() => void saveGuardianMedicalRecord()} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "Saving…" : "Save medical record"}</button><button type="button" onClick={() => void exitGuardianView()} className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground">Exit Guardian View</button></div></ModalShell>}
      {reportUploadOpen && guardianView && <DoctorUpload store={store} dependentId={guardianView.id} onClose={() => setReportUploadOpen(false)} onDone={async () => { setReportUploadOpen(false); if (guardianView) await supabase.rpc("end_guardian_access_session", { p_dependent_id: guardianView.id }); window.location.reload() }} />}
    </div>
  )
}

function DependentCard({ dependent, onEdit, onView }: { dependent: DependentProfile; onEdit: () => void; onView: () => void }) {
  const age = computeAge(dependent.dob)
  const child = dependent.relationship.toLowerCase() === "child" || dependent.relationship.toLowerCase() === "ward"
  return <div className="rounded-2xl bg-card p-4 shadow-sm"><div className="flex items-start gap-3"><div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">{child ? <Baby className="size-7" /> : <User className="size-7" />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-base font-bold text-foreground">{dependent.name}</p><span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">{dependent.relationship || "Dependent"}</span></div><p className="mt-0.5 truncate text-xs text-muted-foreground">{age !== null ? `${age} yrs · ` : ""}{dependent.assignedEmail}</p><div className="mt-2 flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground"><Tag className="size-3.5 text-primary" /> MediTag ID: {dependent.mediTagId}</div></div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5 text-primary" /> Guardian key protected</span><div className="flex gap-2"><button type="button" onClick={onView} className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">View Dependent Profile</button><button type="button" onClick={onEdit} aria-label="Edit dependent link" className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary"><Edit2 className="size-3.5" /></button></div></div></div>
}

const INPUT = "w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
function FormField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span><div className="[&_input]:pl-10 [&_select]:pl-10">{children}</div></div></label>
}
