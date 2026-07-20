'use client';

import { useState } from 'react';
import { Upload, Calendar, X, QrCode } from 'lucide-react';

export default function AddReportForm() {
  const [patient, setPatient] = useState('');
  const [department, setDepartment] = useState('');
  const [consultationDate, setConsultationDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [reportType, setReportType] = useState('');
  const [notes, setNotes] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedDoctor, setScannedDoctor] = useState<{ name: string; license: string; specialty: string } | null>(null);

  const handleFileSelect = (e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>) => {
    let selectedFile: File | null = null;

    if (e instanceof DragEvent) {
      e.preventDefault();
      selectedFile = e.dataTransfer?.files?.[0] || null;
    } else if (e.type === 'change') {
      selectedFile = (e.target as HTMLInputElement).files?.[0] || null;
    }

    if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/'))) {
      setFile(selectedFile);
    }
  };

  const handleQRScan = () => {
    // Simulate QR scan
    setTimeout(() => {
      setScannedDoctor({
        name: 'Dr. Emily Thompson',
        license: 'NMC/2019/12345',
        specialty: 'Cardiology',
      });
      setShowQRScanner(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    alert('Report submitted successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Upload size={28} />
          Add Medical Report
        </h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Patient Selector */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Select Patient</label>
            <select
              value={patient}
              onChange={(e) => setPatient(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Choose a patient...</option>
              <option value="john">John Anderson</option>
              <option value="jane">Jane Smith</option>
              <option value="michael">Michael Chen</option>
            </select>
          </div>

          {/* Department Dropdown */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select department...</option>
              <option value="cardiology">Cardiology</option>
              <option value="neurology">Neurology</option>
              <option value="orthopedics">Orthopedics</option>
              <option value="pulmonology">Pulmonology</option>
              <option value="general">General Medicine</option>
            </select>
          </div>

          {/* Report Type */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select type...</option>
              <option value="lab">Lab Report</option>
              <option value="imaging">Imaging</option>
              <option value="consultation">Consultation Note</option>
              <option value="prescription">Prescription</option>
            </select>
          </div>

          {/* Consultation Date */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Calendar size={16} />
              Consultation Date
            </label>
            <input
              type="date"
              value={consultationDate}
              onChange={(e) => setConsultationDate(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Upload Document</label>
            {file ? (
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center text-green-700 font-bold">
                    ✓
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-green-900 truncate">{file.name}</p>
                    <p className="text-xs text-green-700">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-green-700 hover:text-green-900"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileSelect}
                className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="font-medium text-foreground mb-1">Drag & drop your file here</p>
                <p className="text-xs text-muted-foreground mb-4">or</p>
                <label className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all cursor-pointer inline-block font-medium">
                  Browse Files
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Doctor License Scanner */}
          {scannedDoctor ? (
            <div className="bg-accent/10 border-2 border-accent rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">Doctor Verified</p>
                  <p className="text-sm text-muted-foreground mt-1">{scannedDoctor.name}</p>
                  <p className="text-xs text-muted-foreground">{scannedDoctor.license}</p>
                  <p className="text-xs text-muted-foreground">{scannedDoctor.specialty}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setScannedDoctor(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowQRScanner(true)}
              className="w-full py-3 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <QrCode size={20} />
              Scan Doctor License QR
            </button>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={4}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!patient || !department || !file}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Upload Report
          </button>
        </form>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full max-h-96 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Scan Doctor License</h3>
              <button
                onClick={() => setShowQRScanner(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={24} />
              </button>
            </div>

            {/* QR Code Placeholder */}
            <div className="flex-1 flex items-center justify-center bg-secondary rounded-2xl mb-4">
              <div className="text-center">
                <div className="w-32 h-32 bg-white border-4 border-primary rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <QrCode size={80} className="text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Position QR code in the frame</p>
              </div>
            </div>

            {/* Scan Button */}
            <button
              onClick={handleQRScan}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all"
            >
              Simulate Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
