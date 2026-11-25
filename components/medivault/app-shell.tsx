"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { CreditCard, FileClock, Home, LogOut, Menu, ShieldCheck, Siren, UserRound, X } from "lucide-react"
import type { UserProfile } from "@/lib/store"
import { Logo } from "./shared"
import { TabBar, type MainTab } from "./tab-bar"

const NAV_ITEMS: { id: MainTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Dashboard", icon: Home },
  { id: "timeline", label: "My Timeline", icon: FileClock },
  { id: "insurance", label: "Health Insurance", icon: CreditCard },
  { id: "emergency", label: "Emergency Access", icon: Siren },
  { id: "privacy", label: "Privacy & Policy", icon: ShieldCheck },
  { id: "profile", label: "Profile", icon: UserRound },
]

export function AppShell({
  user,
  active,
  onNavigate,
  onLogout,
  onAdd,
  showAdd,
  children,
}: {
  user: UserProfile
  active: MainTab
  onNavigate: (tab: MainTab) => void
  onLogout: () => void
  onAdd: () => void
  showAdd: boolean
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  function navigate(tab: MainTab) {
    onNavigate(tab)
    setMenuOpen(false)
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr_auto] bg-background text-foreground md:grid-cols-[248px_minmax(0,1fr)] md:grid-rows-1">
      <aside className="hidden min-h-0 flex-col border-r border-border bg-card md:flex">
        <div className="border-b border-border px-6 py-6"><Logo size="sm" /><p className="mt-3 text-xs text-muted-foreground">A bond that cares, always there.</p></div>
        <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => <NavButton key={item.id} item={item} active={active === item.id} onClick={() => navigate(item.id)} />)}
        </nav>
        <div className="border-t border-border p-3"><button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><LogOut className="size-4" /> Log Out</button><p className="mt-3 px-3 text-[11px] text-muted-foreground">Card ID <span className="font-bold text-primary">{user.cardId || "Pending"}</span></p></div>
      </aside>

      <div className="col-span-1 row-span-1 flex min-h-0 flex-col md:col-start-2 md:row-start-1">
        <header className="relative z-20 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur-md md:px-8 md:py-4">
          <div className="flex items-center gap-3 md:hidden"><button type="button" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="grid size-10 place-items-center rounded-xl border border-border bg-background text-primary">{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button><div className="leading-tight"><p className="text-sm font-bold">LyfeVault</p><p className="text-[11px] text-muted-foreground">{user.cardId || "Card ID pending"}</p></div></div>
          <div className="hidden md:block"><p className="text-xs text-muted-foreground">Welcome back</p><h1 className="text-lg font-bold">{user.name || user.email}</h1></div>
          <div className="ml-auto flex items-center gap-2"><span className="hidden rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary sm:inline-flex">{user.cardId || "Card ID pending"}</span><span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "LV"}</span></div>
        </header>

        {menuOpen && <div className="absolute inset-x-0 top-[4.1rem] z-30 border-b border-border bg-card p-3 shadow-xl md:hidden"><nav aria-label="Mobile navigation" className="flex flex-col gap-1">{NAV_ITEMS.map((item) => <NavButton key={item.id} item={item} active={active === item.id} onClick={() => navigate(item.id)} />)}<button type="button" onClick={onLogout} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-destructive"><LogOut className="size-4" /> Log Out</button></nav></div>}

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        <div className="md:hidden"><TabBar active={active} onNavigate={navigate} onAdd={onAdd} showAdd={showAdd} /></div>
      </div>
    </div>
  )
}

function NavButton({ item, active, onClick }: { item: (typeof NAV_ITEMS)[number]; active: boolean; onClick: () => void }) {
  const Icon = item.icon
  return <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><Icon className="size-4 shrink-0" />{item.label}</button>
}
