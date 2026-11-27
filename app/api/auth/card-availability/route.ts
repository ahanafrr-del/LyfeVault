import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceRoleKey) return NextResponse.json({ error: "Card ID availability is temporarily unavailable." }, { status: 503 })

  let cardId = ""
  try {
    const body = await request.json() as { cardId?: unknown }
    cardId = typeof body.cardId === "string" ? body.cardId.trim().toUpperCase() : ""
  } catch {
    return NextResponse.json({ error: "Enter a valid Card ID." }, { status: 400 })
  }
  if (!/^LV-(1[0-9]{3}|2000)$/.test(cardId)) return NextResponse.json({ error: "Enter a Card ID from LV-1000 through LV-2000." }, { status: 400 })

  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const [{ data: profile, error: profileError }, { data: dependent, error: dependentError }] = await Promise.all([
    supabase.from("profiles").select("card_id").eq("card_id", cardId).maybeSingle(),
    supabase.from("dependents").select("card_id").eq("card_id", cardId).maybeSingle(),
  ])
  if (profileError || dependentError) return NextResponse.json({ error: "Card ID availability could not be verified." }, { status: 503 })
  return NextResponse.json({ available: !profile && !dependent })
}
