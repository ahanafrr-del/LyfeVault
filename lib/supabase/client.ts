import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Only create client on the browser
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be created on the browser')
  }

  if (client) {
    return client
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars are missing, return a dummy client that won't throw
  if (!url || !key) {
    console.warn('[v0] Supabase environment variables not configured')
    // Return a client with dummy values to avoid throwing
    client = createBrowserClient(url || 'https://dummy.supabase.co', key || 'dummy-key')
    return client
  }

  client = createBrowserClient(url, key)
  return client
}
