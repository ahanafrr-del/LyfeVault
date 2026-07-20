"use client"

import { useState } from "react"
import { Bell, User as UserIcon, LogOut } from "lucide-react"
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
    store.logout()
    setStage("auth")
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
            <div className="flex h-full flex-col bg-secondary">
              <ScreenHeader title="Profile" subtitle={user.email} />
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
                    {(user.name || "U")
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">{user.name || "Unnamed"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {user.bloodGroup || "Blood N/A"}
                      {user.gender ? ` \u00b7 ${user.gender}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-bold text-white shadow-lg shadow-destructive/25 transition hover:brightness-105"
                >
                  <LogOut className="h-5 w-5" />
                  Log out
                </button>
              </div>
            </div>
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
