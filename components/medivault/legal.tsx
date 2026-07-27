"use client"

import { useState } from "react"
import { FileText, ShieldCheck } from "lucide-react"
import { ModalShell } from "./shared"

type LegalDoc = "terms" | "privacy"

/** Verbatim Terms of Service, split into a heading + ordered clauses for readable rendering. */
const TERMS_TITLE = "LYFEVAULT TERMS OF SERVICE (Last Updated: July 2026)"
const TERMS_CLAUSES: { n: number; heading: string; body: string }[] = [
  {
    n: 1,
    heading: "Acceptance of Terms",
    body: "By creating an account or accessing LyfeVault, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.",
  },
  {
    n: 2,
    heading: "Intellectual Property Rights",
    body: "All software, code, user interface designs, logos, graphics, and branding ('LyfeVault') are the exclusive intellectual property of LyfeVault. Users are granted a limited, non-transferable license to use the app for personal medical tracking and agree not to reverse-engineer, decompile, copy, or scrape any portion of the application.",
  },
  {
    n: 3,
    heading: "Emergency Access & Data Use",
    body: "LyfeVault provides quick-access emergency profile functionality via Card/Tag IDs and NFC/QR integrations. Placing emergency information on physical cards or tags allows first responders and third parties with physical access to your tag to view your designated emergency medical snapshot. You are responsible for managing what information is included in your public emergency snapshot.",
  },
  {
    n: 4,
    heading: "Dependent Accounts & Parental Controls",
    body: "Guardians creating or linking dependent profiles represent that they have full legal authority to manage medical profiles on behalf of the minor or dependent. Guardians are responsible for maintaining the confidentiality of their Parental Secret Code.",
  },
  {
    n: 5,
    heading: "Disclaimer of Medical Liability",
    body: "LyfeVault is an information storage and communication tool, not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified healthcare provider for medical emergencies.",
  },
  {
    n: 6,
    heading: "Account Security",
    body: "You are responsible for maintaining the confidentiality of your login credentials and card numbers. LyfeVault is not liable for unauthorized access resulting from lost or compromised physical cards or credentials.",
  },
]

/** Verbatim Privacy Policy, split into a heading + ordered clauses for readable rendering. */
const PRIVACY_TITLE = "LYFEVAULT PRIVACY POLICY (Last Updated: July 2026)"
const PRIVACY_CLAUSES: { n: number; heading: string; body: string }[] = [
  {
    n: 1,
    heading: "Information We Collect",
    body: "Account Information (Name, Email Address, Password, Assigned Card/Tag ID), Medical Snapshot Data (Blood Group, Critical Allergies, Chronic Conditions, Emergency Contacts, Uploaded Medical Files), and On-Demand Location Data (requested strictly during emergency calls).",
  },
  {
    n: 2,
    heading: "How We Use Information",
    body: "We use your data exclusively to render your medical dashboard, facilitate guardian/dependent profile management, enable medical practitioner report uploads, and display your vital snapshot during emergency lookup requests.",
  },
  {
    n: 3,
    heading: "Data Sharing & Emergency Access",
    body: "We do not sell or rent your personal health data to third-party advertisers. Information stored in your Emergency Snapshot is accessible to anyone who enters your valid Card/Tag ID via the Emergency Access feature. Detailed medical histories and files remain locked behind account logins or Parental Secret Codes.",
  },
  {
    n: 4,
    heading: "Data Control & Deletion",
    body: "You retain full ownership of your data. You may update or remove your medical information or delete your account at any time through your account settings.",
  },
]

function LegalModal({ doc, onClose }: { doc: LegalDoc; onClose: () => void }) {
  const isTerms = doc === "terms"
  const title = isTerms ? TERMS_TITLE : PRIVACY_TITLE
  const clauses = isTerms ? TERMS_CLAUSES : PRIVACY_CLAUSES
  return (
    <ModalShell
      title={isTerms ? "Terms of Service" : "Privacy Policy"}
      subtitle="Last Updated: July 2026"
      headerAccent
      onClose={onClose}
    >
      <div className="space-y-4 p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-primary">{title}</p>
        <ol className="space-y-3">
          {clauses.map((c) => (
            <li key={c.n} className="rounded-2xl bg-secondary p-3.5">
              <p className="text-sm font-bold text-foreground">
                {c.n}. {c.heading}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </ModalShell>
  )
}

/**
 * Reusable copyright + legal links footer. Renders the © line alongside clickable
 * "Terms of Service" and "Privacy Policy" links that each open a readable modal.
 */
export function LegalFooter({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState<LegalDoc | null>(null)
  return (
    <footer
      className={`flex flex-col items-center gap-1.5 px-4 py-4 text-center ${className}`}
    >
      <p className="text-[11px] font-medium text-muted-foreground">
        {"\u00A9 2026 LyfeVault. All Rights Reserved."}
      </p>
      <div className="flex items-center gap-3 text-[11px]">
        <button
          type="button"
          onClick={() => setOpen("terms")}
          className="flex items-center gap-1 font-semibold text-primary underline-offset-2 transition hover:underline"
        >
          <FileText className="h-3.5 w-3.5" />
          Terms of Service
        </button>
        <span aria-hidden="true" className="text-border">
          |
        </span>
        <button
          type="button"
          onClick={() => setOpen("privacy")}
          className="flex items-center gap-1 font-semibold text-primary underline-offset-2 transition hover:underline"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Privacy Policy
        </button>
      </div>
      {open && <LegalModal doc={open} onClose={() => setOpen(null)} />}
    </footer>
  )
}

/**
 * Inline "Terms of Service and Privacy Policy" links used inside the sign-up consent
 * checkbox label. Opens the same readable modals as the footer.
 */
export function LegalLinks() {
  const [open, setOpen] = useState<LegalDoc | null>(null)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen("terms")}
        className="font-semibold text-primary underline underline-offset-2"
      >
        Terms of Service
      </button>
      {" and "}
      <button
        type="button"
        onClick={() => setOpen("privacy")}
        className="font-semibold text-primary underline underline-offset-2"
      >
        Privacy Policy
      </button>
      {open && <LegalModal doc={open} onClose={() => setOpen(null)} />}
    </>
  )
}
