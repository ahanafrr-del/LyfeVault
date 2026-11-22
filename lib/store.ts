"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "./supabase"

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

type ProfileRow = {
  email: string
  password_salt: string
  password_hash: string
  name: string | null
  dob: string | null
  blood_group: string | null
  gender: string | null
  card_id: string | null
  allergies: unknown
  conditions: unknown
  medications: unknown
  contacts: unknown
  updated_at: number | string | null
}

type ReportRow = {
  id: string
  owner_email: string
  doctor_name: string | null
  specialization: string | null
  clinic: string | null
  date: string | null
  time: string | null
  license_number: string | null
  file_name: string | null
  notes: string | null
  created_at: number | string | null
}

type DependentRow = {
  id: string
  owner_email: string
  name: string | null
  dob: string | null
  relationship: string | null
  blood_group: string | null
  allergies: unknown
  conditions: unknown
  contacts: unknown
  assigned_email: string | null
  assigned_password: string | null
  parental_secret_code: string | null
  medi_tag_id: string | null
}

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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : []
}

function asContactsArray(value: unknown): EmergencyContact[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const contact = (item && typeof item === "object" ? item : {}) as Partial<EmergencyContact>
    return {
      id: String(contact.id ?? ""),
      name: String(contact.name ?? ""),
      relation: String(contact.relation ?? ""),
      phone: String(contact.phone ?? ""),
    }
  })
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
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Secure password hashing is unavailable in this environment. Use HTTPS or a modern browser.")
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

function mapDependentRow(row: DependentRow): DependentProfile {
  return {
    id: row.id,
    name: row.name ?? "",
    dob: row.dob ?? "",
    relationship: row.relationship ?? "",
    bloodGroup: row.blood_group ?? "",
    allergies: asStringArray(row.allergies),
    conditions: asStringArray(row.conditions),
    contacts: asContactsArray(row.contacts),
    assignedEmail: normalizeEmail(row.assigned_email ?? ""),
    assignedPassword: row.assigned_password ?? "",
    parentalSecretCode: row.parental_secret_code ?? "",
    mediTagId: row.medi_tag_id ?? "",
  }
}

function mapReportRow(row: ReportRow): MedicalReport {
  return {
    id: row.id,
    doctorName: row.doctor_name ?? "",
    specialization: row.specialization ?? "",
    clinic: row.clinic ?? "",
    date: row.date ?? "",
    time: row.time ?? "",
    licenseNumber: row.license_number ?? "",
    fileName: row.file_name ?? "",
    notes: row.notes ?? "",
    createdAt: Number(row.created_at ?? 0),
  }
}

async function fetchFullProfileByEmail(email: string): Promise<{ row: ProfileRow; profile: UserProfile } | null> {
  const key = normalizeEmail(email)
  if (!key) return null

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", key)
    .maybeSingle()

  if (profileError) throw new Error(profileError.message)
  if (!profileData) return null

  const row = profileData as ProfileRow

  const [{ data: reportsData, error: reportsError }, { data: dependentsData, error: dependentsError }] = await Promise.all([
    supabase
      .from("medical_reports")
      .select("*")
      .eq("owner_email", key)
      .order("created_at", { ascending: false }),
    supabase
      .from("dependents")
      .select("*")
      .eq("owner_email", key),
  ])

  if (reportsError) throw new Error(reportsError.message)
  if (dependentsError) throw new Error(dependentsError.message)

  const profile = normalizeUser({
    name: row.name ?? "",
    dob: row.dob ?? "",
    bloodGroup: row.blood_group ?? "",
    gender: row.gender ?? "",
    email: row.email,
    password: "",
    cardId: row.card_id ?? "",
    allergies: asStringArray(row.allergies),
    conditions: asStringArray(row.conditions),
    medications: asStringArray(row.medications),
    contacts: asContactsArray(row.contacts),
    reports: (reportsData ?? []).map((item) => mapReportRow(item as ReportRow)),
    dependents: (dependentsData ?? []).map((item) => mapDependentRow(item as DependentRow)),
  })

  return { row, profile }
}

async function syncDependentsToSupabase(ownerEmail: string, dependents: DependentProfile[]): Promise<void> {
  const key = normalizeEmail(ownerEmail)
  const { data: existingRows, error: fetchError } = await supabase
    .from("dependents")
    .select("id")
    .eq("owner_email", key)

  if (fetchError) throw new Error(fetchError.message)

  const keepIds = new Set(dependents.map((d) => d.id))
  const removeIds = (existingRows ?? [])
    .map((r) => String((r as { id: string }).id))
    .filter((id) => !keepIds.has(id))

  if (removeIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("dependents")
      .delete()
      .in("id", removeIds)
    if (deleteError) throw new Error(deleteError.message)
  }

  if (dependents.length > 0) {
    const payload = dependents.map((d) => ({
      id: d.id,
      owner_email: key,
      name: d.name,
      dob: d.dob,
      relationship: d.relationship,
      blood_group: d.bloodGroup,
      allergies: d.allergies,
      conditions: d.conditions,
      contacts: d.contacts,
      assigned_email: normalizeEmail(d.assignedEmail),
      assigned_password: d.assignedPassword,
      parental_secret_code: d.parentalSecretCode,
      medi_tag_id: d.mediTagId,
    }))

    const { error: upsertError } = await supabase
      .from("dependents")
      .upsert(payload, { onConflict: "id" })
    if (upsertError) throw new Error(upsertError.message)
  }
}

type AuthData = Omit<Pick<UserProfile, "name" | "dob" | "bloodGroup" | "gender" | "email" | "password" | "cardId">, "cardId"> & { cardId?: string }
type Practitioner = { doctorName: string; registrationNumber: string; institution: string }

export type StoreApi = {
  ready: boolean
  currentUser: UserProfile | null
  emergencyProfile: UserProfile | null
  register: (data: AuthData) => Promise<Result>
  signup: (data: AuthData) => Promise<Result>
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
  requestPasswordReset: (email: string) => Promise<Result>
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
    ;(async () => {
      try {
        const email = readSessionEmail()
        if (!email) {
          if (active) {
            setCurrentUser(null)
            setReady(true)
          }
          return
        }
        const loaded = await fetchFullProfileByEmail(email)
        if (active) {
          setCurrentUser(loaded ? loaded.profile : null)
          setReady(true)
        }
      } catch {
        if (active) {
          setCurrentUser(null)
          setReady(true)
        }
      }
    })()
    return () => { active = false }
  }, [])

  const register: StoreApi["register"] = useCallback(async (data) => {
    const email = normalizeEmail(data.email)
    const password = data.password
    if (!email || !password) return { ok: false, error: "Email and password are required." }
    if (password.length < 6) return { ok: false, error: "Choose a password with at least 6 characters." }

    try {
      const { data: existingEmail, error: emailLookupError } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", email)
        .maybeSingle()

      if (emailLookupError) return { ok: false, error: emailLookupError.message }
      if (existingEmail) return { ok: false, error: "An account with this email already exists." }

      const cardId = data.cardId?.trim() ?? ""
      if (cardId) {
        const normalizedTarget = normalizeCardId(cardId)
        const [{ data: allProfiles, error: pErr }, { data: allDependents, error: dErr }] = await Promise.all([
          supabase.from("profiles").select("card_id"),
          supabase.from("dependents").select("medi_tag_id"),
        ])
        if (pErr) return { ok: false, error: pErr.message }
        if (dErr) return { ok: false, error: dErr.message }

        const cardTaken =
          (allProfiles ?? []).some((p) => normalizeCardId(String((p as { card_id?: string }).card_id ?? "")) === normalizedTarget) ||
          (allDependents ?? []).some((d) => normalizeCardId(String((d as { medi_tag_id?: string }).medi_tag_id ?? "")) === normalizedTarget)

        if (cardTaken) return { ok: false, error: "This Card/Tag ID is already registered." }
      }

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

      const { error: insertError } = await supabase.from("profiles").insert({
        email,
        password_salt: credential.salt,
        password_hash: credential.hash,
        name: profile.name,
        dob: profile.dob,
        blood_group: profile.bloodGroup,
        gender: profile.gender,
        card_id: profile.cardId,
        allergies: [],
        conditions: [],
        medications: [],
        contacts: [],
        updated_at: Date.now(),
      })

      if (insertError) return { ok: false, error: insertError.message }
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

    try {
      const loaded = await fetchFullProfileByEmail(key)
      if (!loaded || !(await passwordMatches(password, { salt: loaded.row.password_salt, hash: loaded.row.password_hash }))) {
        return { ok: false, error: "Email or password is incorrect." }
      }
      if (!writeSession(key)) return { ok: false, error: "This browser could not save the sign-in session." }
      setCurrentUser(loaded.profile)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not sign in." }
    }
  }, [])

  const loginByCard: StoreApi["loginByCard"] = useCallback(async (cardId, password) => {
    const target = normalizeCardId(cardId)
    if (!target) return { ok: false, error: "Enter your Card/Tag ID." }

    try {
      const { data: rows, error } = await supabase.from("profiles").select("email, card_id")
      if (error) return { ok: false, error: error.message }

      const matchedRow = (rows ?? []).find(
        (r) => normalizeCardId(String((r as { card_id?: string }).card_id ?? "")) === target
      ) as { email: string } | undefined

      if (!matchedRow) return { ok: false, error: "Card/Tag ID or password is incorrect." }

      const loaded = await fetchFullProfileByEmail(matchedRow.email)
      if (!loaded || !(await passwordMatches(password, { salt: loaded.row.password_salt, hash: loaded.row.password_hash }))) {
        return { ok: false, error: "Card/Tag ID or password is incorrect." }
      }
      if (!writeSession(loaded.profile.email)) return { ok: false, error: "This browser could not save the sign-in session." }
      setCurrentUser(loaded.profile)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not sign in with Card/Tag ID." }
    }
  }, [])

  const getUserByCardId: StoreApi["getUserByCardId"] = useCallback(async (cardId) => {
    const target = normalizeCardId(cardId)
    if (!target) return null

    try {
      const { data: profilesData, error: pErr } = await supabase.from("profiles").select("email, card_id")
      if (pErr) return null

      const directMatch = (profilesData ?? []).find(
        (p) => normalizeCardId(String((p as { card_id?: string }).card_id ?? "")) === target
      ) as { email: string } | undefined

      if (directMatch) {
        const loaded = await fetchFullProfileByEmail(directMatch.email)
        return loaded ? loaded.profile : null
      }

      const { data: depsData, error: dErr } = await supabase.from("dependents").select("*")
      if (dErr) return null

      const depRow = (depsData ?? []).find(
        (d) => normalizeCardId(String((d as DependentRow).medi_tag_id ?? "")) === target
      ) as DependentRow | undefined

      if (!depRow) return null
      const parentLoaded = await fetchFullProfileByEmail(depRow.owner_email)
      if (!parentLoaded) return null
      return dependentAsUser(parentLoaded.profile, mapDependentRow(depRow))
    } catch {
      return null
    }
  }, [])

  const getUserByEmail: StoreApi["getUserByEmail"] = useCallback(async (email) => {
    const key = normalizeEmail(email)
    if (!key) return null

    try {
      const loaded = await fetchFullProfileByEmail(key)
      if (loaded) return loaded.profile

      const { data: depsData, error: dErr } = await supabase.from("dependents").select("*")
      if (dErr) return null

      const depRow = (depsData ?? []).find(
        (d) => normalizeEmail(String((d as DependentRow).assigned_email ?? "")) === key
      ) as DependentRow | undefined

      if (!depRow) return null
      const parentLoaded = await fetchFullProfileByEmail(depRow.owner_email)
      if (!parentLoaded) return null
      return dependentAsUser(parentLoaded.profile, mapDependentRow(depRow))
    } catch {
      return null
    }
  }, [])

  const findPatientByCardId: StoreApi["findPatientByCardId"] = useCallback(async (cardId) => {
    const target = normalizeCardId(cardId)
    if (!target) return null

    try {
      const { data: profilesData } = await supabase.from("profiles").select("card_id, name")
      const userMatch = (profilesData ?? []).find(
        (p) => normalizeCardId(String((p as { card_id?: string }).card_id ?? "")) === target
      ) as { card_id?: string; name?: string } | undefined

      if (userMatch) {
        return { kind: "user", cardId: userMatch.card_id ?? "", name: userMatch.name ?? "" }
      }

      const { data: depsData } = await supabase.from("dependents").select("medi_tag_id, name")
      const depMatch = (depsData ?? []).find(
        (d) => normalizeCardId(String((d as { medi_tag_id?: string }).medi_tag_id ?? "")) === target
      ) as { medi_tag_id?: string; name?: string } | undefined

      if (depMatch) {
        return { kind: "dependent", cardId: depMatch.medi_tag_id ?? "", name: depMatch.name ?? "" }
      }

      return null
    } catch {
      return null
    }
  }, [])

  const updateStoredProfile = useCallback(async (update: (profile: UserProfile) => UserProfile) => {
    const email = readSessionEmail()
    if (!email) throw new Error("Sign in to update your profile.")

    const loaded = await fetchFullProfileByEmail(email)
    if (!loaded) throw new Error("Your profile could not be found.")

    const updated = normalizeUser(update(loaded.profile))

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({
        name: updated.name,
        dob: updated.dob,
        blood_group: updated.bloodGroup,
        gender: updated.gender,
        card_id: updated.cardId,
        allergies: updated.allergies,
        conditions: updated.conditions,
        medications: updated.medications,
        contacts: updated.contacts,
        updated_at: Date.now(),
      })
      .eq("email", email)

    if (profileUpdateError) throw new Error(profileUpdateError.message)

    await syncDependentsToSupabase(email, updated.dependents)

    const refreshed = await fetchFullProfileByEmail(email)
    setCurrentUser(refreshed ? refreshed.profile : updated)
  }, [])

  const addReportToCard: StoreApi["addReportToCard"] = useCallback(async (cardId, report, practitioner) => {
    if (!practitioner) return { ok: false, error: "Practitioner identity is required." }
    const target = normalizeCardId(cardId)

    try {
      const { data: profilesData, error: pErr } = await supabase.from("profiles").select("email, card_id")
      if (pErr) return { ok: false, error: pErr.message }

      const matched = (profilesData ?? []).find(
        (p) => normalizeCardId(String((p as { card_id?: string }).card_id ?? "")) === target
      ) as { email: string } | undefined

      if (!matched) return { ok: false, error: "No registered account was found for this Card/Tag ID." }

      const ownerEmail = normalizeEmail(matched.email)
      const newReport: MedicalReport = { ...report, id: uid(), createdAt: Date.now() }

      const { error: insertError } = await supabase.from("medical_reports").insert({
        id: newReport.id,
        owner_email: ownerEmail,
        doctor_name: newReport.doctorName,
        specialization: newReport.specialization,
        clinic: newReport.clinic,
        date: newReport.date,
        time: newReport.time,
        license_number: newReport.licenseNumber,
        file_name: newReport.fileName,
        notes: newReport.notes,
        created_at: newReport.createdAt,
      })

      if (insertError) return { ok: false, error: insertError.message }

      if (readSessionEmail() === ownerEmail) {
        const refreshed = await fetchFullProfileByEmail(ownerEmail)
        if (refreshed) setCurrentUser(refreshed.profile)
      }

      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not save the report." }
    }
  }, [])

  const verifyCredentials: StoreApi["verifyCredentials"] = useCallback(async (email, password) => {
    const key = normalizeEmail(email)
    if (!key || !password) return { ok: false, error: "Enter the child's email and password." }

    try {
      const loaded = await fetchFullProfileByEmail(key)
      if (loaded && (await passwordMatches(password, { salt: loaded.row.password_salt, hash: loaded.row.password_hash }))) {
        return { ok: true }
      }

      const { data: depsData, error } = await supabase.from("dependents").select("assigned_email, assigned_password")
      if (error) return { ok: false, error: error.message }

      const matchedDep = (depsData ?? []).some((d) => {
        const row = d as { assigned_email?: string; assigned_password?: string }
        return normalizeEmail(row.assigned_email ?? "") === key && (row.assigned_password ?? "") === password
      })

      return matchedDep
        ? { ok: true }
        : { ok: false, error: "No account matches that email and password." }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not verify credentials." }
    }
  }, [])

  const requestPasswordReset: StoreApi["requestPasswordReset"] = useCallback(async (email) => {
    const key = normalizeEmail(email)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) {
      return { ok: false, error: "Enter a valid email address." }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(key, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) return { ok: false, error: "If an account exists for this email, recovery instructions will be sent." }
      return { ok: true }
    } catch {
      return { ok: false, error: "If an account exists for this email, recovery instructions will be sent." }
    }
  }, [])

  const getDependentByEmail: StoreApi["getDependentByEmail"] = useCallback(async (email) => {
    const key = normalizeEmail(email)
    if (!key) return null

    try {
      const { data: depsData, error } = await supabase.from("dependents").select("*")
      if (error) return null

      const depRow = (depsData ?? []).find(
        (d) => normalizeEmail(String((d as DependentRow).assigned_email ?? "")) === key
      ) as DependentRow | undefined

      return depRow ? mapDependentRow(depRow) : null
    } catch {
      return null
    }
  }, [])

  const logout: StoreApi["logout"] = useCallback(async () => {
    removeSession()
    setCurrentUser(null)
  }, [])

  const resetAll: StoreApi["resetAll"] = useCallback(() => {
    removeSession()
    setCurrentUser(null)
    setReady(true)
  }, [])

  const addReport: StoreApi["addReport"] = useCallback(async (report) => {
    const email = readSessionEmail()
    if (!email) throw new Error("Sign in to add a report.")

    const newReport: MedicalReport = { ...report, id: uid(), createdAt: Date.now() }
    const { error } = await supabase.from("medical_reports").insert({
      id: newReport.id,
      owner_email: email,
      doctor_name: newReport.doctorName,
      specialization: newReport.specialization,
      clinic: newReport.clinic,
      date: newReport.date,
      time: newReport.time,
      license_number: newReport.licenseNumber,
      file_name: newReport.fileName,
      notes: newReport.notes,
      created_at: newReport.createdAt,
    })

    if (error) throw new Error(error.message)

    const refreshed = await fetchFullProfileByEmail(email)
    if (refreshed) setCurrentUser(refreshed.profile)
  }, [])

  const updateProfile: StoreApi["updateProfile"] = useCallback(async (partial) => {
    await updateStoredProfile((profile) => ({ ...profile, ...partial, email: profile.email, password: "" }))
  }, [updateStoredProfile])

  const addDependent: StoreApi["addDependent"] = useCallback(async (data) => {
    await updateStoredProfile((profile) => ({
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
    await updateStoredProfile((profile) => ({
      ...profile,
      dependents: profile.dependents.map((dependent) => dependent.id === id
        ? { ...dependent, ...partial, id, assignedEmail: normalizeEmail(partial.assignedEmail ?? dependent.assignedEmail) }
        : dependent),
    }))
  }, [updateStoredProfile])

  const removeDependent: StoreApi["removeDependent"] = useCallback(async (id) => {
    await updateStoredProfile((profile) => ({
      ...profile,
      dependents: profile.dependents.filter((dependent) => dependent.id !== id),
    }))
  }, [updateStoredProfile])

  return {
    ready,
    currentUser,
    emergencyProfile: currentUser,
    register,
    signup: register,
    login,
    loginByCard,
    getUserByCardId,
    getUserByEmail,
    findPatientByCardId,
    addReportToCard,
    verifyCredentials,
    requestPasswordReset,
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

export const PILOT_CLINICS = [
  "Der-med Clinic",
  "Apollo Hospitals",
  "Seawoods Hospital",
  "Terna Speciality Hospital",
  "D Y Patil Hospital",
  "Fortis Hiranandani Hospital",
  "MGM Hospital",
] as const

export function isPilotClinic(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase().replace(/\s+/g, " ")
  return PILOT_CLINICS.some((clinic) => clinic.toLocaleLowerCase() === normalized)
}

export function recognizeOfficialMmcKydQr(value: string): { official: boolean; url?: string; registrationNumber?: string } {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== "https:" || !["kyd.co.in", "www.kyd.co.in"].includes(url.hostname.toLowerCase())) {
      return { official: false }
    }
    const registrationNumber = ["registrationNumber", "registration_no", "regNo", "mmcRegNo", "registration"]
      .map((key) => url.searchParams.get(key))
      .find((candidate): candidate is string => Boolean(candidate?.trim()))
    return { official: true, url: url.toString(), registrationNumber }
  } catch {
    return { official: false }
  }
}

/** Pilot fallback check only; it does not replace live MMC/KYD credential verification. */
export function validateMedicalLicense(input: { doctorName: string; registrationNumber: string; institution: string }): { ok: boolean; error?: string } {
  const denied = { ok: false, error: "Approval denied: check the practitioner details and pilot clinic." }
  const name = input.doctorName.trim()
  const reg = input.registrationNumber.trim()
  if (!name || name.replace(/[^A-Za-z]/g, "").length < 3) return denied
  if (!/^[A-Za-z0-9]{1,8}[-/ ]?\d{4,}$/.test(reg)) return denied
  if (!isPilotClinic(input.institution)) {
    return { ok: false, error: "This clinic is not on the Navi Mumbai / Seawoods pilot allowlist." }
  }
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
