'use client';

import { useState } from 'react';
import { UserSession } from '@/lib/storage';
import { Clock, FileText, Upload, MessageSquare, Zap, Settings, LogOut, Plus, Activity } from 'lucide-react';

interface DashboardScreenProps {
  user: UserSession | null;
  onViewReports: () => void;
  onUploadReport: () => void;
  onLogout: () => void;
}

export default function DashboardScreen({
  user,
  onViewReports,
  onUploadReport,
  onLogout,
}: DashboardScreenProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const menuItems = [
    { icon: FileText, label: 'Medical Reports', color: 'from-blue-400 to-blue-600', onClick: onViewReports },
    { icon: Upload, label: 'Upload Report', color: 'from-purple-400 to-purple-600', onClick: onUploadReport },
    { icon: Activity, label: 'Vital Signs', color: 'from-green-400 to-green-600', onClick: () => {} },
    { icon: Clock, label: 'Appointments', color: 'from-orange-400 to-orange-600', onClick: () => {} },
    { icon: MessageSquare, label: 'AI Chatbot', color: 'from-pink-400 to-pink-600', onClick: () => setChatOpen(true) },
    { icon: Zap, label: 'Health Summary', color: 'from-yellow-400 to-yellow-600', onClick: () => setSummaryOpen(true) },
    { icon: Settings, label: 'Settings', color: 'from-indigo-400 to-indigo-600', onClick: () => {} },
    { icon: LogOut, label: 'Logout', color: 'from-red-400 to-red-600', onClick: onLogout },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 space-y-8">
      {/* Header with FAB */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome, {user?.fullName}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Your health, secured</p>
        </div>
        <button
          onClick={onUploadReport}
          className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">5</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Reports</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">3</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Doctors</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">12</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Alerts</p>
        </div>
      </div>

      {/* Bento Grid Menu */}
      <div className="grid grid-cols-2 gap-4">
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            onClick={item.onClick}
            className={`bg-gradient-to-br ${item.color} hover:shadow-xl transition-all duration-200 text-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3 min-h-[140px] group`}
          >
            <div className="bg-white/20 group-hover:bg-white/30 rounded-xl p-3 transition-all duration-200">
              <item.icon className="w-6 h-6" />
            </div>
            <span className="font-semibold text-sm text-center">{item.label}</span>
          </button>
        ))}
      </div>

      {/* AI Chatbot Modal */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl w-full max-w-md mx-auto p-6 space-y-4 max-h-96 flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Health Assistant</h2>
              <button
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4">
              <div className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-900 dark:text-cyan-100 rounded-lg p-3 text-sm">
                Hello {user?.fullName}! I&apos;m your health assistant. How can I help you today?
              </div>
              <div className="bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white rounded-lg p-3 text-sm ml-auto w-3/4">
                What are my recent vitals?
              </div>
              <div className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-900 dark:text-cyan-100 rounded-lg p-3 text-sm">
                Based on your medical profile, your recent vitals show healthy blood pressure and oxygen levels. All markers are within normal range.
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold py-2 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Health Summary Modal */}
      {summaryOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Health Summary</h2>
              <button
                onClick={() => setSummaryOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-xl p-3">
                <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">✓ Overall Health Status</p>
                <p className="text-sm text-green-800 dark:text-green-200">Excellent. All vitals within normal range.</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">✓ Recommendations</p>
                <p className="text-sm text-blue-800 dark:text-blue-200">Continue current exercise routine and maintain hydration.</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-xl p-3">
                <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-100 mb-1">⚠ Follow-up</p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">Schedule checkup with your GP in 3 months.</p>
              </div>
            </div>
            <button
              onClick={() => setSummaryOpen(false)}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-2 rounded-xl transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
