'use client';

import { useState } from 'react';
import { ChevronRight, Phone, AlertTriangle, Lock, CheckCircle, FileText, Zap } from 'lucide-react';

type Permission = 'PATIENT' | 'DOCTOR' | 'EMERGENCY';
type ScreenType = 'privacy' | 'auth' | 'emergency' | 'dashboard' | 'timeline' | 'upload' | 'summary';

interface Patient {
  id: string;
  name: string;
  age: number;
  bloodGroup: string;
  allergies: string[];
  medicalHistory: string[];
  emergencyContacts: Array<{ name: string; phone: string; relation: string }>;
  photo?: string;
}

interface MedicalReport {
  id: string;
  date: string;
  type: string;
  doctor: string;
  specialty: string;
  hospital: string;
  description: string;
}

const MOCK_PATIENT: Patient = {
  id: 'PAT001',
  name: 'John Doe',
  age: 35,
  bloodGroup: 'O+',
  allergies: ['Penicillin', 'Nuts'],
  medicalHistory: ['Hypertension', 'Type 2 Diabetes'],
  emergencyContacts: [
    { name: 'Jane Doe', phone: '+91-9876543210', relation: 'Spouse' },
    { name: 'Robert Doe', phone: '+91-9876543211', relation: 'Brother' },
    { name: 'Dr. Smith', phone: '+91-9876543212', relation: 'Family Doctor' },
  ],
};

const MOCK_REPORTS: MedicalReport[] = [
  {
    id: '1',
    date: '2024-01-15',
    type: 'Blood Test',
    doctor: 'Dr. Rajesh Kumar',
    specialty: 'General Physician',
    hospital: 'Apollo Hospitals',
    description: 'Annual Health Checkup - All parameters normal',
  },
  {
    id: '2',
    date: '2024-01-10',
    type: 'ECG',
    doctor: 'Dr. Priya Singh',
    specialty: 'Cardiology',
    hospital: 'Max Health',
    description: 'Cardiac health check - No abnormalities detected',
  },
  {
    id: '3',
    date: '2024-01-05',
    type: 'X-Ray',
    doctor: 'Dr. Ahmed Hassan',
    specialty: 'Radiology',
    hospital: 'Apollo Hospitals',
    description: 'Chest X-Ray - Clear lungs, no findings',
  },
];

export default function LyfVault() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('privacy');
  const [permission, setPermission] = useState<Permission>('PATIENT');
  const [consentGiven, setConsentGiven] = useState(false);
  const [nfcScanned, setNfcScanned] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MedicalReport | null>(null);

  // Screen 1: Privacy & Consent Modal
  const PrivacyScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Privacy & Consent</h1>
            <p className="text-muted-foreground mt-2">Secure medical passport access</p>
          </div>

          <div className="space-y-3">
            <div className="border border-border rounded-lg p-4 bg-secondary/50">
              <p className="text-sm font-semibold text-foreground mb-2">Required Permissions:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  <span>Camera Access (for NFC/QR scanning)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  <span>Location Access (emergency services)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  <span>Phone Access (emergency calling)</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                All data is encrypted end-to-end (E2E). Your medical records are never shared without explicit consent. Emergency access is anonymous and read-only.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setConsentGiven(true)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition"
            >
              Accept & Continue
            </button>
            <button
              onClick={() => setConsentGiven(false)}
              className="w-full border border-border hover:bg-secondary/50 text-foreground font-semibold py-3 rounded-lg transition"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Screen 2: Dynamic Auth
  const AuthScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-6">
          <h1 className="text-2xl font-bold text-foreground">LyfVault Access</h1>

          {!nfcScanned ? (
            <div className="space-y-4">
              <div className="bg-secondary/50 border-2 border-dashed border-primary rounded-lg p-8 text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <p className="text-sm text-foreground font-semibold mb-2">Scan Patient ID Card</p>
                <p className="text-xs text-muted-foreground mb-4">Hold NFC/QR code near device</p>
                <button
                  onClick={() => setNfcScanned(true)}
                  className="text-primary hover:text-primary/80 font-semibold text-sm"
                >
                  Simulate NFC Scan
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-accent/10 border border-accent rounded-lg p-4">
                <p className="text-sm text-foreground font-semibold mb-1">Patient ID Scanned</p>
                <p className="text-xs text-muted-foreground">PAT001 - John Doe</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Access Type</p>
                <div className="space-y-2">
                  <button
                    onClick={() => { setPermission('PATIENT'); setCurrentScreen('dashboard'); }}
                    className="w-full text-left p-3 border border-border hover:bg-secondary/50 rounded-lg transition"
                  >
                    <p className="font-semibold text-foreground">Patient Login</p>
                    <p className="text-xs text-muted-foreground">Full edit access to personal records</p>
                  </button>
                  <button
                    onClick={() => { setPermission('DOCTOR'); setCurrentScreen('timeline'); }}
                    className="w-full text-left p-3 border border-border hover:bg-secondary/50 rounded-lg transition"
                  >
                    <p className="font-semibold text-foreground">Doctor Verification</p>
                    <p className="text-xs text-muted-foreground">Scan NMC License Number</p>
                  </button>
                  <button
                    onClick={() => { setPermission('EMERGENCY'); setCurrentScreen('emergency'); }}
                    className="w-full text-left p-3 border-2 border-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                  >
                    <p className="font-semibold text-red-600 dark:text-red-400">Emergency Access</p>
                    <p className="text-xs text-red-500 dark:text-red-400">Read-only vital information</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Screen 3: Emergency Access
  const EmergencyScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-2xl overflow-hidden border-2 border-red-500">
        <div className="p-6 space-y-6">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 rounded-lg flex gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">Emergency Access</p>
              <p className="text-sm text-red-700 dark:text-red-200">Read-only vital information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">PATIENT INFORMATION</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-semibold">{MOCK_PATIENT.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span className="font-semibold">{MOCK_PATIENT.age} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blood Group:</span>
                  <span className="font-semibold text-red-600 dark:text-red-400 text-lg">{MOCK_PATIENT.bloodGroup}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-100 mb-2">ALLERGIES (CRITICAL)</p>
              <div className="space-y-1">
                {MOCK_PATIENT.allergies.map(allergy => (
                  <span key={allergy} className="inline-block bg-red-500 text-white text-xs px-3 py-1 rounded-full mr-2 mb-1">
                    {allergy}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">EMERGENCY CONTACTS</p>
              <div className="space-y-2">
                {MOCK_PATIENT.emergencyContacts.map((contact, idx) => (
                  <button
                    key={idx}
                    className="w-full flex items-center justify-between p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-sm text-foreground">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.relation}</p>
                    </div>
                    <Phone className="w-5 h-5 text-primary" />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition text-xs">
                Ambulance
              </button>
              <button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition text-xs">
                Fire
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition text-xs">
                Police
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Screen 4: Dashboard
  const DashboardScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Welcome back,</p>
            <h1 className="text-2xl font-bold text-foreground">{MOCK_PATIENT.name}</h1>
            <p className="text-xs text-accent mt-2">
              {permission === 'PATIENT' ? 'Patient Mode - Full Edit Access' : 'Doctor Mode - Read-Only'}
            </p>
          </div>

          <div className="bg-secondary/50 rounded-lg p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">QUICK STATS</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{MOCK_REPORTS.length}</p>
                <p className="text-xs text-muted-foreground">Reports</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">{MOCK_PATIENT.allergies.length}</p>
                <p className="text-xs text-muted-foreground">Allergies</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500">{MOCK_PATIENT.medicalHistory.length}</p>
                <p className="text-xs text-muted-foreground">Conditions</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setCurrentScreen('timeline')}
              className="w-full flex items-center justify-between p-4 border border-border hover:bg-secondary/50 rounded-lg transition"
            >
              <span className="font-semibold text-foreground">Medical Timeline</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            {permission === 'PATIENT' && (
              <button
                onClick={() => setCurrentScreen('summary')}
                className="w-full flex items-center justify-between p-4 border border-border hover:bg-secondary/50 rounded-lg transition"
              >
                <span className="font-semibold text-foreground">AI Health Summary</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            {permission === 'DOCTOR' && (
              <button
                onClick={() => setCurrentScreen('upload')}
                className="w-full flex items-center justify-between p-4 border border-border hover:bg-secondary/50 rounded-lg transition"
              >
                <span className="font-semibold text-foreground">Add Report</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>

          <button
            onClick={() => { setCurrentScreen('auth'); setNfcScanned(false); }}
            className="w-full border border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold py-2 rounded-lg transition text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  // Screen 5: Medical Timeline
  const TimelineScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Medical Timeline</h1>
            <button onClick={() => setCurrentScreen('dashboard')} className="text-primary hover:text-primary/80">
              ← Back
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {MOCK_REPORTS.map((report, idx) => (
              <button
                key={report.id}
                onClick={() => { setSelectedReport(report); setCurrentScreen('summary'); }}
                className="w-full text-left p-4 border border-border hover:bg-secondary/50 rounded-lg transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground">{report.type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(report.date).toLocaleDateString()}</p>
                  </div>
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Dr. {report.doctor}</p>
                <p className="text-xs text-accent mt-1">{report.specialty}</p>
              </button>
            ))}
          </div>

          {permission === 'DOCTOR' && (
            <button
              onClick={() => setCurrentScreen('upload')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition"
            >
              + Add Report
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Screen 6: Doctor Upload & AI Scanner
  const UploadScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Add Medical Report</h1>
            <button onClick={() => setCurrentScreen('timeline')} className="text-primary hover:text-primary/80">
              ← Back
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground">Report Type</label>
              <select className="w-full mt-2 p-2 border border-border rounded-lg bg-background text-foreground">
                <option>Blood Test</option>
                <option>X-Ray</option>
                <option>ECG</option>
                <option>Ultrasound</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground">Date</label>
              <input type="date" className="w-full mt-2 p-2 border border-border rounded-lg bg-background text-foreground" />
            </div>

            <div className="bg-secondary/50 border-2 border-dashed border-primary rounded-lg p-8 text-center">
              <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Drag & Drop PDF</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground">Doctor License (NMC)</label>
              <div className="w-full mt-2 p-4 bg-secondary/50 border border-border rounded-lg text-center">
                <Zap className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
                <button className="text-primary hover:text-primary/80 text-sm font-semibold">
                  Scan QR Code
                </button>
              </div>
            </div>

            <button
              onClick={() => alert('Report uploaded successfully!')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-lg transition"
            >
              Upload Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Screen 7: AI Health Summary
  const SummaryScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">AI Health Summary</h1>
            <button onClick={() => setCurrentScreen('dashboard')} className="text-primary hover:text-primary/80">
              ← Back
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">Stay Hydrated</p>
                  <p className="text-sm text-green-700 dark:text-green-200 mt-1">Drink 8-10 glasses of water daily to maintain optimal health and circulation.</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900 dark:text-yellow-100">Medication Reminder</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-1">Take blood pressure medication with meals, not on an empty stomach.</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">Based on Blood Test (Jan 15)</p>
                  <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">All parameters within normal range. Continue current lifestyle.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render current screen
  const renderScreen = () => {
    if (!consentGiven) return <PrivacyScreen />;
    
    switch (currentScreen) {
      case 'auth':
        return <AuthScreen />;
      case 'emergency':
        return <EmergencyScreen />;
      case 'dashboard':
        return <DashboardScreen />;
      case 'timeline':
        return <TimelineScreen />;
      case 'upload':
        return <UploadScreen />;
      case 'summary':
        return <SummaryScreen />;
      default:
        return <PrivacyScreen />;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Fixed Prototype Switcher */}
      {consentGiven && (
        <div className="fixed top-0 left-0 right-0 bg-white dark:bg-card border-b border-border shadow-md z-50">
          <div className="flex items-center gap-2 overflow-x-auto p-3 max-w-full">
            {[
              { id: 'privacy', label: 'Privacy' },
              { id: 'auth', label: 'Auth' },
              { id: 'emergency', label: 'Emergency' },
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'timeline', label: 'Timeline' },
              { id: 'upload', label: 'Upload' },
              { id: 'summary', label: 'Summary' },
            ].map(screen => (
              <button
                key={screen.id}
                onClick={() => setCurrentScreen(screen.id as ScreenType)}
                className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition ${
                  currentScreen === screen.id
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border hover:bg-secondary/50 text-foreground'
                }`}
              >
                {screen.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Screen Content */}
      <div className={consentGiven ? 'pt-16' : ''}>
        {renderScreen()}
      </div>
    </div>
  );
}
