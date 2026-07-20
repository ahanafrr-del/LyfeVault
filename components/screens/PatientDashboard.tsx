'use client';

import { Heart, Activity, Zap, Clock, FileText, Pill, MessageSquare, Settings, Plus, AlertCircle } from 'lucide-react';

interface PatientDashboardProps {
  onNavigate: (screen: string) => void;
}

export default function PatientDashboard({ onNavigate }: PatientDashboardProps) {
  const quickAccessItems = [
    { icon: FileText, label: 'Records', color: 'bg-blue-500', screen: 'timeline' },
    { icon: Clock, label: 'Appointments', color: 'bg-purple-500', screen: 'timeline' },
    { icon: Pill, label: 'Prescriptions', color: 'bg-green-500', screen: 'reports' },
    { icon: Activity, label: 'Test Results', color: 'bg-orange-500', screen: 'reports' },
    { icon: Heart, label: 'Vital Signs', color: 'bg-red-500', screen: 'dashboard' },
    { icon: FileText, label: 'Reports', color: 'bg-indigo-500', screen: 'reports' },
    { icon: MessageSquare, label: 'Chat Doctor', color: 'bg-pink-500', screen: 'dashboard' },
    { icon: Settings, label: 'Settings', color: 'bg-gray-500', screen: 'dashboard' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-8 rounded-b-3xl shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm opacity-90">Good Morning 👋</p>
            <h1 className="text-3xl font-bold">John Anderson</h1>
          </div>
          <div className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center text-xl">
            👤
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Vital Stats Card */}
        <div className="bg-card rounded-3xl p-6 shadow-lg border border-border">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Activity size={20} className="text-primary" />
            Vital Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary p-4 rounded-2xl text-center">
              <p className="text-sm text-muted-foreground">Heart Rate</p>
              <p className="text-2xl font-bold text-primary mt-1">72</p>
              <p className="text-xs text-muted-foreground">bpm</p>
            </div>
            <div className="bg-secondary p-4 rounded-2xl text-center">
              <p className="text-sm text-muted-foreground">Blood Pressure</p>
              <p className="text-2xl font-bold text-primary mt-1">120/80</p>
              <p className="text-xs text-muted-foreground">mmHg</p>
            </div>
            <div className="bg-secondary p-4 rounded-2xl text-center">
              <p className="text-sm text-muted-foreground">Oxygen Level</p>
              <p className="text-2xl font-bold text-accent mt-1">98%</p>
              <p className="text-xs text-muted-foreground">SpO2</p>
            </div>
            <div className="bg-secondary p-4 rounded-2xl text-center">
              <p className="text-sm text-muted-foreground">Temperature</p>
              <p className="text-2xl font-bold text-primary mt-1">98.6°F</p>
              <p className="text-xs text-muted-foreground">Temp</p>
            </div>
          </div>
        </div>

        {/* Quick Access Grid */}
        <div className="bg-card rounded-3xl p-6 shadow-lg border border-border">
          <h3 className="text-lg font-bold text-foreground mb-4">Quick Access</h3>
          <div className="grid grid-cols-4 gap-3">
            {quickAccessItems.map((item) => (
              <button
                key={item.label}
                onClick={() => onNavigate(item.screen)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-secondary hover:bg-accent/20 transition-all group"
              >
                <div className={`${item.color} p-3 rounded-xl text-white group-hover:shadow-lg transition-all`}>
                  <item.icon size={24} />
                </div>
                <span className="text-xs text-center font-medium text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-3xl p-6 shadow-lg border border-border">
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock size={20} className="text-primary" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {[
              { date: 'Today', desc: 'Lab test results uploaded', icon: '✓' },
              { date: 'Yesterday', desc: 'Consultation with Dr. Brown', icon: '📋' },
              { date: '3 days ago', desc: 'Blood pressure checkup', icon: '❤️' },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-secondary rounded-xl">
                <div className="text-lg">{activity.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{activity.desc}</p>
                  <p className="text-xs text-muted-foreground">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Health Alert */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-3xl p-4 shadow-lg border-2 border-yellow-200 flex items-start gap-3">
          <AlertCircle size={24} className="text-yellow-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-900 text-sm">AI Health Insight</p>
            <p className="text-xs text-yellow-800 mt-1">Monitor your hydration levels this week. Stay healthy!</p>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => onNavigate('upload')}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-accent to-primary text-white rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center justify-center font-bold text-3xl hover:scale-110"
      >
        <Plus size={32} />
      </button>
    </div>
  );
}
