import Stripe from "stripe"

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secretKey) throw new Error("Stripe billing is not configured.")
  return new Stripe(secretKey)
}
