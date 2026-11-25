"use client"

import { useState } from "react"
import useSWR from "swr"
import { FileJson2, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ModalShell } from "./shared"

type PrivacySettings = {
  userId: string
  mask_sensitive_fields: boolean
  practitioner_insurance_visible: boolean
  consent_active: boolean
}

type PrivacyLog = { id: string; action: string; details: Record<string, unknown>; created_at: string }

async function loadPrivacy() {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Sign in to manage privacy settings.")
  const [{ data: settings, error: settingsError }, { data: activity, error: activityError }] = await Promise.all([
    supabase.from("user_privacy_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("privacy_audit_logs").select("id,action,details,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12),
  ])
  if (settingsError) throw settingsError
  if (activityError) throw activityError
  return {
    settings: {
      userId: user.id,
      mask_sensitive_fields: settings?.mask_sensitive_fields ?? true,
      practitioner_insurance_visible: settings?.practitioner_insurance_visible ?? false,
      consent_active: settings?.consent_active ?? true,
    } as PrivacySettings,
    activity: (activity ?? []) as PrivacyLog[],
  }
}

const PRIVACY_CONTACT = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || "privacy@lyfevault.app"
const ACTION_LABELS: Record<string, string> = {
  insurance_reveal: "Sensitive insurance details revealed",
  ecard_view: "Insurance E-card opened",
  practitioner_access: "Practitioner viewed an authorized insurance summary",
  settings_update: "Privacy or insurance settings updated",
  consent_granted: "Health-data consent granted at sign-up",
  consent_withdrawn: "Health-data consent withdrawn",
  data_export: "Personal data export requested",
  account_deletion_requested: "Account deletion requested",
}

export function PrivacySection({ onLogout }: { onLogout: () => void }) {
  const { data, error, isLoading, mutate } = useSWR("lyfevault-privacy", loadPrivacy)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function saveSettings(patch: Partial<Omit<PrivacySettings, "userId">>, action: "settings_update" | "consent_withdrawn" = "settings_update") {
    if (!data?.settings) return
    setBusy(true)
    setNotice(null)
    const updated = { ...data.settings, ...patch }
    const { error: saveError } = await supabase.from("user_privacy_settings").upsert({
      user_id: updated.userId,
      mask_sensitive_fields: updated.mask_sensitive_fields,
      practitioner_insurance_visible: updated.practitioner_insurance_visible,
      consent_active: updated.consent_active,
      consent_updated_at: action === "consent_withdrawn" ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    if (saveError) {
      setNotice(saveError.message)
      setBusy(false)
      return
    }
    const { error: logError } = await supabase.rpc("log_privacy_activity", { p_action: action, p_details: { section: "privacy_settings" } })
    if (logError) setNotice("Settings saved, but the activity log could not be updated.")
    else setNotice(action === "consent_withdrawn" ? "Health-data consent has been withdrawn." : "Privacy settings saved.")
    await mutate({ ...data, settings: updated })
    setBusy(false)
  }

  async function exportData() {
    setBusy(true)
    setNotice(null)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Sign in to export your data.")
      const [profile, dependents, reports, insurance, settings, audit] = await Promise.all([
        supabase.from("profiles").select("auth_user_id,email,name,dob,blood_group,gender,card_id,allergies,conditions,medications,contacts,updated_at").eq("auth_user_id", user.id).maybeSingle(),
        supabase.from("dependents").select("id,owner_email,name,dob,relationship,blood_group,allergies,conditions,medications,contacts,assigned_email,medi_tag_id,dependent_type").eq("guardian_id", user.id),
        supabase.from("medical_reports").select("*").eq("owner_email", user.email ?? ""),
        supabase.from("health_insurance").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_privacy_settings").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("privacy_audit_logs").select("*").eq("user_id", user.id),
      ])
      const failures = [profile.error, dependents.error, reports.error, insurance.error, settings.error, audit.error].filter(Boolean)
      if (failures.length) throw new Error("Some records could not be exported. Please try again.")
      const payload = {
        exportedAt: new Date().toISOString(),
        account: profile.data,
        dependents: dependents.data,
        medicalReports: reports.data,
        healthInsurance: insurance.data,
        privacySettings: settings.data,
        privacyActivity: audit.data,
        fileNote: "Private file contents are not embedded in JSON. E-card and report file paths are included in the records.",
      }
      const { error: logError } = await supabase.rpc("log_privacy_activity", { p_action: "data_export", p_details: { format: "json" } })
      if (logError) throw new Error("The export could not be recorded. Please try again.")
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `lyfevault-data-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      setNotice("Your JSON export has been downloaded.")
      await mutate()
    } catch (exportError) {
      setNotice(exportError instanceof Error ? exportError.message : "The export could not be created.")
    } finally {
      setBusy(false)
    }
  }

  async function deleteAccount() {
    setBusy(true)
    setNotice(null)
    try {
      const { error: logError } = await supabase.rpc("log_privacy_activity", { p_action: "account_deletion_requested", p_details: {} })
      if (logError) throw new Error("The deletion request could not be recorded.")
      const response = await fetch("/api/auth/delete-account", { method: "POST" })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? "Account deletion could not be completed.")
      await supabase.auth.signOut({ scope: "global" })
      onLogout()
    } catch (deleteError) {
      setNotice(deleteError instanceof Error ? deleteError.message : "Account deletion could not be completed.")
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  if (isLoading) return <section className="mx-auto w-full max-w-5xl p-5"><div className="h-40 rounded-3xl bg-card" /></section>

  const settings = data?.settings
  const canWithdraw = settings?.consent_active ?? false

  return (
    <section className="mx-auto w-full max-w-5xl p-4 pb-24 sm:p-6 lg:p-8">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your choices</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">Privacy &amp; Policy</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Control how sensitive details are displayed, review recent access activity, and manage your LyfeVault health-data consent.</p>
      </header>
      {error && <p role="alert" className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error.message}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-primary/10 p-3 text-sm text-primary">{notice}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,.85fr)]">
        <div className="flex flex-col gap-6">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole className="size-5" /></span><div><h2 className="font-bold text-foreground">Privacy settings</h2><p className="text-xs text-muted-foreground">Your choices are stored in your protected account settings.</p></div></div>
            <SettingRow title="Mask sensitive insurance numbers by default" description="Policy, member, and group numbers are hidden until you reveal them." checked={settings?.mask_sensitive_fields ?? true} disabled={busy} onChange={(checked) => void saveSettings({ mask_sensitive_fields: checked })} />
            <SettingRow title="Share an insurance summary with verified practitioners" description="Only the active plan summary is shared; identifiers stay masked. Turn off any time." checked={settings?.practitioner_insurance_visible ?? false} disabled={busy || !canWithdraw} onChange={(checked) => void saveSettings({ practitioner_insurance_visible: checked })} />
            <div className="mt-4 rounded-2xl bg-secondary p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-foreground">Health-data consent</p><p className="mt-1 text-xs text-muted-foreground">{canWithdraw ? "Consent is active for your medical passport and emergency access." : "Consent has been withdrawn; optional practitioner insurance visibility is disabled."}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${canWithdraw ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>{canWithdraw ? "Active" : "Withdrawn"}</span></div>{canWithdraw && <button type="button" disabled={busy} onClick={() => void saveSettings({ consent_active: false, practitioner_insurance_visible: false }, "consent_withdrawn")} className="mt-3 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50">Withdraw consent</button>}</div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-4"><h2 className="font-bold text-foreground">Recent privacy activity</h2><p className="mt-1 text-xs text-muted-foreground">Recent data access and privacy-setting changes recorded for your account.</p></div>
            {!data?.activity.length ? <p className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">No privacy activity has been recorded yet.</p> : <ul className="divide-y divide-border">{data.activity.map((item) => <li key={item.id} className="flex items-start justify-between gap-4 py-3"><div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><ShieldCheck className="size-4" /></span><div className="min-w-0"><p className="text-sm font-semibold text-foreground">{ACTION_LABELS[item.action] ?? "Privacy activity"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{typeof item.details?.section === "string" ? item.details.section.replaceAll("_", " ") : "Account activity"}</p></div></div><time className="shrink-0 text-xs text-muted-foreground" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></li>)}</ul>}
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="font-bold text-foreground">Your account data</h2><p className="mt-1 text-sm text-muted-foreground">Export a JSON copy of account, medical, insurance, dependent, and privacy records, or permanently delete your account and associated records.</p>
            <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void exportData()} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-50"><FileJson2 className="size-4" /> Export JSON</button><button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Trash2 className="size-4" /> Delete account</button></div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 className="font-bold text-foreground">Sign out of all devices</h2><p className="mt-1 text-sm text-muted-foreground">This revokes active sessions across your devices.</p><button type="button" disabled={busy} onClick={async () => { await supabase.auth.signOut({ scope: "global" }); onLogout() }} className="mt-4 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-50">Sign out everywhere</button></section>
        </div>

        <article className="h-fit rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">LyfeVault</p>
          <h2 className="mt-1 text-xl font-bold text-foreground">Privacy Policy</h2>
          <p className="mt-1 text-xs text-muted-foreground">Effective date: November 25, 2026</p>
          <div className="mt-5 flex max-h-[62vh] flex-col gap-5 overflow-y-auto pr-2 text-sm leading-relaxed text-muted-foreground">
            <PolicyClause title="Information we collect">Account details (name, email, and assigned Card ID); health information (blood group, allergies, conditions, medications, medical reports and uploaded files); emergency contacts; health insurance information and E-card documents; and security or privacy activity logs. If you add a passkey, the authentication service processes a WebAuthn credential and public-key material. Your device keeps the biometric template; LyfeVault does not receive or store your fingerprint or face scan. Location is requested only when you choose to use location-based emergency assistance.</PolicyClause>
            <PolicyClause title="Purpose and consent">We process this information to provide your medical passport, emergency access, insurance organization, dependent management, account security, and requested practitioner sharing. You must actively accept the Privacy Policy and health-data consent at sign-up. You may withdraw optional health-data consent in Privacy Settings; this turns off practitioner insurance visibility. Withdrawal does not undo processing already completed or prevent legally required retention.</PolicyClause>
            <PolicyClause title="Access and sharing">We do not sell personal or health information and do not share it with advertising brokers. Account records are protected by authenticated access and Supabase Row Level Security. A patient Card ID intentionally supports limited emergency lookup; anyone with a valid ID may see the public emergency snapshot. Verified practitioners can only read Home and Medical Timeline information needed for care. An insurance summary is shared only when you enable its separate visibility setting, and its identifiers remain masked.</PolicyClause>
            <PolicyClause title="Security">Data is sent over encrypted HTTPS/TLS connections and stored using the hosting provider&apos;s encryption-at-rest safeguards. Database access is constrained by Supabase RLS policies; private E-cards use a non-public storage bucket and short-lived signed URLs. Passkeys use WebAuthn and device biometrics are not transmitted to LyfeVault. No online service can promise absolute security; keep your account credentials and physical Card ID private.</PolicyClause>
            <PolicyClause title="Retention and deletion">We retain account and health records while your account is active, and only longer where required for security, legal, or dispute-resolution obligations. You can export your records or request account deletion in Privacy Settings. Deletion removes associated account records and stored E-cards; backups may persist temporarily until normal backup rotation.</PolicyClause>
            <PolicyClause title="Children and dependents">A guardian must have authority to manage a dependent profile. The guardian is responsible for accuracy, access permissions, and the dependent&apos;s privacy choices as applicable law requires.</PolicyClause>
            <PolicyClause title="Policy updates and grievances">We will update this policy when our practices change and show the current effective date here. For privacy questions or grievances, contact the LyfeVault privacy officer at <a className="font-semibold text-primary underline" href={`mailto:${PRIVACY_CONTACT}`}>{PRIVACY_CONTACT}</a>. The address is configurable with NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL; confirm it is monitored before production use.</PolicyClause>
          </div>
        </article>
      </div>
      {confirmDelete && <ModalShell title="Delete your LyfeVault account?" subtitle="This action cannot be undone." onClose={() => setConfirmDelete(false)}><div className="p-5"><p className="text-sm leading-relaxed text-muted-foreground">Your profile, insurance details, dependents, reports, E-cards, and privacy activity will be permanently deleted. Export any records you need first.</p><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setConfirmDelete(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground">Keep account</button><button type="button" disabled={busy} onClick={() => void deleteAccount()} className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? "Deleting…" : "Permanently delete"}</button></div></div></ModalShell>}
    </section>
  )
}

function SettingRow({ title, description, checked, disabled, onChange }: { title: string; description: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-start justify-between gap-4 border-b border-border py-4 last:border-0"><span><span className="block text-sm font-semibold text-foreground">{title}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span></span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-primary disabled:opacity-50" /></label>
}

function PolicyClause({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-1 font-bold text-foreground">{title}</h3><p>{children}</p></section>
}
