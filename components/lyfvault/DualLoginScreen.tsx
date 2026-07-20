import { Lock, Stethoscope, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface DualLoginScreenProps {
  isChildProfile: boolean;
  onLoginAsOwner: () => void;
  onLoginAsDoctor: () => void;
  onGoToEmergency: () => void;
}

export default function DualLoginScreen({
  isChildProfile,
  onLoginAsOwner,
  onLoginAsDoctor,
  onGoToEmergency,
}: DualLoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'owner' | 'doctor'>('owner');
  const [showPassword, setShowPassword] = useState(false);
  const [patientEmail, setPatientEmail] = useState('sarah@example.com');
  const [doctorEmail, setDoctorEmail] = useState('dr.smith@hospital.com');
  const [password, setPassword] = useState('••••••••');

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-card">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-primary to-accent text-white">
        <h1 className="text-2xl font-bold">LyfVault Access</h1>
        <p className="text-sm text-white/90">Secure Login Required</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-4 border-b border-border">
        <button
          onClick={() => setActiveTab('owner')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            activeTab === 'owner'
              ? 'bg-primary text-white'
              : 'bg-muted text-foreground hover:bg-muted/80'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Patient/Owner</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('doctor')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            activeTab === 'doctor'
              ? 'bg-accent text-white'
              : 'bg-muted text-foreground hover:bg-muted/80'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Stethoscope className="w-4 h-4" />
            <span>Doctor</span>
          </div>
        </button>
      </div>

      {/* Login form */}
      <div className="flex-1 p-6 space-y-6">
        {activeTab === 'owner' ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">Email</label>
              <input
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-secondary dark:bg-input focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-secondary dark:bg-input focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="••••••••"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isChildProfile && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Guardian Approval Required:</strong> Parent/guardian must authorize this profile.
                </p>
              </div>
            )}

            <Button
              onClick={onLoginAsOwner}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 rounded-xl mt-6"
            >
              Login as Patient/Owner
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">Doctor Email</label>
              <input
                type="email"
                value={doctorEmail}
                onChange={(e) => setDoctorEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-secondary dark:bg-input focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                placeholder="doctor@hospital.com"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">License Number</label>
              <input
                type="text"
                defaultValue="NMC-2024-12345"
                className="w-full px-4 py-3 rounded-lg border border-border bg-secondary dark:bg-input focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                placeholder="NMC-XXXXXXXX"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-secondary dark:bg-input focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  placeholder="••••••••"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={onLoginAsDoctor}
              className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-6 rounded-xl mt-6"
            >
              Login as Doctor
            </Button>
          </div>
        )}

        {/* Emergency bypass button */}
        <div className="pt-4 border-t border-border">
          <Button
            onClick={onGoToEmergency}
            variant="outline"
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 font-semibold py-6 rounded-xl flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Emergency Bypass
          </Button>
        </div>
      </div>
    </div>
  );
}
