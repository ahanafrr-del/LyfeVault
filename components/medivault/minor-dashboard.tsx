"use client"

import { useRef, useState } from "react"
import {
  Bell,
  Lock,
  Unlock,
  AlertTriangle,
  HeartPulse,
  Pill,
  Phone,
  ShieldCheck,
  Bot,
  Send,
  KeyRound,
  Save,
  Droplet,
  User,
  Plus,
  Trash2,
} from "lucide-react"
import { ModalShell } from "./shared"
import { computeAge, uid, BLOOD_GROUPS, type EmergencyContact, type StoreApi, type UserProfile } from "@/lib/store"

type Draft = {
  bloodGroup: string
  allergies: string
  conditions: string
  medications: string
  contacts: EmergencyContact[]
}

function toDraft(user: UserProfile): Draft {
  return {
    bloodGroup: user.bloodGroup,
    allergies: user.allergies.join(", "),
    conditions: user.conditions.join(", "),
    medications: user.medications.join(", "),
    contacts: user.contacts.map((c) => ({ ...c })),
  }
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

export function MinorDashboard({
  store,
  user,
  onNotifications,
  onEditModeChange,
}: {
  store: StoreApi
  user: UserProfile
  onNotifications: () => void
  /** Notifies the parent shell when parental edit mode toggles, so it can show the upload FAB. */
  onEditModeChange?: (unlocked: boolean) => void
}) {
  const firstName = user.name.split(" ")[0] || "there"
  const age = computeAge(user.dob)
  const initials = user.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U"

  // Parental override state. The 4-digit code lives on the dependent record that a
  // guardian created when linking this child's login email.
  const linkedDependent = store.getDependentByEmail(user.email)
  const [pinOpen, setPinOpen] = useState(false)
  const [pin, setPin] = useState("")
  const [pinError, setPinError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => toDraft(user))
  const [savedFlash, setSavedFlash] = useState(false)

  function openPin() {
    setPin("")
    setPinError(null)
    setPinOpen(true)
  }

  function verifyPin() {
    const stored = linkedDependent?.parentalSecretCode ?? ""
    if (!stored) {
      setPinError("No Parental Secret Code is set for this profile. Ask the guardian to link it.")
      return
    }
    if (pin !== stored) {
      setPinError("Incorrect code. Access stays locked in read-only mode.")
      return
    }
    setDraft(toDraft(user))
    setEditMode(true)
    onEditModeChange?.(true)
    setPinOpen(false)
  }

  function saveEdits() {
    store.updateProfile({
      bloodGroup: draft.bloodGroup,
      allergies: splitList(draft.allergies),
      conditions: splitList(draft.conditions),
      medications: splitList(draft.medications),
      contacts: draft.contacts
        .map((c) => ({ ...c, name: c.name.trim(), phone: c.phone.trim() }))
        .filter((c) => c.name || c.phone),
    })
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  function lockProfile() {
    setEditMode(false)
    onEditModeChange?.(false)
    setSavedFlash(false)
  }

  function setDraftField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function addContact() {
    setDraft((d) => ({
      ...d,
      contacts: [...d.contacts, { id: uid(), name: "", relation: "Guardian", phone: "" }],
    }))
  }

  function updateContact(id: string, partial: Partial<EmergencyContact>) {
    setDraft((d) => ({
      ...d,
      contacts: d.contacts.map((c) => (c.id === id ? { ...c, ...partial } : c)),
    }))
  }

  function removeContact(id: string) {
    setDraft((d) => ({ ...d, contacts: d.contacts.filter((c) => c.id !== id) }))
  }

  return (
    <div className="flex-1 overflow-y-auto bg-secondary pb-6">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-secondary/90 px-4 py-3.5 backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Hello,</p>
          <div className="flex items-center gap-2">
            <p className="truncate text-lg font-bold text-foreground">{firstName}</p>
            {editMode ? (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Unlock className="h-3 w-3" />
                Parental edit
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                <Lock className="h-3 w-3" />
                View only
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onNotifications}
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-full bg-card text-primary shadow-sm"
        >
          <Bell className="h-5 w-5" />
        </button>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {initials}
        </div>
      </div>

      <div className="space-y-4 px-4">
        {/* Safe-mode identity banner */}
        <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/25">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/15">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">{editMode ? "Guardian Access Unlocked" : "Safe Mode Active"}</p>
              <p className="text-xs text-primary-foreground/80">
                {editMode ? (
                  <>Edit and save records in real-time</>
                ) : (
                  <>
                    {draft.bloodGroup || user.bloodGroup || "Blood N/A"}
                    {age !== null ? ` \u00b7 ${age} yrs` : ""}
                    {" \u00b7 Read-only records"}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Parental Master Access control */}
        {editMode ? (
          <div className="rounded-2xl bg-foreground p-4 text-background shadow-lg">
            <div className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              <p className="text-sm font-bold">Parental Master Access</p>
              {savedFlash && (
                <span className="ml-auto rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                  Saved
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-background/75">
              You can edit the medical snapshot, allergies, chronic conditions, and emergency
              contacts below. Changes save instantly to this dependent&apos;s vault.
            </p>
            <div className="mt-3 flex gap-2.5">
              <button
                type="button"
                onClick={saveEdits}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-sm font-bold text-accent-foreground transition hover:brightness-110"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
              <button
                type="button"
                onClick={lockProfile}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-background/15 py-2.5 text-sm font-bold text-background transition hover:bg-background/25"
              >
                <Lock className="h-4 w-4" />
                Lock Profile
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openPin}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background shadow-lg transition hover:brightness-125"
          >
            <KeyRound className="h-5 w-5" />
            Parental Master Access
          </button>
        )}

        {editMode ? (
          <>
            {/* Medical snapshot (blood group) */}
            <section className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-primary">
                <Droplet className="h-5 w-5" />
                <h2 className="font-bold text-foreground">Medical Snapshot</h2>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Blood Group</span>
                <select
                  className={SELECT}
                  value={draft.bloodGroup}
                  onChange={(e) => setDraftField("bloodGroup", e.target.value)}
                >
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <EditableCard
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="warn"
              title="Active Allergies"
              value={draft.allergies}
              placeholder="Comma separated, e.g. Penicillin, Peanuts"
              onChange={(v) => setDraftField("allergies", v)}
            />
            <EditableCard
              icon={<HeartPulse className="h-5 w-5" />}
              tone="primary"
              title="Chronic Conditions"
              value={draft.conditions}
              placeholder="Comma separated, e.g. Asthma, Diabetes"
              onChange={(v) => setDraftField("conditions", v)}
            />
            <EditableCard
              icon={<Pill className="h-5 w-5" />}
              tone="accent"
              title="Daily Required Medications"
              value={draft.medications}
              placeholder="Comma separated, e.g. Inhaler, Insulin"
              onChange={(v) => setDraftField("medications", v)}
            />

            {/* Emergency contacts editor */}
            <section className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-destructive">
                <Phone className="h-5 w-5" />
                <h2 className="font-bold text-foreground">Emergency Contacts</h2>
              </div>
              <div className="flex flex-col gap-3">
                {draft.contacts.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border bg-secondary p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <input
                        className={ROW_INPUT}
                        placeholder="Contact name"
                        value={c.name}
                        onChange={(e) => updateContact(c.id, { name: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => removeContact(c.id)}
                        aria-label="Remove contact"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive transition hover:bg-destructive/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="tel"
                        className={ROW_INPUT}
                        placeholder="Phone number"
                        value={c.phone}
                        onChange={(e) => updateContact(c.id, { phone: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm font-semibold text-primary transition hover:bg-secondary"
                >
                  <Plus className="h-4 w-4" />
                  Add Contact
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            {/* 1. Active Allergies */}
            <LockedCard
              icon={<AlertTriangle className="h-5 w-5" />}
              tone="warn"
              title="Active Allergies"
              items={user.allergies}
              empty="No allergies on record"
            />

            {/* 2. Chronic Conditions */}
            <LockedCard
              icon={<HeartPulse className="h-5 w-5" />}
              tone="primary"
              title="Chronic Conditions"
              items={user.conditions}
              empty="No chronic conditions on record"
            />

            {/* 3. Daily Required Medications */}
            <LockedCard
              icon={<Pill className="h-5 w-5" />}
              tone="accent"
              title="Daily Required Medications"
              items={user.medications}
              empty="No medications on record"
            />

            {/* 4. Emergency Guardian Call Deck */}
            <section className="rounded-2xl bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-destructive">
                <Phone className="h-5 w-5" />
                <h2 className="font-bold text-foreground">Call a Guardian</h2>
              </div>
              {user.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No guardian contacts saved. Ask an adult to add one for you.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {user.contacts.map((c) => (
                    <a
                      key={c.id}
                      href={`tel:${c.phone}`}
                      className="flex items-center gap-3 rounded-2xl bg-destructive p-3.5 text-white shadow-lg shadow-destructive/25 transition hover:brightness-105"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20">
                        <Phone className="h-6 w-6" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-bold leading-tight">
                          {c.name}
                        </span>
                        <span className="block truncate text-xs text-white/80">
                          {c.relation}
                          {c.phone ? ` \u00b7 ${c.phone}` : ""}
                        </span>
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide">Call</span>
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* 5. Micro AI Safety Chatbot */}
            <SafetyChatbot user={user} />
          </>
        )}
      </div>

      {pinOpen && (
        <ModalShell
          title="Parental Master Access"
          subtitle="Enter the 5-12 character secret code"
          headerAccent
          onClose={() => setPinOpen(false)}
        >
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-primary">
              <ShieldCheck className="h-6 w-6 shrink-0" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                This unlocks temporary edit access so a guardian can update {firstName}&apos;s
                medical records. Read-only stays enforced without the correct code.
              </p>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                Parental Secret Code
              </span>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <KeyRound className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  maxLength={12}
                  autoFocus
                  className={`${SELECT} pl-10 tracking-widest`}
                  placeholder="Secret code"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.slice(0, 12))
                    setPinError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) verifyPin()
                  }}
                />
              </div>
            </label>

            {pinError && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={verifyPin}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-accent-foreground shadow-lg shadow-accent/25 transition hover:brightness-110"
            >
              <Unlock className="h-4 w-4" />
              Unlock Edit Access
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  )
}

const SELECT =
  "w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

const ROW_INPUT =
  "min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"

function EditableCard({
  icon,
  title,
  value,
  placeholder,
  onChange,
  tone,
}: {
  icon: React.ReactNode
  title: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  tone: "warn" | "primary" | "accent"
}) {
  const toneText = { warn: "text-destructive", primary: "text-primary", accent: "text-accent" } as const
  return (
    <section className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex items-center gap-2 ${toneText[tone]}`}>
          {icon}
          <h2 className="font-bold text-foreground">{title}</h2>
        </div>
        <Unlock className="h-4 w-4 text-primary" aria-label="Editable" />
      </div>
      <input
        className={SELECT}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </section>
  )
}

function LockedCard({
  icon,
  title,
  items,
  empty,
  tone,
}: {
  icon: React.ReactNode
  title: string
  items: string[]
  empty: string
  tone: "warn" | "primary" | "accent"
}) {
  const toneMap = {
    warn: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
  } as const
  return (
    <section className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex items-center gap-2 ${toneMap[tone].split(" ")[1]}`}>
          {icon}
          <h2 className="font-bold text-foreground">{title}</h2>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground/60" aria-label="Read only" />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground"
            >
              <Lock className="h-3 w-3 opacity-60" />
              {item}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

type Message = { role: "user" | "bot"; text: string }

function SafetyChatbot({ user }: { user: UserProfile }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: `Hi ${user.name.split(" ")[0] || "there"}! I'm your safety helper. Ask me things like "Can I eat this if I have an allergy?"`,
    },
  ])
  const [input, setInput] = useState("")
  const listRef = useRef<HTMLDivElement>(null)

  function respond(q: string): string {
    const t = q.toLowerCase()
    const allergyHit = user.allergies.find((a) => t.includes(a.toLowerCase().split(" ")[0]))
    if (allergyHit) {
      return `Careful! You are allergic to ${allergyHit}. Do not eat or use it, and tell an adult right away.`
    }
    if (t.includes("eat") || t.includes("candy") || t.includes("food") || t.includes("peanut")) {
      return user.allergies.length
        ? `Your allergies are: ${user.allergies.join(", ")}. If the food has any of these, do not eat it. When unsure, ask a guardian first.`
        : "You have no allergies on record, but always ask a guardian before trying new foods."
    }
    if (t.includes("medic") || t.includes("medicine") || t.includes("pill")) {
      return user.medications.length
        ? `Your medications are: ${user.medications.join(", ")}. Only take them when a guardian or doctor tells you to.`
        : "You have no medications on record. Never take medicine without an adult's help."
    }
    if (t.includes("hurt") || t.includes("pain") || t.includes("sick") || t.includes("emergency")) {
      return "If you feel sick or hurt, tap the red Call a Guardian button above to reach an adult right now."
    }
    return "I can help with allergies, medicines, and staying safe. If it's an emergency, use the Call a Guardian button above."
  }

  function send(e: React.FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q) return
    setMessages((m) => [...m, { role: "user", text: q }])
    setInput("")
    setTimeout(() => {
      setMessages((m) => [...m, { role: "bot", text: respond(q) }])
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }))
    }, 350)
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-card shadow-sm">
      <div className="flex items-center gap-2 bg-accent px-4 py-3 text-accent-foreground">
        <Bot className="h-5 w-5" />
        <div>
          <h2 className="text-sm font-bold leading-tight">AI Safety Helper</h2>
          <p className="text-[11px] text-accent-foreground/80">Quick answers for kids</p>
        </div>
      </div>

      <div ref={listRef} className="max-h-52 space-y-2.5 overflow-y-auto bg-secondary p-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "bot" && (
              <span className="mr-2 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <Bot className="h-3.5 w-3.5" />
              </span>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md bg-card text-foreground shadow-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-card p-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a safety question..."
          className="flex-1 rounded-full border border-border bg-input px-3.5 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          aria-label="Send"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition hover:brightness-110"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  )
}
