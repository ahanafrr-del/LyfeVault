"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { isChildProfile, type UserProfile } from "@/lib/store"
import { useStoreClient } from "@/lib/use-store-client"
import { SplashScreen } from "@/components/medivault/splash-screen"
import { AuthScreen } from "@/components/medivault/auth-screen"
import { SegmentationScreen } from "@/components/medivault/segmentation-screen"
import { EmergencyView } from "@/components/medivault/emergency-view"
import { Dashboard, type DashboardAction } from "@/components/medivault/dashboard"
import { MinorDashboard } from "@/components/medivault/minor-dashboard"
import { TabBar, type MainTab } from "@/components/medivault/tab-bar"
import { Timeline } from "@/components/medivault/timeline"
import { Departments } from "@/components/medivault/departments"
import { DependentsDirectory } from "@/components/medivault/dependents-directory"
import { AiChatbot } from "@/components/medivault/ai-chatbot"
import { AiSummary } from "@/components/medivault/ai-summary"
import { DoctorUpload } from "@/components/medivault/doctor-upload"
import { ProfileScreen } from "@/components/medivault/profile-screen"
import { ClinicalMode } from "@/components/medivault/clinical-mode"
import type { PractitionerSession } from "@/components/medivault/practitioner-scan"
import { ScreenHeader, EmptyState } from "@/components/medivault/shared"

type Stage = "splash" | "auth" | "segment" | "emergency" | "app" | "clinical"
type Overlay = "chatbot" | "summary" | "upload" | null
type SubScreen = "departments" | "dependents" | null

export default function Page() {
  const store = useStoreClient()
  const [stage, setStage] = useState<Stage>("splash")
  const [tab, setTab] = useState<MainTab>("home")
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [subScreen, setSubScreen] = useState<SubScreen>(null)
  // Verified practitioner session powering Approved Clinical Mode.
  const [practitioner, setPractitioner] = useState<PractitionerSession | null>(null)
  // True once a guardian unlocks parental edit mode on a minor's dashboard — reveals the upload FAB.
  const [minorUnlocked, setMinorUnlocked] = useState(false)
  // A specific profile resolved via the top-bar Card/Tag ID lookup. When set, the Emergency
  // View (Screen 2) renders this responder-targeted record instead of the local snapshot.
  const [emergencyTarget, setEmergencyTarget] = useState<UserProfile | null>(null)

  const user = store.currentUser
  const minor = isChildProfile(user)

  function handleReset() {
    store.resetAll()
    setStage("splash")
    setTab("home")
    setSubScreen(null)
    setOverlay(null)
    setMinorUnlocked(false)
  }

  function handleDashboardAction(action: DashboardAction) {
    switch (action) {
      case "dependents":
        setSubScreen("dependents")
        break
      case "timeline":
        setTab("timeline")
        break
      case "departments":
      case "health-info":
      case "vitals":
        setSubScreen("departments")
        break
      case "emergency":
        setStage("emergency")
        break
      case "settings":
        setTab("profile")
        break
    }
  }

  function handleLogout() {
    // Clear the persisted session (userRole -> null). Age-derived isChildProfile
    // resets automatically once there is no active user. Non-session data in
    // localStorage (registered accounts, reports) is preserved.
    store.logout()
    // Reset all in-memory navigation state and return to Screen 0 (Splash / NFC entry).
    setStage("splash")
    setTab("home")
    setSubScreen(null)
    setOverlay(null)
    setMinorUnlocked(false)
  }

  // Opens the read-only Emergency View (Screen 2). When called with a profile resolved from a
  // Card/Tag ID lookup, that exact record is shown; otherwise it falls back to the local snapshot.
  function handleEmergency(profile?: UserProfile | null) {
    setEmergencyTarget(profile ?? null)
    setStage("emergency")
  }

  function renderPhoneContent() {
    if (stage === "splash") {
      return <SplashScreen onEnter={() => setStage("auth")} onReset={handleReset} />
    }

    if (stage === "auth") {
      return (
        <AuthScreen
          store={store}
          onAuthed={(mode) => setStage(mode === "signup" ? "segment" : "app")}
          onEmergency={handleEmergency}
          onPractitioner={(session) => {
            setPractitioner(session)
            setStage("clinical")
          }}
        />
      )
    }

    if (stage === "clinical" && practitioner) {
      return (
        <ClinicalMode
          store={store}
          session={practitioner}
          onExit={() => {
            setPractitioner(null)
            setStage("auth")
          }}
        />
      )
    }

    if (stage === "segment") {
      // Screen 1.5 — confirm minor vs adult segmentation before entering the app.
      if (!user) return <SplashScreen onEnter={() => setStage("auth")} onReset={handleReset} />
      return <SegmentationScreen user={user} onProceed={() => setStage("app")} />
    }

    if (stage === "emergency") {
      return (
        <EmergencyView
          profile={emergencyTarget ?? store.emergencyProfile}
          onBack={() => {
            setEmergencyTarget(null)
            setStage(user ? "app" : "auth")
          }}
        />
      )
    }

    // stage === "app"
    if (!user) {
      // Safety fallback if session was lost
      return (
        <AuthScreen
          store={store}
          onAuthed={(mode) => setStage(mode === "signup" ? "segment" : "app")}
          onEmergency={handleEmergency}
          onPractitioner={(session) => {
            setPractitioner(session)
            setStage("clinical")
          }}
        />
      )
    }

    if (subScreen === "departments") {
      return <Departments user={user} onBack={() => setSubScreen(null)} />
    }

    if (subScreen === "dependents") {
      return <DependentsDirectory store={store} user={user} onBack={() => setSubScreen(null)} />
    }

    return (
      <div className="flex h-full flex-col">
        <div className="relative h-full flex-1 overflow-hidden">
          <div className="flex h-full">
            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab === "home" &&
                (minor ? (
                  // Screen 3b — strict view-only layout, no bento grid, no FAB.
                  <MinorDashboard
                    store={store}
                    user={user}
                    onNotifications={() => setTab("notifications")}
                    onEditModeChange={setMinorUnlocked}
                  />
                ) : (
                  <Dashboard
                    user={user}
                    onAction={handleDashboardAction}
                    onNotifications={() => setTab("notifications")}
                  />
                ))}
              {tab === "timeline" && <Timeline user={user} showBack={false} />}
              {tab === "notifications" && (
                <div className="flex h-full flex-col bg-secondary">
                  <ScreenHeader title="Alerts" subtitle="Reminders & updates" />
                  <EmptyState
                    icon={<Bell className="h-7 w-7" />}
                    title="You're all caught up"
                    hint="Notifications about new reports, verifications, and reminders will appear here."
                  />
                </div>
              )}
              {tab === "profile" && (
                <ProfileScreen store={store} user={user} onLogout={handleLogout} />
              )}
            </div>
          </div>
        </div>

        <TabBar
          active={tab}
          onNavigate={setTab}
          onAdd={() => setOverlay("upload")}
          showAdd={!minor || (minorUnlocked && tab === "home")}
        />

        {overlay === "upload" && (!minor || minorUnlocked) && (
          <DoctorUpload
            store={store}
            onClose={() => setOverlay(null)}
            onDone={() => {
              setOverlay(null)
              setTab("timeline")
            }}
          />
        )}
      </div>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-0 sm:p-6">
      <PhoneFrame>{renderPhoneContent()}</PhoneFrame>
    </main>
  )
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-card sm:h-[min(812px,calc(100dvh-3rem))] sm:w-[390px] sm:rounded-[2.5rem] sm:border-8 sm:border-foreground/90 sm:shadow-2xl">
      <div className="relative h-full w-full overflow-hidden">{children}</div>
    </div>
  )
}
