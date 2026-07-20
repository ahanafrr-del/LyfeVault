'use client';

import { useState, useEffect } from 'react';
import { storage, UserSession } from '@/lib/storage';
import RegistrationScreen from '@/components/premium/RegistrationScreen';
import LoginScreen from '@/components/premium/LoginScreen';
import DashboardScreen from '@/components/premium/DashboardScreen';
import MedicalReportsScreen from '@/components/premium/MedicalReportsScreen';
import DoctorUploadScreen from '@/components/premium/DoctorUploadScreen';

type ScreenType = 'registration' | 'login' | 'dashboard' | 'reports' | 'upload';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('registration');
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has an active session
    const existingSession = storage.getSession();
    if (existingSession) {
      setSession(existingSession);
      setCurrentScreen('dashboard');
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="animate-pulse flex flex-col gap-4">
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          </div>
        </div>
      </main>
    );
  }

  const handleRegistration = (email: string, password: string, fullName: string, age: number) => {
    const newUser = {
      id: 'user_' + Date.now(),
      email,
      password,
      fullName,
      age,
      bloodGroup: 'O+',
      allergies: ['Penicillin'],
      createdAt: new Date().toISOString(),
    };
    storage.saveUser(newUser);
    setCurrentScreen('login');
  };

  const handleLogin = (email: string, password: string) => {
    const user = storage.getUser();
    if (user && user.email === email && user.password === password) {
      const newSession = {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        loggedInAt: new Date().toISOString(),
      };
      storage.saveSession(newSession);
      setSession(newSession);
      setCurrentScreen('dashboard');
    }
  };

  const handleLogout = () => {
    storage.clearSession();
    setSession(null);
    setCurrentScreen('login');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'registration':
        return (
          <RegistrationScreen
            onRegister={handleRegistration}
            onSwitchToLogin={() => setCurrentScreen('login')}
          />
        );

      case 'login':
        return (
          <LoginScreen
            onLogin={handleLogin}
            onSwitchToRegistration={() => setCurrentScreen('registration')}
          />
        );

      case 'dashboard':
        return (
          <DashboardScreen
            user={session}
            onViewReports={() => setCurrentScreen('reports')}
            onUploadReport={() => setCurrentScreen('upload')}
            onLogout={handleLogout}
          />
        );

      case 'reports':
        return (
          <MedicalReportsScreen
            user={session}
            onBack={() => setCurrentScreen('dashboard')}
            onUploadNew={() => setCurrentScreen('upload')}
          />
        );

      case 'upload':
        return (
          <DoctorUploadScreen
            user={session}
            onBack={() => setCurrentScreen('reports')}
            onSuccess={() => setCurrentScreen('reports')}
          />
        );

      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          {renderScreen()}
        </div>
      </div>
    </main>
  );
}
