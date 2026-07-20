"use client"

import { useState } from "react"
import { PhoneFrame } from "@/components/meditag/phone-frame"
import { PrivacyScreen } from "@/components/meditag/privacy-screen"
import { AuthScreen } from "@/components/meditag/auth-screen"
import { EmergencyView } from "@/components/meditag/emergency-view"
import { PatientDashboard } from "@/components/meditag/patient-dashboard"
import { DoctorPortal } from "@/components/meditag/doctor-portal"
import { TimelineScreen } from "@/components/meditag/timeline-screen"
import { AddReportScanner } from "@/components/meditag/add-report-scanner"
import { AIHealthSummary } from "@/components/meditag/ai-health-summary"

type Screen =
  | "privacy"
  | "auth"
  | "emergency"
  | "dashboard"
  | "doctor"
  | "timeline"
  | "scanner"
  | "ai"

const SCREENS: { id: Screen; label: string }[] = [
  { id: "privacy", label: "Privacy & Terms" },
  { id: "auth", label: "Auth & Signup" },
  { id: "emergency", label: "Emergency View" },
  { id: "dashboard", label: "Patient Dashboard" },
  { id: "doctor", label: "Doctor Access Portal" },
  { id: "timeline", label: "Timeline" },
  { id: "scanner", label: "Add Report Scanner" },
  { id: "ai", label: "AI Summary" },
]

export default function Page() {
  const [screen, setScreen] = useState<Screen>("privacy")

  function render() {
    switch (screen) {
      case "privacy":
        return <PrivacyScreen onContinue={() => setScreen("auth")} />
      case "auth":
        return (
          <AuthScreen onEmergency={() => setScreen("emergency")} onAuthenticated={() => setScreen("dashboard")} />
        )
      case "emergency":
        return <EmergencyView />
      case "dashboard":
        return (
          <PatientDashboard
            onOpenDoctorPortal={() => setScreen("doctor")}
            onOpenTimeline={() => setScreen("timeline")}
            onOpenAISummary={() => setScreen("ai")}
          />
        )
      case "doctor":
        return <DoctorPortal onManageRecords={() => setScreen("scanner")} />
      case "timeline":
        return <TimelineScreen />
      case "scanner":
        return <AddReportScanner />
      case "ai":
        return <AIHealthSummary />
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-100 via-background to-background">
      {/* Prototype switcher */}
      <div className="sticky top-0 z-50 border-b border-border/60 bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="mr-1 shrink-0 text-xs font-bold uppercase tracking-wide text-primary">MediTag</span>
          {SCREENS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScreen(s.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                screen === s.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-8">
        <PhoneFrame>{render()}</PhoneFrame>
      </div>
    </main>
  )
}
