"use client"

import { useState } from "react"
import useSWR from "swr"
import { ImagePlus, Plus, Siren } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ModalShell } from "./shared"

type Incident = { id: string; incident_type: string; occurred_at: string; location: string; description: string; photo_path: string | null }

async function loadIncidents() {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Sign in to manage incident records.")
  const { data, error } = await supabase.from("emergency_incidents").select("id,incident_type,occurred_at,location,description,photo_path").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(20)
  if (error) throw error
  return { userId: user.id, incidents: (data ?? []) as Incident[] }
}

export function EmergencyIncidentLog() {
  const { data, error, isLoading, mutate } = useSWR("lyfevault-emergency-incidents", loadIncidents)
  const [open, setOpen] = useState(false)
  const [type, setType] = useState("Medical emergency")
  const [occurredAt, setOccurredAt] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16))
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function saveIncident(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data?.userId || !description.trim() || !occurredAt) return setMessage("Add a date and time, and describe the incident.")
    if (photo && (!/^image\/(jpeg|png|webp)$/.test(photo.type) || photo.size > 10_485_760)) return setMessage("Choose a JPG, PNG, or WEBP photo under 10 MB.")
    setSaving(true)
    setMessage(null)
    let photoPath: string | null = null
    try {
      if (photo) {
        const name = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_")
        photoPath = `${data.userId}/${crypto.randomUUID()}/${name}`
        const { error: uploadError } = await supabase.storage.from("emergency-incidents").upload(photoPath, photo, { contentType: photo.type, upsert: false })
        if (uploadError) throw uploadError
      }
      const { error: insertError } = await supabase.from("emergency_incidents").insert({ user_id: data.userId, incident_type: type, occurred_at: new Date(occurredAt).toISOString(), location: location.trim(), description: description.trim(), photo_path: photoPath })
      if (insertError) throw insertError
      await mutate()
      setOpen(false)
      setDescription("")
      setLocation("")
      setPhoto(null)
    } catch (caught) {
      if (photoPath) await supabase.storage.from("emergency-incidents").remove([photoPath])
      setMessage(caught instanceof Error ? caught.message : "The incident could not be saved.")
    } finally { setSaving(false) }
  }

  return <section className="rounded-2xl bg-card p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-foreground">Personal Emergency Incident Log</h2><p className="mt-1 text-xs text-muted-foreground">Private to your LyfeVault account.</p></div><button type="button" onClick={() => { setMessage(null); setOpen(true) }} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><Plus className="size-4" /> Log incident</button></div>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">Incident log is unavailable.</p>}
    {isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading incident history…</p> : !data?.incidents.length ? <p className="mt-3 text-sm text-muted-foreground">No incidents recorded.</p> : <ul className="mt-3 flex flex-col gap-2">{data.incidents.map((incident) => <li key={incident.id} className="rounded-xl bg-secondary p-3"><div className="flex items-start gap-2"><Siren className="mt-0.5 size-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-sm font-semibold text-foreground">{incident.incident_type}</p><p className="text-xs text-muted-foreground">{new Date(incident.occurred_at).toLocaleString()}{incident.location ? ` · ${incident.location}` : ""}</p><p className="mt-1 text-sm text-foreground">{incident.description}</p></div></div></li>)}</ul>}
    {open && <ModalShell title="Personal Emergency Incident" subtitle="Create a private record in your LyfeVault" onClose={() => setOpen(false)}><form onSubmit={saveIncident} className="flex flex-col gap-4 p-5"><label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">Incident type<select className={INPUT} value={type} onChange={(event) => setType(event.target.value)}><option>Medical emergency</option><option>Accident or injury</option><option>Ambulance transport</option><option>Hospital admission</option><option>Other</option></select></label><label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">Date and time<input required type="datetime-local" className={INPUT} value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} /></label><label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">Location<input maxLength={240} className={INPUT} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Address or place" /></label><label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">Description<textarea required maxLength={4000} className={`${INPUT} min-h-24 resize-y`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What happened and what care was provided?" /></label><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-secondary p-3 text-sm text-foreground"><ImagePlus className="size-5 text-primary" />{photo?.name ?? "Add an optional photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} /></label>{message && <p role="alert" className="text-sm text-destructive">{message}</p>}<button disabled={saving} className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save incident"}</button></form></ModalShell>}
  </section>
}

const INPUT = "w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
