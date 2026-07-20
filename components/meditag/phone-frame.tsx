import type { ReactNode } from "react"

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[400px]">
      {/* Device shell */}
      <div className="relative rounded-[3rem] border border-sky-200/70 bg-slate-900 p-3 shadow-2xl shadow-sky-900/20">
        <div className="relative overflow-hidden rounded-[2.4rem] bg-background">
          {/* Notch */}
          <div className="pointer-events-none absolute left-1/2 top-0 z-30 flex -translate-x-1/2 items-center justify-center">
            <div className="h-6 w-36 rounded-b-2xl bg-slate-900" />
          </div>
          {/* Screen scroll area */}
          <div className="h-[760px] max-h-[80vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  )
}
