import { NextResponse } from "next/server"
import { getStripeClient } from "@/lib/stripe"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const PLANS = {
  monthly: { amount: 15000, interval: "month" as const, name: "LyfeVault Monthly" },
  yearly: { amount: 150000, interval: "year" as const, name: "LyfeVault Yearly" },
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Sign in to renew your subscription." }, { status: 401 })

  let planType: keyof typeof PLANS
  let idempotencyKey: string
  try {
    const body = await request.json() as { planType?: unknown; idempotencyKey?: unknown }
    if (body.planType !== "monthly" && body.planType !== "yearly") return NextResponse.json({ error: "Choose a valid subscription plan." }, { status: 400 })
    if (typeof body.idempotencyKey !== "string" || !/^[0-9a-f-]{36}$/i.test(body.idempotencyKey)) return NextResponse.json({ error: "Refresh and try again." }, { status: 400 })
    planType = body.planType
    idempotencyKey = body.idempotencyKey
  } catch {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("main_profile_id,card_id")
    .eq("auth_user_id", user.id)
    .maybeSingle()
  if (profileError || !profile?.card_id || !profile.main_profile_id) return NextResponse.json({ error: "Your LyfeVault profile is not ready for renewal." }, { status: 409 })

  const plan = PLANS[planType]
  const origin = new URL(request.url).origin
  const emergencyUrl = `${origin}/c/${encodeURIComponent(profile.card_id)}`
  const metadata = {
    user_id: user.id,
    main_profile_id: profile.main_profile_id,
    card_id: profile.card_id,
    emergency_url: emergencyUrl,
    plan_type: planType,
  }

  try {
    const stripe = getStripeClient()
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: "inr",
          unit_amount: plan.amount,
          recurring: { interval: plan.interval },
          product_data: { name: plan.name, description: "LyfeVault health passport subscription" },
        },
        quantity: 1,
      }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}/?billing=success`,
      cancel_url: `${origin}/?billing=cancelled`,
    }, { idempotencyKey })

    if (!session.url) return NextResponse.json({ error: "Stripe did not return a checkout link." }, { status: 502 })
    return NextResponse.json({ url: session.url })
  } catch {
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 503 })
  }
}
