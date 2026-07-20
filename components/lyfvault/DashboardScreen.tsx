import { LogOut, Settings, Clock, FileText, Users, Shield, Heart, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/app/page';

interface DashboardScreenProps {
  userRole: UserRole;
  patientName: string;
  isChildProfile: boolean;
  onViewTimeline: () => void;
  onGoToSettings: () => void;
  onLogout: () => void;
}

export default function DashboardScreen({
  userRole,
  patientName,
  isChildProfile,
  onViewTimeline,
  onGoToSettings,
  onLogout,
}: DashboardScreenProps) {
  const getRoleColor = () => {
    switch (userRole) {
      case 'OWNER':
        return 'from-primary to-cyan-400';
      case 'DOCTOR':
        return 'from-accent to-emerald-400';
      case 'BYSTANDER':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-primary to-accent';
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case 'OWNER':
        return 'Patient/Owner';
      case 'DOCTOR':
        return 'Medical Professional';
      case 'BYSTANDER':
        return 'Emergency Responder';
      default:
        return 'User';
    }
  };

  const menuItems = [
    {
      icon: Clock,
      label: 'Medical Timeline',
      description: 'View & manage records',
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      action: onViewTimeline,
    },
    {
      icon: FileText,
      label: 'Doctor Reports',
      description: 'Consultation notes',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      action: onViewTimeline,
    },
    {
      icon: Pill,
      label: 'Medications',
      description: 'Current prescriptions',
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      action: () => {},
    },
    {
      icon: Heart,
      label: 'Vital Signs',
      description: 'Health metrics',
      color: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-950/30',
      action: () => {},
    },
  ];

  // Filter menu based on role
  const visibleMenu = userRole === 'BYSTANDER' ? menuItems.slice(0, 2) : menuItems;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-card">
      {/* Header */}
      <div className={`p-6 bg-gradient-to-r ${getRoleColor()} text-white space-y-1`}>
        <p className="text-xs font-semibold opacity-90">Logged in as</p>
        <h1 className="text-2xl font-bold">{patientName}</h1>
        <p className="text-sm opacity-90">{getRoleLabel()}</p>
        {isChildProfile && (
          <div className="flex items-center gap-1 mt-2 text-xs bg-white/20 px-2 py-1 rounded-full w-fit">
            <Shield className="w-3 h-3" />
            Child Profile (Guardian Protected)
          </div>
        )}
      </div>

      {/* Alert banner */}
      {userRole === 'BYSTANDER' && (
        <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border-b border-orange-200 dark:border-orange-800 text-xs text-orange-700 dark:text-orange-300">
          <strong>Emergency Mode:</strong> Limited access to critical data only
        </div>
      )}

      {/* Quick stats */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Age</p>
          <p className="font-bold text-foreground">8 years</p>
        </div>
        <div className="p-3 bg-accent/10 dark:bg-accent/20 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Blood Group</p>
          <p className="font-bold text-foreground">O+</p>
        </div>
      </div>

      {/* Menu items */}
      <div className="flex-1 p-4 space-y-3">
        {visibleMenu.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full p-4 rounded-lg text-left transition-all hover:shadow-md active:scale-95 ${item.bg}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${item.bg}`}>
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </button>
          );
        })}

        {userRole === 'DOCTOR' && (
          <div className="p-4 bg-accent/10 dark:bg-accent/20 rounded-lg border border-accent/30">
            <p className="text-xs font-semibold text-accent mb-2">Doctor Verification Status</p>
            <p className="text-xs text-muted-foreground">License verified ✓</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-4 space-y-2 border-t border-border">
        <Button
          onClick={onGoToSettings}
          variant="outline"
          className="w-full rounded-lg font-semibold py-5 flex items-center justify-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
        <Button
          onClick={onLogout}
          className="w-full bg-destructive hover:bg-destructive/90 text-white rounded-lg font-semibold py-5 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
