import { notFound } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"

type PublicCardRow = {
  card_id: string
  name: string | null
  dob: string | null
  blood_group: string | null
  allergies: unknown
  conditions: unknown
  medications: unknown
  contacts: unknown
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}

function contacts(value: unknown): Array<{ name: string; relation: string; phone: string }> {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const record = item as Record<string, unknown>
    const phone = typeof record.phone === "string" ? record.phone : ""
    return [{
      name: typeof record.name === "string" ? record.name : "Emergency contact",
      relation: typeof record.relation === "string" ? record.relation : "",
      phone,
    }]
  })
}

function TriageSection({ title, values }: { title: string; values: string[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
      <p className="mt-2 text-sm font-semibold text-foreground">{values.length ? values.join(", ") : "None listed"}</p>
    </section>
  )
}

export default async function PublicEmergencyCard({ params }: { params: Promise<{ card_id: string }> }) {
  const { card_id: rawCardId } = await params
  const cardId = decodeURIComponent(rawCardId).trim().toUpperCase()
  if (!/^LV-(1[0-9]{3}|2000)$/.test(cardId)) notFound()

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("public_emergency_cards")
    .select("card_id,name,dob,blood_group,allergies,conditions,medications,contacts")
    .eq("card_id", cardId)
    .maybeSingle()
  if (error || !data) notFound()

  const profile = data as PublicCardRow
  const emergencyContacts = contacts(profile.contacts)
  return (
    <main className="min-h-screen bg-secondary px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/75">Emergency medical card</p>
          <h1 className="mt-2 text-3xl font-black">{profile.name || "LyfeVault member"}</h1>
          <p className="mt-2 font-mono text-sm tracking-widest text-primary-foreground/80">{profile.card_id}</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-primary-foreground/70">Date of birth</p><p className="mt-1 font-semibold">{profile.dob || "Not listed"}</p></div>
            <div className="rounded-xl bg-white/10 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-primary-foreground/70">Blood group</p><p className="mt-1 font-semibold">{profile.blood_group || "Not listed"}</p></div>
          </div>
        </header>

        <section aria-label="Emergency triage information" className="grid gap-3 sm:grid-cols-2">
          <TriageSection title="Allergies" values={list(profile.allergies)} />
          <TriageSection title="Conditions" values={list(profile.conditions)} />
          <TriageSection title="Medications" values={list(profile.medications)} />
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Emergency contacts</h2>
            <ul className="mt-2 space-y-3">
              {emergencyContacts.length ? emergencyContacts.map((contact, index) => (
                <li key={`${contact.phone}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0"><span className="block truncate font-semibold">{contact.name}</span>{contact.relation && <span className="text-xs text-muted-foreground">{contact.relation}</span>}</span>
                  {contact.phone && <a className="shrink-0 font-bold text-primary underline underline-offset-2" href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}>{contact.phone}</a>}
                </li>
              )) : <li className="text-sm font-semibold text-foreground">None listed</li>}
            </ul>
          </section>
        </section>
        <p className="text-center text-xs text-muted-foreground">Read-only emergency information. No account sign-in is required.</p>
      </div>
    </main>
  )
}
