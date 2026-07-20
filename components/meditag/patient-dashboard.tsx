"use client"

import Image from "next/image"
import { Droplet, Phone, BadgeCheck, Pill, Stethoscope, ChevronRight, Sparkles, Clock } from "lucide-react"
import { PATIENT } from "@/lib/meditag-data"

export function PatientDashboard({
  onOpenDoctorPortal,
  onOpenTimeline,
  onOpenAISummary,
}: {
  onOpenDoctorPortal: () => void
  onOpenTimeline: () => void
  onOpenAISummary: () => void
}) {
  const p = PATIENT
  return (
    <div className="min-h-full bg-background pb-8">
      {/* Header */}
      <div className="rounded-b-[2rem] bg-gradient-to-b from-primary to-sky-400 px-5 pb-8 pt-12 text-primary-foreground">
        <div className="flex items-center gap-4">
          <Image
            src={p.photo || "/placeholder.svg"}
            alt={`Portrait of ${p.name}`}
            width={60}
            height={60}
            className="h-15 w-15 rounded-2xl border-2 border-white/40 object-cover"
          />
          <div className="flex-1">
            <p className="text-xs opacity-80">Welcome back</p>
            <h1 className="text-xl font-bold">{p.name}</h1>
            <p className="font-mono text-[11px] opacity-80">{p.id}</p>
          </div>
          <div className="flex flex-col items-center rounded-2xl bg-white/20 px-3 py-2 backdrop-blur">
            <Droplet className="h-4 w-4" />
            <span className="text-lg font-extrabold">{p.bloodGroup}</span>
          </div>
        </div>
        <div className="mt-4 flex gap-3 text-sm">
          <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{p.age} yrs</span>
          <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">{p.gender}</span>
          <span className="rounded-full bg-white/20 px-3 py-1 backdrop-blur">DOB {p.dob}</span>
        </div>
      </div>

      <div className="-mt-4 space-y-4 px-5">
        {/* Emergency contacts */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-foreground">Emergency Contacts</h2>
          <div className="space-y-2">
            {p.emergencyContacts.map((c) => (
              <div key={c.phone} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Phone className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.relation} · {c.phone}
                  </p>
                </div>
                {c.accessGranted && (
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                    <BadgeCheck className="h-3 w-3" /> ID Access
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Allergies */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-foreground">Allergies</h2>
          <div className="flex flex-wrap gap-2">
            {p.allergies.map((a) => (
              <span
                key={a.name}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  a.level === "high"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {a.name}
              </span>
            ))}
          </div>
        </section>

        {/* Medications */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <Pill className="h-4 w-4 text-primary" /> Current Medications
          </h2>
          <div className="flex flex-wrap gap-2">
            {p.medications.map((m) => (
              <div key={m.name} className="rounded-xl bg-secondary/60 px-3 py-2">
                <p className="text-sm font-semibold text-foreground">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {m.dosage} · {m.frequency}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenTimeline}
            className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
              <Clock className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-foreground">Medical Timeline</span>
          </button>
          <button
            onClick={onOpenAISummary}
            className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-foreground">AI Health Summary</span>
          </button>
        </div>

        {/* Doctor access banner */}
        <button
          onClick={onOpenDoctorPortal}
          className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left transition hover:bg-primary/10"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Healthcare Provider Access</p>
            <p className="text-xs text-muted-foreground">Verify your NMC number to manage clinical records</p>
          </div>
          <ChevronRight className="h-5 w-5 text-primary" />
        </button>
      </div>
    </div>
  )
}
