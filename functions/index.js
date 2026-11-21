const crypto = require("node:crypto")
const { initializeApp } = require("firebase-admin/app")
const { getAuth } = require("firebase-admin/auth")
const { FieldValue, getFirestore } = require("firebase-admin/firestore")
const { HttpsError, onCall } = require("firebase-functions/v2/https")

initializeApp()

const auth = getAuth()
const db = getFirestore()
const users = db.collection("users")

async function enforceRateLimit(request, action, limit) {
  const ip = request.rawRequest?.ip || "unknown"
  const key = crypto.createHash("sha256").update(`${action}:${ip}`).digest("hex")
  const reference = db.collection("functionRateLimits").doc(key)
  const now = Date.now()
  const windowMs = 60_000
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference)
    const previous = snapshot.data()
    const withinWindow = previous && now - previous.startedAt < windowMs
    const count = withinWindow ? previous.count + 1 : 1
    if (count > limit) throw new HttpsError("resource-exhausted", "Too many attempts. Try again later.")
    transaction.set(reference, { action, startedAt: withinWindow ? previous.startedAt : now, count })
  })
}

function normalizedCardId(value) {
  return String(value ?? "").trim().toLowerCase()
}

function normalizedEmail(value) {
  return String(value ?? "").trim().toLowerCase()
}

function publicProfile(data) {
  const { password: _password, ...safeData } = data
  const profile = safeData
  profile.dependents = (profile.dependents ?? []).map(({ assignedPassword, parentalSecretCode, ...dependent }) => ({
    ...dependent,
    assignedPassword: "",
  }))
  return profile
}

async function findByCardId(cardId) {
  const normalized = normalizedCardId(cardId)
  if (!normalized) return null
  const matches = await users.where("cardIdNormalized", "==", normalized).limit(1).get()
  if (matches.empty) return null
  const doc = matches.docs[0]
  return { ref: doc.ref, data: publicProfile(doc.data()) }
}

exports.createProfile = onCall(async (request) => {
  if (!request.auth?.token?.email) throw new HttpsError("unauthenticated", "Sign in to create a profile.")
  const email = normalizedEmail(request.auth.token.email)
  const profile = request.data?.profile
  if (!profile || normalizedEmail(profile.email) !== email || !profile.cardId?.trim()) {
    throw new HttpsError("invalid-argument", "A profile email and Card/Tag ID are required.")
  }
  const cardIdNormalized = normalizedCardId(profile.cardId)
  const userRef = users.doc(email)
  const claimRef = db.collection("cardIdClaims").doc(cardIdNormalized)

  await db.runTransaction(async (transaction) => {
    const [userSnapshot, claimSnapshot] = await Promise.all([
      transaction.get(userRef),
      transaction.get(claimRef),
    ])
    if (userSnapshot.exists) throw new HttpsError("already-exists", "An account with this email already exists.")
    if (claimSnapshot.exists) throw new HttpsError("already-exists", "This Card/Tag ID is already registered.")
    const { password, ...profileWithoutPassword } = profile
    const storedProfile = { ...profileWithoutPassword, email, cardIdNormalized }
    storedProfile.dependents = (storedProfile.dependents ?? []).map(({ assignedPassword, ...dependent }) => ({
      ...dependent,
      assignedPassword: "",
    }))
    transaction.create(userRef, storedProfile)
    transaction.create(claimRef, { email })
  })

  return { ok: true }
})

exports.lookupByCardId = onCall(async (request) => {
  await enforceRateLimit(request, "emergency-lookup", 10)
  const match = await findByCardId(request.data?.cardId)
  if (!match) throw new HttpsError("not-found", "No patient found for this Card/Tag ID.")
  const profile = match.data
  return {
    name: profile.name ?? "",
    dob: profile.dob ?? "",
    bloodGroup: profile.bloodGroup ?? "",
    gender: profile.gender ?? "",
    email: "",
    password: "",
    cardId: "",
    allergies: profile.allergies ?? [],
    conditions: profile.conditions ?? [],
    medications: profile.medications ?? [],
    contacts: profile.contacts ?? [],
    reports: [],
    dependents: [],
  }
})

exports.findPatientByCardId = onCall(async (request) => {
  await enforceRateLimit(request, "patient-lookup", 20)
  const cardId = normalizedCardId(request.data?.cardId)
  if (!cardId) return null
  const direct = await findByCardId(cardId)
  if (direct) return { kind: "user", cardId: direct.data.cardId, name: direct.data.name }

  const docs = await users.select("dependents").get()
  for (const doc of docs.docs) {
    for (const dependent of doc.data().dependents ?? []) {
      const linkedEmail = normalizedEmail(dependent.assignedEmail)
      const tag = normalizedCardId(dependent.mediTagId)
      const linked = linkedEmail ? await users.doc(linkedEmail).get() : null
      const linkedCard = normalizedCardId(linked?.data()?.cardId)
      if (linkedCard === cardId || tag === cardId) {
        return {
          kind: "dependent",
          cardId: linked?.data()?.cardId ?? dependent.mediTagId,
          name: dependent.name,
        }
      }
    }
  }
  return null
})

exports.loginByCard = onCall(async (request) => {
  await enforceRateLimit(request, "card-login", 5)
  const cardId = normalizedCardId(request.data?.cardId)
  const password = String(request.data?.password ?? "")
  const apiKey = String(request.data?.apiKey ?? "")
  if (!cardId || !password || !apiKey) throw new HttpsError("invalid-argument", "Enter your Card/Tag ID and password.")
  const match = await findByCardId(cardId)
  if (!match) throw new HttpsError("not-found", "No account found for this Card/Tag ID.")
  const account = await auth.getUserByEmail(match.data.email)
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: account.email, password, returnSecureToken: true }),
  })
  const result = await response.json()
  if (!response.ok) throw new HttpsError("unauthenticated", "Incorrect password.")
  return { token: await auth.createCustomToken(result.localId) }
})

exports.getUserByEmail = onCall(async (request) => {
  const email = normalizedEmail(request.data?.email)
  if (!request.auth?.token?.email || normalizedEmail(request.auth.token.email) !== email) {
    throw new HttpsError("permission-denied", "You can only load your own profile.")
  }
  if (!email) return null
  const doc = await users.doc(email).get()
  return doc.exists ? publicProfile(doc.data()) : null
})

exports.getDependentByEmail = onCall(async (request) => {
  const email = normalizedEmail(request.data?.email)
  if (!request.auth?.token?.email || normalizedEmail(request.auth.token.email) !== email) {
    throw new HttpsError("permission-denied", "You can only load your own linked profile.")
  }
  if (!email) return null
  const docs = await users.select("dependents").get()
  for (const doc of docs.docs) {
    const dependent = (doc.data().dependents ?? []).find((item) => normalizedEmail(item.assignedEmail) === email)
    if (dependent) return { ...dependent, assignedPassword: "", parentalSecretCode: dependent.parentalSecretCode ?? "" }
  }
  return null
})

exports.addReportToCard = onCall(async (request) => {
  await enforceRateLimit(request, "report-upload", 5)
  const requesterEmail = normalizedEmail(request.auth?.token?.email)
  if (!requesterEmail) throw new HttpsError("unauthenticated", "Sign in before adding a report.")
  const cardId = normalizedCardId(request.data?.cardId)
  const report = request.data?.report
  const practitioner = request.data?.practitioner
  if (!report || !practitioner) throw new HttpsError("invalid-argument", "A signed report and practitioner identity are required.")
  const match = await findByCardId(cardId)
  if (!match) throw new HttpsError("not-found", "No patient found for this Card/Tag ID.")
  if (match.ref.id !== requesterEmail) throw new HttpsError("permission-denied", "You can only attach reports to your own medical record.")
  const name = String(practitioner.doctorName ?? "").trim()
  const reg = String(practitioner.registrationNumber ?? "").trim()
  const institution = String(practitioner.institution ?? "").trim()
  if (name.replace(/[^A-Za-z]/g, "").length < 3 || !/^[A-Za-z]{0,6}[-/ ]?\d{4,}$/.test(reg) || !/(nmc|mci|smc|medical council|state medical|council|hospital|clinic|medical|health)/i.test(institution)) {
    throw new HttpsError("permission-denied", "Practitioner credentials could not be verified.")
  }
  const newReport = { ...report, id: require("crypto").randomUUID(), createdAt: Date.now() }
  await match.ref.update({ reports: FieldValue.arrayUnion(newReport) })
  return { ok: true }
})

exports.verifyResetIdentity = onCall(async (request) => {
  await enforceRateLimit(request, "password-reset", 5)
  const email = normalizedEmail(request.data?.email)
  const cardId = normalizedCardId(request.data?.cardId)
  const doc = email ? await users.doc(email).get() : null
  if (!doc?.exists || normalizedCardId(doc.data().cardId) !== cardId) {
    throw new HttpsError("permission-denied", "Email ID and Card/Tag ID do not match.")
  }
  return { ok: true }
})

