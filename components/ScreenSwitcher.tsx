'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

type ScreenType = 'login' | 'emergency' | 'dashboard' | 'timeline' | 'reports' | 'upload' | 'ai-summary';

interface ScreenSwitcherProps {
  currentScreen: ScreenType;
  onScreenChange: (screen: ScreenType) => void;
}

const SCREENS: { value: ScreenType; label: string }[] = [
  { value: 'login', label: '1. Login' },
  { value: 'emergency', label: '2. Emergency Profile' },
  { value: 'dashboard', label: '3. Patient Dashboard' },
  { value: 'timeline', label: '4. Medical Timeline' },
  { value: 'reports', label: '5. Departmental Reports' },
  { value: 'upload', label: '6. Add Report' },
  { value: 'ai-summary', label: '7. AI Summary' },
];

export default function ScreenSwitcher({
  currentScreen,
  onScreenChange,
}: ScreenSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="sticky top-0 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
      >
        <span>
          {SCREENS.find((s) => s.value === currentScreen)?.label}
        </span>
        <ChevronDown
          size={20}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {SCREENS.map((screen) => (
            <button
              key={screen.value}
              onClick={() => {
                onScreenChange(screen.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left hover:bg-secondary transition-colors ${
                currentScreen === screen.value
                  ? 'bg-accent text-accent-foreground font-semibold'
                  : 'text-foreground'
              }`}
            >
              {screen.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
