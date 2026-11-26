"use client"

import { Bell, Lock, Phone, ShieldCheck, HeartPulse, AlertTriangle, Pill } from "lucide-react"
import { computeAge, type UserProfile } from "@/lib/store"

export function MinorDashboard({ user, onNotifications }: { user: UserProfile; onNotifications: () => void }) {
  const age = computeAge(user.dob)
  const firstName = user.name.split(" ")[0] || "there"
  const initials = user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "U"

  return (
    <div className="flex-1 overflow-y-auto bg-secondary pb-6">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-secondary/90 px-4 py-3.5 backdrop-blur-md">
        <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">Hello,</p><div className="flex items-center gap-2"><h1 className="truncate text-lg font-bold text-foreground">{firstName}</h1><span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent"><Lock className="size-3" /> View only</span></div></div>
        <button type="button" onClick={onNotifications} aria-label="Notifications" className="grid size-10 place-items-center rounded-full bg-card text-primary shadow-sm"><Bell className="size-5" /></button>
        <div aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{initials}</div>
      </header>

      <div className="flex flex-col gap-4 px-4">
        <section className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/25">
          <div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15"><ShieldCheck className="size-6" /></span><div><h2 className="text-sm font-bold">Safe Mode Active</h2><p className="text-xs text-primary-foreground/80">{user.bloodGroup || "Blood N/A"}{age !== null ? ` · ${age} yrs` : ""} · Read-only records</p></div></div>
        </section>
        <section className="rounded-2xl border border-accent/20 bg-accent/10 p-4 text-sm text-foreground"><p className="font-semibold">Read-only account</p><p className="mt-1 text-muted-foreground">Only a linked parent or guardian can edit this record from their own dashboard.</p></section>
        <ReadOnlyCard icon={<AlertTriangle className="size-5" />} title="Active Allergies" items={user.allergies} empty="No allergies on record" />
        <ReadOnlyCard icon={<HeartPulse className="size-5" />} title="Chronic Conditions" items={user.conditions} empty="No conditions on record" />
        <ReadOnlyCard icon={<Pill className="size-5" />} title="Daily Required Medications" items={user.medications} empty="No medications on record" />
        <section className="rounded-2xl bg-card p-4 shadow-sm"><div className="mb-3 flex items-center gap-2 text-destructive"><Phone className="size-5" /><h2 className="font-bold text-foreground">Call a Guardian</h2></div>{user.contacts.length === 0 ? <p className="text-sm text-muted-foreground">No guardian contacts saved. Ask an adult to add one for you.</p> : <ul className="flex flex-col gap-2.5">{user.contacts.map((contact) => <li key={contact.id}><a href={`tel:${contact.phone}`} className="flex items-center gap-3 rounded-2xl bg-destructive p-3.5 text-white shadow-lg shadow-destructive/25"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/20"><Phone className="size-6" /></span><span className="min-w-0 flex-1"><span className="block truncate text-base font-bold">{contact.name}</span><span className="block truncate text-xs text-white/80">{contact.relation}{contact.phone ? ` · ${contact.phone}` : ""}</span></span><span className="text-xs font-semibold uppercase tracking-wide">Call</span></a></li>)}</ul>}</section>
      </div>
    </div>
  )
}

function ReadOnlyCard({ icon, title, items, empty }: { icon: React.ReactNode; title: string; items: string[]; empty: string }) {
  return <section className="rounded-2xl bg-card p-4 shadow-sm"><div className="mb-3 flex items-center gap-2 text-primary">{icon}<h2 className="font-bold text-foreground">{title}</h2></div>{items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : <ul className="flex flex-wrap gap-2">{items.map((item) => <li key={item} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground"><Lock className="size-3" aria-hidden="true" />{item}</li>)}</ul>}</section>
}
