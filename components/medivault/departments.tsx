"use client"

import { useMemo, useState } from "react"
import {
  Search,
  ChevronRight,
  Heart,
  Brain,
  Scan,
  FlaskConical,
  Bone,
  Ear,
  Smile,
  Sparkles,
  Activity,
} from "lucide-react"
import { ScreenHeader } from "./shared"
import type { UserProfile } from "@/lib/store"

const CATEGORIES: { name: string; icon: typeof Heart; match: string }[] = [
  { name: "Cardiology", icon: Heart, match: "cardio" },
  { name: "Neurology", icon: Brain, match: "neuro" },
  { name: "Dermatology", icon: Sparkles, match: "derma" },
  { name: "Radiology", icon: Scan, match: "radio" },
  { name: "Laboratory", icon: FlaskConical, match: "lab" },
  { name: "Orthopedics", icon: Bone, match: "ortho" },
  { name: "ENT", icon: Ear, match: "ent" },
  { name: "Dental", icon: Smile, match: "dent" },
  { name: "Psychiatry", icon: Activity, match: "psych" },
]

export function Departments({
  user,
  onBack,
}: {
  user: UserProfile
  onBack: () => void
}) {
  const [query, setQuery] = useState("")

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of CATEGORIES) {
      map[c.name] = user.reports.filter((r) =>
        r.specialization.toLowerCase().includes(c.match),
      ).length
    }
    return map
  }, [user.reports])

  const filtered = CATEGORIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="flex h-full flex-col bg-secondary">
      <ScreenHeader title="Report Folders" subtitle="Browse by department" onBack={onBack} />

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports..."
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <ul className="space-y-2.5">
          {filtered.map((c) => {
            const Icon = c.icon
            const count = counts[c.name]
            return (
              <li key={c.name}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl bg-card p-3.5 text-left shadow-sm transition hover:shadow-md hover:shadow-primary/10"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {count} report{count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
