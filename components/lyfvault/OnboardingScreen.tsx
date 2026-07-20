import { Users, Heart, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface OnboardingScreenProps {
  isChildProfile: boolean;
  onSelectProfile: (isChild: boolean) => void;
}

export default function OnboardingScreen({
  isChildProfile,
  onSelectProfile,
}: OnboardingScreenProps) {
  const [selectedAge, setSelectedAge] = useState<'adult' | 'child' | null>(null);

  return (
    <div className="p-6 min-h-screen flex flex-col justify-between bg-gradient-to-b from-background to-secondary/50">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Profile Setup</h1>
        <p className="text-sm text-muted-foreground">Select account type to proceed</p>
      </div>

      {/* Profile cards */}
      <div className="space-y-4 flex-1 flex items-center justify-center">
        {/* Adult Profile Card */}
        <div
          onClick={() => {
            setSelectedAge('adult');
            setTimeout(() => onSelectProfile(false), 300);
          }}
          className={`cursor-pointer w-full p-6 rounded-2xl border-2 transition-all duration-300 ${
            selectedAge === 'adult'
              ? 'border-primary bg-primary/10 dark:bg-primary/20 scale-105'
              : 'border-border bg-white dark:bg-card/50 hover:border-primary/50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground mb-1">Adult Profile</h3>
              <p className="text-xs text-muted-foreground">Age 18+</p>
              <ul className="text-xs text-muted-foreground mt-3 space-y-1">
                <li>✓ Full control of records</li>
                <li>✓ Emergency access settings</li>
                <li>✓ Doctor collaboration</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Child Profile Card */}
        <div
          onClick={() => {
            setSelectedAge('child');
            setTimeout(() => onSelectProfile(true), 300);
          }}
          className={`cursor-pointer w-full p-6 rounded-2xl border-2 transition-all duration-300 ${
            selectedAge === 'child'
              ? 'border-accent bg-accent/10 dark:bg-accent/20 scale-105'
              : 'border-border bg-white dark:bg-card/50 hover:border-accent/50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-accent/20 rounded-xl">
              <Heart className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground mb-1">Child Profile</h3>
              <p className="text-xs text-muted-foreground">Age 0-17</p>
              <ul className="text-xs text-muted-foreground mt-3 space-y-1">
                <li>✓ Guardian approval required</li>
                <li>✓ Parental controls enabled</li>
                <li>✓ Protected by COPPA</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="flex gap-2 p-3 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/30 text-xs text-primary mb-4">
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>All data encrypted with AES-256 encryption standard.</span>
      </div>

      {/* Helper text */}
      <p className="text-xs text-center text-muted-foreground">
        {selectedAge ? 'Loading...' : 'Select your profile type to continue'}
      </p>
    </div>
  );
}
