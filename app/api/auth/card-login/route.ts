import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Card login is temporarily unavailable. Contact support." }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Enter a valid Card/Tag ID and password." }, { status: 400 })
  }

  const values = body && typeof body === "object" ? body as Record<string, unknown> : {}
  const cardId = typeof values.cardId === "string" ? values.cardId.trim() : ""
  const password = typeof values.password === "string" ? values.password : ""
  if (!/^[a-z0-9-]{1,64}$/i.test(cardId) || !password || password.length > 256) {
    return NextResponse.json({ error: "Card/Tag ID or password is incorrect." }, { status: 401 })
  }

  const lookupClient = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: profiles, error: lookupError } = await lookupClient
    .from("profiles")
    .select("email, card_id")
    .ilike("card_id", cardId)
    .limit(2)

  if (lookupError || !profiles || profiles.length !== 1) {
    return NextResponse.json({ error: "Card/Tag ID or password is incorrect." }, { status: 401 })
  }

  const profile = profiles[0] as { email: string; card_id: string | null }
  if ((profile.card_id ?? "").trim().toLowerCase() !== cardId.toLowerCase()) {
    return NextResponse.json({ error: "Card/Tag ID or password is incorrect." }, { status: 401 })
  }

  const { data, error } = await authClient.auth.signInWithPassword({
    email: profile.email.trim().toLowerCase(),
    password,
  })
  if (error || !data.session) {
    return NextResponse.json({ error: "Card/Tag ID or password is incorrect." }, { status: 401 })
  }

  return NextResponse.json({ session: data.session })
}
