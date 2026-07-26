"use client"

import { useState } from "react"
import {
  UserPlus,
  Edit2,
  Lock,
  Users,
  AlertTriangle,
  Mail,
  KeyRound,
  User,
  Baby,
  Trash2,
  Tag,
} from "lucide-react"
import { ScreenHeader, ModalShell, EmptyState } from "./shared"
import {
  computeAge,
  validateParentalCode,
  type DependentProfile,
  type StoreApi,
  type UserProfile,
} from "@/lib/store"

// Simplified guardian directory form — strictly 4 fields.
type FormState = {
  name: string
  assignedEmail: string
  assignedPassword: string
  parentalSecretCode: string
}

const EMPTY_FORM: FormState = {
  name: "",
  assignedEmail: "",
  assignedPassword: "",
  parentalSecretCode: "",
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
  // Holds the original dependent while editing so non-form fields are preserved.
  const [editing, setEditing] = useState<DependentProfile | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  function closeModal() {
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setEditing(null)
    setError(null)
  }

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(dep: DependentProfile) {
    setEditing(dep)
    setForm({
      name: dep.name,
      assignedEmail: dep.assignedEmail,
      assignedPassword: dep.assignedPassword,
      parentalSecretCode: dep.parentalSecretCode ?? "",
    })
    setError(null)
    setModalOpen(true)
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Shared validation for both add and edit: name + verified child login + strong code.
  function validateForm(): { ok: boolean; error?: string } {
    if (!form.name.trim()) return { ok: false, error: "Enter the child's full name." }
    const cred = store.verifyCredentials(form.assignedEmail, form.assignedPassword)
    if (!cred.ok) return { ok: false, error: cred.error ?? "Could not verify the child's account." }
    const code = validateParentalCode(form.parentalSecretCode)
    if (!code.ok) return { ok: false, error: code.error }
    return { ok: true }
  }

  function handleAdd() {
    setError(null)
    const res = validateForm()
    if (!res.ok) return setError(res.error ?? "Please review the form.")
    store.addDependent({
      name: form.name.trim(),
      dob: "",
      relationship: "Child",
      bloodGroup: "",
      allergies: [],
      conditions: [],
      contacts: [],
      assignedEmail: form.assignedEmail.trim().toLowerCase(),
      assignedPassword: form.assignedPassword,
      parentalSecretCode: form.parentalSecretCode,
    })
    closeModal()
  }

  function handleUpdate() {
    if (!editing) return
    setError(null)
    const res = validateForm()
    if (!res.ok) return setError(res.error ?? "Please review the form.")
    store.updateDependent(editing.id, {
      name: form.name.trim(),
      assignedEmail: form.assignedEmail.trim().toLowerCase(),
      assignedPassword: form.assignedPassword,
      parentalSecretCode: form.parentalSecretCode,
    })
    closeModal()
  }

  function handleDelete() {
    if (editing) store.removeDependent(editing.id)
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
          title={editing ? "Edit Dependent Profile" : "Add a New Dependent"}
          subtitle={editing ? "Update linked family passport" : "Create a linked family passport"}
          headerAccent
          onClose={closeModal}
        >
          <div className="space-y-4 p-5">
            <FormField label="Child's Full Name" icon={<User className="h-4 w-4" />}>
              <input
                className={INPUT}
                placeholder="e.g. Aarav Sharma"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </FormField>

            <FormField label="Child's Email ID" icon={<Mail className="h-4 w-4" />}>
              <input
                type="email"
                className={INPUT}
                placeholder="child.login@lyfvault.io"
                value={form.assignedEmail}
                onChange={(e) => set("assignedEmail", e.target.value)}
              />
            </FormField>

            <FormField label="Child's Password" icon={<KeyRound className="h-4 w-4" />}>
              <input
                type="text"
                className={INPUT}
                placeholder="The child's account password"
                value={form.assignedPassword}
                onChange={(e) => set("assignedPassword", e.target.value)}
              />
            </FormField>

            <FormField label="Parental Secret Code" icon={<Lock className="h-4 w-4" />}>
              <input
                type="text"
                maxLength={12}
                className={INPUT}
                placeholder="5-12 chars, 1 upper, 1 number, 1 special"
                value={form.parentalSecretCode}
                onChange={(e) => set("parentalSecretCode", e.target.value.slice(0, 12))}
              />
            </FormField>
            <p className="-mt-1 pl-1 text-[11px] leading-relaxed text-muted-foreground">
              The Parental Secret Code must be 5&ndash;12 characters and include at least one
              uppercase letter, one number, and one special character (e.g. @, #, $, !). Only you
              will use it to unlock edit access on this dependent&apos;s dashboard.
            </p>

            {error && (
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
                onClick={editing ? handleUpdate : handleAdd}
                className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/25 transition hover:brightness-110"
              >
                {editing ? "Save Profile to Vault" : "Verify & Link Dependent"}
              </button>
            </div>

            {editing && (
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
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {age !== null ? `${age} yrs \u00b7 ` : ""}
            {dependent.assignedEmail || "No login linked"}
          </p>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
            <Tag className="h-3.5 w-3.5 text-primary" />
            Linked MediTag ID: {dependent.mediTagId}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-primary" />
          Secret code set
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
