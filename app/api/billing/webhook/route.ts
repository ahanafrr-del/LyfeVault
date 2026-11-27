import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"
import { getStripeClient } from "@/lib/stripe"

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!signature || !webhookSecret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripeClient().webhooks.constructEvent(await request.text(), signature, webhookSecret)
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 })
  }

  if (event.type !== "invoice.paid") return NextResponse.json({ received: true })
  const invoice = event.data.object as Stripe.Invoice
  if (invoice.status !== "paid") return NextResponse.json({ received: true })

  const subscriptionDetails = invoice.parent?.subscription_details
  const metadata = subscriptionDetails?.metadata
  if (!metadata?.user_id || !metadata.main_profile_id || !metadata.card_id || !metadata.plan_type) {
    return NextResponse.json({ received: true })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceRoleKey) return NextResponse.json({ error: "Payment alerts are not configured." }, { status: 503 })
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const paidAt = new Date((invoice.status_transitions.paid_at ?? invoice.created) * 1000).toISOString()
  const alert = {
    user_id: metadata.user_id,
    main_profile_id: metadata.main_profile_id,
    card_id: metadata.card_id,
    emergency_url: metadata.emergency_url || `/c/${metadata.card_id}`,
    plan_type: metadata.plan_type,
    amount_paid: invoice.amount_paid / 100,
    timestamp: paidAt,
  }

  const { data: existingAlert, error: lookupError } = await supabase
    .from("admin_payment_alerts")
    .select("user_id")
    .eq("user_id", alert.user_id)
    .eq("timestamp", alert.timestamp)
    .maybeSingle()
  if (lookupError) return NextResponse.json({ error: "Payment alert status could not be checked." }, { status: 503 })

  if (!existingAlert) {
    const { error: insertError } = await supabase.from("admin_payment_alerts").insert(alert)
    if (insertError) return NextResponse.json({ error: "Payment alert could not be recorded." }, { status: 503 })
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ subscription_status: "active", subscription_plan: metadata.plan_type })
    .eq("auth_user_id", metadata.user_id)
  if (profileError) return NextResponse.json({ error: "Subscription status could not be updated." }, { status: 503 })

  return NextResponse.json({ received: true })
}
