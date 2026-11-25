"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { useStore, isChildProfile, type UserProfile } from "@/lib/store"
import { SplashScreen } from "@/components/medivault/splash-screen"
import { AuthScreen } from "@/components/medivault/auth-screen"
import { SegmentationScreen } from "@/components/medivault/segmentation-screen"
import { EmergencyView } from "@/components/medivault/emergency-view"
import { Dashboard, type DashboardAction } from "@/components/medivault/dashboard"
import { MinorDashboard } from "@/components/medivault/minor-dashboard"
import { type MainTab } from "@/components/medivault/tab-bar"
import { AppShell } from "@/components/medivault/app-shell"
import { InsuranceSection } from "@/components/medivault/insurance-section"
import { PrivacySection } from "@/components/medivault/privacy-section"
import { Timeline } from "@/components/medivault/timeline"
import { Departments } from "@/components/medivault/departments"
import { DependentsDirectory } from "@/components/medivault/dependents-directory"
import { DoctorUpload } from "@/components/medivault/doctor-upload"
import { ProfileScreen } from "@/components/medivault/profile-screen"
import { ParentalMasterAccess } from "@/components/medivault/parental-master-access"
import { ClinicalMode } from "@/components/medivault/clinical-mode"
import type { PractitionerSession } from "@/components/medivault/practitioner-scan"
import { supabase } from "@/lib/supabase"
import { ScreenHeader, EmptyState } from "@/components/medivault/shared"

type Stage = "splash" | "auth" | "segment" | "emergency" | "app" | "clinical"
type Overlay = "chatbot" | "summary" | "upload" | null
type SubScreen = "departments" | "dependents" | null

export default function Page() {
  const store = useStore()
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
  const visibleStage = store.ready && user && stage === "splash" ? "app" : stage

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
        setTab("emergency")
        break
      case "settings":
        setTab("profile")
        break
    }
  }

  function handleLogout() {
    void store.logout()
    // Reset navigation state and return to the landing screen.
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
    if (visibleStage === "splash") {
      return <SplashScreen onEnter={() => setStage("auth")} />
    }

    if (visibleStage === "auth") {
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

    if (visibleStage === "clinical" && practitioner) {
      return (
        <ClinicalMode
          session={practitioner}
          onExit={async () => {
            setPractitioner(null)
            const { data } = await supabase.auth.getSession()
            setStage(data.session ? "app" : "auth")
          }}
        />
      )
    }

    if (visibleStage === "segment") {
      // Screen 1.5 — confirm minor vs adult segmentation before entering the app.
      if (!user) return <SplashScreen onEnter={() => setStage("auth")} />
      return <SegmentationScreen user={user} store={store} onProceed={() => setStage("app")} />
    }

    if (visibleStage === "emergency") {
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
        {minor && <ParentalMasterAccess store={store} unlocked={minorUnlocked} onChange={setMinorUnlocked} />}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full">
            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab === "home" &&
                (minor ? (
                  // Screen 3b — strict view-only layout, no bento grid, no FAB.
                  <MinorDashboard
                    store={store}
                    user={user}
                    unlocked={minorUnlocked}
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
              {tab === "insurance" && <InsuranceSection readOnly={minor && !minorUnlocked} />}
              {tab === "emergency" && <EmergencyView profile={user} onBack={() => setTab("home")} />}
              {tab === "privacy" && <PrivacySection onLogout={handleLogout} readOnly={minor && !minorUnlocked} />}
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
                <ProfileScreen store={store} user={user} unlocked={minorUnlocked} onLogout={handleLogout} onPrivacy={() => setTab("privacy")} />
              )}
            </div>
          </div>
        </div>

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

  if (visibleStage === "app" && user) {
    return (
      <main className="min-h-screen bg-background">
        <div className="h-[100dvh] min-h-[560px] w-full md:h-screen md:min-h-0">
          <AppShell
            user={user}
            active={tab}
            onNavigate={setTab}
            onLogout={handleLogout}
            onAdd={() => setOverlay("upload")}
            showAdd={!minor || minorUnlocked}
          >
            {renderPhoneContent()}
          </AppShell>
        </div>
      </main>
    )
  }

  return (
    <main className={`flex min-h-screen items-center justify-center bg-secondary ${visibleStage === "clinical" ? "p-0" : "p-0 sm:p-6"}`}>
      <PhoneFrame fullWidth={visibleStage === "clinical"}>{renderPhoneContent()}</PhoneFrame>
    </main>
  )
}

function PhoneFrame({ children, fullWidth = false }: { children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={`relative w-full overflow-hidden bg-card ${fullWidth ? "h-[100dvh]" : "h-[100dvh] sm:h-[min(812px,calc(100dvh-3rem))] sm:w-[390px] sm:rounded-[2.5rem] sm:border-8 sm:border-foreground/90 sm:shadow-2xl"}`}>
      <div className="relative h-full w-full overflow-hidden">{children}</div>
    </div>
  )
}
