import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST() {
  const sessionClient = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await sessionClient.auth.getUser()
  if (authError || !user?.email) {
    return NextResponse.json({ error: "Sign in again before deleting your account." }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "Account deletion is temporarily unavailable." }, { status: 503 })
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const [{ data: insurance, error: insuranceError }, { data: ownedReports, error: reportsError }, { data: dependents, error: dependentsError }] = await Promise.all([
    admin.from("health_insurance").select("ecard_path").eq("user_id", user.id).maybeSingle(),
    admin.from("medical_reports").select("file_path").eq("owner_email", user.email),
    admin.from("dependents").select("id").eq("guardian_id", user.id),
  ])
  if (insuranceError || reportsError || dependentsError) {
    return NextResponse.json({ error: "Account records could not be prepared for deletion." }, { status: 500 })
  }

  const dependentIds = (dependents ?? []).map((dependent) => String(dependent.id))
  const { data: dependentReports, error: dependentReportsError } = dependentIds.length
    ? await admin.from("medical_reports").select("file_path").in("dependent_id", dependentIds)
    : { data: [], error: null }
  if (dependentReportsError) {
    return NextResponse.json({ error: "Dependent records could not be prepared for deletion." }, { status: 500 })
  }

  const insurancePaths = insurance?.ecard_path ? [insurance.ecard_path] : []
  const reportPaths = [...(ownedReports ?? []), ...(dependentReports ?? [])]
    .map((report) => report.file_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0)
  if (insurancePaths.length) {
    const { error } = await admin.storage.from("insurance-ecards").remove(insurancePaths)
    if (error) return NextResponse.json({ error: "Private insurance files could not be deleted." }, { status: 500 })
  }
  if (reportPaths.length) {
    const { error } = await admin.storage.from("medical-reports").remove(reportPaths)
    if (error) return NextResponse.json({ error: "Medical report files could not be deleted." }, { status: 500 })
  }

  const { error: dataError } = await admin.rpc("delete_lyfevault_user_data", {
    p_user_id: user.id,
    p_email: user.email,
  })
  if (dataError) {
    return NextResponse.json({ error: "Account records could not be deleted. Please contact support." }, { status: 500 })
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return NextResponse.json({ error: "Your records were removed, but the sign-in account could not be deleted. Please contact support." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
