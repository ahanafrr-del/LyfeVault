export type Severity = "green" | "yellow" | "red"

export interface EmergencyContact {
  name: string
  phone: string
  relation: string
  accessGranted: boolean
}

export interface Medication {
  name: string
  dosage: string
  frequency: string
}

export interface Patient {
  id: string
  name: string
  dob: string
  age: number
  gender: string
  bloodGroup: string
  photo: string
  allergies: { name: string; level: "high" | "moderate" }[]
  chronicIllnesses: string[]
  medications: Medication[]
  emergencyContacts: EmergencyContact[]
}

export type Specialty =
  | "All"
  | "Cardiology"
  | "Blood Tests"
  | "MRI & Radiology"
  | "Dermatology"
  | "Neurology"
  | "General Practice"

export interface MedicalReport {
  id: string
  date: string
  specialty: Exclude<Specialty, "All">
  title: string
  hospital: string
  doctor: string
  licenseId: string
  summary: string
  aiSeverity: Severity
  aiExplanation: string
}

export const PATIENT: Patient = {
  id: "MTG-4837-2291",
  name: "Aarav Mehta",
  dob: "1989-04-12",
  age: 36,
  gender: "Male",
  bloodGroup: "O+",
  photo: "/patient-portrait.png",
  allergies: [
    { name: "Penicillin", level: "high" },
    { name: "Peanuts", level: "high" },
    { name: "Pollen", level: "moderate" },
  ],
  chronicIllnesses: ["Type 2 Diabetes", "Hypertension"],
  medications: [
    { name: "Metformin", dosage: "500mg", frequency: "Twice daily" },
    { name: "Amlodipine", dosage: "5mg", frequency: "Once daily" },
    { name: "Atorvastatin", dosage: "10mg", frequency: "At night" },
  ],
  emergencyContacts: [
    { name: "Priya Mehta", phone: "+91 98765 43210", relation: "Spouse", accessGranted: true },
    { name: "Rohan Mehta", phone: "+91 98765 11223", relation: "Brother", accessGranted: true },
    { name: "Dr. Kavya Nair", phone: "+91 98700 55667", relation: "Family Physician", accessGranted: false },
  ],
}

export const REPORTS: MedicalReport[] = [
  {
    id: "r1",
    date: "2025-06-18",
    specialty: "Cardiology",
    title: "Echocardiogram & Stress Test",
    hospital: "Fortis Heart Institute",
    doctor: "Dr. Sanjay Rao",
    licenseId: "NMC-CAR-88213",
    summary: "Ejection fraction 58%. Mild left ventricular hypertrophy. No ischemia detected.",
    aiSeverity: "yellow",
    aiExplanation:
      "Your heart is pumping normally, but the muscle wall is slightly thickened — often linked to blood pressure. Keep taking your medication and monitor BP weekly.",
  },
  {
    id: "r2",
    date: "2025-05-02",
    specialty: "Blood Tests",
    title: "Comprehensive Metabolic Panel",
    hospital: "Apollo Diagnostics",
    doctor: "Dr. Kavya Nair",
    licenseId: "NMC-GEN-40192",
    summary: "HbA1c 7.2%, LDL 128 mg/dL, fasting glucose 142 mg/dL. Kidney function normal.",
    aiSeverity: "yellow",
    aiExplanation:
      "Your blood sugar and cholesterol are a little above target. Small diet changes and staying consistent with medication should bring these into a healthy range.",
  },
  {
    id: "r3",
    date: "2025-03-27",
    specialty: "MRI & Radiology",
    title: "MRI Lumbar Spine",
    hospital: "Max Imaging Center",
    doctor: "Dr. Ahmed Hassan",
    licenseId: "NMC-RAD-77510",
    summary: "Mild disc bulge at L4-L5. No nerve compression. Normal alignment.",
    aiSeverity: "green",
    aiExplanation:
      "A minor bulge in a lower-back disc with no nerve involvement. This is common and usually managed with posture care and light exercise.",
  },
  {
    id: "r4",
    date: "2025-01-15",
    specialty: "General Practice",
    title: "Annual Wellness Visit",
    hospital: "City Care Clinic",
    doctor: "Dr. Kavya Nair",
    licenseId: "NMC-GEN-40192",
    summary: "Overall stable. Continue current medications. BP 138/86. BMI 26.4.",
    aiSeverity: "green",
    aiExplanation:
      "A routine check-up with stable results. Blood pressure is slightly high — worth keeping an eye on with your existing treatment.",
  },
  {
    id: "r5",
    date: "2024-11-08",
    specialty: "Neurology",
    title: "Migraine Consultation",
    hospital: "NeuroCare Hospital",
    doctor: "Dr. Leena Iyer",
    licenseId: "NMC-NEU-31288",
    summary: "Episodic migraine without aura. Prescribed abortive therapy. MRI brain clear.",
    aiSeverity: "green",
    aiExplanation:
      "Your headaches are a manageable form of migraine and your brain scan was clear. Track triggers and use the prescribed medication when an attack begins.",
  },
]

export const SPECIALTIES: Specialty[] = [
  "All",
  "Cardiology",
  "Blood Tests",
  "MRI & Radiology",
  "Dermatology",
  "Neurology",
  "General Practice",
]
