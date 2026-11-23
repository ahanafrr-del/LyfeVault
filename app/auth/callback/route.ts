import { NextResponse, type NextRequest } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  if (!code) return NextResponse.redirect(new URL("/?auth=callback-error", request.url))

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL("/?auth=callback-error", request.url))

  return NextResponse.redirect(new URL("/", request.url))
}
