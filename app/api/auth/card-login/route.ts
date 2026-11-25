import { createHmac } from "node:crypto"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Card ID sign-in is temporarily unavailable." }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Enter a valid Card ID and password." }, { status: 400 })
  }
  const values = body && typeof body === "object" ? body as Record<string, unknown> : {}
  const cardId = typeof values.cardId === "string" ? values.cardId.trim().toUpperCase() : ""
  const password = typeof values.password === "string" ? values.password : ""
  if (!/^LV-(1000|1[0-9]{3}|2[0-9]{3}|3000)$/.test(cardId) || !password || password.length > 256) {
    return NextResponse.json({ error: "Card ID or password is incorrect." }, { status: 401 })
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean).at(-1)
  const clientAddress = request.headers.get("x-real-ip")?.trim() || forwarded
  if (!clientAddress) {
    return NextResponse.json({ error: "Card ID sign-in is temporarily unavailable." }, { status: 503 })
  }

  const ipHash = createHmac("sha256", serviceRoleKey).update(clientAddress).digest("hex")
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: attemptCount, error: rateLimitError } = await admin.rpc("register_card_login_attempt", { p_ip_hash: ipHash })
  if (rateLimitError) {
    return NextResponse.json({ error: "Card ID sign-in is temporarily unavailable." }, { status: 503 })
  }
  if (Number(attemptCount) > 20) {
    return NextResponse.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, { status: 429 })
  }

  const { data: email, error: lookupError } = await admin.rpc("get_email_by_card_id", { p_card_id: cardId })
  if (lookupError || typeof email !== "string" || !email) {
    return NextResponse.json({ error: "Card ID or password is incorrect." }, { status: 401 })
  }

  const { data, error } = await authClient.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    return NextResponse.json({ error: "Card ID or password is incorrect." }, { status: 401 })
  }

  return NextResponse.json({ session: data.session })
}
