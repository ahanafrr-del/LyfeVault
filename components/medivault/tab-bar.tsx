"use client"

import { Home, Clock, Bell, User, Plus } from "lucide-react"

export type MainTab = "home" | "timeline" | "notifications" | "profile"

export function TabBar({
  active,
  onNavigate,
  onAdd,
  showAdd = true,
}: {
  active: MainTab
  onNavigate: (tab: MainTab) => void
  onAdd: () => void
  /** Minors (read-only profiles) never see the "Add Report" FAB. */
  showAdd?: boolean
}) {
  const tabs: { id: MainTab; label: string; icon: typeof Home }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "notifications", label: "Alerts", icon: Bell },
    { id: "profile", label: "Profile", icon: User },
  ]

  // Without the FAB, render all four tabs evenly; with it, split around the center button.
  if (!showAdd) {
    return (
      <nav className="relative z-30 flex items-center justify-around border-t border-border bg-card px-2 pb-2 pt-2.5">
        {tabs.map((t) => (
          <TabButton key={t.id} tab={t} active={active === t.id} onClick={() => onNavigate(t.id)} />
        ))}
      </nav>
    )
  }

  return (
    <nav className="relative z-30 flex items-center justify-around border-t border-border bg-card px-2 pb-2 pt-2.5">
      {tabs.slice(0, 2).map((t) => (
        <TabButton key={t.id} tab={t} active={active === t.id} onClick={() => onNavigate(t.id)} />
      ))}

      <div className="relative w-14">
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add new report"
          className="absolute -top-9 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/40 ring-4 ring-card transition hover:brightness-110"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>
      </div>

      {tabs.slice(2).map((t) => (
        <TabButton key={t.id} tab={t} active={active === t.id} onClick={() => onNavigate(t.id)} />
      ))}
    </nav>
  )
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: { label: string; icon: typeof Home }
  active: boolean
  onClick: () => void
}) {
  const Icon = tab.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      {tab.label}
    </button>
  )
}
