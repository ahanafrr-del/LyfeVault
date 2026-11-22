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

type PatientMatch = { kind: "user" | "dependent"; cardId: string; name: string }
type Result = { ok: boolean; error?: string }
type StoredCredential = { salt: string; hash: string }
type StoredAccount = { credential: StoredCredential; profile: UserProfile }
type StoredAccounts = Record<string, StoredAccount>

const ACCOUNTS_KEY = "lyfevault_accounts_v1"
const SESSION_KEY = "medivault_session_v1"
const PASSWORD_ITERATIONS = 310_000

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalizeCardId(cardId: string): string {
  return cardId.trim().toLowerCase()
}

function normalizeUser(user: Partial<UserProfile> & { email: string }): UserProfile {
  return {
    name: user.name ?? "",
    dob: user.dob ?? "",
    bloodGroup: user.bloodGroup ?? "",
    gender: user.gender ?? "",
    email: normalizeEmail(user.email),
    password: "",
    cardId: user.cardId ?? "",
    allergies: user.allergies ?? [],
    conditions: user.conditions ?? [],
    medications: user.medications ?? [],
    contacts: user.contacts ?? [],
    reports: user.reports ?? [],
    dependents: (user.dependents ?? []).map((dependent) => ({
      ...dependent,
      assignedEmail: normalizeEmail(dependent.assignedEmail ?? ""),
      assignedPassword: dependent.assignedPassword ?? "",
      parentalSecretCode: dependent.parentalSecretCode ?? "",
      allergies: dependent.allergies ?? [],
      conditions: dependent.conditions ?? [],
      contacts: dependent.contacts ?? [],
    })),
  }
}

function readAccounts(): StoredAccounts {
  if (!canUseStorage()) return {}
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) ?? "{}")
    if (!value || typeof value !== "object" || Array.isArray(value)) return {}
    const accounts: StoredAccounts = {}
    for (const [key, item] of Object.entries(value)) {
      if (!item || typeof item !== "object") continue
      const entry = item as Partial<StoredAccount>
      if (!entry.profile || typeof entry.profile.email !== "string") continue
      if (!entry.credential || typeof entry.credential.salt !== "string" || typeof entry.credential.hash !== "string") continue
      const email = normalizeEmail(entry.profile.email)
      accounts[email || key] = {
        credential: entry.credential,
        profile: normalizeUser(entry.profile),
      }
    }
    return accounts
  } catch {
    return {}
  }
}

function writeAccounts(accounts: StoredAccounts): boolean {
  if (!canUseStorage()) return false
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
    return true
  } catch {
    return false
  }
}

function readSessionEmail(): string | null {
  if (!canUseStorage()) return null
  try {
    const email = window.localStorage.getItem(SESSION_KEY)
    return email ? normalizeEmail(email) : null
  } catch {
    return null
  }
}

function writeSession(email: string): boolean {
  if (!canUseStorage()) return false
  try {
    window.localStorage.setItem(SESSION_KEY, normalizeEmail(email))
    return true
  } catch {
    return false
  }
}

function removeSession(): void {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage may be disabled by the browser; in-memory state is still cleared.
  }
}

function passwordBytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

async function hashPassword(password: string, saltHex?: string): Promise<StoredCredential> {
  if (!canUseStorage() || !window.crypto?.subtle) {
    throw new Error("Secure local password storage is unavailable in this browser. Use HTTPS or a modern browser.")
  }
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{1,2}/g) ?? [], (byte) => Number.parseInt(byte, 16))
    : window.crypto.getRandomValues(new Uint8Array(16))
  const key = await window.crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"])
  const bits = await window.crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PASSWORD_ITERATIONS, hash: "SHA-256" }, key, 256)
  return { salt: passwordBytesToHex(salt), hash: passwordBytesToHex(new Uint8Array(bits)) }
}

async function passwordMatches(password: string, credential: StoredCredential): Promise<boolean> {
  const calculated = await hashPassword(password, credential.salt)
  return calculated.hash === credential.hash
}

function dependentAsUser(parent: UserProfile, dependent: DependentProfile): UserProfile {
  return normalizeUser({
    name: dependent.name,
    dob: dependent.dob,
    bloodGroup: dependent.bloodGroup,
    gender: "",
    email: dependent.assignedEmail || parent.email,
    password: "",
    cardId: dependent.mediTagId,
    allergies: dependent.allergies,
    conditions: dependent.conditions,
    medications: [],
    contacts: dependent.contacts,
    reports: [],
    dependents: [],
  })
}

type AuthData = Omit<Pick<UserProfile, "name" | "dob" | "bloodGroup" | "gender" | "email" | "password" | "cardId">, "cardId"> & { cardId?: string }
type Practitioner = { doctorName: string; registrationNumber: string; institution: string }

export type StoreApi = {
  ready: boolean
  currentUser: UserProfile | null
  emergencyProfile: UserProfile | null
  register: (data: AuthData) => Promise<Result>
  login: (email: string, password: string) => Promise<Result>
  loginByCard: (cardId: string, password: string) => Promise<Result>
  /** Looks up a registered user or dependent by physical Card/Tag ID. */
  getUserByCardId: (cardId: string) => Promise<UserProfile | null>
  /** Read-only lookup of a locally registered account by email. */
  getUserByEmail: (email: string) => Promise<UserProfile | null>
  /** Searches local profiles and linked dependents for an exact Card/Tag ID. */
  findPatientByCardId: (cardId: string) => Promise<PatientMatch | null>
  /** Attaches a clinical report to the profile identified by a Card/Tag ID. */
  addReportToCard: (cardId: string, report: Omit<MedicalReport, "id" | "createdAt">, practitioner?: Practitioner) => Promise<Result>
  verifyCredentials: (email: string, password: string) => Promise<Result>
  verifyResetIdentity: (email: string, cardId: string) => Promise<Result>
  resetPassword: (email: string, cardId: string, password: string) => Promise<Result>
  getDependentByEmail: (email: string) => Promise<DependentProfile | null>
  logout: () => Promise<void>
  resetAll: () => void
  addReport: (report: Omit<MedicalReport, "id" | "createdAt">) => Promise<void>
  updateProfile: (partial: Partial<UserProfile>) => Promise<void>
  addDependent: (data: Omit<DependentProfile, "id" | "mediTagId">) => Promise<void>
  updateDependent: (id: string, partial: Partial<Omit<DependentProfile, "id">>) => Promise<void>
  removeDependent: (id: string) => Promise<void>
}

export function useStore(): StoreApi {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      const email = readSessionEmail()
      const account = email ? readAccounts()[email] : undefined
      setCurrentUser(account ? normalizeUser(account.profile) : null)
      setReady(true)
    })
    return () => { active = false }
  }, [])

  const register: StoreApi["register"] = useCallback(async (data) => {
    const email = normalizeEmail(data.email)
    const password = data.password
    if (!email || !password) return { ok: false, error: "Email and password are required." }
    if (password.length < 6) return { ok: false, error: "Choose a password with at least 6 characters." }
    if (!canUseStorage()) return { ok: false, error: "Sign-up is only available in a browser." }

    const accounts = readAccounts()
    if (accounts[email]) return { ok: false, error: "An account with this email already exists." }
    const cardId = data.cardId?.trim() ?? ""
    if (cardId && Object.values(accounts).some(({ profile }) => (
      normalizeCardId(profile.cardId) === normalizeCardId(cardId) ||
      profile.dependents.some((dependent) => normalizeCardId(dependent.mediTagId) === normalizeCardId(cardId))
    ))) return { ok: false, error: "This Card/Tag ID is already registered." }

    try {
      const credential = await hashPassword(password)
      const profile = normalizeUser({
        ...data,
        email,
        password: "",
        cardId,
        allergies: [],
        conditions: [],
        medications: [],
        contacts: [],
        reports: [],
        dependents: [],
      })
      accounts[email] = { credential, profile }
      if (!writeAccounts(accounts)) return { ok: false, error: "Your browser could not save this account. Check local storage settings and try again." }
      if (!writeSession(email)) return { ok: false, error: "Your account was saved, but this browser could not persist the sign-in session." }
      setCurrentUser(profile)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not create the account." }
    }
  }, [])

  const login: StoreApi["login"] = useCallback(async (email, password) => {
    const key = normalizeEmail(email)
    if (!key || !password) return { ok: false, error: "Email and password are required." }
    const account = readAccounts()[key]
    if (!account || !(await passwordMatches(password, account.credential))) {
      return { ok: false, error: "Email or password is incorrect." }
    }
    if (!writeSession(key)) return { ok: false, error: "This browser could not save the sign-in session." }
    setCurrentUser(normalizeUser(account.profile))
    return { ok: true }
  }, [])

  const loginByCard: StoreApi["loginByCard"] = useCallback(async (cardId, password) => {
    const target = normalizeCardId(cardId)
    if (!target) return { ok: false, error: "Enter your Card/Tag ID." }
    const accounts = readAccounts()
    const match = Object.entries(accounts).find(([, account]) => normalizeCardId(account.profile.cardId) === target)
    if (!match || !(await passwordMatches(password, match[1].credential))) {
      return { ok: false, error: "Card/Tag ID or password is incorrect." }
    }
    if (!writeSession(match[0])) return { ok: false, error: "This browser could not save the sign-in session." }
    setCurrentUser(normalizeUser(match[1].profile))
    return { ok: true }
  }, [])

  const getUserByCardId: StoreApi["getUserByCardId"] = useCallback(async (cardId) => {
    const target = normalizeCardId(cardId)
    if (!target) return null
    for (const { profile } of Object.values(readAccounts())) {
      if (normalizeCardId(profile.cardId) === target) return normalizeUser(profile)
      const dependent = profile.dependents.find((item) => normalizeCardId(item.mediTagId) === target)
      if (dependent) return dependentAsUser(profile, dependent)
    }
    return null
  }, [])

  const getUserByEmail: StoreApi["getUserByEmail"] = useCallback(async (email) => {
    const key = normalizeEmail(email)
    if (!key) return null
    const accounts = readAccounts()
    if (accounts[key]) return normalizeUser(accounts[key].profile)
    for (const { profile } of Object.values(accounts)) {
      const dependent = profile.dependents.find((item) => item.assignedEmail === key)
      if (dependent) return dependentAsUser(profile, dependent)
    }
    return null
  }, [])

  const findPatientByCardId: StoreApi["findPatientByCardId"] = useCallback(async (cardId) => {
    const target = normalizeCardId(cardId)
    if (!target) return null
    for (const { profile } of Object.values(readAccounts())) {
      if (normalizeCardId(profile.cardId) === target) return { kind: "user", cardId: profile.cardId, name: profile.name }
      const dependent = profile.dependents.find((item) => normalizeCardId(item.mediTagId) === target)
      if (dependent) return { kind: "dependent", cardId: dependent.mediTagId, name: dependent.name }
    }
    return null
  }, [])

  const updateStoredProfile = useCallback((update: (profile: UserProfile) => UserProfile) => {
    const email = readSessionEmail()
    if (!email) throw new Error("Sign in to update your profile.")
    const accounts = readAccounts()
    const account = accounts[email]
    if (!account) throw new Error("Your local profile could not be found.")
    const profile = normalizeUser(update(normalizeUser(account.profile)))
    accounts[email] = { ...account, profile }
    if (!writeAccounts(accounts)) throw new Error("Your browser could not save this change. Check local storage settings and try again.")
    setCurrentUser(profile)
    return profile
  }, [])

  const addReportToCard: StoreApi["addReportToCard"] = useCallback(async (cardId, report, practitioner) => {
    if (!practitioner) return { ok: false, error: "Practitioner identity is required." }
    const target = normalizeCardId(cardId)
    const accounts = readAccounts()
    const match = Object.entries(accounts).find(([, account]) => normalizeCardId(account.profile.cardId) === target)
    if (!match) return { ok: false, error: "No registered account was found for this Card/Tag ID." }
    const [email, account] = match
    const updated = normalizeUser({
      ...account.profile,
      reports: [{ ...report, id: uid(), createdAt: Date.now() }, ...account.profile.reports],
    })
    accounts[email] = { ...account, profile: updated }
    if (!writeAccounts(accounts)) return { ok: false, error: "Your browser could not save the report." }
    if (readSessionEmail() === email) setCurrentUser(updated)
    return { ok: true }
  }, [])

  const verifyCredentials: StoreApi["verifyCredentials"] = useCallback(async (email, password) => {
    const key = normalizeEmail(email)
    if (!key || !password) return { ok: false, error: "Enter the child's email and password." }
    const accounts = readAccounts()
    const account = accounts[key]
    if (account && await passwordMatches(password, account.credential)) return { ok: true }
    const dependent = Object.values(accounts).some(({ profile }) => profile.dependents.some((item) => (
      item.assignedEmail === key && item.assignedPassword === password
    )))
    return dependent
      ? { ok: true }
      : { ok: false, error: "No local account matches that email and password." }
  }, [])

  const verifyResetIdentity: StoreApi["verifyResetIdentity"] = useCallback(async (email, cardId) => {
    const key = normalizeEmail(email)
    const target = normalizeCardId(cardId)
    if (!key || !target) return { ok: false, error: "Enter both your Email ID and Card/Tag ID." }
    const accounts = readAccounts()
    const account = accounts[key]
    if (account && normalizeCardId(account.profile.cardId) === target) return { ok: true }
    const dependent = Object.values(accounts).some(({ profile }) => profile.dependents.some((item) => (
      item.assignedEmail === key && normalizeCardId(item.mediTagId) === target
    )))
    return dependent
      ? { ok: true }
      : { ok: false, error: "Email ID and Card/Tag ID do not match a local account." }
  }, [])

  const resetPassword: StoreApi["resetPassword"] = useCallback(async (email, cardId, password) => {
    const key = normalizeEmail(email)
    if (password.length < 6) return { ok: false, error: "Choose a password with at least 6 characters." }
    const identity = await verifyResetIdentity(key, cardId)
    if (!identity.ok) return identity

    try {
      const accounts = readAccounts()
      const account = accounts[key]
      if (account) {
        accounts[key] = { ...account, credential: await hashPassword(password) }
      } else {
        let updatedDependent = false
        for (const [ownerEmail, owner] of Object.entries(accounts)) {
          const dependents = owner.profile.dependents.map((dependent) => {
            if (dependent.assignedEmail !== key || normalizeCardId(dependent.mediTagId) !== normalizeCardId(cardId)) return dependent
            updatedDependent = true
            return { ...dependent, assignedPassword: password }
          })
          if (updatedDependent) accounts[ownerEmail] = { ...owner, profile: { ...owner.profile, dependents } }
        }
        if (!updatedDependent) return { ok: false, error: "The local account could not be found." }
      }
      return writeAccounts(accounts)
        ? { ok: true }
        : { ok: false, error: "Your browser could not save the new password." }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not reset the password." }
    }
  }, [verifyResetIdentity])

  const getDependentByEmail: StoreApi["getDependentByEmail"] = useCallback(async (email) => {
    const key = normalizeEmail(email)
    for (const { profile } of Object.values(readAccounts())) {
      const dependent = profile.dependents.find((item) => item.assignedEmail === key)
      if (dependent) return { ...dependent }
    }
    return null
  }, [])

  const logout: StoreApi["logout"] = useCallback(async () => {
    removeSession()
    setCurrentUser(null)
  }, [])

  const resetAll: StoreApi["resetAll"] = useCallback(() => {
    removeSession()
    if (canUseStorage()) {
      try {
        window.localStorage.removeItem(ACCOUNTS_KEY)
      } catch {
        // In-memory state is still cleared if storage is unavailable.
      }
    }
    setCurrentUser(null)
    setReady(true)
  }, [])

  const addReport: StoreApi["addReport"] = useCallback(async (report) => {
    updateStoredProfile((profile) => ({
      ...profile,
      reports: [{ ...report, id: uid(), createdAt: Date.now() }, ...profile.reports],
    }))
  }, [updateStoredProfile])

  const updateProfile: StoreApi["updateProfile"] = useCallback(async (partial) => {
    updateStoredProfile((profile) => ({ ...profile, ...partial, email: profile.email, password: "" }))
  }, [updateStoredProfile])

  const addDependent: StoreApi["addDependent"] = useCallback(async (data) => {
    updateStoredProfile((profile) => ({
      ...profile,
      dependents: [...profile.dependents, {
        ...data,
        assignedEmail: normalizeEmail(data.assignedEmail),
        id: uid(),
        mediTagId: makeMediTag(),
      }],
    }))
  }, [updateStoredProfile])

  const updateDependent: StoreApi["updateDependent"] = useCallback(async (id, partial) => {
    updateStoredProfile((profile) => ({
      ...profile,
      dependents: profile.dependents.map((dependent) => dependent.id === id
        ? { ...dependent, ...partial, id, assignedEmail: normalizeEmail(partial.assignedEmail ?? dependent.assignedEmail) }
        : dependent),
    }))
  }, [updateStoredProfile])

  const removeDependent: StoreApi["removeDependent"] = useCallback(async (id) => {
    updateStoredProfile((profile) => ({ ...profile, dependents: profile.dependents.filter((dependent) => dependent.id !== id) }))
  }, [updateStoredProfile])

  return {
    ready,
    currentUser,
    emergencyProfile: currentUser,
    register,
    login,
    loginByCard,
    getUserByCardId,
    getUserByEmail,
    findPatientByCardId,
    addReportToCard,
    verifyCredentials,
    verifyResetIdentity,
    resetPassword,
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

/** Generates a fallback physical Card/Tag ID like "LV-8H3N2" when a user does not supply one. */
export function makeCardId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `LV-${code}`
}

/** Client-side strength check for the parental secret code: 5-12 chars, 1 uppercase, 1 number, 1 special. */
export function validateParentalCode(code: string): { ok: boolean; error?: string } {
  if (code.length < 5 || code.length > 12) return { ok: false, error: "Code must be 5 to 12 characters long." }
  if (!/[A-Z]/.test(code)) return { ok: false, error: "Add at least one uppercase letter." }
  if (!/[0-9]/.test(code)) return { ok: false, error: "Add at least one number." }
  if (!/[^A-Za-z0-9]/.test(code)) return { ok: false, error: "Add at least one special character (e.g. @, #, $)." }
  return { ok: true }
}

/** Simulated medical-credential verification engine. */
export function validateMedicalLicense(input: { doctorName: string; registrationNumber: string; institution: string }): { ok: boolean; error?: string } {
  const denied = { ok: false, error: "⛔ Approval Denied: Unverified or Invalid Medical License Credentials." }
  const name = input.doctorName.trim()
  const reg = input.registrationNumber.trim()
  const inst = input.institution.trim()
  if (!name || name.replace(/[^A-Za-z]/g, "").length < 3) return denied
  if (!/^[A-Za-z]{0,6}[-/ ]?\d{4,}$/.test(reg)) return denied
  const registry = /(nmc|mci|smc|medical council|state medical|council|hospital|clinic|medical|health)/i
  if (!registry.test(inst)) return denied
  return { ok: true }
}

/** A profile belongs to a minor (child) when the user is under 18. */
export function isChildProfile(user: Pick<UserProfile, "dob"> | null | undefined): boolean {
  if (!user) return false
  const age = computeAge(user.dob)
  return age !== null && age < 18
}

export const RELATIONSHIPS = ["Child", "Parent", "Spouse", "Sibling", "Grandparent", "Ward", "Other"]
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
export const SPECIALIZATIONS = ["Cardiologist", "Dentist", "General Physician", "Dermatologist", "Orthopedic", "Neurologist", "Radiologist", "ENT Specialist", "Psychiatrist"]
export const DEPARTMENTS = ["Cardiology", "Neurology", "Dermatology", "Radiology", "Laboratory", "Orthopedics", "ENT", "Dental", "Psychiatry"]
