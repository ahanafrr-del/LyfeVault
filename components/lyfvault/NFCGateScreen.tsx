import { Smartphone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NFCGateScreenProps {
  nfcScanned: boolean;
  termsAccepted: boolean;
  tAndCModalOpen: boolean;
  onNFCScan: () => void;
  onTermsAccept: () => void;
  onOpenTerms: () => void;
  onCloseTerms: () => void;
  onProceed: () => void;
}

export default function NFCGateScreen({
  nfcScanned,
  termsAccepted,
  tAndCModalOpen,
  onNFCScan,
  onTermsAccept,
  onOpenTerms,
  onCloseTerms,
  onProceed,
}: NFCGateScreenProps) {
  return (
    <div className="relative p-6 flex flex-col items-center justify-center min-h-screen bg-white dark:bg-card">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-50/30 to-transparent dark:from-cyan-950/20 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">LyfVault</h1>
          <p className="text-sm text-muted-foreground">Medical Access Protocol v1.2</p>
        </div>

        {/* NFC Animation */}
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <div className={`w-24 h-24 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center transition-all duration-500 ${
              nfcScanned ? 'scale-95' : 'animate-pulse'
            }`}>
              <Smartphone className="w-12 h-12 text-primary" />
            </div>
          </div>
          
          {/* Pulsing rings */}
          {!nfcScanned && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" style={{ animationDuration: '2.5s' }} />
            </>
          )}
        </div>

        {/* Status message */}
        <div className="space-y-2">
          {!nfcScanned ? (
            <>
              <p className="text-lg font-semibold text-foreground">Initiate NFC Scan</p>
              <p className="text-sm text-muted-foreground">Hold device near medical tag</p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-accent">NFC Tag Detected</p>
              <p className="text-sm text-muted-foreground">Access token acquired</p>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3 pt-4">
          <Button
            onClick={onNFCScan}
            disabled={nfcScanned}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 rounded-xl transition-all"
          >
            {nfcScanned ? 'Tag Verified' : 'Scan NFC Tag'}
          </Button>

          {nfcScanned && (
            <Button
              onClick={onOpenTerms}
              variant="outline"
              className="w-full border border-primary/50 text-primary hover:bg-primary/5 font-semibold py-6 rounded-xl"
            >
              View Terms & Conditions
            </Button>
          )}
        </div>

        {/* Warning notice */}
        <div className="flex gap-2 p-3 bg-destructive/10 dark:bg-destructive/20 rounded-lg border border-destructive/30 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Authorized users only. Medical data protected by law.</span>
        </div>

        {/* T&C Modal */}
        {tAndCModalOpen && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-card rounded-2xl p-6 max-h-96 overflow-y-auto max-w-sm">
              <h2 className="text-lg font-bold text-foreground mb-4">Terms & Conditions</h2>
              <div className="text-sm text-muted-foreground space-y-3 mb-6">
                <p>
                  <strong>HIPAA Compliance:</strong> Your medical data is encrypted and protected under HIPAA regulations.
                </p>
                <p>
                  <strong>Data Access:</strong> Only authorized personnel can access your records.
                </p>
                <p>
                  <strong>Emergency Protocol:</strong> In emergencies, authorized responders may access critical information.
                </p>
                <p>
                  <strong>Age Restrictions:</strong> For users under 18, parental consent is required.
                </p>
                <p>
                  <strong>Liability:</strong> LyfVault is not liable for third-party service interruptions.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={onCloseTerms}
                  variant="outline"
                  className="flex-1 text-sm py-5"
                >
                  Decline
                </Button>
                <Button
                  onClick={onTermsAccept}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white text-sm py-5"
                >
                  Accept
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Proceed button */}
        {nfcScanned && termsAccepted && (
          <Button
            onClick={onProceed}
            className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-6 rounded-xl mt-4 animate-pulse"
          >
            Proceed to Onboarding
          </Button>
        )}
      </div>
    </div>
  );
}
