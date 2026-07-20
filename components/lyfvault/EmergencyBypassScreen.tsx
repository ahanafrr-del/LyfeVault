import { AlertTriangle, Phone, AlertCircle, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface EmergencyBypassScreenProps {
  onCallEmergency: () => void;
  onCancel: () => void;
}

export default function EmergencyBypassScreen({
  onCallEmergency,
  onCancel,
}: EmergencyBypassScreenProps) {
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

  const emergencyNumbers = [
    { label: 'Ambulance', number: '108', color: 'bg-red-500' },
    { label: 'Police', number: '100', color: 'bg-blue-500' },
    { label: 'Fire', number: '101', color: 'bg-orange-500' },
  ];

  const handleCall = (number: string) => {
    setSelectedNumber(number);
    setTimeout(() => {
      onCallEmergency();
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-red-50 dark:from-red-950/20 to-background">
      {/* Alert Header */}
      <div className="p-6 bg-gradient-to-r from-destructive to-red-600 text-white space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
          <h1 className="text-2xl font-bold">EMERGENCY MODE</h1>
        </div>
        <p className="text-sm text-white/90">Bystander Access - Limited View</p>
      </div>

      {/* Patient Info Alert */}
      <div className="p-4 mx-4 mt-6 bg-white dark:bg-card rounded-lg border-2 border-red-200 dark:border-red-900 space-y-3">
        <div className="flex items-start gap-3">
          <Heart className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-foreground">Patient Information (Public)</p>
            <p className="text-xs text-muted-foreground mt-1">Limited data accessible in emergency</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded">
            <p className="text-xs text-muted-foreground">Blood Group</p>
            <p className="font-bold text-foreground">O+</p>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded">
            <p className="text-xs text-muted-foreground">Age</p>
            <p className="font-bold text-foreground">8 years</p>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded col-span-2">
            <p className="text-xs text-muted-foreground">Emergency Contacts</p>
            <p className="font-bold text-foreground">Mom (555-0123) | Dad (555-0124)</p>
          </div>
        </div>
      </div>

      {/* Emergency Numbers */}
      <div className="flex-1 p-6 space-y-4">
        <p className="text-sm font-semibold text-foreground">Call Emergency Services</p>
        <div className="grid grid-cols-1 gap-3">
          {emergencyNumbers.map((service) => (
            <button
              key={service.number}
              onClick={() => handleCall(service.number)}
              disabled={selectedNumber !== null}
              className={`p-4 rounded-xl font-bold text-white text-lg transition-all duration-300 flex items-center justify-between ${
                selectedNumber === service.number
                  ? `${service.color} scale-105 shadow-lg`
                  : selectedNumber
                  ? 'opacity-50 cursor-not-allowed'
                  : `${service.color} hover:shadow-lg active:scale-95`
              }`}
            >
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-xs opacity-90">Call</p>
                  <p>{service.label}</p>
                </div>
              </div>
              <span className="text-2xl font-bold">{service.number}</span>
            </button>
          ))}
        </div>

        {/* Calling status */}
        {selectedNumber && (
          <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-center space-y-2">
            <p className="text-sm font-bold text-green-700 dark:text-green-300">Calling {selectedNumber}...</p>
            <div className="flex justify-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Warning notice */}
      <div className="p-4 mx-6 mb-6 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg flex gap-2">
        <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-700 dark:text-yellow-300">
          <strong>Notice:</strong> This is bystander mode. Patient data is limited. Authorities will be notified.
        </p>
      </div>

      {/* Back button */}
      <Button
        onClick={onCancel}
        disabled={selectedNumber !== null}
        variant="outline"
        className="mx-6 mb-6 w-full py-5 rounded-xl font-semibold"
      >
        Back to Login
      </Button>
    </div>
  );
}
