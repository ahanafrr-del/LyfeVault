import { createBrowserClient } from "@supabase/ssr"

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }
  return { url, anonKey }
}

export function createClient() {
  const { url, anonKey } = getSupabaseConfig()
  return createBrowserClient(url, anonKey, {
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
  })
}

export const supabase = createClient()
