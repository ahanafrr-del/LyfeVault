import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: Request) {
  let cardId = ""
  try {
    const body = await request.json() as { cardId?: unknown }
    cardId = typeof body.cardId === "string" ? body.cardId : ""
  } catch {
    return NextResponse.json({ available: false })
  }
  if (!/^LV-(1[0-9]{3}|2000)$/.test(cardId)) return NextResponse.json({ available: false })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceRoleKey) return NextResponse.json({ error: "Card ID availability is temporarily unavailable." }, { status: 503 })

  try {
    const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await supabase.rpc("is_card_id_available", { check_card_id: cardId })
    if (error) throw error
    return NextResponse.json({ available: Boolean(data) })
  } catch {
    return NextResponse.json({ error: "Card ID availability could not be verified." }, { status: 503 })
  }
}
