import { createHmac } from "node:crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const noStore = { "Cache-Control": "private, no-store, max-age=0" }

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "Practitioner lookup is temporarily unavailable." }, { status: 503, headers: noStore })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Enter a valid patient Card ID and MMC ID." }, { status: 400, headers: noStore })
  }
  const values = body && typeof body === "object" ? body as Record<string, unknown> : {}
  const cardId = typeof values.cardId === "string" ? values.cardId.trim().toUpperCase() : ""
  const mmcId = typeof values.mmcId === "string" ? values.mmcId.trim() : ""
  const validCardId = /^LV-(1000|1[0-9]{3}|2[0-9]{3}|3000)$/.test(cardId) || /^MT-[A-Z0-9]{4,8}$/.test(cardId)
  if (!validCardId || !/^[A-Za-z0-9/.-]{2,64}$/.test(mmcId)) {
    return NextResponse.json({ error: "Patient Card ID or MMC ID is invalid." }, { status: 400, headers: noStore })
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean).at(-1)
  const clientAddress = request.headers.get("x-real-ip")?.trim() || forwarded
  if (!clientAddress) {
    return NextResponse.json({ error: "Practitioner lookup is temporarily unavailable." }, { status: 503, headers: noStore })
  }

  const ipHash = createHmac("sha256", serviceRoleKey).update(clientAddress).digest("hex")
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: attemptCount, error: rateLimitError } = await admin.rpc("register_practitioner_lookup_attempt", { p_ip_hash: ipHash })
  if (rateLimitError) {
    return NextResponse.json({ error: "Practitioner lookup is temporarily unavailable." }, { status: 503, headers: noStore })
  }
  if (Number(attemptCount) > 120) {
    return NextResponse.json({ error: "Too many lookups. Try again in 15 minutes." }, { status: 429, headers: noStore })
  }

  const { data: patientData, error: patientError } = await admin.rpc("practitioner_lookup_patient_readonly", {
    p_card_id: cardId,
    p_mmc_id: mmcId,
  })
  if (patientError) {
    return NextResponse.json({ error: "Practitioner access could not be verified." }, { status: 403, headers: noStore })
  }
  if (!patientData || typeof patientData !== "object") {
    return NextResponse.json({ error: "No patient record was found for that Card ID." }, { status: 404, headers: noStore })
  }

  const record = patientData as Record<string, unknown>
  const reports = Array.isArray(record.reports) ? record.reports as Record<string, unknown>[] : []
  let signedReports: Record<string, unknown>[]
  try {
    signedReports = await Promise.all(reports.map(async (report) => {
      const { file_path, ...safeReport } = report
      const filePath = typeof file_path === "string" ? file_path : null
      if (!filePath) return safeReport

      const { data, error } = await admin.storage.from("medical-reports").createSignedUrl(filePath, 300)
      if (error || !data?.signedUrl) throw new Error("Signed report URL could not be created")
      return { ...safeReport, fileUrl: data.signedUrl }
    }))
  } catch {
    return NextResponse.json({ error: "A private medical file could not be prepared." }, { status: 500, headers: noStore })
  }

  const { data: insurance, error: insuranceError } = await admin.rpc("practitioner_lookup_insurance", {
    p_card_id: cardId,
    p_mmc_id: mmcId,
  })
  if (insuranceError) {
    return NextResponse.json({ error: "The patient summary could not be loaded." }, { status: 500, headers: noStore })
  }

  const safePatient = { ...record }
  delete safePatient.email
  delete safePatient.dependent_id
  delete safePatient.reports
  return NextResponse.json({ patient: { ...safePatient, reports: signedReports }, insurance: insurance ?? null }, { headers: noStore })
}
