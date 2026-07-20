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

export type UserProfile = {
  name: string
  dob: string
  bloodGroup: string
  gender: string
  email: string
  password: string
  allergies: string[]
  conditions: string[]
  medications: string[]
  contacts: EmergencyContact[]
  reports: MedicalReport[]
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
  logout: () => void
  addReport: (report: Omit<MedicalReport, "id" | "createdAt">) => void
  updateProfile: (partial: Partial<UserProfile>) => void
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

  const currentUser = db.session ? db.users[db.session] ?? null : null
  const allUsers = Object.values(db.users)
  const emergencyProfile = currentUser ?? (allUsers.length > 0 ? allUsers[allUsers.length - 1] : null)

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

  const logout: StoreApi["logout"] = useCallback(() => {
    const existing = readDb()
    persist({ ...existing, session: null })
  }, [persist])

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

  return { ready, currentUser, emergencyProfile, register, login, logout, addReport, updateProfile }
}

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
