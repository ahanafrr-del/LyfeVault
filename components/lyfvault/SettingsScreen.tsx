import { ArrowLeft, Lock, Bell, Users, Trash2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/app/page';

interface SettingsScreenProps {
  isChildProfile: boolean;
  userRole: UserRole;
  patientName: string;
  onLogout: () => void;
  onGoToDashboard: () => void;
}

export default function SettingsScreen({
  isChildProfile,
  userRole,
  patientName,
  onLogout,
  onGoToDashboard,
}: SettingsScreenProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-card">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-primary to-accent text-white flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button onClick={onGoToDashboard} className="p-2 hover:bg-white/20 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Settings content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Account section */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Account</p>
          
          <div className="p-4 bg-secondary/50 dark:bg-secondary/20 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground text-sm">{patientName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isChildProfile ? 'Child Profile' : 'Adult Profile'}
                </p>
              </div>
              <div className="px-3 py-1 bg-primary/20 dark:bg-primary/30 rounded-full">
                <p className="text-xs font-bold text-primary">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Privacy & Security</p>

          <button className="w-full p-4 bg-secondary/50 dark:bg-secondary/20 rounded-lg border border-border text-left hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Privacy Settings</p>
                <p className="text-xs text-muted-foreground">Data visibility controls</p>
              </div>
            </div>
          </button>

          <button className="w-full p-4 bg-secondary/50 dark:bg-secondary/20 rounded-lg border border-border text-left hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Notifications</p>
                <p className="text-xs text-muted-foreground">Alert preferences</p>
              </div>
            </div>
          </button>
        </div>

        {/* Guardian settings (for child profiles) */}
        {isChildProfile && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Guardian Controls</p>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Guardians & Permissions</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-white dark:bg-card rounded-lg text-sm">
                  <div>
                    <p className="font-semibold text-foreground">Mom (Rachel Johnson)</p>
                    <p className="text-xs text-muted-foreground">Full access</p>
                  </div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">OWNER</div>
                </div>
                <div className="flex items-center justify-between p-2 bg-white dark:bg-card rounded-lg text-sm">
                  <div>
                    <p className="font-semibold text-foreground">Dad (Michael Johnson)</p>
                    <p className="text-xs text-muted-foreground">Full access</p>
                  </div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">OWNER</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Doctor access (for DOCTOR role) */}
        {userRole === 'DOCTOR' && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Professional Settings</p>

            <button className="w-full p-4 bg-secondary/50 dark:bg-secondary/20 rounded-lg border border-border text-left hover:border-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Users className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">Patient Access List</p>
                  <p className="text-xs text-muted-foreground">Manage assigned patients</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Data management */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Data Management</p>

          <button className="w-full p-4 bg-secondary/50 dark:bg-secondary/20 rounded-lg border border-border text-left hover:border-destructive/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/20 rounded-lg">
                <Trash2 className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Delete Account</p>
                <p className="text-xs text-destructive">Permanently delete all data</p>
              </div>
            </div>
          </button>
        </div>

        {/* App info */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">About</p>

          <div className="p-4 bg-secondary/50 dark:bg-secondary/20 rounded-lg border border-border space-y-2 text-sm">
            <div className="flex justify-between">
              <p className="text-muted-foreground">App Version</p>
              <p className="font-semibold text-foreground">1.0.0</p>
            </div>
            <div className="flex justify-between">
              <p className="text-muted-foreground">Build</p>
              <p className="font-semibold text-foreground">2024.01.15</p>
            </div>
            <div className="flex justify-between">
              <p className="text-muted-foreground">Status</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">Secure ✓</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout button */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={onLogout}
          className="w-full bg-destructive hover:bg-destructive/90 text-white rounded-lg font-semibold py-6 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
