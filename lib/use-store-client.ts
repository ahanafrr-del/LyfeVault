"use client"

/**
 * Client-side smart store selector: automatically uses Supabase if env vars
 * are configured, otherwise falls back to localStorage.
 */

import { useEffect, useState } from "react"
import { useStore as useLocalStore, type StoreApi } from "@/lib/store"

export function useStoreClient(): StoreApi {
  const [store, setStore] = useState<StoreApi | null>(null)
  const localStore = useLocalStore()

  useEffect(() => {
    // Check if Supabase is configured
    const hasSupabaseConfig =
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (hasSupabaseConfig) {
      // Dynamically import and use Supabase store
      import("@/lib/store-supabase").then(({ useSupabaseStore }) => {
        setStore(useSupabaseStore())
      })
    } else {
      // Use local store
      setStore(localStore)
    }
  }, [localStore])

  // Return a placeholder until store is ready
  if (!store) {
    return localStore
  }

  return store
}
