'use client';

import { useState } from 'react';
import NFCGateScreen from '@/components/lyfvault/NFCGateScreen';
import OnboardingScreen from '@/components/lyfvault/OnboardingScreen';
import DualLoginScreen from '@/components/lyfvault/DualLoginScreen';
import EmergencyBypassScreen from '@/components/lyfvault/EmergencyBypassScreen';
import DashboardScreen from '@/components/lyfvault/DashboardScreen';
import TimelineScreen from '@/components/lyfvault/TimelineScreen';
import SettingsScreen from '@/components/lyfvault/SettingsScreen';

export type UserRole = 'OWNER' | 'DOCTOR' | 'BYSTANDER' | null;

interface AppState {
  currentScreen: 'NFC_GATE' | 'ONBOARDING' | 'LOGIN' | 'EMERGENCY' | 'DASHBOARD' | 'TIMELINE' | 'SETTINGS';
  userRole: UserRole;
  isChildProfile: boolean;
  patientName: string;
  patientAge: number;
  doctorName: string;
  nfcScanned: boolean;
  termsAccepted: boolean;
  tAndCModal: boolean;
  qrScannerOpen: boolean;
  uploadError: boolean;
  uploadRetrying: boolean;
}

export default function App() {
  const [state, setState] = useState<AppState>({
    currentScreen: 'NFC_GATE',
    userRole: null,
    isChildProfile: false,
    patientName: 'Sarah Johnson',
    patientAge: 8,
    doctorName: '',
    nfcScanned: false,
    termsAccepted: false,
    tAndCModal: false,
    qrScannerOpen: false,
    uploadError: false,
    uploadRetrying: false,
  });

  const updateState = (updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const renderScreen = () => {
    switch (state.currentScreen) {
      case 'NFC_GATE':
        return (
          <NFCGateScreen
            nfcScanned={state.nfcScanned}
            termsAccepted={state.termsAccepted}
            tAndCModalOpen={state.tAndCModal}
            onNFCScan={() => updateState({ nfcScanned: true })}
            onTermsAccept={() => updateState({ termsAccepted: true, tAndCModal: false })}
            onOpenTerms={() => updateState({ tAndCModal: true })}
            onCloseTerms={() => updateState({ tAndCModal: false })}
            onProceed={() => updateState({ currentScreen: 'ONBOARDING', nfcScanned: false, termsAccepted: false })}
          />
        );

      case 'ONBOARDING':
        return (
          <OnboardingScreen
            isChildProfile={state.isChildProfile}
            onSelectProfile={(isChild) => {
              updateState({ isChildProfile: isChild, currentScreen: 'LOGIN' });
            }}
          />
        );

      case 'LOGIN':
        return (
          <DualLoginScreen
            isChildProfile={state.isChildProfile}
            onLoginAsOwner={() => updateState({ userRole: 'OWNER', currentScreen: 'DASHBOARD' })}
            onLoginAsDoctor={() => {
              updateState({ userRole: 'DOCTOR', currentScreen: 'TIMELINE', qrScannerOpen: true });
            }}
            onGoToEmergency={() => updateState({ currentScreen: 'EMERGENCY' })}
          />
        );

      case 'EMERGENCY':
        return (
          <EmergencyBypassScreen
            onCallEmergency={() => {
              updateState({ currentScreen: 'DASHBOARD', userRole: 'BYSTANDER' });
            }}
            onCancel={() => updateState({ currentScreen: 'LOGIN' })}
          />
        );

      case 'DASHBOARD':
        return (
          <DashboardScreen
            userRole={state.userRole}
            patientName={state.patientName}
            isChildProfile={state.isChildProfile}
            onViewTimeline={() => updateState({ currentScreen: 'TIMELINE' })}
            onGoToSettings={() => updateState({ currentScreen: 'SETTINGS' })}
            onLogout={() => updateState({ currentScreen: 'LOGIN', userRole: null })}
          />
        );

      case 'TIMELINE':
        return (
          <TimelineScreen
            userRole={state.userRole}
            qrScannerOpen={state.qrScannerOpen}
            uploadError={state.uploadError}
            uploadRetrying={state.uploadRetrying}
            doctorName={state.doctorName}
            onOpenQRScanner={() => updateState({ qrScannerOpen: true })}
            onCloseQRScanner={() => updateState({ qrScannerOpen: false })}
            onScanQR={(name) => {
              updateState({ doctorName: name, qrScannerOpen: false, uploadError: false });
            }}
            onRetryUpload={() => {
              updateState({ uploadRetrying: true });
              setTimeout(() => {
                updateState({ uploadRetrying: false, uploadError: false });
              }, 1500);
            }}
            onTriggerError={() => updateState({ uploadError: true, uploadRetrying: false })}
            onDismissError={() => updateState({ uploadError: false })}
            onGoToDashboard={() => updateState({ currentScreen: 'DASHBOARD' })}
          />
        );

      case 'SETTINGS':
        return (
          <SettingsScreen
            isChildProfile={state.isChildProfile}
            userRole={state.userRole}
            patientName={state.patientName}
            onLogout={() => updateState({ currentScreen: 'LOGIN', userRole: null, isChildProfile: false })}
            onGoToDashboard={() => updateState({ currentScreen: 'DASHBOARD' })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md bg-white dark:bg-card rounded-3xl shadow-2xl dark:shadow-2xl overflow-hidden">
          {renderScreen()}
        </div>
      </div>
    </main>
  );
}
