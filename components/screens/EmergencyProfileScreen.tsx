'use client';

import { AlertTriangle, Phone, Mail, MapPin, CheckCircle } from 'lucide-react';

export default function EmergencyProfileScreen() {
  const emergencyContacts = [
    { name: 'Sarah Johnson', relation: 'Mother', phone: '+1 (555) 123-4567', email: 'sarah.j@email.com' },
    { name: 'Michael Chen', relation: 'Brother', phone: '+1 (555) 234-5678', email: 'mchen@email.com' },
    { name: 'Dr. Lisa Brown', relation: 'Primary Doctor', phone: '+1 (555) 345-6789', email: 'drbrown@clinic.com' },
  ];

  const allergies = ['Penicillin', 'Shellfish', 'Pollen'];
  const conditions = ['Type 2 Diabetes', 'Hypertension'];
  const medications = ['Metformin', 'Lisinopril'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-red-50/20 to-background pb-8">
      {/* Red Emergency Banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={28} className="flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold">Emergency Profile</h2>
            <p className="text-red-100 text-sm">Critical medical information</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Patient Header */}
        <div className="bg-card rounded-3xl p-6 shadow-lg border border-border text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full mx-auto mb-4 flex items-center justify-center text-4xl">
            👤
          </div>
          <h3 className="text-2xl font-bold text-foreground">John Anderson</h3>
          <p className="text-muted-foreground">Age: 45 years</p>
        </div>

        {/* Blood Group - Prominent */}
        <div className="bg-gradient-to-br from-accent to-primary rounded-3xl p-6 shadow-lg border-2 border-accent text-white text-center">
          <p className="text-sm font-medium opacity-90 mb-1">Blood Group</p>
          <p className="text-5xl font-bold">O+</p>
        </div>

        {/* Allergies */}
        <div className="bg-card rounded-3xl p-6 shadow-lg border border-border">
          <h4 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-600" />
            Verified Allergies
          </h4>
          <div className="space-y-2">
            {allergies.map((allergy) => (
              <div key={allergy} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200">
                <CheckCircle size={20} className="text-red-600" />
                <span className="font-medium text-red-900">{allergy}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Medical Conditions */}
        <div className="bg-card rounded-3xl p-6 shadow-lg border border-border">
          <h4 className="text-lg font-bold text-foreground mb-4">Medical Conditions</h4>
          <div className="space-y-2">
            {conditions.map((condition) => (
              <div key={condition} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                <CheckCircle size={20} className="text-primary" />
                <span className="font-medium">{condition}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Medications */}
        <div className="bg-card rounded-3xl p-6 shadow-lg border border-border">
          <h4 className="text-lg font-bold text-foreground mb-4">Current Medications</h4>
          <div className="space-y-2">
            {medications.map((med) => (
              <div key={med} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                <span className="font-medium">{med}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-card rounded-3xl p-6 shadow-lg border border-border">
          <h4 className="text-lg font-bold text-foreground mb-4">Emergency Contacts</h4>
          <div className="space-y-4">
            {emergencyContacts.map((contact, idx) => (
              <div key={idx} className="p-4 bg-secondary rounded-2xl border border-border">
                <div className="font-semibold text-foreground mb-1">{contact.name}</div>
                <div className="text-sm text-muted-foreground mb-3">{contact.relation}</div>
                <div className="flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm font-medium">
                    <Phone size={16} />
                    Call
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-all text-sm font-medium">
                    <Mail size={16} />
                    Email
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Call Button */}
        <button className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2">
          <AlertTriangle size={24} />
          Emergency Call - 911
        </button>
      </div>
    </div>
  );
}
