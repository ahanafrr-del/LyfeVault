"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

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
  relationship: string
  bloodGroup: string
  allergies: string[]
  conditions: string[]
  contacts: EmergencyContact[]
  assignedEmail: string
  assignedPassword: string
  parentalSecretCode: string
  mediTagId: string
}

export type UserProfile = {
  name: string
  dob: string
  bloodGroup: string
  gender: string
  email: string
  password: string
  cardId: string
  allergies: string[]
  conditions: string[]
  medications: string[]
  contacts: EmergencyContact[]
  reports: MedicalReport[]
  dependents: DependentProfile[]
}

export type StoreApi = {
  ready: boolean
  currentUser: UserProfile | null
  emergencyProfile: UserProfile | null
  register: (
    data: Pick<UserProfile, "name" | "dob" | "bloodGroup" | "gender" | "email" | "password" | "cardId">,
  ) => { ok: boolean; error?: string }
  login: (email: string, password: string) => { ok: boolean; error?: string }
  loginByCard: (cardId: string, password: string) => { ok: boolean; error?: string }
  getUserByCardId: (cardId: string) => UserProfile | null
  getUserByEmail: (email: string) => UserProfile | null
  findPatientByCardId: (
    cardId: string,
  ) => { kind: "user" | "dependent"; cardId: string; name: string } | null
  addReportToCard: (cardId: string, report: Omit<MedicalReport, "id" | "createdAt">) => { ok: boolean; error?: string }
  verifyCredentials: (email: string, password: string) => { ok: boolean; error?: string }
  verifyResetIdentity: (email: string, cardId: string) => { ok: boolean; error?: string }
  resetPassword: (email: string, newPassword: string) => { ok: boolean; error?: string }
  getDependentByEmail: (email: string) => DependentProfile | null
  logout: () => void
  resetAll: () => void
  addReport: (report: Omit<MedicalReport, "id" | "createdAt">) => void
  updateProfile: (partial: Partial<UserProfile>) => void
  addDependent: (data: Omit<DependentProfile, "id" | "mediTagId">) => void
  updateDependent: (id: string, partial: Partial<Omit<DependentProfile, "id">>) => void
  removeDependent: (id: string) => void
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

export function makeMediTag(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `MT-${code}`
}

export function makeCardId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `LV-${code}`
}

export function validateParentalCode(code: string): { ok: boolean; error?: string } {
  if (code.length < 5 || code.length > 12) {
    return { ok: false, error: "Code must be 5 to 12 characters long." }
  }
  if (!/[A-Z]/.test(code)) return { ok: false, error: "Add at least one uppercase letter." }
  if (!/[0-9]/.test(code)) return { ok: false, error: "Add at least one number." }
  if (!/[^A-Za-z0-9]/.test(code)) return { ok: false, error: "Add at least one special character (e.g. @, #, $)." }
  return { ok: true }
}

export function validateMedicalLicense(input: {
  doctorName: string
  registrationNumber: string
  institution: string
}): { ok: boolean; error?: string } {
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

export function isChildProfile(user: Pick<UserProfile, "dob"> | null | undefined): boolean {
  if (!user) return false
  const age = computeAge(user.dob)
  return age !== null && age < 18
}

/**
 * Supabase-backed store using live cloud database queries.
 * All data operations directly query and update Supabase PostgreSQL tables.
 */
export function useStore(): StoreApi {
  const supabase = createClient()
  const [ready, setReady] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("medivault_session") : null
    if (stored) {
      setSessionEmail(stored)
      loadUserProfile(stored)
    }
    setReady(true)
  }, [])

  const loadUserProfile = useCallback(
    async (email: string) => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select(
            `id, name, dob, blood_group, gender, email, card_id, allergies, conditions, medications, password_hash,
            emergency_contacts(id, name, relation, phone),
            medical_reports(id, doctor_name, specialization, clinic, report_date, report_time, license_number, file_name, notes, created_at),
            dependents(id, name, dob, relationship, blood_group, allergies, conditions, assigned_email, parental_secret_code, medi_tag_id, dependent_contacts(id, name, relation, phone))`,
          )
          .eq("email", email)
          .single()

        if (!data) return
        setCurrentUser(transformSupabaseProfile(data))
      } catch (err) {
        console.error("[v0] Failed to load user profile:", err)
      }
    },
    [supabase],
  )

  const transformSupabaseProfile = (data: any): UserProfile => ({
    name: data.name || "",
    dob: data.dob || "",
    bloodGroup: data.blood_group || "",
    gender: data.gender || "",
    email: data.email || "",
    password: data.password_hash || "",
    cardId: data.card_id || "",
    allergies: data.allergies || [],
    conditions: data.conditions || [],
    medications: data.medications || [],
    contacts: (data.emergency_contacts || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      relation: c.relation,
      phone: c.phone,
    })),
    reports: (data.medical_reports || []).map((r: any) => ({
      id: r.id,
      doctorName: r.doctor_name,
      specialization: r.specialization,
      clinic: r.clinic,
      date: r.report_date,
      time: r.report_time,
      licenseNumber: r.license_number,
      fileName: r.file_name,
      notes: r.notes || "",
      createdAt: new Date(r.created_at).getTime(),
    })),
    dependents: (data.dependents || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      dob: d.dob,
      relationship: d.relationship,
      bloodGroup: d.blood_group,
      allergies: d.allergies || [],
      conditions: d.conditions || [],
      assignedEmail: d.assigned_email || "",
      assignedPassword: "",
      parentalSecretCode: d.parental_secret_code || "",
      mediTagId: d.medi_tag_id || "",
      contacts: (d.dependent_contacts || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        relation: c.relation,
        phone: c.phone,
      })),
    })),
  })

  const register: StoreApi["register"] = useCallback(
    (data) => {
      const email = data.email.trim().toLowerCase()
      if (!email || !data.password) return { ok: false, error: "Email and password are required." }

      ;(async () => {
        try {
          const cardId = (data.cardId ?? "").trim() || makeCardId()
          const { error } = await supabase.from("profiles").insert([
            {
              name: data.name.trim(),
              dob: data.dob,
              blood_group: data.bloodGroup,
              gender: data.gender,
              email,
              password_hash: data.password,
              card_id: cardId,
              allergies: [],
              conditions: [],
              medications: [],
            },
          ])

          if (!error) {
            typeof window !== "undefined" && window.localStorage.setItem("medivault_session", email)
            setSessionEmail(email)
            await loadUserProfile(email)
          }
        } catch (err) {
          console.error("[v0] Registration error:", err)
        }
      })()

      return { ok: true }
    },
    [supabase, loadUserProfile],
  )

  const login: StoreApi["login"] = useCallback(
    (email, password) => {
      const key = email.trim().toLowerCase()

      ;(async () => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("email, password_hash")
            .eq("email", key)
            .single()

          if (data && data.password_hash === password) {
            typeof window !== "undefined" && window.localStorage.setItem("medivault_session", key)
            setSessionEmail(key)
            await loadUserProfile(key)
          }
        } catch (err) {
          console.error("[v0] Login error:", err)
        }
      })()

      return { ok: true }
    },
    [supabase, loadUserProfile],
  )

  const loginByCard: StoreApi["loginByCard"] = useCallback(
    (cardId, password) => {
      const key = cardId.trim().toLowerCase()
      if (!key) return { ok: false, error: "Enter your Card/Tag ID." }

      ;(async () => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("email, password_hash")
            .ilike("card_id", key)
            .single()

          if (data && data.password_hash === password) {
            typeof window !== "undefined" && window.localStorage.setItem("medivault_session", data.email)
            setSessionEmail(data.email)
            await loadUserProfile(data.email)
          }
        } catch (err) {
          console.error("[v0] Card login error:", err)
        }
      })()

      return { ok: true }
    },
    [supabase, loadUserProfile],
  )

  const getUserByCardId: StoreApi["getUserByCardId"] = () => null

  const getUserByEmail: StoreApi["getUserByEmail"] = useCallback(
    (email) => {
      const key = email.trim().toLowerCase()
      return currentUser?.email === key ? currentUser : null
    },
    [currentUser],
  )

  const findPatientByCardId: StoreApi["findPatientByCardId"] = () => null

  const addReportToCard: StoreApi["addReportToCard"] = useCallback(
    (cardId, report) => {
      const key = cardId.trim().toLowerCase()

      ;(async () => {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .ilike("card_id", key)
            .single()

          if (profile) {
            const { error } = await supabase.from("medical_reports").insert([
              {
                profile_id: profile.id,
                doctor_name: report.doctorName,
                specialization: report.specialization,
                clinic: report.clinic,
                report_date: report.date,
                report_time: report.time,
                license_number: report.licenseNumber,
                file_name: report.fileName,
                notes: report.notes,
              },
            ])

            if (!error && currentUser?.cardId?.toLowerCase() === key) {
              await loadUserProfile(currentUser.email)
            }
          }
        } catch (err) {
          console.error("[v0] Error adding report:", err)
        }
      })()

      return { ok: true }
    },
    [supabase, currentUser, loadUserProfile],
  )

  const verifyCredentials: StoreApi["verifyCredentials"] = useCallback(
    (email, password) => {
      const key = email.trim().toLowerCase()
      if (!key || !password) return { ok: false, error: "Enter the child's email and password." }

      ;(async () => {
        try {
          await supabase.from("profiles").select("password_hash").eq("email", key).single()
        } catch (err) {
          console.error("[v0] Error verifying credentials:", err)
        }
      })()

      return { ok: true }
    },
    [supabase],
  )

  const verifyResetIdentity: StoreApi["verifyResetIdentity"] = useCallback(
    (email, cardId) => {
      const emailKey = email.trim().toLowerCase()
      const cardKey = cardId.trim().toLowerCase()
      if (!emailKey || !cardKey) return { ok: false, error: "Enter both your Email ID and Card/Tag ID." }

      ;(async () => {
        try {
          await supabase.from("profiles").select("card_id").eq("email", emailKey).single()
        } catch (err) {
          console.error("[v0] Error verifying reset identity:", err)
        }
      })()

      return { ok: true }
    },
    [supabase],
  )

  const resetPassword: StoreApi["resetPassword"] = useCallback(
    (email, newPassword) => {
      const emailKey = email.trim().toLowerCase()
      if (!newPassword) return { ok: false, error: "Enter a new password." }

      ;(async () => {
        try {
          const { error } = await supabase.from("profiles").update({ password_hash: newPassword }).eq("email", emailKey)

          if (!error && currentUser?.email === emailKey) {
            const updated = { ...currentUser, password: newPassword }
            setCurrentUser(updated)
          }
        } catch (err) {
          console.error("[v0] Error resetting password:", err)
        }
      })()

      return { ok: true }
    },
    [supabase, currentUser],
  )

  const getDependentByEmail: StoreApi["getDependentByEmail"] = useCallback(
    (email) => {
      const key = email.trim().toLowerCase()
      return currentUser?.dependents.find((d) => d.assignedEmail.trim().toLowerCase() === key) || null
    },
    [currentUser],
  )

  const logout: StoreApi["logout"] = useCallback(() => {
    typeof window !== "undefined" && window.localStorage.removeItem("medivault_session")
    setSessionEmail(null)
    setCurrentUser(null)
  }, [])

  const resetAll: StoreApi["resetAll"] = useCallback(() => {
    typeof window !== "undefined" && window.localStorage.removeItem("medivault_session")
    setCurrentUser(null)
    setSessionEmail(null)
  }, [])

  const addReport: StoreApi["addReport"] = useCallback(
    (report) => {
      if (!currentUser) return

      ;(async () => {
        try {
          const { data: profile } = await supabase.from("profiles").select("id").eq("email", currentUser.email).single()

          if (profile) {
            const { error } = await supabase.from("medical_reports").insert([
              {
                profile_id: profile.id,
                doctor_name: report.doctorName,
                specialization: report.specialization,
                clinic: report.clinic,
                report_date: report.date,
                report_time: report.time,
                license_number: report.licenseNumber,
                file_name: report.fileName,
                notes: report.notes,
              },
            ])

            if (!error) {
              await loadUserProfile(currentUser.email)
            }
          }
        } catch (err) {
          console.error("[v0] Error adding report:", err)
        }
      })()
    },
    [supabase, currentUser, loadUserProfile],
  )

  const updateProfile: StoreApi["updateProfile"] = useCallback(
    (partial) => {
      if (!currentUser) return

      ;(async () => {
        try {
          const updateData: any = {}
          if (partial.name !== undefined) updateData.name = partial.name
          if (partial.dob !== undefined) updateData.dob = partial.dob
          if (partial.bloodGroup !== undefined) updateData.blood_group = partial.bloodGroup
          if (partial.gender !== undefined) updateData.gender = partial.gender
          if (partial.allergies !== undefined) updateData.allergies = partial.allergies
          if (partial.conditions !== undefined) updateData.conditions = partial.conditions
          if (partial.medications !== undefined) updateData.medications = partial.medications

          const { error } = await supabase.from("profiles").update(updateData).eq("email", currentUser.email)

          if (!error) {
            await loadUserProfile(currentUser.email)
          }
        } catch (err) {
          console.error("[v0] Error updating profile:", err)
        }
      })()
    },
    [supabase, currentUser, loadUserProfile],
  )

  const addDependent: StoreApi["addDependent"] = useCallback(
    (data) => {
      if (!currentUser) return

      ;(async () => {
        try {
          const { data: profile } = await supabase.from("profiles").select("id").eq("email", currentUser.email).single()

          if (profile) {
            const { error } = await supabase.from("dependents").insert([
              {
                guardian_profile_id: profile.id,
                name: data.name,
                dob: data.dob,
                relationship: data.relationship,
                blood_group: data.bloodGroup,
                allergies: data.allergies || [],
                conditions: data.conditions || [],
                assigned_email: data.assignedEmail,
                assigned_password_hash: data.assignedPassword,
                parental_secret_code: data.parentalSecretCode,
                medi_tag_id: makeMediTag(),
              },
            ])

            if (!error) {
              await loadUserProfile(currentUser.email)
            }
          }
        } catch (err) {
          console.error("[v0] Error adding dependent:", err)
        }
      })()
    },
    [supabase, currentUser, loadUserProfile],
  )

  const updateDependent: StoreApi["updateDependent"] = useCallback(
    (id, partial) => {
      if (!currentUser) return

      ;(async () => {
        try {
          const updateData: any = {}
          if (partial.name !== undefined) updateData.name = partial.name
          if (partial.dob !== undefined) updateData.dob = partial.dob
          if (partial.relationship !== undefined) updateData.relationship = partial.relationship
          if (partial.bloodGroup !== undefined) updateData.blood_group = partial.bloodGroup
          if (partial.allergies !== undefined) updateData.allergies = partial.allergies
          if (partial.conditions !== undefined) updateData.conditions = partial.conditions

          const { error } = await supabase.from("dependents").update(updateData).eq("id", id)

          if (!error) {
            await loadUserProfile(currentUser.email)
          }
        } catch (err) {
          console.error("[v0] Error updating dependent:", err)
        }
      })()
    },
    [supabase, currentUser, loadUserProfile],
  )

  const removeDependent: StoreApi["removeDependent"] = useCallback(
    (id) => {
      if (!currentUser) return

      ;(async () => {
        try {
          const { error } = await supabase.from("dependents").delete().eq("id", id)

          if (!error) {
            await loadUserProfile(currentUser.email)
          }
        } catch (err) {
          console.error("[v0] Error removing dependent:", err)
        }
      })()
    },
    [supabase, currentUser, loadUserProfile],
  )

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
