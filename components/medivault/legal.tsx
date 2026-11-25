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
const PRIVACY_TITLE = "LYFEVAULT PRIVACY POLICY (Effective November 25, 2026)"
const PRIVACY_CONTACT = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || "privacy@lyfevault.app"
const PRIVACY_CLAUSES: { n: number; heading: string; body: string }[] = [
  {
    n: 1,
    heading: "Information We Collect",
    body: "We collect account details (name, email, assigned Card ID); health information (blood group, allergies, conditions, medications, medical reports and uploaded files); emergency contacts; insurance provider, plan, policy, member and group details plus private E-card files; privacy activity logs; and location only when you request location-based emergency assistance. If you add a passkey, Supabase Auth processes a WebAuthn credential and public-key material. Your device keeps its biometric template: LyfeVault does not receive or store your fingerprint or face scan.",
  },
  {
    n: 2,
    heading: "Purpose, Lawful Basis & Consent",
    body: "We process your information to provide your medical passport, emergency snapshot, health-insurance organization, dependent management, account security and any practitioner sharing you choose. Sign-up requires your explicit agreement to this policy and health-data processing. You can withdraw optional health-data consent in Privacy Settings; doing so disables practitioner insurance visibility. This does not undo processing already completed or prevent legally required retention.",
  },
  {
    n: 3,
    heading: "Sharing & Emergency Access",
    body: "LyfeVault does not sell health data or share it with advertising brokers. Anyone with a valid Card ID may see the limited emergency snapshot by design. Authenticated account records are protected by Supabase Row Level Security. Verified practitioners can view only the read-only Home and Medical Timeline. An active insurance summary is disclosed only when you enable practitioner visibility, and its policy, member and group identifiers remain masked.",
  },
  {
    n: 4,
    heading: "Security",
    body: "Information is sent over HTTPS/TLS and stored with the hosting provider's encryption-at-rest safeguards. Supabase Row Level Security restricts database access; private medical and insurance files use non-public buckets and short-lived signed URLs. Passkeys use WebAuthn. No online service can promise absolute security, so protect your password and physical Card ID.",
  },
  {
    n: 5,
    heading: "Retention & Deletion",
    body: "We retain account and health information while your account is active and only longer where needed for legal obligations, security or dispute resolution. Use Privacy Settings to export a JSON copy or permanently delete your account and associated records and files. Encrypted backups may persist temporarily until normal backup rotation.",
  },
  {
    n: 6,
    heading: "Children & Dependents",
    body: "Guardians must have legal authority to manage a dependent profile and are responsible for its accuracy and access choices, subject to applicable law. A guardian should remove linked data when their authority ends.",
  },
  {
    n: 7,
    heading: "Updates & Privacy Grievances",
    body: `We will revise this policy when our practices change. For privacy questions or grievances, contact the LyfeVault privacy officer at ${PRIVACY_CONTACT}. Configure a monitored address before production use.`,
  },
]

function LegalModal({ doc, onClose }: { doc: LegalDoc; onClose: () => void }) {
  const isTerms = doc === "terms"
  const title = isTerms ? TERMS_TITLE : PRIVACY_TITLE
  const clauses = isTerms ? TERMS_CLAUSES : PRIVACY_CLAUSES
  return (
    <ModalShell
      title={isTerms ? "Terms of Service" : "Privacy Policy"}
      subtitle={isTerms ? "Last Updated: July 2026" : "Effective November 25, 2026"}
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
 * Inline legal links used beside the sign-up consent checkbox. Opens the same readable modals as the footer.
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
