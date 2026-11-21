"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { deleteApp, initializeApp } from "firebase/app"
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth"
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { getFirebaseClient } from "@/lib/firebase"

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

type CloudProfile = Omit<UserProfile, "password"> & { cardIdNormalized?: string }
type PatientMatch = { kind: "user" | "dependent"; cardId: string; name: string }
type Result = { ok: boolean; error?: string }

const SESSION_KEY = "medivault_session_v1"

function profileDoc(email: string) {
  return doc(getFirebaseClient().db, "users", email.trim().toLowerCase())
}

function sanitizeProfile(profile: Partial<UserProfile> & { email: string }): CloudProfile {
  const { password: _password, ...safeProfile } = profile
  return {
    ...safeProfile,
    email: profile.email.trim().toLowerCase(),
    cardId: profile.cardId ?? "",
    cardIdNormalized: (profile.cardId ?? "").trim().toLowerCase(),
    allergies: profile.allergies ?? [],
    conditions: profile.conditions ?? [],
    medications: profile.medications ?? [],
    contacts: profile.contacts ?? [],
    reports: profile.reports ?? [],
    dependents: (profile.dependents ?? []).map(({ assignedPassword: _assignedPassword, ...dependent }) => ({
      ...dependent,
      assignedPassword: "",
      parentalSecretCode: dependent.parentalSecretCode ?? "",
    })),
  } as CloudProfile
}

function normalizeUser(user: Partial<UserProfile> & { email: string }): UserProfile {
  const safe = sanitizeProfile(user)
  return {
    name: safe.name ?? "",
    dob: safe.dob ?? "",
    bloodGroup: safe.bloodGroup ?? "",
    gender: safe.gender ?? "",
    email: safe.email,
    password: "",
    cardId: safe.cardId ?? "",
    allergies: safe.allergies ?? [],
    conditions: safe.conditions ?? [],
    medications: safe.medications ?? [],
    contacts: safe.contacts ?? [],
    reports: safe.reports ?? [],
    dependents: safe.dependents ?? [],
  }
}

function errorMessage(error: unknown, fallback: string): string {
  const details = error as { code?: string; message?: string; status?: number; statusCode?: number }
  const code = details?.code?.toLowerCase() ?? ""
  const message = details?.message?.toLowerCase() ?? ""
  const status = details?.status ?? details?.statusCode
  if (code.includes("email-already-in-use") || code.includes("already-exists")) return "An account with this email or Card/Tag ID already exists."
  if (code.includes("invalid-email")) return "Enter a valid email address."
  if (code.includes("weak-password")) return "Choose a password with at least 6 characters."
  if (code.includes("operation-not-allowed")) return "Email and password sign-up is not enabled for this Firebase project."
  if (status === 0 || /status(?: code)?[: ]+0\b/.test(message)) {
    return "Firebase returned a network status of 0. Check your connection, browser extensions, and Firebase API key restrictions, then try again."
  }
  if (code.includes("auth/internal-error") || code === "internal" || code.endsWith("/internal")) {
    return "Firebase returned an internal error. Check that Email/Password sign-in is enabled in Firebase Authentication and try again."
  }
  if (code.includes("network-request-failed") || code.includes("unavailable") || code.includes("deadline-exceeded")) {
    return "Firebase could not be reached. Check your connection and try again."
  }
  if (code.includes("invalid-api-key")) return "Firebase rejected this app's API key. Check the Firebase Web App configuration."
  if (code.includes("functions/not-found")) return "The profile service is not deployed for this Firebase project. Contact the app administrator."
  if (code.includes("user-not-found")) return "No account found for this email."
  if (code.includes("wrong-password") || code.includes("invalid-credential") || code.includes("unauthenticated")) return "Incorrect password."
  if (code.includes("permission-denied")) return "This action is not permitted for this account."
  if (code.includes("too-many-requests") || code.includes("resource-exhausted")) return "Too many attempts. Wait a little and try again."
  return fallback
}

async function mutateSignedInProfile(
  update: (profile: UserProfile) => UserProfile,
): Promise<void> {
  const { auth, db } = getFirebaseClient()
  const email = auth.currentUser?.email?.trim().toLowerCase()
  if (!email) return
  const reference = profileDoc(email)
  const snapshot = await getDoc(reference)
  if (!snapshot.exists()) throw new Error("Your cloud profile could not be found.")
  const current = normalizeUser(snapshot.data() as Partial<UserProfile> & { email: string })
  await setDoc(reference, sanitizeProfile(update(current)), { merge: true })
}

export type StoreApi = {
  ready: boolean
  currentUser: UserProfile | null
  emergencyProfile: UserProfile | null
  register: (data: Omit<Pick<UserProfile, "name" | "dob" | "bloodGroup" | "gender" | "email" | "password" | "cardId">, "cardId"> & { cardId?: string }) => Promise<Result>
  login: (email: string, password: string) => Promise<Result>
  /** Quick Card login: authenticates using the physical Card/Tag ID + password. */
  loginByCard: (cardId: string, password: string) => Promise<Result>
  /** Looks up a registered user by their physical Card/Tag ID (for emergency snapshots). */
  getUserByCardId: (cardId: string) => Promise<UserProfile | null>
  /** Read-only lookup of a registered account by email (no password / no session change). */
  getUserByEmail: (email: string) => Promise<UserProfile | null>
  /** Searches registered profiles and linked dependents for an exact Card/Tag ID. */
  findPatientByCardId: (cardId: string) => Promise<PatientMatch | null>
  /** Attaches a clinical report to the record identified by a Card/Tag ID. */
  addReportToCard: (cardId: string, report: Omit<MedicalReport, "id" | "createdAt">, practitioner?: { doctorName: string; registrationNumber: string; institution: string }) => Promise<Result>
  verifyCredentials: (email: string, password: string) => Promise<Result>
  verifyResetIdentity: (email: string, cardId: string) => Promise<Result>
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
  const pendingRegistration = useRef<{ uid: string; email: string; profile: CloudProfile } | null>(null)
  useEffect(() => {
    let alive = true
    let unsubscribeAuth = () => {}
    let unsubscribeProfile = () => {}
    let auth
    try {
      auth = getFirebaseClient().auth
    } catch {
      setReady(true)
      return () => { alive = false }
    }
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        if (!alive) return
        unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
          unsubscribeProfile()
          unsubscribeProfile = () => {}
          if (!firebaseUser?.email) {
            window.localStorage.removeItem(SESSION_KEY)
            setCurrentUser(null)
            setReady(true)
            return
          }
          const email = firebaseUser.email.trim().toLowerCase()
          window.localStorage.setItem(SESSION_KEY, email)
          unsubscribeProfile = onSnapshot(
            profileDoc(email),
            (snapshot) => {
              setCurrentUser(snapshot.exists() ? normalizeUser(snapshot.data() as Partial<UserProfile> & { email: string }) : null)
              setReady(true)
            },
            () => {
              setCurrentUser(null)
              setReady(true)
            },
          )
        })
      })
      .catch(() => {
        setCurrentUser(null)
        setReady(true)
      })
    return () => {
      alive = false
      unsubscribeAuth()
      unsubscribeProfile()
    }
  }, [])

  const register: StoreApi["register"] = useCallback(async (data) => {
    const email = data.email.trim().toLowerCase()
    if (!email || !data.password) return { ok: false, error: "Email and password are required." }

    const user: UserProfile = {
      name: data.name.trim(), dob: data.dob, bloodGroup: data.bloodGroup, gender: data.gender,
      email, password: "", cardId: data.cardId?.trim() ?? "", allergies: [], conditions: [], medications: [],
      contacts: [], reports: [], dependents: [],
    }
    const profile = sanitizeProfile(user)
    const { auth } = getFirebaseClient()
    let firebaseUser = auth.currentUser
    const canRetryProfile = pendingRegistration.current?.email === email && pendingRegistration.current.uid === firebaseUser?.uid

    if (!canRetryProfile) {
      pendingRegistration.current = null
      try {
        firebaseUser = (await createUserWithEmailAndPassword(auth, email, data.password)).user
      } catch (error) {
        return { ok: false, error: errorMessage(error, "Firebase Authentication could not create your account. Try again.") }
      }
      pendingRegistration.current = { uid: firebaseUser.uid, email, profile }
    } else {
      pendingRegistration.current = { ...pendingRegistration.current!, profile }
    }

   try {
  await setDoc(profileDoc(email), profile);
} catch (error) {
  pendingRegistration.current = null;
  return {
    ok: false,
    error: errorMessage(
      error,
      "Your Firebase account was created, but Firestore could not save your profile."
    ),
  };
}
      pendingRegistration.current = null
      setCurrentUser(normalizeUser(user))
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: `Your Firebase account was created, but Firestore could not save your profile. Your account has not been deleted. Retry sign-up to finish saving it. ${errorMessage(error, "Check the Firestore connection, rules, and profile service deployment.")}`,
      }
    }
  }, [])

  const login: StoreApi["login"] = useCallback(async (email, password) => {
    const key = email.trim().toLowerCase()
    if (!key || !password) return { ok: false, error: "Email and password are required." }
    try {
      const { auth } = getFirebaseClient()
      await signInWithEmailAndPassword(auth, key, password)
      window.localStorage.setItem(SESSION_KEY, key)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: errorMessage(error, "Login failed. Check the Firebase connection and try again.") }
    }
  }, [])

  const loginByCard: StoreApi["loginByCard"] = useCallback(async (cardId, password) => {
    const id = cardId.trim()
    if (!id) return { ok: false, error: "Enter your Card/Tag ID." }
    try {
      const { auth, functions, app } = getFirebaseClient()
      const result = await httpsCallable<{ cardId: string; password: string; apiKey?: string }, { token: string }>(functions, "loginByCard")({
        cardId: id, password, apiKey: app.options.apiKey,
      })
      await signInWithCustomToken(auth, result.data.token)
      const email = auth.currentUser?.email?.trim().toLowerCase()
      if (email) window.localStorage.setItem(SESSION_KEY, email)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: errorMessage(error, "Card login failed. Check the Firebase connection and try again.") }
    }
  }, [])

  const getUserByCardId: StoreApi["getUserByCardId"] = useCallback(async (cardId) => {
    if (!cardId.trim()) return null
    try {
      const { functions } = getFirebaseClient()
      const result = await httpsCallable<{ cardId: string }, UserProfile>(functions, "lookupByCardId")({ cardId: cardId.trim() })
      return normalizeUser(result.data)
    } catch {
      return null
    }
  }, [])

  const getUserByEmail: StoreApi["getUserByEmail"] = useCallback(async (email) => {
    if (!email.trim()) return null
    try {
      const { functions } = getFirebaseClient()
      const result = await httpsCallable<{ email: string }, UserProfile | null>(functions, "getUserByEmail")({ email: email.trim() })
      return result.data ? normalizeUser(result.data) : null
    } catch {
      return null
    }
  }, [])

  const findPatientByCardId: StoreApi["findPatientByCardId"] = useCallback(async (cardId) => {
    if (!cardId.trim()) return null
    try {
      const { functions } = getFirebaseClient()
      const result = await httpsCallable<{ cardId: string }, PatientMatch | null>(functions, "findPatientByCardId")({ cardId: cardId.trim() })
      return result.data
    } catch {
      return null
    }
  }, [])

  const addReportToCard: StoreApi["addReportToCard"] = useCallback(async (cardId, report, practitioner) => {
    if (!practitioner) return { ok: false, error: "Practitioner identity is required." }
    try {
      const { functions } = getFirebaseClient()
      await httpsCallable(functions, "addReportToCard")({ cardId, report, practitioner })
      return { ok: true }
    } catch (error) {
      return { ok: false, error: errorMessage(error, "Could not attach the report.") }
    }
  }, [])

  const verifyCredentials: StoreApi["verifyCredentials"] = useCallback(async (email, password) => {
    const key = email.trim().toLowerCase()
    if (!key || !password) return { ok: false, error: "Enter the child's email and password." }
    let secondaryApp
    try {
      const { app } = getFirebaseClient()
      secondaryApp = initializeApp(app.options, `credential-check-${Date.now()}`)
      const secondaryAuth = (await import("firebase/auth")).getAuth(secondaryApp)
      await setPersistence(secondaryAuth, inMemoryPersistence)
      await signInWithEmailAndPassword(secondaryAuth, key, password)
      await signOut(secondaryAuth)
      await deleteApp(secondaryApp)
      return { ok: true }
    } catch (error) {
      if (secondaryApp) await deleteApp(secondaryApp).catch(() => {})
      return { ok: false, error: errorMessage(error, "Could not verify the child's account.") }
    }
  }, [])

  const verifyResetIdentity: StoreApi["verifyResetIdentity"] = useCallback(async (email, cardId) => {
    if (!email.trim() || !cardId.trim()) return { ok: false, error: "Enter both your Email ID and Card/Tag ID." }
    try {
      const { auth, functions } = getFirebaseClient()
      await httpsCallable(functions, "verifyResetIdentity")({ email, cardId })
      await sendPasswordResetEmail(auth, email.trim().toLowerCase())
      return { ok: true }
    } catch (error) {
      return { ok: false, error: errorMessage(error, "Email ID and Card/Tag ID do not match.") }
    }
  }, [])

  const getDependentByEmail: StoreApi["getDependentByEmail"] = useCallback(async (email) => {
    try {
      const { functions } = getFirebaseClient()
      const result = await httpsCallable<{ email: string }, DependentProfile | null>(functions, "getDependentByEmail")({ email })
      return result.data
    } catch {
      return null
    }
  }, [])

  const logout: StoreApi["logout"] = useCallback(async () => {
    window.localStorage.removeItem(SESSION_KEY)
    await signOut(getFirebaseClient().auth)
  }, [])

  const resetAll: StoreApi["resetAll"] = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY)
    setCurrentUser(null)
    void signOut(getFirebaseClient().auth)
  }, [])

  const addReport: StoreApi["addReport"] = useCallback(async (report) => {
    await mutateSignedInProfile((user) => ({
      ...user,
      reports: [{ ...report, id: uid(), createdAt: Date.now() }, ...user.reports],
    }))
  }, [])

  const updateProfile: StoreApi["updateProfile"] = useCallback(async (partial) => {
    await mutateSignedInProfile((user) => ({ ...user, ...partial, email: user.email, password: "" }))
  }, [])

  const addDependent: StoreApi["addDependent"] = useCallback(async (data) => {
    await mutateSignedInProfile((user) => ({
      ...user,
      dependents: [...user.dependents, { ...data, id: uid(), mediTagId: makeMediTag(), assignedPassword: "" }],
    }))
  }, [])

  const updateDependent: StoreApi["updateDependent"] = useCallback(async (id, partial) => {
    await mutateSignedInProfile((user) => ({
      ...user,
      dependents: user.dependents.map((dependent) => dependent.id === id ? { ...dependent, ...partial, assignedPassword: "" } : dependent),
    }))
  }, [])

  const removeDependent: StoreApi["removeDependent"] = useCallback(async (id) => {
    await mutateSignedInProfile((user) => ({ ...user, dependents: user.dependents.filter((dependent) => dependent.id !== id) }))
  }, [])

  const emergencyProfile = currentUser
  return {
    ready, currentUser, emergencyProfile, register, login, loginByCard, getUserByCardId, getUserByEmail,
    findPatientByCardId, addReportToCard, verifyCredentials, verifyResetIdentity,
    getDependentByEmail, logout, resetAll, addReport, updateProfile, addDependent, updateDependent, removeDependent,
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
  const denied = { ok: false, error: "\u26D4 Approval Denied: Unverified or Invalid Medical License Credentials." }
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
