"use client"

import { useRef, useState } from "react"
import { Send, Bot } from "lucide-react"
import { ModalShell } from "./shared"
import { computeAge, type UserProfile } from "@/lib/store"

type Message = { role: "user" | "bot"; text: string }

export function AiChatbot({
  user,
  onClose,
}: {
  user: UserProfile
  onClose: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: `Hi ${user.name.split(" ")[0] || "there"}! I'm your MediVault assistant. Ask me about your allergies, medications, blood group, or reports.`,
    },
  ])
  const [input, setInput] = useState("")
  const listRef = useRef<HTMLDivElement>(null)

  function respond(q: string): string {
    const t = q.toLowerCase()
    if (t.includes("allerg")) {
      return user.allergies.length
        ? `Your recorded allergies are: ${user.allergies.join(", ")}. Always inform new providers about these.`
        : "You have no allergies recorded yet. You can add them under Allergies & Conditions."
    }
    if (t.includes("blood")) {
      return user.bloodGroup
        ? `Your blood group is ${user.bloodGroup}.`
        : "Your blood group hasn't been set yet."
    }
    if (t.includes("medic") || t.includes("prescri") || t.includes("drug")) {
      return user.medications.length
        ? `Your active medications: ${user.medications.join(", ")}.`
        : "No active medications are recorded."
    }
    if (t.includes("condition") || t.includes("chronic")) {
      return user.conditions.length
        ? `Your recorded conditions: ${user.conditions.join(", ")}.`
        : "No chronic conditions are recorded."
    }
    if (t.includes("report") || t.includes("record")) {
      return user.reports.length
        ? `You have ${user.reports.length} report(s). The latest is from ${user.reports[0].doctorName} (${user.reports[0].specialization}).`
        : "You have no medical reports yet. Add one with the + button."
    }
    if (t.includes("age") || t.includes("old")) {
      const age = computeAge(user.dob)
      return age !== null ? `You are ${age} years old.` : "Your date of birth isn't set."
    }
    if (t.includes("contact") || t.includes("emergency")) {
      return user.contacts.length
        ? `Your primary emergency contact is ${user.contacts[0].name} (${user.contacts[0].phone}).`
        : "No emergency contacts are saved yet."
    }
    return "I can help with your allergies, blood group, medications, conditions, reports, and emergency contacts. Try asking about one of those."
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
    }, 400)
  }

  const suggestions = ["What are my active allergies?", "What's my blood group?", "List my medications"]

  return (
    <ModalShell title="AI Assistant" subtitle="Ask about your health record" onClose={onClose} headerAccent>
      <div className="flex h-[26rem] flex-col">
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-secondary p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "bot" && (
                <span className="mr-2 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
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

        <div className="flex gap-2 overflow-x-auto border-t border-border bg-card px-4 py-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput(s)}
              className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-card p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 rounded-full border border-border bg-input px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            aria-label="Send"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition hover:brightness-110"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </ModalShell>
  )
}
