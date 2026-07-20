"use client"

import { useState } from "react"
import {
  Lock,
  LogOut,
  Save,
  Pencil,
  ShieldCheck,
  Check,
  User as UserIcon,
  Calendar,
  Droplet,
  AlertTriangle,
  HeartPulse,
  Pill,
} from "lucide-react"
import { ScreenHeader } from "./shared"
import { computeAge, isChildProfile, type StoreApi, type UserProfile } from "@/lib/store"

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const GENDERS = ["Male", "Female", "Other"]

type Draft = {
  name: string
  dob: string
  gender: string
  bloodGroup: string
  allergies: string
  conditions: string
  medications: string
}

function toDraft(user: UserProfile): Draft {
  return {
    name: user.name,
    dob: user.dob,
    gender: user.gender,
    bloodGroup: user.bloodGroup,
    allergies: user.allergies.join(", "),
    conditions: user.conditions.join(", "),
    medications: user.medications.join(", "),
  }
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

export function ProfileScreen({
  store,
  user,
  onLogout,
}: {
  store: StoreApi
  user: UserProfile
  onLogout: () => void
}) {
  const readOnly = isChildProfile(user)
  const age = computeAge(user.dob)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => toDraft(user))
  const [savedFlash, setSavedFlash] = useState(false)

  const initials = user.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U"

  function startEdit() {
    setDraft(toDraft(user))
    setEditing(true)
  }

  function cancelEdit() {
    setDraft(toDraft(user))
    setEditing(false)
  }

  function save() {
    store.updateProfile({
      name: draft.name.trim(),
      dob: draft.dob,
      gender: draft.gender,
      bloodGroup: draft.bloodGroup,
      allergies: splitList(draft.allergies),
      conditions: splitList(draft.conditions),
      medications: splitList(draft.medications),
    })
    setEditing(false)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2000)
  }

  // Adults edit against the live draft; everyone else views persisted values.
  const active = editing && !readOnly
  const fieldClass = (locked: boolean) =>
    `w-full rounded-xl border py-3 pl-11 pr-10 text-sm outline-none transition ${
      locked
        ? "border-border bg-secondary text-foreground/80 cursor-not-allowed"
        : "border-border bg-input text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
    }`

  return (
    <div className="flex h-full flex-col bg-secondary">
      <ScreenHeader
        title="Profile"
        subtitle={user.email}
        right={
          readOnly ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent">
              <Lock className="h-3.5 w-3.5" />
              View only
            </span>
          ) : editing ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              aria-label="Edit profile"
              className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition hover:brightness-110"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )
        }
      />

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Identity card */}
        <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-foreground">{user.name || "Unnamed"}</p>
            <p className="truncate text-sm text-muted-foreground">
              {user.bloodGroup || "Blood N/A"}
              {age !== null ? ` \u00b7 ${age} yrs` : ""}
              {user.gender ? ` \u00b7 ${user.gender}` : ""}
            </p>
          </div>
        </div>

        {/* Access-mode banner */}
        {readOnly ? (
          <div className="flex items-start gap-3 rounded-2xl bg-accent/10 p-4 text-sm text-foreground">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="font-semibold">Read-only access</p>
              <p className="text-muted-foreground">
                This profile belongs to a minor (under 18). Records can be viewed but not edited. A
                guardian or verified doctor must update medical information.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl bg-primary/10 p-4 text-sm text-foreground">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Full access</p>
              <p className="text-muted-foreground">
                {active
                  ? "Update your details below, then save your changes."
                  : "You can edit your personal and medical information at any time."}
              </p>
            </div>
          </div>
        )}

        {savedFlash && (
          <div className="mv-fade-in flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
            <Check className="h-4 w-4" />
            Changes saved
          </div>
        )}

        {/* Personal information */}
        <section className="rounded-2xl bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-foreground">Personal Information</h2>
          <div className="flex flex-col gap-3">
            <ProfileField icon={<UserIcon className="h-4 w-4" />} locked={!active}>
              <input
                className={fieldClass(!active)}
                placeholder="Full name"
                value={active ? draft.name : user.name || "Not set"}
                readOnly={!active}
                aria-readonly={!active}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </ProfileField>
            <ProfileField icon={<Calendar className="h-4 w-4" />} locked={!active}>
              <input
                type={active ? "date" : "text"}
                className={fieldClass(!active)}
                value={active ? draft.dob : user.dob || "Not set"}
                readOnly={!active}
                aria-readonly={!active}
                onChange={(e) => setDraft((d) => ({ ...d, dob: e.target.value }))}
              />
            </ProfileField>
            <ProfileField icon={<Droplet className="h-4 w-4" />} locked={!active}>
              {active ? (
                <select
                  className={`${fieldClass(false)} appearance-none`}
                  value={draft.bloodGroup}
                  onChange={(e) => setDraft((d) => ({ ...d, bloodGroup: e.target.value }))}
                >
                  <option value="">Blood group</option>
                  {BLOOD_GROUPS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={fieldClass(true)}
                  value={user.bloodGroup || "Not set"}
                  readOnly
                  aria-readonly
                />
              )}
            </ProfileField>
            <ProfileField icon={<UserIcon className="h-4 w-4" />} locked={!active}>
              {active ? (
                <select
                  className={`${fieldClass(false)} appearance-none`}
                  value={draft.gender}
                  onChange={(e) => setDraft((d) => ({ ...d, gender: e.target.value }))}
                >
                  <option value="">Gender</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={fieldClass(true)}
                  value={user.gender || "Not set"}
                  readOnly
                  aria-readonly
                />
              )}
            </ProfileField>
          </div>
        </section>

        {/* Medical information */}
        <section className="rounded-2xl bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-foreground">Medical Information</h2>
          <div className="flex flex-col gap-3">
            <ProfileField icon={<AlertTriangle className="h-4 w-4" />} locked={!active}>
              <input
                className={fieldClass(!active)}
                placeholder="Allergies (comma separated)"
                value={active ? draft.allergies : user.allergies.join(", ") || "None recorded"}
                readOnly={!active}
                aria-readonly={!active}
                onChange={(e) => setDraft((d) => ({ ...d, allergies: e.target.value }))}
              />
            </ProfileField>
            <ProfileField icon={<HeartPulse className="h-4 w-4" />} locked={!active}>
              <input
                className={fieldClass(!active)}
                placeholder="Conditions (comma separated)"
                value={active ? draft.conditions : user.conditions.join(", ") || "None recorded"}
                readOnly={!active}
                aria-readonly={!active}
                onChange={(e) => setDraft((d) => ({ ...d, conditions: e.target.value }))}
              />
            </ProfileField>
            <ProfileField icon={<Pill className="h-4 w-4" />} locked={!active}>
              <input
                className={fieldClass(!active)}
                placeholder="Medications (comma separated)"
                value={active ? draft.medications : user.medications.join(", ") || "None recorded"}
                readOnly={!active}
                aria-readonly={!active}
                onChange={(e) => setDraft((d) => ({ ...d, medications: e.target.value }))}
              />
            </ProfileField>
          </div>
        </section>

        {/* Save action for adults in edit mode */}
        {active && (
          <button
            type="button"
            onClick={save}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
          >
            <Save className="h-5 w-5" />
            Save Changes
          </button>
        )}

        {/* Terminate session -> back to Splash (Screen 0) */}
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-bold text-white shadow-lg shadow-destructive/25 transition hover:brightness-105"
        >
          <LogOut className="h-5 w-5" />
          Terminate Active Session
        </button>
      </div>
    </div>
  )
}

function ProfileField({
  icon,
  locked,
  children,
}: {
  icon: React.ReactNode
  locked: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      {children}
      {locked && (
        <Lock
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
