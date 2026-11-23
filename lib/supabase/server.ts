import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }
  return { url, anonKey }
}

export async function createServerSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig()
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server components cannot write cookies; proxy.ts refreshes the session.
        }
      },
    },
  })
}
