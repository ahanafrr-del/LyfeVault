"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { useStore } from "@/lib/store"
import { SplashScreen } from "@/components/medivault/splash-screen"
import { AuthScreen } from "@/components/medivault/auth-screen"
import { EmergencyView } from "@/components/medivault/emergency-view"
import { Dashboard, type DashboardAction } from "@/components/medivault/dashboard"
import { TabBar, type MainTab } from "@/components/medivault/tab-bar"
import { Timeline } from "@/components/medivault/timeline"
import { Departments } from "@/components/medivault/departments"
import { AiChatbot } from "@/components/medivault/ai-chatbot"
import { AiSummary } from "@/components/medivault/ai-summary"
import { DoctorUpload } from "@/components/medivault/doctor-upload"
import { ProfileScreen } from "@/components/medivault/profile-screen"
import { ScreenHeader, EmptyState } from "@/components/medivault/shared"

type Stage = "splash" | "auth" | "emergency" | "app"
type Overlay = "chatbot" | "summary" | "upload" | null
type SubScreen = "departments" | null

export default function Page() {
  const store = useStore()
  const [stage, setStage] = useState<Stage>("splash")
  const [tab, setTab] = useState<MainTab>("home")
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [subScreen, setSubScreen] = useState<SubScreen>(null)

  const user = store.currentUser

  function handleDashboardAction(action: DashboardAction) {
    switch (action) {
      case "chatbot":
        setOverlay("chatbot")
        break
      case "summary":
        setOverlay("summary")
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
  }

  function renderPhoneContent() {
    if (stage === "splash") {
      return <SplashScreen onEnter={() => setStage("auth")} />
    }

    if (stage === "auth") {
      return (
        <AuthScreen
          store={store}
          onAuthed={() => setStage("app")}
          onEmergency={() => setStage("emergency")}
        />
      )
    }

    if (stage === "emergency") {
      return (
        <EmergencyView
          profile={store.emergencyProfile}
          onBack={() => setStage(user ? "app" : "auth")}
        />
      )
    }

    // stage === "app"
    if (!user) {
      // Safety fallback if session was lost
      return (
        <AuthScreen
          store={store}
          onAuthed={() => setStage("app")}
          onEmergency={() => setStage("emergency")}
        />
      )
    }

    if (subScreen === "departments") {
      return <Departments user={user} onBack={() => setSubScreen(null)} />
    }

    return (
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1">
          {tab === "home" && (
            <Dashboard
              user={user}
              onAction={handleDashboardAction}
              onNotifications={() => setTab("notifications")}
            />
          )}
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

        <TabBar active={tab} onNavigate={setTab} onAdd={() => setOverlay("upload")} />

        {overlay === "chatbot" && <AiChatbot user={user} onClose={() => setOverlay(null)} />}
        {overlay === "summary" && <AiSummary user={user} onClose={() => setOverlay(null)} />}
        {overlay === "upload" && (
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
    <div className="relative h-screen w-full overflow-hidden bg-card sm:h-[812px] sm:w-[390px] sm:rounded-[2.5rem] sm:border-8 sm:border-foreground/90 sm:shadow-2xl">
      <div className="relative h-full w-full overflow-hidden">{children}</div>
    </div>
  )
}
