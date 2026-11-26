"use client"

import { useState } from "react"
import useSWR from "swr"
import { Eye, EyeOff, FileText, HeartPulse, Pencil, ShieldCheck, UploadCloud } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { FileViewer } from "./file-viewer"

type InsuranceRecord = {
  id: string
  user_id: string
  provider_name: string
  plan_name: string
  plan_type: "Individual" | "Family Floater" | "Group"
  policy_number: string
  member_id: string
  group_number: string
  tpa_name: string
  helpline_phone: string
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  ecard_path: string | null
  ecard_name: string | null
}

type InsuranceDraft = Omit<InsuranceRecord, "id" | "user_id" | "ecard_path" | "ecard_name">

const MAX_ECARD_BYTES = 52_428_800
const ECARD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"]

const blankDraft: InsuranceDraft = {
  provider_name: "",
  plan_name: "",
  plan_type: "Individual",
  policy_number: "",
  member_id: "",
  group_number: "",
  tpa_name: "",
  helpline_phone: "",
  valid_from: "",
  valid_until: "",
  is_active: true,
}

async function loadInsurance(guardianDependentId?: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Sign in to view health insurance.")
  let targetUserId = user.id
  if (guardianDependentId) {
    const { data, error } = await supabase.rpc("guardian_dependent_user_id", { p_dependent_id: guardianDependentId })
    if (error || typeof data !== "string") throw new Error("Guardian access is not verified or the dependent account is unavailable.")
    targetUserId = data
  }
  const [{ data: policy, error: policyError }, { data: settings }] = await Promise.all([
    supabase.from("health_insurance").select("*").eq("user_id", targetUserId).maybeSingle(),
    supabase.from("user_privacy_settings").select("mask_sensitive_fields").eq("user_id", targetUserId).maybeSingle(),
  ])
  if (policyError) throw policyError
  return { userId: targetUserId, policy: policy as InsuranceRecord | null, maskedByDefault: settings?.mask_sensitive_fields ?? true }
}

function maskValue(value: string): string {
  return value ? `••••••${value.slice(-4)}` : "Not provided"
}

export function InsuranceSection({ readOnly = false, guardianDependentId }: { readOnly?: boolean; guardianDependentId?: string }) {
  const cacheKey = guardianDependentId ? `lyfevault-insurance-${guardianDependentId}` : "lyfevault-insurance"
  const { data, error, isLoading, mutate } = useSWR(cacheKey, () => loadInsurance(guardianDependentId))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<InsuranceDraft | null>(null)
  const [ecard, setEcard] = useState<File | null>(null)
  const [revealOverride, setRevealOverride] = useState<boolean | null>(null)
  const [viewer, setViewer] = useState<{ url: string; name: string } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const policy = data?.policy ?? null
  const form = draft ?? (policy ? {
    provider_name: policy.provider_name,
    plan_name: policy.plan_name,
    plan_type: policy.plan_type,
    policy_number: policy.policy_number,
    member_id: policy.member_id,
    group_number: policy.group_number,
    tpa_name: policy.tpa_name,
    helpline_phone: policy.helpline_phone,
    valid_from: policy.valid_from ?? "",
    valid_until: policy.valid_until ?? "",
    is_active: policy.is_active,
  } : blankDraft)
  const isEditing = !readOnly && (editing || !policy)
  const maskedByDefault = data?.maskedByDefault ?? true
  const reveal = !readOnly && (revealOverride ?? !maskedByDefault)

  function startEditing() {
    setDraft({ ...form })
    setEditing(true)
    setMessage(null)
  }

  async function saveInsurance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data?.userId || !form.provider_name.trim() || !form.policy_number.trim()) {
      setMessage("Provider name and policy number are required.")
      return
    }
    if (ecard && (!ECARD_TYPES.includes(ecard.type) || ecard.size > MAX_ECARD_BYTES)) {
      setMessage("Choose a PDF, JPG, PNG, or WEBP file no larger than 50 MB.")
      return
    }

    setSaving(true)
    setMessage(null)
    let uploadedPath: string | null = null
    try {
      if (ecard) {
        const safeName = ecard.name.replace(/[^a-zA-Z0-9._-]/g, "_")
        uploadedPath = `${data.userId}/${crypto.randomUUID()}/${safeName}`
        const { error: uploadError } = await supabase.storage.from("insurance-ecards").upload(uploadedPath, ecard, {
          contentType: ecard.type,
          upsert: false,
        })
        if (uploadError) throw uploadError
      }

      const { data: saved, error: saveError } = await supabase.from("health_insurance").upsert({
        user_id: data.userId,
        provider_name: form.provider_name.trim(),
        plan_name: form.plan_name.trim(),
        plan_type: form.plan_type,
        policy_number: form.policy_number.trim(),
        member_id: form.member_id.trim(),
        group_number: form.group_number.trim(),
        tpa_name: form.tpa_name.trim(),
        helpline_phone: form.helpline_phone.trim(),
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        is_active: form.is_active,
        ...(uploadedPath ? { ecard_path: uploadedPath, ecard_name: ecard?.name ?? "E-card" } : {}),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).select("*").single()
      if (saveError) throw saveError

      if (uploadedPath && policy?.ecard_path) {
        await supabase.storage.from("insurance-ecards").remove([policy.ecard_path])
      }
      await supabase.rpc("log_privacy_activity", { p_action: "settings_update", p_details: { section: "health_insurance" } })
      setDraft(null)
      setEditing(false)
      setEcard(null)
      setMessage("Insurance details saved securely.")
      await mutate({ ...data, policy: saved as InsuranceRecord })
    } catch (saveError) {
      if (uploadedPath) await supabase.storage.from("insurance-ecards").remove([uploadedPath])
      setMessage(saveError instanceof Error ? saveError.message : "Insurance details could not be saved.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleReveal() {
    const nextReveal = !reveal
    setRevealOverride(nextReveal)
    if (nextReveal) {
      await supabase.rpc("log_privacy_activity", { p_action: "insurance_reveal", p_details: { section: "health_insurance" } })
    }
  }

  async function viewEcard() {
    if (!policy?.ecard_path) return
    const { data: signed, error: signedError } = await supabase.storage.from("insurance-ecards").createSignedUrl(policy.ecard_path, 300)
    if (signedError || !signed?.signedUrl) {
      setMessage("The private E-card could not be opened. Please try again.")
      return
    }
    await supabase.rpc("log_privacy_activity", { p_action: "ecard_view", p_details: { document: "insurance_ecard" } })
    setViewer({ url: signed.signedUrl, name: policy.ecard_name ?? "Insurance E-card" })
  }

  if (isLoading) return <section className="mx-auto w-full max-w-5xl p-5"><div className="h-40 animate-pulse rounded-3xl bg-card" /></section>

  return (
    <section className="mx-auto w-full max-w-5xl p-4 pb-24 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your coverage</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">Health insurance</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Keep your policy details and E-card together. Sensitive identifiers are masked by default and are never saved in browser storage.</p>
        </div>
        {policy && !isEditing && !readOnly && <button type="button" onClick={startEditing} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground"><Pencil className="size-4" /> Edit policy</button>}
      </header>

      {error && <p role="alert" className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error.message}</p>}
      {message && <p role="status" className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">{message}</p>}

      {policy && !isEditing ? (
        <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 bg-primary p-5 text-primary-foreground sm:p-7">
            <div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-white/15"><HeartPulse className="size-5" /></span><div><p className="text-xs font-medium text-primary-foreground/75">{policy.provider_name}</p><h2 className="mt-0.5 text-xl font-bold">{policy.plan_name || policy.plan_type}</h2><p className="mt-1 text-sm text-primary-foreground/75">{policy.plan_type} plan</p></div></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${policy.is_active ? "bg-accent/20 text-white" : "bg-white/15 text-primary-foreground"}`}>{policy.is_active ? "Active policy" : "Inactive policy"}</span>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
            <SensitiveValue label="Policy number" value={policy.policy_number} reveal={reveal} />
            <SensitiveValue label="Member ID" value={policy.member_id} reveal={reveal} />
            <SensitiveValue label="Group number" value={policy.group_number} reveal={reveal} />
            <InfoValue label="TPA" value={policy.tpa_name} />
            <InfoValue label="Coverage dates" value={`${policy.valid_from || "Not set"} — ${policy.valid_until || "Not set"}`} />
            <InfoValue label="Plan name" value={policy.plan_name || "Not set"} />
            {policy.helpline_phone && <div className="rounded-2xl bg-secondary p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Member helpline</p><a href={`tel:${policy.helpline_phone}`} className="mt-2 inline-flex text-base font-bold text-primary underline underline-offset-2">{policy.helpline_phone}</a></div>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-7">
            {!readOnly && <button type="button" onClick={() => void toggleReveal()} aria-pressed={reveal} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground">{reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{reveal ? "Hide sensitive numbers" : "Reveal sensitive numbers"}</button>}
            {policy.ecard_path && <button type="button" onClick={() => void viewEcard()} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground"><FileText className="size-4" /> View E-card</button>}
          </div>
        </article>
      ) : isEditing ? (
        <form onSubmit={saveInsurance} className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Insurance provider *"><input required maxLength={120} value={form.provider_name} onChange={(e) => setDraft({ ...form, provider_name: e.target.value })} className={inputClass} placeholder="Provider name" /></Field>
            <Field label="Plan name"><input maxLength={120} value={form.plan_name} onChange={(e) => setDraft({ ...form, plan_name: e.target.value })} className={inputClass} placeholder="Plan name" /></Field>
            <Field label="Plan type"><select value={form.plan_type} onChange={(e) => setDraft({ ...form, plan_type: e.target.value as InsuranceDraft["plan_type"] })} className={inputClass}><option>Individual</option><option>Family Floater</option><option>Group</option></select></Field>
            <Field label="Policy number *"><input required maxLength={100} autoComplete="off" value={form.policy_number} onChange={(e) => setDraft({ ...form, policy_number: e.target.value })} className={inputClass} /></Field>
            <Field label="Member ID"><input maxLength={100} autoComplete="off" value={form.member_id} onChange={(e) => setDraft({ ...form, member_id: e.target.value })} className={inputClass} /></Field>
            <Field label="Group number"><input maxLength={100} autoComplete="off" value={form.group_number} onChange={(e) => setDraft({ ...form, group_number: e.target.value })} className={inputClass} /></Field>
            <Field label="TPA name"><input maxLength={120} value={form.tpa_name} onChange={(e) => setDraft({ ...form, tpa_name: e.target.value })} className={inputClass} /></Field>
            <Field label="Helpline phone"><input type="tel" maxLength={32} value={form.helpline_phone} onChange={(e) => setDraft({ ...form, helpline_phone: e.target.value })} className={inputClass} /></Field>
            <Field label="Valid from"><input type="date" value={form.valid_from ?? ""} onChange={(e) => setDraft({ ...form, valid_from: e.target.value })} className={inputClass} /></Field>
            <Field label="Valid until"><input type="date" value={form.valid_until ?? ""} onChange={(e) => setDraft({ ...form, valid_until: e.target.value })} className={inputClass} /></Field>
          </div>
          <label className="mt-4 flex items-center gap-3 rounded-xl bg-secondary p-3 text-sm font-medium text-foreground"><input type="checkbox" checked={form.is_active} onChange={(e) => setDraft({ ...form, is_active: e.target.checked })} className="size-4 accent-primary" /> This policy is currently active</label>
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-secondary p-4 text-sm text-foreground"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><UploadCloud className="size-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{ecard?.name ?? policy?.ecard_name ?? "Upload insurance E-card"}</span><span className="mt-0.5 block text-xs text-muted-foreground">PDF, JPG, PNG, or WEBP · up to 50 MB</span></span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setEcard(e.target.files?.[0] ?? null)} /></label>
          <p className="mt-2 text-xs text-muted-foreground">E-cards are stored in a private Supabase bucket and opened with a short-lived signed link.</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => { setEditing(false); setDraft(null); setEcard(null) }} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">{saving ? "Saving…" : "Save policy"}</button></div>
        </form>
      ) : null}
      {!policy && !isEditing && <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center"><ShieldCheck className="mx-auto size-9 text-primary" /><p className="mt-3 font-semibold text-foreground">No insurance details added</p><p className="mt-1 text-sm text-muted-foreground">Add a policy to keep your E-card and coverage information available in emergencies.</p></div>}
      {viewer && <FileViewer fileName={viewer.name} fileUrl={viewer.url} onClose={() => setViewer(null)} />}
    </section>
  )
}

const inputClass = "w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">{label}{children}</label>
}

function SensitiveValue({ label, value, reveal }: { label: string; value: string; reveal: boolean }) {
  return <InfoValue label={label} value={reveal ? value || "Not provided" : maskValue(value)} />
}

function InfoValue({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-2xl bg-secondary p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 break-all text-sm font-semibold text-foreground">{value || "Not provided"}</p></div>
}
