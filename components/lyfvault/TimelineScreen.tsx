import { ArrowLeft, Upload, AlertCircle, CheckCircle, QrCode, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { UserRole } from '@/app/page';

interface TimelineScreenProps {
  userRole: UserRole;
  qrScannerOpen: boolean;
  uploadError: boolean;
  uploadRetrying: boolean;
  doctorName: string;
  onOpenQRScanner: () => void;
  onCloseQRScanner: () => void;
  onScanQR: (name: string) => void;
  onRetryUpload: () => void;
  onTriggerError: () => void;
  onDismissError: () => void;
  onGoToDashboard: () => void;
}

export default function TimelineScreen({
  userRole,
  qrScannerOpen,
  uploadError,
  uploadRetrying,
  doctorName,
  onOpenQRScanner,
  onCloseQRScanner,
  onScanQR,
  onRetryUpload,
  onTriggerError,
  onDismissError,
  onGoToDashboard,
}: TimelineScreenProps) {
  const [showUploadForm, setShowUploadForm] = useState(false);

  const timelineItems = [
    {
      date: '2024-01-15',
      type: 'Consultation',
      doctor: 'Dr. Raj Patel',
      notes: 'Routine checkup - All vitals normal',
      status: 'completed',
    },
    {
      date: '2024-01-08',
      type: 'Lab Test',
      doctor: 'PathLab Center',
      notes: 'Blood work results - Healthy',
      status: 'completed',
    },
    {
      date: '2024-01-01',
      type: 'Vaccination',
      doctor: 'Dr. Sarah Khan',
      notes: 'Annual flu vaccine administered',
      status: 'completed',
    },
  ];

  const mockDoctors = [
    'Dr. Aisha Kumar',
    'Dr. Rajesh Singh',
    'Dr. Priya Sharma',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-card">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-primary to-accent text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Medical Timeline</h1>
          <p className="text-sm text-white/90">Records & History</p>
        </div>
        <button onClick={onGoToDashboard} className="p-2 hover:bg-white/20 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Doctor verification status (for DOCTOR role) */}
      {userRole === 'DOCTOR' && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800">
          {doctorName ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4" />
              <span>
                <strong>Verified Doctor:</strong> {doctorName}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
              <AlertCircle className="w-4 h-4" />
              <span>Scan your NMC license to enable uploads</span>
            </div>
          )}
        </div>
      )}

      {/* Upload error alert */}
      {uploadError && (
        <div className="p-4 mx-4 mt-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-700 dark:text-red-300 text-sm">Upload Failed</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Security validation failed. Please try again.</p>
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={onRetryUpload}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={uploadRetrying}
                >
                  {uploadRetrying ? 'Retrying...' : 'Retry'}
                </Button>
                <Button
                  onClick={onDismissError}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300"
                >
                  Dismiss
                </Button>
              </div>
            </div>
            <button onClick={onDismissError}>
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      )}

      {/* Timeline items */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {timelineItems.map((item, idx) => (
          <div key={idx} className="p-4 bg-secondary/50 dark:bg-secondary/20 rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">{item.type}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                <p className="text-xs text-foreground mt-2">{item.notes}</p>
                {item.doctor && <p className="text-xs text-primary mt-1 font-semibold">{item.doctor}</p>}
              </div>
              {item.status === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-1" />}
            </div>
          </div>
        ))}
      </div>

      {/* Upload section for doctors */}
      {userRole === 'DOCTOR' && (
        <div className="p-4 border-t border-border space-y-3">
          {!doctorName ? (
            <Button
              onClick={onOpenQRScanner}
              className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-6 rounded-lg flex items-center justify-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              Scan NMC License (QR)
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 rounded-lg flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Medical Report
              </Button>

              {showUploadForm && (
                <div className="p-4 bg-secondary/30 dark:bg-secondary/10 rounded-lg space-y-3 border border-border">
                  <input
                    type="text"
                    placeholder="Report type (e.g., Lab Test)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white dark:bg-input"
                  />
                  <div className="p-3 border-2 border-dashed border-primary/30 rounded-lg text-center text-xs text-muted-foreground">
                    Drag & drop or click to upload file
                  </div>
                  <Button
                    onClick={onTriggerError}
                    className="w-full bg-primary hover:bg-primary/90 text-white text-sm py-4 rounded-lg"
                  >
                    Submit Report
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* QR Scanner Modal */}
      {qrScannerOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-card rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-bold text-foreground">Scan NMC License</h2>

            {/* QR scanner frame */}
            <div className="w-full aspect-square bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border-2 border-primary/30 flex items-center justify-center">
              <div className="text-center space-y-2">
                <QrCode className="w-12 h-12 text-primary/50 mx-auto" />
                <p className="text-xs text-muted-foreground">Point camera at QR code</p>
              </div>
            </div>

            {/* Mock scan result buttons */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Scan Result:</p>
              {mockDoctors.map((doctor) => (
                <Button
                  key={doctor}
                  onClick={() => onScanQR(doctor)}
                  variant="outline"
                  className="w-full text-sm py-5 text-left justify-start"
                >
                  {doctor}
                </Button>
              ))}
            </div>

            <Button
              onClick={onCloseQRScanner}
              className="w-full bg-destructive hover:bg-destructive/90 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
