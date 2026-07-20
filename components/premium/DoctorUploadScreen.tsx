'use client';

import { useState } from 'react';
import { UserSession, storage, MedicalReport } from '@/lib/storage';
import { ArrowLeft, Upload, QrCode, Check, AlertCircle } from 'lucide-react';

interface DoctorUploadScreenProps {
  user: UserSession | null;
  onBack: () => void;
  onSuccess: () => void;
}

export default function DoctorUploadScreen({ user, onBack, onSuccess }: DoctorUploadScreenProps) {
  const [step, setStep] = useState<'form' | 'qr' | 'success' | 'error'>(
    'form'
  );
  const [formData, setFormData] = useState({
    title: '',
    category: 'Lab Tests',
    description: '',
    reportDate: new Date().toISOString().split('T')[0],
  });
  const [doctor, setDoctor] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [scannedDoctor, setScannedDoctor] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQRScan = () => {
    // Simulate QR code scanning
    const doctors = ['Dr. Sarah Smith', 'Dr. James Wilson', 'Dr. Emily Chen'];
    const randomDoctor = doctors[Math.floor(Math.random() * doctors.length)];
    setScannedDoctor(randomDoctor);
    setDoctor(randomDoctor);
    setQrOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !doctor) {
      setStep('error');
      return;
    }

    // Simulate upload with random success/failure
    const success = Math.random() > 0.3; // 70% success rate

    if (success) {
      const newReport: MedicalReport = {
        id: 'report_' + Date.now(),
        date: formData.reportDate,
        category: formData.category,
        title: formData.title,
        doctor,
        description: formData.description,
        status: 'completed',
      };

      storage.addMedicalReport(newReport);
      setStep('success');

      setTimeout(() => {
        onSuccess();
      }, 2000);
    } else {
      setStep('error');
    }
  };

  if (step === 'success') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center text-center space-y-6 min-h-96">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center animate-pulse">
          <Check className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Report Uploaded!</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
            Your medical report has been securely saved to your profile.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Error</h1>
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-100 mb-1">Upload Failed</p>
            <p className="text-sm text-red-800 dark:text-red-200">
              Unable to verify doctor credentials. Please ensure the QR code is valid.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              setStep('form');
              setScannedDoctor('');
              setDoctor('');
            }}
            className="w-full px-4 py-3 bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all"
          >
            Try Again
          </button>
          <button
            onClick={onBack}
            className="w-full px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl font-semibold transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Medical Report</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Step 1 of 2</p>
        </div>
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Report Title */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Report Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Blood Test Results"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-900 dark:text-white"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-900 dark:text-white"
          >
            <option>Lab Tests</option>
            <option>Imaging</option>
            <option>Consultation</option>
            <option>Vaccination</option>
          </select>
        </div>

        {/* Report Date */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Report Date</label>
          <input
            type="date"
            name="reportDate"
            value={formData.reportDate}
            onChange={handleInputChange}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-900 dark:text-white"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Add any relevant notes..."
            rows={3}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-900 dark:text-white resize-none"
          />
        </div>

        {/* Doctor Verification */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Doctor Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={doctor}
              placeholder="Scanned from QR code"
              readOnly
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white opacity-75"
            />
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="px-4 py-3 bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <QrCode className="w-5 h-5" />
              Scan QR
            </button>
          </div>
        </div>

        {/* QR Scanner Modal */}
        {qrOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-sm space-y-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Scan Doctor License</h2>
              <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl p-8 flex items-center justify-center">
                <div className="w-32 h-32 border-4 border-cyan-400 rounded-lg animate-pulse flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-slate-400" />
                </div>
              </div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleQRScan}
                  className="w-full px-4 py-3 bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all"
                >
                  Simulate Scan
                </button>
                <button
                  type="button"
                  onClick={() => setQrOpen(false)}
                  className="w-full px-4 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full px-4 py-3 bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          <Upload className="w-5 h-5" />
          Upload Report
        </button>
      </form>
    </div>
  );
}
