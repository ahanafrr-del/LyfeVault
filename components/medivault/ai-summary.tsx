"use client"

import { CheckCircle2, Sparkles, AlertTriangle, Pill, FileText, Droplet } from "lucide-react"
import { ModalShell } from "./shared"
import { computeAge, type UserProfile } from "@/lib/store"

export function AiSummary({
  user,
  onClose,
}: {
  user: UserProfile
  onClose: () => void
}) {
  const age = computeAge(user.dob)
  const latest = user.reports[0]

  const sections: { icon: typeof Droplet; title: string; lines: string[] }[] = [
    {
      icon: Droplet,
      title: "Patient Overview",
      lines: [
        `${user.name || "Patient"}${age !== null ? `, ${age} years` : ""}${
          user.gender ? `, ${user.gender}` : ""
        }`,
        `Blood group ${user.bloodGroup || "not set"}`,
      ],
    },
    {
      icon: AlertTriangle,
      title: "Verified Allergies",
      lines: user.allergies.length ? user.allergies : ["No known allergies on record"],
    },
    {
      icon: FileText,
      title: "Scans & Reports",
      lines: user.reports.length
        ? [
            `${user.reports.length} report(s) on file`,
            latest ? `Latest: ${latest.specialization} with ${latest.doctorName} (${latest.date})` : "",
          ].filter(Boolean)
        : ["No reports uploaded yet"],
    },
    {
      icon: Pill,
      title: "Active Medications",
      lines: user.medications.length ? user.medications : ["No active medications"],
    },
  ]

  return (
    <ModalShell title="AI Health Summary" subtitle="Auto-generated from your record" onClose={onClose} headerAccent>
      <div className="space-y-4 bg-secondary p-5">
        <div className="flex items-center gap-3 rounded-2xl bg-accent/10 p-4">
          <Sparkles className="h-6 w-6 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed text-foreground">
            Here is a concise, AI-generated overview of your MediVault profile that you can share with a
            provider.
          </p>
        </div>

        {sections.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.title} className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="mb-2.5 flex items-center gap-2 text-primary">
                <Icon className="h-5 w-5" />
                <h3 className="font-bold text-foreground">{s.title}</h3>
              </div>
              <ul className="space-y-2">
                {s.lines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span className="leading-relaxed">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </ModalShell>
  )
}
