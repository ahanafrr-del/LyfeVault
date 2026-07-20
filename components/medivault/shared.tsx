"use client"

import type { ReactNode } from "react"
import { ChevronLeft, ShieldPlus, X } from "lucide-react"

export function Logo({
  size = "md",
  light = false,
}: {
  size?: "sm" | "md" | "lg"
  light?: boolean
}) {
  const icon = size === "lg" ? "h-9 w-9" : size === "md" ? "h-7 w-7" : "h-5 w-5"
  const text = size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-lg"
  const box = size === "lg" ? "h-14 w-14" : size === "md" ? "h-11 w-11" : "h-8 w-8"
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`grid ${box} place-items-center rounded-2xl ${
          light ? "bg-white/15 text-white" : "bg-primary text-primary-foreground"
        } shadow-lg shadow-primary/20`}
      >
        <ShieldPlus className={icon} strokeWidth={2.2} />
      </div>
      <span
        className={`${text} font-bold tracking-tight ${light ? "text-white" : "text-primary"}`}
      >
        Medi<span className={light ? "text-white" : "text-accent"}>Vault</span>
      </span>
    </div>
  )
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3.5 backdrop-blur-md">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold leading-tight text-foreground">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

export function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  headerAccent = false,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  headerAccent?: boolean
}) {
  return (
    <div className="mv-fade-in fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center">
      <div className="mv-slide-up flex max-h-[92%] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl">
        <div
          className={`flex items-center justify-between px-5 py-4 ${
            headerAccent ? "bg-primary text-primary-foreground" : "border-b border-border text-foreground"
          }`}
        >
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold">{title}</h2>
            {subtitle && (
              <p
                className={`truncate text-xs ${
                  headerAccent ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${
              headerAccent
                ? "bg-white/15 text-primary-foreground hover:bg-white/25"
                : "bg-secondary text-primary hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
          : "bg-secondary text-secondary-foreground hover:bg-primary/10"
      }`}
    >
      {children}
    </button>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: ReactNode
  title: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary text-primary">
        {icon}
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      {hint && <p className="max-w-[16rem] text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}
