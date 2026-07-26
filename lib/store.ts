"use client"

import { useCallback, useEffect, useState } from "react"

export type EmergencyContact = {
  id: string
  name: string
  relation: string
  phone: string
}

export type MedicalReport = {
  id: string
  doctorName: string
  specialization: string
  clinic: string
  date: string
  time: string
  licenseNumber: string
  fileName: string
  notes: string
  createdAt: number
}

export type DependentProfile = {
  id: string
  name: string
  dob: string
  /** Family relationship type, e.g. "Child" or "Parent". */
  relationship: string
  bloodGroup: string
  allergies: string[]
  conditions: string[]
  contacts: EmergencyContact[]
  /** Guardian-assigned login for subsequent minor view-only access. */
  assignedEmail: string
  assignedPassword: string
  /** Strong parental secret code (5-12 chars incl. uppercase, number, special) unlocking edit access on the minor dashboard. */
  parentalSecretCode: string
  /** Physical paired tag identifier, e.g. "MT-7Q2K". */
  mediTagId: string
}

export type UserProfile = {
  name: string
  dob: string
  bloodGroup: string
  gender: string
  email: string
  password: string
  /** Physical Card/Tag ID printed on the user's card, used for Quick Card login and emergency lookup. */
  cardId: string
  allergies: string[]
  conditions: string[]
  medications: string[]
  contacts: EmergencyContact[]
  reports: MedicalReport[]
  dependents: DependentProfile[]
}

type Database = {
  users: Record<string, UserProfile>
  session: string | null
}

const KEY = "medivault_db_v1"

const EMPTY_DB: Database = { users: {}, session: null }

function readDb(): Database {
  if (typeof window === "undefined") return EMPTY_DB
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return EMPTY_DB
    const parsed = JSON.parse(raw) as Database
    return { users: parsed.users ?? {}, session: parsed.session ?? null }
  } catch {
    return EMPTY_DB
  }
}

function writeDb(db: Database) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KEY, JSON.stringify(db))
}

export function computeAge(dob: string): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Generates a physical MediTag identifier like "MT-7Q2K" (ambiguous chars removed). */
export function makeMediTag(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `MT-${code}`
}

/** Ensures a stored profile has all newer fields (backfills for older records). */
function normalizeUser(user: UserProfile): UserProfile {
  return {
    ...user,
    cardId: user.cardId ?? "",
    dependents: (user.dependents ?? []).map((d) => ({ ...d, parentalSecretCode: d.parentalSecretCode ?? "" })),
  }
}

/** Generates a fallback physical Card/Tag ID like "LV-8H3N2" when a user does not supply one. */
export function makeCardId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `LV-${code}`
}

/** Client-side strength check for the parental secret code: 5-12 chars, 1 uppercase, 1 number, 1 special. */
export function validateParentalCode(code: string): { ok: boolean; error?: string } {
  if (code.length < 5 || code.length > 12) {
    return { ok: false, error: "Code must be 5 to 12 characters long." }
  }
  if (!/[A-Z]/.test(code)) return { ok: false, error: "Add at least one uppercase letter." }
  if (!/[0-9]/.test(code)) return { ok: false, error: "Add at least one number." }
  if (!/[^A-Za-z0-9]/.test(code)) return { ok: false, error: "Add at least one special character (e.g. @, #, $)." }
  return { ok: true }
}

/**
 * A profile belongs to a minor (child) when the user is under 18.
 * Minors get read-only access; adults (18+) can edit their records.
 */
export function isChildProfile(user: Pick<UserProfile, "dob"> | null | undefined): boolean {
  if (!user) return false
  const age = computeAge(user.dob)
  return age !== null && age < 18
}

export type StoreApi = {
  ready: boolean
  currentUser: UserProfile | null
  emergencyProfile: UserProfile | null
  register: (
    data: Pick<UserProfile, "name" | "dob" | "bloodGroup" | "gender" | "email" | "password">,
  ) => { ok: boolean; error?: string }
  login: (email: string, password: string) => { ok: boolean; error?: string }
  /** Verifies an email + password pair against the local users database (no session change). */
  verifyCredentials: (email: string, password: string) => { ok: boolean; error?: string }
  /** Finds a linked dependent record (across all guardians) by its assigned login email. */
  getDependentByEmail: (email: string) => DependentProfile | null
  logout: () => void
  resetAll: () => void
  addReport: (report: Omit<MedicalReport, "id" | "createdAt">) => void
  updateProfile: (partial: Partial<UserProfile>) => void
  addDependent: (data: Omit<DependentProfile, "id" | "mediTagId">) => void
  updateDependent: (id: string, partial: Partial<Omit<DependentProfile, "id">>) => void
  removeDependent: (id: string) => void
}

export function useStore(): StoreApi {
  const [db, setDb] = useState<Database>(EMPTY_DB)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setDb(readDb())
    setReady(true)
  }, [])

  const persist = useCallback((next: Database) => {
    setDb(next)
    writeDb(next)
  }, [])

  const rawCurrent = db.session ? db.users[db.session] ?? null : null
  const currentUser = rawCurrent ? normalizeUser(rawCurrent) : null
  const allUsers = Object.values(db.users)
  const rawEmergency = currentUser ?? (allUsers.length > 0 ? allUsers[allUsers.length - 1] : null)
  const emergencyProfile = rawEmergency ? normalizeUser(rawEmergency) : null

  const register: StoreApi["register"] = useCallback(
    (data) => {
      const email = data.email.trim().toLowerCase()
      if (!email || !data.password) return { ok: false, error: "Email and password are required." }
      const existing = readDb()
      if (existing.users[email]) return { ok: false, error: "An account with this email already exists." }
      const user: UserProfile = {
        name: data.name.trim(),
        dob: data.dob,
        bloodGroup: data.bloodGroup,
        gender: data.gender,
        email,
        password: data.password,
        allergies: [],
        conditions: [],
        medications: [],
        contacts: [],
        reports: [],
        dependents: [],
      }
      const next: Database = {
        users: { ...existing.users, [email]: user },
        session: email,
      }
      persist(next)
      return { ok: true }
    },
    [persist],
  )

  const login: StoreApi["login"] = useCallback(
    (email, password) => {
      const key = email.trim().toLowerCase()
      const existing = readDb()
      const user = existing.users[key]
      if (!user) return { ok: false, error: "No account found for this email." }
      if (user.password !== password) return { ok: false, error: "Incorrect password." }
      persist({ ...existing, session: key })
      return { ok: true }
    },
    [persist],
  )

  const verifyCredentials: StoreApi["verifyCredentials"] = useCallback((email, password) => {
    const key = email.trim().toLowerCase()
    if (!key || !password) return { ok: false, error: "Enter the child's email and password." }
    const existing = readDb()
    const user = existing.users[key]
    if (!user) return { ok: false, error: "No account found for this email." }
    if (user.password !== password) return { ok: false, error: "Incorrect password for this account." }
    return { ok: true }
  }, [])

  const getDependentByEmail: StoreApi["getDependentByEmail"] = useCallback((email) => {
    const key = email.trim().toLowerCase()
    if (!key) return null
    const existing = readDb()
    for (const u of Object.values(existing.users)) {
      const match = (u.dependents ?? []).find((d) => d.assignedEmail.trim().toLowerCase() === key)
      if (match) return { ...match, parentalSecretCode: match.parentalSecretCode ?? "" }
    }
    return null
  }, [])

  const logout: StoreApi["logout"] = useCallback(() => {
    const existing = readDb()
    persist({ ...existing, session: null })
  }, [persist])

  // Demo utility: wipe ALL stored accounts, reports, and the active session so
  // profiles can be swapped cleanly during live testing.
  const resetAll: StoreApi["resetAll"] = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY)
    setDb(EMPTY_DB)
  }, [])

  const addReport: StoreApi["addReport"] = useCallback(
    (report) => {
      const existing = readDb()
      if (!existing.session) return
      const user = existing.users[existing.session]
      if (!user) return
      const newReport: MedicalReport = { ...report, id: uid(), createdAt: Date.now() }
      const updated: UserProfile = { ...user, reports: [newReport, ...user.reports] }
      persist({ ...existing, users: { ...existing.users, [existing.session]: updated } })
    },
    [persist],
  )

  const updateProfile: StoreApi["updateProfile"] = useCallback(
    (partial) => {
      const existing = readDb()
      if (!existing.session) return
      const user = existing.users[existing.session]
      if (!user) return
      const updated: UserProfile = { ...user, ...partial }
      persist({ ...existing, users: { ...existing.users, [existing.session]: updated } })
    },
    [persist],
  )

  const addDependent: StoreApi["addDependent"] = useCallback(
    (data) => {
      const existing = readDb()
      if (!existing.session) return
      const user = existing.users[existing.session]
      if (!user) return
      const dependent: DependentProfile = { ...data, id: uid(), mediTagId: makeMediTag() }
      const updated: UserProfile = {
        ...normalizeUser(user),
        dependents: [...(user.dependents ?? []), dependent],
      }
      persist({ ...existing, users: { ...existing.users, [existing.session]: updated } })
    },
    [persist],
  )

  const updateDependent: StoreApi["updateDependent"] = useCallback(
    (id, partial) => {
      const existing = readDb()
      if (!existing.session) return
      const user = existing.users[existing.session]
      if (!user) return
      const updated: UserProfile = {
        ...normalizeUser(user),
        dependents: (user.dependents ?? []).map((d) => (d.id === id ? { ...d, ...partial } : d)),
      }
      persist({ ...existing, users: { ...existing.users, [existing.session]: updated } })
    },
    [persist],
  )

  const removeDependent: StoreApi["removeDependent"] = useCallback(
    (id) => {
      const existing = readDb()
      if (!existing.session) return
      const user = existing.users[existing.session]
      if (!user) return
      const updated: UserProfile = {
        ...normalizeUser(user),
        dependents: (user.dependents ?? []).filter((d) => d.id !== id),
      }
      persist({ ...existing, users: { ...existing.users, [existing.session]: updated } })
    },
    [persist],
  )

  return {
    ready,
    currentUser,
    emergencyProfile,
    register,
    login,
    verifyCredentials,
    getDependentByEmail,
    logout,
    resetAll,
    addReport,
    updateProfile,
    addDependent,
    updateDependent,
    removeDependent,
  }
}

export const RELATIONSHIPS = ["Child", "Parent", "Spouse", "Sibling", "Grandparent", "Ward", "Other"]

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export const SPECIALIZATIONS = [
  "Cardiologist",
  "Dentist",
  "General Physician",
  "Dermatologist",
  "Orthopedic",
  "Neurologist",
  "Radiologist",
  "ENT Specialist",
  "Psychiatrist",
]

export const DEPARTMENTS = [
  "Cardiology",
  "Neurology",
  "Dermatology",
  "Radiology",
  "Laboratory",
  "Orthopedics",
  "ENT",
  "Dental",
  "Psychiatry",
]
