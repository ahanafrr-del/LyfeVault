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
  filePath?: string
  fileUrl?: string
  uploadedByRole?: "patient" | "practitioner"
  doctorMmcId?: string
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
  medications: string[]
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

type Result = { ok: boolean; error?: string; message?: string; pendingConfirmation?: boolean }

type ProfileRow = {
  auth_user_id: string | null
  email: string
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
  file_path?: string | null
  uploaded_by_role?: "patient" | "practitioner" | null
  doctor_mmc_id?: string | null
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
  medications?: unknown
  contacts: unknown
  assigned_email: string | null
  medi_tag_id: string | null
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
      medications: dependent.medications ?? [],
      contacts: dependent.contacts ?? [],
    })),
  }
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
    medications: dependent.medications,
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
    medications: asStringArray(row.medications),
    contacts: asContactsArray(row.contacts),
    assignedEmail: normalizeEmail(row.assigned_email ?? ""),
  assignedPassword: "",
  parentalSecretCode: "",
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
    filePath: row.file_path ?? undefined,
    uploadedByRole: row.uploaded_by_role ?? "patient",
    doctorMmcId: row.doctor_mmc_id ?? undefined,
  }
}

async function fetchFullProfileByEmail(email: string, authUserId?: string): Promise<{ row: ProfileRow; profile: UserProfile } | null> {
  const key = normalizeEmail(email)
  if (!key && !authUserId) return null

  const profileQuery = supabase.from("profiles").select("auth_user_id,email,name,dob,blood_group,gender,card_id,allergies,conditions,medications,contacts,updated_at")
  const { data: profileData, error: profileError } = authUserId
    ? await profileQuery.eq("auth_user_id", authUserId).maybeSingle()
    : await profileQuery.eq("email", key).maybeSingle()

  if (profileError) throw new Error(profileError.message)
  if (!profileData && authUserId && key) {
    return fetchFullProfileByEmail(key)
  }
  if (!profileData) return null

  const row = profileData as ProfileRow

  const [{ data: reportsData, error: reportsError }, { data: dependentsData, error: dependentsError }] = await Promise.all([
    supabase
      .from("medical_reports")
      .select("id,owner_email,doctor_name,specialization,clinic,date,time,license_number,file_name,notes,created_at,file_path,uploaded_by_role,doctor_mmc_id,dependent_id")
      .eq("owner_email", key)
      .order("created_at", { ascending: false }),
    supabase
      .from("dependents")
      .select("id,owner_email,name,dob,relationship,blood_group,allergies,conditions,medications,contacts,assigned_email,medi_tag_id")
      .eq("owner_email", key),
  ])

  if (reportsError) throw new Error(reportsError.message)
  if (dependentsError) throw new Error(dependentsError.message)

  const mappedReports = (reportsData ?? []).map((item) => mapReportRow(item as ReportRow))
  const signedReports = await Promise.all(mappedReports.map(async (report) => {
    if (!report.filePath) return report
    const { data } = await supabase.storage.from("medical-reports").createSignedUrl(report.filePath, 300)
    return { ...report, fileUrl: data?.signedUrl }
  }))

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
    reports: signedReports,
    dependents: (dependentsData ?? []).map((item) => mapDependentRow(item as DependentRow)),
  })

  return { row, profile }
}

async function loadOrCreateAuthenticatedProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<UserProfile | null> {
  const email = normalizeEmail(user.email ?? "")
  if (!email) return null

  const { data: linkedRow, error: linkedError } = await supabase
    .from("dependents")
    .select("id,owner_email,name,dob,relationship,blood_group,allergies,conditions,medications,contacts,assigned_email,medi_tag_id")
    .eq("assigned_email", email)
    .maybeSingle()
  if (linkedError) throw new Error(linkedError.message)
  if (linkedRow) {
    const dependent = mapDependentRow(linkedRow as DependentRow)
    const { data: linkedReports, error: linkedReportsError } = await supabase
      .from("medical_reports")
      .select("id,owner_email,doctor_name,specialization,clinic,date,time,license_number,file_name,notes,created_at,file_path,uploaded_by_role,doctor_mmc_id,dependent_id")
      .eq("dependent_id", dependent.id)
      .order("created_at", { ascending: false })
    if (linkedReportsError) throw new Error(linkedReportsError.message)
    const reports = await Promise.all((linkedReports ?? []).map(async (item) => {
      const report = mapReportRow(item as ReportRow)
      if (!report.filePath) return report
      const { data } = await supabase.storage.from("medical-reports").createSignedUrl(report.filePath, 300)
      return { ...report, fileUrl: data?.signedUrl }
    }))
    return { ...dependentAsUser({ email } as UserProfile, dependent), reports }
  }

  const existing = await fetchFullProfileByEmail(email, user.id)
  if (existing) return existing.profile

  return null
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
    for (const dependent of dependents) {
      const { error: updateError } = await supabase
        .from("dependents")
        .update({
          name: dependent.name,
          dob: dependent.dob,
          relationship: dependent.relationship,
          blood_group: dependent.bloodGroup,
          allergies: dependent.allergies,
          conditions: dependent.conditions,
          medications: dependent.medications,
          contacts: dependent.contacts,
          medi_tag_id: dependent.mediTagId,
        })
        .eq("id", dependent.id)
        .eq("owner_email", key)
      if (updateError) throw new Error(updateError.message)
    }
  }
}

type AuthData = { name: string; email: string; password: string; dob?: string; bloodGroup?: string; gender?: string }
export type StoreApi = {
  ready: boolean
  currentUser: UserProfile | null
  emergencyProfile: UserProfile | null
  register: (data: AuthData) => Promise<Result>
  signup: (data: AuthData) => Promise<Result>
  login: (email: string, password: string) => Promise<Result>
  loginByCard: (cardId: string, password: string) => Promise<Result>
  loginWithPasskey: () => Promise<Result>
  registerPasskey: () => Promise<Result>
  /** Looks up a registered user or dependent by physical Card/Tag ID. */
  getUserByCardId: (cardId: string) => Promise<UserProfile | null>
  requestPasswordReset: (email: string) => Promise<Result>
  getDependentByEmail: (email: string) => Promise<DependentProfile | null>
  logout: () => Promise<void>
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
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          if (active) {
            setCurrentUser(null)
            setReady(true)
          }
          return
        }
        const profile = await loadOrCreateAuthenticatedProfile(user)
        if (active) {
          setCurrentUser(profile)
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

    const profile = normalizeUser({
      ...data,
      email,
      password: "",
      cardId: "",
      allergies: [],
      conditions: [],
      medications: [],
      contacts: [],
      reports: [],
      dependents: [],
    })

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
          data: {
            name: profile.name,
            dob: profile.dob,
            blood_group: profile.bloodGroup,
            gender: profile.gender,
            health_data_consent: true,
            consent_version: "2026-11-25",
          },
        },
      })

      if (error) {
        const message = error.message.toLowerCase()
        if (message.includes("already registered") || message.includes("already been registered")) {
          return { ok: false, error: "Unable to create the account with these details. Try signing in instead." }
        }
        return { ok: false, error: error.message }
      }
      if (!authData.user) return { ok: false, error: "Account creation could not be completed. Try again." }

      if (!authData.session) {
        return {
          ok: true,
          pendingConfirmation: true,
          message: "Account created. Confirm your email using the link we sent, then sign in to finish setting up your profile.",
        }
      }

      const savedProfile = await loadOrCreateAuthenticatedProfile(authData.user)
      if (!savedProfile) return { ok: false, error: "Your account was created, but its profile could not be loaded." }
      setCurrentUser(savedProfile)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not create the account." }
    }
  }, [])

  const login: StoreApi["login"] = useCallback(async (email, password) => {
    const key = normalizeEmail(email)
    if (!key || !password) return { ok: false, error: "Email and password are required." }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: key, password })
      if (error) {
        const message = error.message.toLowerCase()
        if (message.includes("email not confirmed")) {
          return { ok: false, error: "Confirm your email using the link we sent before signing in." }
        }
        return { ok: false, error: "Email or password is incorrect." }
      }
      if (!data.user) return { ok: false, error: "Email or password is incorrect." }

      const profile = await loadOrCreateAuthenticatedProfile(data.user)
      if (!profile) {
        await supabase.auth.signOut()
        return { ok: false, error: "Your account profile could not be loaded. Contact support." }
      }
      setCurrentUser(profile)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Could not sign in." }
    }
  }, [])

  const loginByCard: StoreApi["loginByCard"] = useCallback(async (cardId, password) => {
    const target = cardId.trim()
    if (!target) return { ok: false, error: "Enter your Card/Tag ID." }
    if (!password) return { ok: false, error: "Enter your password." }

    if (!/^LV-(1000|1[0-9]{3}|2[0-9]{3}|3000)$/i.test(target)) {
      return { ok: false, error: "Enter a Card ID from LV-1000 to LV-3000." }
    }

    try {
      const response = await fetch("/api/auth/card-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: target.toUpperCase(), password }),
      })
      const result = await response.json() as { error?: string; session?: { access_token: string; refresh_token: string } }
      if (!response.ok || !result.session) {
        return { ok: false, error: result.error ?? "Card ID or password is incorrect." }
      }
      const { data, error } = await supabase.auth.setSession(result.session)
      if (error || !data.user) return { ok: false, error: "Card ID or password is incorrect." }
      const profile = await loadOrCreateAuthenticatedProfile(data.user)
      if (!profile) {
        await supabase.auth.signOut()
        return { ok: false, error: "Your account profile could not be loaded. Contact support." }
      }
      setCurrentUser(profile)
      return { ok: true }
    } catch {
      return { ok: false, error: "Card/Tag ID or password is incorrect." }
    }
  }, [])

  const loginWithPasskey: StoreApi["loginWithPasskey"] = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPasskey()
      if (error || !data.user) {
        return { ok: false, error: error?.message ?? "Passkey sign-in could not be completed." }
      }
      const profile = await loadOrCreateAuthenticatedProfile(data.user)
      if (!profile) {
        await supabase.auth.signOut()
        return { ok: false, error: "Your account profile could not be loaded. Contact support." }
      }
      setCurrentUser(profile)
      return { ok: true }
    } catch {
      return { ok: false, error: "Passkey sign-in is unavailable. Enable Passkeys in Supabase Auth settings and try again." }
    }
  }, [])

  const registerPasskey: StoreApi["registerPasskey"] = useCallback(async () => {
    try {
      const { error } = await supabase.auth.registerPasskey()
      if (error) return { ok: false, error: error.message }
      return { ok: true, message: "Passkey added to this account." }
    } catch {
      return { ok: false, error: "Passkey setup is unavailable. Enable Passkeys in Supabase Auth settings and try again." }
    }
  }, [])

  const getUserByCardId: StoreApi["getUserByCardId"] = useCallback(async (cardId) => {
    const target = normalizeCardId(cardId)
    if (!target) return null
    try {
      const { data, error } = await supabase.rpc("emergency_lookup_card", { p_card_id: target })
      if (error || !data || typeof data !== "object") return null
      const record = data as Record<string, unknown>
      return normalizeUser({
        name: String(record.name ?? ""),
        dob: String(record.dob ?? ""),
        bloodGroup: String(record.blood_group ?? ""),
        gender: String(record.gender ?? ""),
        email: "",
        password: "",
        cardId: String(record.card_id ?? ""),
        allergies: asStringArray(record.allergies),
        conditions: asStringArray(record.conditions),
        medications: asStringArray(record.medications),
        contacts: asContactsArray(record.contacts),
        reports: [],
        dependents: [],
      })
    } catch {
      return null
    }
  }, [])

  const updateStoredProfile = useCallback(async (update: (profile: UserProfile) => UserProfile) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const email = normalizeEmail(user?.email ?? "")
    if (authError || !email) throw new Error("Sign in to update your profile.")

    const { data: linkedRow, error: linkedError } = await supabase.from("dependents").select("id,owner_email,name,dob,relationship,blood_group,allergies,conditions,medications,contacts,assigned_email,medi_tag_id").eq("assigned_email", email).maybeSingle()
    if (linkedError) throw new Error(linkedError.message)
    if (linkedRow) {
      const linkedProfile = dependentAsUser({ email } as UserProfile, mapDependentRow(linkedRow as DependentRow))
      const updatedDependent = normalizeUser(update(linkedProfile))
      const { error } = await supabase.rpc("update_linked_dependent_profile", {
        p_data: {
          blood_group: updatedDependent.bloodGroup,
          allergies: updatedDependent.allergies,
          conditions: updatedDependent.conditions,
          medications: updatedDependent.medications,
          contacts: updatedDependent.contacts,
        },
      })
      if (error) throw new Error(error.message)
      setCurrentUser(updatedDependent)
      return
    }

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
      const { data: depRow, error } = await supabase
        .from("dependents")
        .select("id,owner_email,name,dob,relationship,blood_group,allergies,conditions,medications,contacts,assigned_email,medi_tag_id")
        .eq("assigned_email", key)
        .maybeSingle()
      if (error || !depRow) return null
      return mapDependentRow(depRow as DependentRow)
    } catch {
      return null
    }
  }, [])

  const logout: StoreApi["logout"] = useCallback(async () => {
    await supabase.auth.signOut({ scope: "global" })
    setCurrentUser(null)
  }, [])
  const addReport: StoreApi["addReport"] = useCallback(async (report) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const email = normalizeEmail(user?.email ?? "")
    if (authError || !email) throw new Error("Sign in to add a report.")

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
      file_path: newReport.filePath ?? null,
      uploaded_by_role: "patient",
      created_at: newReport.createdAt,
    })

    if (error) throw new Error(error.message)

    const refreshed = await fetchFullProfileByEmail(email)
    if (refreshed) setCurrentUser(refreshed.profile)
  }, [])

  const updateProfile: StoreApi["updateProfile"] = useCallback(async (partial) => {
    await updateStoredProfile((profile) => ({ ...profile, ...partial, email: profile.email, password: "" }))
  }, [updateStoredProfile])

  const addDependent: StoreApi["addDependent"] = useCallback(async () => {
    throw new Error("Dependents must complete the Gmail verification flow before they can be linked.")
  }, [])

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
    loginWithPasskey,
    registerPasskey,
    getUserByCardId,
    requestPasswordReset,
  getDependentByEmail,
  logout,
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

/** Client-side strength check for the parental secret code: 5-12 chars, 1 uppercase, 1 number, 1 special. */
export function validateParentalCode(code: string): { ok: boolean; error?: string } {
  if (code.length < 5 || code.length > 12) return { ok: false, error: "Code must be 5 to 12 characters long." }
  if (!/[A-Z]/.test(code)) return { ok: false, error: "Add at least one uppercase letter." }
  if (!/[0-9]/.test(code)) return { ok: false, error: "Add at least one number." }
  if (!/[^A-Za-z0-9]/.test(code)) return { ok: false, error: "Add at least one special character (e.g. @, #, $)." }
  return { ok: true }
}

export const PILOT_CLINIC_REGISTRATIONS = {
  "Der-med Clinic": "2024/06/18402",
  "Apollo Hospitals": "2023/11/54910",
  "Seawoods Hospital": "2024/02/31208",
  "Terna Speciality Hospital": "2023/09/67421",
  "D Y Patil Hospital": "2024/04/89105",
  "Fortis Hiranandani Hospital": "2023/07/42019",
  "MGM Hospital": "2024/01/73564",
} as const

export const PILOT_CLINICS = Object.keys(PILOT_CLINIC_REGISTRATIONS) as (keyof typeof PILOT_CLINIC_REGISTRATIONS)[]

export function getPilotRegistrationId(value: string): string | null {
  const normalized = value.trim().toLocaleLowerCase().replace(/\s+/g, " ")
  const clinic = PILOT_CLINICS.find((name) => name.toLocaleLowerCase() === normalized)
  return clinic ? PILOT_CLINIC_REGISTRATIONS[clinic] : null
}

export function isPilotClinic(value: string): boolean {
  return getPilotRegistrationId(value) !== null
}

export function recognizeOfficialMmcKydQr(value: string): { official: boolean; url?: string; registrationNumber?: string } {
  try {
    const url = new URL(value.trim())
    const hostname = url.hostname.toLowerCase()
    const isOfficialHost = hostname === "kyd.co.in" || hostname.endsWith(".kyd.co.in") || hostname === "maharashtramedicalcouncil.org.in" || hostname.endsWith(".maharashtramedicalcouncil.org.in")
    if (url.protocol !== "https:" || !isOfficialHost) {
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
  if (!isPilotClinic(input.institution)) {
    return { ok: false, error: "This clinic is not on the Navi Mumbai / Seawoods pilot allowlist." }
  }
  const pilotClinic = PILOT_CLINICS.find((clinic) => clinic.toLocaleLowerCase() === input.institution.trim().replace(/\s+/g, " ").toLocaleLowerCase())
  if (!pilotClinic || reg !== PILOT_CLINIC_REGISTRATIONS[pilotClinic]) {
    return { ok: false, error: "The registration ID does not match this clinic's pilot allowlist record." }
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
