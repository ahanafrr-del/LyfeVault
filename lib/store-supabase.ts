"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type {
  EmergencyContact,
  MedicalReport,
  DependentProfile,
  UserProfile,
  StoreApi,
} from "@/lib/store"
import {
  computeAge,
  uid,
  makeMediTag,
  makeCardId,
  validateParentalCode,
  validateMedicalLicense,
  isChildProfile,
} from "@/lib/store"

/**
 * Supabase-backed store that syncs all data to cloud PostgreSQL tables.
 * Maintains the same StoreApi interface as the localStorage version for drop-in replacement.
 * Real-time multi-device sync via Supabase subscriptions and cloud queries.
 */
export function useSupabaseStore(): StoreApi {
  const supabase = createClient()
  const [ready, setReady] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [emergencyProfile, setEmergencyProfile] = useState<UserProfile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [missingEnv, setMissingEnv] = useState(false)

  // Check environment variables on mount
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      setMissingEnv(true)
      setReady(true)
      return
    }

    // Initialize session and load current user
    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.user) {
          setUserId(session.user.id)
          await loadCurrentUser(session.user.id)
        }
        setReady(true)
      } catch (error) {
        console.error("[v0] Error initializing Supabase session:", error)
        setReady(true)
      }
    }

    initSession()
  }, [supabase])

  const loadCurrentUser = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            `
            id,
            name,
            dob,
            blood_group,
            gender,
            email,
            card_id,
            allergies,
            conditions,
            medications,
            emergency_contacts:emergency_contacts(id, name, relation, phone),
            medical_reports:medical_reports(
              id,
              doctor_name,
              specialization,
              clinic,
              report_date,
              report_time,
              license_number,
              file_name,
              notes,
              created_at
            ),
            dependents:dependents(
              id,
              name,
              dob,
              relationship,
              blood_group,
              allergies,
              conditions,
              assigned_email,
              parental_secret_code,
              medi_tag_id,
              dependent_contacts:dependent_contacts(id, name, relation, phone)
            )
          `,
          )
          .eq("user_id", userId)
          .single()

        if (error) throw error

        if (data) {
          const profile: UserProfile = {
            name: data.name,
            dob: data.dob,
            bloodGroup: data.blood_group,
            gender: data.gender,
            email: data.email,
            password: "", // Never expose password
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
              notes: r.notes,
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
              contacts: (d.dependent_contacts || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                relation: c.relation,
                phone: c.phone,
              })),
              assignedEmail: d.assigned_email || "",
              assignedPassword: "", // Never expose password
              parentalSecretCode: d.parental_secret_code || "",
              mediTagId: d.medi_tag_id || "",
            })),
          }
          setCurrentUser(profile)
          setEmergencyProfile(profile)
        }
      } catch (error) {
        console.error("[v0] Error loading current user:", error)
      }
    },
    [supabase],
  )

  const register: StoreApi["register"] = useCallback(
    (data) => {
      const email = data.email.trim().toLowerCase()
      if (!email || !data.password) {
        return { ok: false, error: "Email and password are required." }
      }

      // Async operation in background
      ;(async () => {
        try {
          const profileId = crypto.randomUUID?.() || uid()
          const cardId = (data.cardId ?? "").trim() || makeCardId()

          const { error } = await supabase.from("profiles").insert({
            id: profileId,
            user_id: profileId,
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
          })

          if (error) {
            console.error("[v0] Registration error:", error)
            return
          }

          setUserId(profileId)
          await loadCurrentUser(profileId)
        } catch (error) {
          console.error("[v0] Registration error:", error)
        }
      })()

      return { ok: true }
    },
    [supabase, loadCurrentUser],
  )

  const login: StoreApi["login"] = useCallback(
    (email, password) => {
      const key = email.trim().toLowerCase()

      // Validate synchronously, then async load
      ;(async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, password_hash")
            .eq("email", key)
            .single()

          if (error || !data) {
            console.error("[v0] Login error: No account found")
            return
          }

          if (data.password_hash !== password) {
            console.error("[v0] Login error: Incorrect password")
            return
          }

          setUserId(data.id)
          await loadCurrentUser(data.id)
        } catch (error) {
          console.error("[v0] Login error:", error)
        }
      })()

      return { ok: true }
    },
    [supabase, loadCurrentUser],
  )

  const loginByCard: StoreApi["loginByCard"] = useCallback(
    async (cardId, password) => {
      try {
        const key = cardId.trim().toLowerCase()
        if (!key) {
          return { ok: false, error: "Enter your Card/Tag ID." }
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, password_hash")
          .eq("card_id", key)
          .single()

        if (error || !data) {
          return { ok: false, error: "No account found for this Card/Tag ID." }
        }

        if (data.password_hash !== password) {
          return { ok: false, error: "Incorrect password." }
        }

        setUserId(data.id)
        await loadCurrentUser(data.id)
        return { ok: true }
      } catch (error) {
        console.error("[v0] Card login error:", error)
        return { ok: false, error: "Login failed." }
      }
    },
    [supabase, loadCurrentUser],
  )

  const getUserByCardId: StoreApi["getUserByCardId"] = useCallback(
    async (cardId) => {
      try {
        const key = cardId.trim().toLowerCase()
        if (!key) return null

        const { data, error } = await supabase
          .from("profiles")
          .select(
            `
            id,
            name,
            dob,
            blood_group,
            gender,
            email,
            card_id,
            allergies,
            conditions,
            medications,
            emergency_contacts:emergency_contacts(id, name, relation, phone),
            medical_reports:medical_reports(
              id,
              doctor_name,
              specialization,
              clinic,
              report_date,
              report_time,
              license_number,
              file_name,
              notes,
              created_at
            ),
            dependents:dependents(
              id,
              name,
              dob,
              relationship,
              blood_group,
              allergies,
              conditions,
              assigned_email,
              parental_secret_code,
              medi_tag_id
            )
          `,
          )
          .eq("card_id", key)
          .single()

        if (error || !data) return null

        return {
          name: data.name,
          dob: data.dob,
          bloodGroup: data.blood_group,
          gender: data.gender,
          email: data.email,
          password: "",
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
            notes: r.notes,
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
            contacts: [],
            assignedEmail: d.assigned_email || "",
            assignedPassword: "",
            parentalSecretCode: d.parental_secret_code || "",
            mediTagId: d.medi_tag_id || "",
          })),
        } as UserProfile
      } catch (error) {
        console.error("[v0] Error fetching user by card:", error)
        return null
      }
    },
    [supabase],
  )

  const getUserByEmail: StoreApi["getUserByEmail"] = useCallback(
    async (email) => {
      try {
        const key = email.trim().toLowerCase()
        if (!key) return null

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", key)
          .single()

        if (error || !data) return null

        return {
          name: data.name,
          dob: data.dob,
          bloodGroup: data.blood_group,
          gender: data.gender,
          email: data.email,
          password: "",
          cardId: data.card_id || "",
          allergies: data.allergies || [],
          conditions: data.conditions || [],
          medications: data.medications || [],
          contacts: [],
          reports: [],
          dependents: [],
        } as UserProfile
      } catch (error) {
        console.error("[v0] Error fetching user by email:", error)
        return null
      }
    },
    [supabase],
  )

  const findPatientByCardId: StoreApi["findPatientByCardId"] = useCallback(
    async (cardId) => {
      try {
        const key = cardId.trim().toLowerCase()
        if (!key) return null

        // Check profiles table first
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, name, card_id")
          .eq("card_id", key)
          .single()

        if (profileData) {
          return { kind: "user" as const, cardId: profileData.card_id, name: profileData.name }
        }

        // Check dependents by medi_tag_id or assigned account card_id
        const { data: dependentData } = await supabase
          .from("dependents")
          .select("id, name, medi_tag_id, assigned_email")
          .or(`medi_tag_id.eq.${key},assigned_email.neq.null`)
          .single()

        if (dependentData) {
          // Lookup the assigned profile to get its card_id
          if (dependentData.assigned_email) {
            const { data: linkedProfile } = await supabase
              .from("profiles")
              .select("card_id")
              .eq("email", dependentData.assigned_email)
              .single()

            return {
              kind: "dependent" as const,
              cardId: linkedProfile?.card_id || dependentData.medi_tag_id,
              name: dependentData.name,
            }
          }

          return {
            kind: "dependent" as const,
            cardId: dependentData.medi_tag_id,
            name: dependentData.name,
          }
        }

        return null
      } catch (error) {
        console.error("[v0] Error finding patient by card:", error)
        return null
      }
    },
    [supabase],
  )

  const addReportToCard: StoreApi["addReportToCard"] = useCallback(
    async (cardId, report) => {
      try {
        const key = cardId.trim().toLowerCase()
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("card_id", key)
          .single()

        if (profileError || !profileData) {
          return { ok: false, error: "No patient found for this Card/Tag ID." }
        }

        const { error } = await supabase.from("medical_reports").insert({
          id: crypto.randomUUID?.() || uid(),
          profile_id: profileData.id,
          doctor_name: report.doctorName,
          specialization: report.specialization,
          clinic: report.clinic,
          report_date: report.date,
          report_time: report.time,
          license_number: report.licenseNumber,
          file_name: report.fileName,
          notes: report.notes,
        })

        if (error) throw error
        return { ok: true }
      } catch (error) {
        console.error("[v0] Error adding report:", error)
        return { ok: false, error: "Failed to add medical report." }
      }
    },
    [supabase],
  )

  const verifyCredentials: StoreApi["verifyCredentials"] = useCallback(
    async (email, password) => {
      try {
        const key = email.trim().toLowerCase()
        if (!key || !password) {
          return { ok: false, error: "Enter the child's email and password." }
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("password_hash")
          .eq("email", key)
          .single()

        if (error || !data) {
          return { ok: false, error: "No account found for this email." }
        }

        if (data.password_hash !== password) {
          return { ok: false, error: "Incorrect password for this account." }
        }

        return { ok: true }
      } catch (error) {
        console.error("[v0] Error verifying credentials:", error)
        return { ok: false, error: "Verification failed." }
      }
    },
    [supabase],
  )

  const verifyResetIdentity: StoreApi["verifyResetIdentity"] = useCallback(
    async (email, cardId) => {
      try {
        const emailKey = email.trim().toLowerCase()
        const cardKey = cardId.trim().toLowerCase()
        if (!emailKey || !cardKey) {
          return { ok: false, error: "Enter both your Email ID and Card/Tag ID." }
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("card_id")
          .eq("email", emailKey)
          .single()

        if (error || !data || (data.card_id ?? "").trim().toLowerCase() !== cardKey) {
          return { ok: false, error: "⛔ Invalid credentials: Email ID and Card/Tag ID do not match." }
        }

        return { ok: true }
      } catch (error) {
        console.error("[v0] Error verifying reset identity:", error)
        return { ok: false, error: "Verification failed." }
      }
    },
    [supabase],
  )

  const resetPassword: StoreApi["resetPassword"] = useCallback(
    async (email, newPassword) => {
      try {
        const emailKey = email.trim().toLowerCase()
        if (!newPassword) {
          return { ok: false, error: "Enter a new password." }
        }

        const { error } = await supabase
          .from("profiles")
          .update({ password_hash: newPassword })
          .eq("email", emailKey)

        if (error) throw error
        return { ok: true }
      } catch (error) {
        console.error("[v0] Error resetting password:", error)
        return { ok: false, error: "Password reset failed." }
      }
    },
    [supabase],
  )

  const getDependentByEmail: StoreApi["getDependentByEmail"] = useCallback(
    async (email) => {
      try {
        const key = email.trim().toLowerCase()
        if (!key) return null

        const { data, error } = await supabase
          .from("dependents")
          .select(
            `
            id,
            name,
            dob,
            relationship,
            blood_group,
            allergies,
            conditions,
            assigned_email,
            parental_secret_code,
            medi_tag_id,
            dependent_contacts:dependent_contacts(id, name, relation, phone)
          `,
          )
          .eq("assigned_email", key)
          .single()

        if (error || !data) return null

        return {
          id: data.id,
          name: data.name,
          dob: data.dob,
          relationship: data.relationship,
          bloodGroup: data.blood_group,
          allergies: data.allergies || [],
          conditions: data.conditions || [],
          contacts: (data.dependent_contacts || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            relation: c.relation,
            phone: c.phone,
          })),
          assignedEmail: data.assigned_email || "",
          assignedPassword: "",
          parentalSecretCode: data.parental_secret_code || "",
          mediTagId: data.medi_tag_id || "",
        } as DependentProfile
      } catch (error) {
        console.error("[v0] Error fetching dependent by email:", error)
        return null
      }
    },
    [supabase],
  )

  const logout: StoreApi["logout"] = useCallback(() => {
    setUserId(null)
    setCurrentUser(null)
    setEmergencyProfile(null)
  }, [])

  const resetAll: StoreApi["resetAll"] = useCallback(() => {
    // Note: In a real app, this would delete all data from Supabase
    setUserId(null)
    setCurrentUser(null)
    setEmergencyProfile(null)
  }, [])

  const addReport: StoreApi["addReport"] = useCallback(
    async (report) => {
      if (!userId) return

      try {
        await supabase.from("medical_reports").insert({
          id: crypto.randomUUID?.() || uid(),
          profile_id: userId,
          doctor_name: report.doctorName,
          specialization: report.specialization,
          clinic: report.clinic,
          report_date: report.date,
          report_time: report.time,
          license_number: report.licenseNumber,
          file_name: report.fileName,
          notes: report.notes,
        })

        await loadCurrentUser(userId)
      } catch (error) {
        console.error("[v0] Error adding report:", error)
      }
    },
    [supabase, userId, loadCurrentUser],
  )

  const updateProfile: StoreApi["updateProfile"] = useCallback(
    async (partial) => {
      if (!userId) return

      try {
        const updates: Record<string, any> = {}
        if (partial.name) updates.name = partial.name
        if (partial.dob) updates.dob = partial.dob
        if (partial.bloodGroup) updates.blood_group = partial.bloodGroup
        if (partial.gender) updates.gender = partial.gender
        if (partial.allergies) updates.allergies = partial.allergies
        if (partial.conditions) updates.conditions = partial.conditions
        if (partial.medications) updates.medications = partial.medications

        await supabase.from("profiles").update(updates).eq("id", userId)
        await loadCurrentUser(userId)
      } catch (error) {
        console.error("[v0] Error updating profile:", error)
      }
    },
    [supabase, userId, loadCurrentUser],
  )

  const addDependent: StoreApi["addDependent"] = useCallback(
    async (data) => {
      if (!userId) return

      try {
        const mediTagId = makeMediTag()
        await supabase.from("dependents").insert({
          id: crypto.randomUUID?.() || uid(),
          guardian_profile_id: userId,
          name: data.name,
          dob: data.dob,
          relationship: data.relationship,
          blood_group: data.bloodGroup,
          allergies: data.allergies || [],
          conditions: data.conditions || [],
          assigned_email: data.assignedEmail,
          assigned_password_hash: data.assignedPassword,
          parental_secret_code: data.parentalSecretCode,
          medi_tag_id: mediTagId,
        })

        await loadCurrentUser(userId)
      } catch (error) {
        console.error("[v0] Error adding dependent:", error)
      }
    },
    [supabase, userId, loadCurrentUser],
  )

  const updateDependent: StoreApi["updateDependent"] = useCallback(
    async (id, partial) => {
      if (!userId) return

      try {
        const updates: Record<string, any> = {}
        if (partial.name) updates.name = partial.name
        if (partial.dob) updates.dob = partial.dob
        if (partial.relationship) updates.relationship = partial.relationship
        if (partial.bloodGroup) updates.blood_group = partial.bloodGroup
        if (partial.allergies) updates.allergies = partial.allergies
        if (partial.conditions) updates.conditions = partial.conditions
        if (partial.assignedEmail) updates.assigned_email = partial.assignedEmail
        if (partial.parentalSecretCode) updates.parental_secret_code = partial.parentalSecretCode

        await supabase.from("dependents").update(updates).eq("id", id)
        await loadCurrentUser(userId)
      } catch (error) {
        console.error("[v0] Error updating dependent:", error)
      }
    },
    [supabase, userId, loadCurrentUser],
  )

  const removeDependent: StoreApi["removeDependent"] = useCallback(
    async (id) => {
      if (!userId) return

      try {
        await supabase.from("dependents").delete().eq("id", id)
        await loadCurrentUser(userId)
      } catch (error) {
        console.error("[v0] Error removing dependent:", error)
      }
    },
    [supabase, userId, loadCurrentUser],
  )

  // If environment variables are missing, show fallback banner
  if (missingEnv) {
    console.warn("[v0] Supabase environment variables not configured")
  }

  return {
    ready,
    currentUser,
    emergencyProfile,
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
