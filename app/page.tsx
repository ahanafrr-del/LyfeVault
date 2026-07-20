'use client';

import { useState } from 'react';
import LoginScreen from '@/components/screens/LoginScreen';
import EmergencyProfileScreen from '@/components/screens/EmergencyProfileScreen';
import PatientDashboard from '@/components/screens/PatientDashboard';
import MedicalTimeline from '@/components/screens/MedicalTimeline';
import DepartmentalReports from '@/components/screens/DepartmentalReports';
import AddReportForm from '@/components/screens/AddReportForm';
import AIHealthSummary from '@/components/screens/AIHealthSummary';
import ScreenSwitcher from '@/components/ScreenSwitcher';

type ScreenType = 'login' | 'emergency' | 'dashboard' | 'timeline' | 'reports' | 'upload' | 'ai-summary';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('login');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen onNavigate={() => setCurrentScreen('dashboard')} />;
      case 'emergency':
        return <EmergencyProfileScreen />;
      case 'dashboard':
        return <PatientDashboard onNavigate={(screen) => setCurrentScreen(screen as ScreenType)} />;
      case 'timeline':
        return <MedicalTimeline />;
      case 'reports':
        return <DepartmentalReports />;
      case 'upload':
        return <AddReportForm />;
      case 'ai-summary':
        return <AIHealthSummary />;
      default:
        return <LoginScreen onNavigate={() => setCurrentScreen('dashboard')} />;
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md">
        <ScreenSwitcher currentScreen={currentScreen} onScreenChange={setCurrentScreen} />
        <div className="mt-4">
          {renderScreen()}
        </div>
      </div>
    </main>
  );
}
