"use client"

import { useState } from "react"
import {
  UserPlus,
  Edit2,
  Lock,
  Users,
  Calendar,
  Droplet,
  Phone,
  AlertTriangle,
  HeartPulse,
  Mail,
  KeyRound,
  User,
  Baby,
  Trash2,
  Tag,
  ShieldCheck,
} from "lucide-react"
import { ScreenHeader, ModalShell, EmptyState } from "./shared"
import {
  computeAge,
  uid,
  validateParentalCode,
  BLOOD_GROUPS,
  RELATIONSHIPS,
  type DependentProfile,
  type StoreApi,
  type UserProfile,
} from "@/lib/store"

type FormState = {
  name: string
  dob: string
  relationship: string
  bloodGroup: string
  allergies: string
  conditions: string
  contactName: string
  contactPhone: string
  assignedEmail: string
  assignedPassword: string
  parentalSecretCode: string
}

const EMPTY_FORM: FormState = {
  name: "",
  dob: "",
  relationship: "",
  bloodGroup: "",
  allergies: "",
  conditions: "",
  contactName: "",
  contactPhone: "",
  assignedEmail: "",
  assignedPassword: "",
  parentalSecretCode: "",
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

export function DependentsDirectory({
  store,
  user,
  onBack,
}: {
  store: StoreApi
  user: UserProfile
  onBack: () => void
}) {
  const dependents = user.dependents ?? []
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  // Step within the add flow: "details" collects profile + child credentials,
  // "code" prompts the guardian to create the 4-digit Parental Secret Code.
  const [step, setStep] = useState<"details" | "code">("details")
  const [error, setError] = useState<string | null>(null)

  function closeModal() {
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setEditingId(null)
    setStep("details")
    setError(null)
  }

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setStep("details")
    setError(null)
    setModalOpen(true)
  }

  function openEdit(dep: DependentProfile) {
    setEditingId(dep.id)
    setForm({
      name: dep.name,
      dob: dep.dob,
      relationship: dep.relationship,
      bloodGroup: dep.bloodGroup,
      allergies: dep.allergies.join(", "),
      conditions: dep.conditions.join(", "),
      contactName: dep.contacts[0]?.name ?? "",
      contactPhone: dep.contacts[0]?.phone ?? "",
      assignedEmail: dep.assignedEmail,
      assignedPassword: dep.assignedPassword,
      parentalSecretCode: dep.parentalSecretCode ?? "",
    })
    setStep("details")
    setError(null)
    setModalOpen(true)
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function buildPayload(parentalSecretCode: string) {
    const contacts =
      form.contactName.trim() || form.contactPhone.trim()
        ? [
            {
              id: uid(),
              name: form.contactName.trim() || "Emergency contact",
              relation: "Emergency",
              phone: form.contactPhone.trim(),
            },
          ]
        : []

    return {
      name: form.name.trim(),
      dob: form.dob,
      relationship: form.relationship || "Child",
      bloodGroup: form.bloodGroup,
      allergies: splitList(form.allergies),
      conditions: splitList(form.conditions),
      contacts,
      assignedEmail: form.assignedEmail.trim().toLowerCase(),
      assignedPassword: form.assignedPassword,
      parentalSecretCode,
    }
  }

  // Editing an existing dependent saves immediately (credentials already verified on link).
  function handleUpdate() {
    if (!editingId || !form.name.trim()) return
    store.updateDependent(editingId, buildPayload(form.parentalSecretCode))
    closeModal()
  }

  // Step 1 of linking: validate the child's credentials against the local users DB.
  function handleVerifyAndContinue() {
    setError(null)
    if (!form.name.trim()) return setError("Enter the dependent's full name.")
    const res = store.verifyCredentials(form.assignedEmail, form.assignedPassword)
    if (!res.ok) return setError(res.error ?? "Could not verify the child's account.")
    setStep("code")
  }

  // Step 2 of linking: store the guardian-created 4-digit Parental Secret Code.
  function handleConfirmCode() {
    setError(null)
    if (!/^\d{4}$/.test(form.parentalSecretCode)) {
      return setError("The Parental Secret Code must be exactly 4 digits.")
    }
    store.addDependent(buildPayload(form.parentalSecretCode))
    closeModal()
  }

  function handleDelete() {
    if (editingId) store.removeDependent(editingId)
    closeModal()
  }

  return (
    <div className="flex h-full flex-col bg-secondary">
      <ScreenHeader
        title="Dependent Profiles"
        subtitle="Family medical directory"
        onBack={onBack}
        right={
          <button
            type="button"
            onClick={openAdd}
            aria-label="Add a new dependent"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground shadow-sm transition hover:brightness-110"
          >
            <UserPlus className="h-5 w-5" />
          </button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-10">
        {/* 1.4 Guardian Control & Account Recovery Banner */}
        <div className="rounded-2xl bg-foreground p-4 text-background shadow-lg">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background/15">
              <Lock className="h-5 w-5" />
            </span>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-foreground">
              Guardian Master Access Active
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-background/75">
            All minor profile settings, master passwords, and data update overrides are tightly
            coupled to the primary adult supervisor&apos;s authorization token. Account recovery and
            parameter reset requests are routed exclusively to the master administrator email.
          </p>
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={openAdd}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
        >
          <UserPlus className="h-5 w-5" />
          Add a New Dependent
        </button>

        {/* 1.1 Linked Profiles Grid Array */}
        <div className="mt-5 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Linked Profiles</h2>
          <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground shadow-sm">
            {dependents.length}
          </span>
        </div>

        {dependents.length === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title="No dependents linked yet"
            hint="Add a child or elderly parent to manage their medical passport and paired MediTag."
          />
        ) : (
          <div className="mt-3 grid gap-3">
            {dependents.map((dep) => (
              <DependentCard key={dep.id} dependent={dep} onEdit={() => openEdit(dep)} />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <ModalShell
          title={
            editingId
              ? "Edit Dependent Profile"
              : step === "code"
                ? "Set Parental Secret Code"
                : "Add a New Dependent"
          }
          subtitle={
            editingId
              ? "Update medical & tag parameters"
              : step === "code"
                ? "Authorize this linked dependent"
                : "Create a linked family passport"
          }
          headerAccent
          onClose={closeModal}
        >
          {step === "code" && !editingId ? (
            <div className="space-y-5 p-5">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                  <p className="text-sm font-bold">Child account verified</p>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {form.assignedEmail.trim().toLowerCase()}
                  </span>{" "}
                  matched a registered account. Create a 4-digit secret code that only you will use
                  to unlock edit access on this dependent&apos;s dashboard.
                </p>
              </div>

              <FormField label="4-Digit Parental Secret Code" icon={<KeyRound className="h-4 w-4" />}>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  className={`${INPUT} tracking-[0.5em]`}
                  placeholder="••••"
                  value={form.parentalSecretCode}
                  onChange={(e) => set("parentalSecretCode", e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </FormField>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("details")
                    setError(null)
                  }}
                  className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCode}
                  className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/25 transition hover:brightness-110"
                >
                  Approve & Link
                </button>
              </div>
            </div>
          ) : (
          <div className="space-y-4 p-5">
            <FormField label="Full Name" icon={<User className="h-4 w-4" />}>
              <input
                className={INPUT}
                placeholder="e.g. Aarav Sharma"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date of Birth" icon={<Calendar className="h-4 w-4" />}>
                <input
                  type="date"
                  className={INPUT}
                  value={form.dob}
                  onChange={(e) => set("dob", e.target.value)}
                />
              </FormField>
              <FormField label="Relationship" icon={<Users className="h-4 w-4" />}>
                <select
                  className={`${INPUT} appearance-none`}
                  value={form.relationship}
                  onChange={(e) => set("relationship", e.target.value)}
                >
                  <option value="">Select</option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Blood Group" icon={<Droplet className="h-4 w-4" />}>
              <select
                className={`${INPUT} appearance-none`}
                value={form.bloodGroup}
                onChange={(e) => set("bloodGroup", e.target.value)}
              >
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Critical Allergies" icon={<AlertTriangle className="h-4 w-4" />}>
              <input
                className={INPUT}
                placeholder="Comma separated, e.g. Penicillin, Peanuts"
                value={form.allergies}
                onChange={(e) => set("allergies", e.target.value)}
              />
            </FormField>

            <FormField label="Chronic Illnesses" icon={<HeartPulse className="h-4 w-4" />}>
              <input
                className={INPUT}
                placeholder="Comma separated, e.g. Asthma, Diabetes"
                value={form.conditions}
                onChange={(e) => set("conditions", e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Emergency Contact" icon={<User className="h-4 w-4" />}>
                <input
                  className={INPUT}
                  placeholder="Contact name"
                  value={form.contactName}
                  onChange={(e) => set("contactName", e.target.value)}
                />
              </FormField>
              <FormField label="Contact Phone" icon={<Phone className="h-4 w-4" />}>
                <input
                  type="tel"
                  className={INPUT}
                  placeholder="Phone number"
                  value={form.contactPhone}
                  onChange={(e) => set("contactPhone", e.target.value)}
                />
              </FormField>
            </div>

            {/* Critical Auth Requirement — guardian-managed credentials */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <div className="mb-3 flex items-center gap-2 text-primary">
                <Lock className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-wide">Guardian-Managed Login</p>
              </div>
              <div className="space-y-3">
                <FormField label="Child Assigned Email ID" icon={<Mail className="h-4 w-4" />}>
                  <input
                    type="email"
                    className={INPUT}
                    placeholder="child.login@lyfvault.io"
                    value={form.assignedEmail}
                    onChange={(e) => set("assignedEmail", e.target.value)}
                  />
                </FormField>
                <FormField label="Child Assigned Password" icon={<KeyRound className="h-4 w-4" />}>
                  <input
                    type="text"
                    className={INPUT}
                    placeholder="Set a view-only access password"
                    value={form.assignedPassword}
                    onChange={(e) => set("assignedPassword", e.target.value)}
                  />
                </FormField>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Enter the child&apos;s existing account email and password. We verify them against
                the vault before linking, then you&apos;ll set a Parental Secret Code.
              </p>
            </div>

            {error && !editingId && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Dual-button row */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setForm(EMPTY_FORM)}
                className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                Clear Form Data
              </button>
              <button
                type="button"
                onClick={editingId ? handleUpdate : handleVerifyAndContinue}
                className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/25 transition hover:brightness-110"
              >
                {editingId ? "Save Profile to Vault" : "Verify & Continue"}
              </button>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/15"
              >
                <Trash2 className="h-4 w-4" />
                Remove Dependent
              </button>
            )}
          </div>
          )}
        </ModalShell>
      )}
    </div>
  )
}

function DependentCard({
  dependent,
  onEdit,
}: {
  dependent: DependentProfile
  onEdit: () => void
}) {
  const age = computeAge(dependent.dob)
  const initials = dependent.name
    ? dependent.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?"
  const isChildLike = dependent.relationship === "Child" || dependent.relationship === "Ward"

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          {isChildLike ? <Baby className="h-7 w-7" /> : <User className="h-7 w-7" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-bold text-foreground">{dependent.name}</p>
            <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {dependent.relationship || "Dependent"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {age !== null ? `${age} yrs` : "Age N/A"}
            {dependent.bloodGroup ? ` \u00b7 ${dependent.bloodGroup}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
            <Tag className="h-3.5 w-3.5 text-primary" />
            Linked MediTag ID: {dependent.mediTagId}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
            {dependent.allergies.length} allergy
          </span>
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
            {dependent.conditions.length} condition
          </span>
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
        >
          <Edit2 className="h-3.5 w-3.5" />
          Edit Profile
        </button>
      </div>
    </div>
  )
}

const INPUT =
  "w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

function FormField({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        {children}
      </div>
    </label>
  )
}
