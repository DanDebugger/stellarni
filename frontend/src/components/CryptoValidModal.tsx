import { useState } from 'react';
import { X, ShieldCheck, ShieldAlert, Fingerprint, Loader2, Eye, Star } from 'lucide-react';
import type { Credential } from '../pages/EmployerDashboard';

interface CryptoValidModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential: Credential | null;
  publicKey: string | null;
  verificationResult: 'success' | 'failed' | null;
  verificationNote: string | null;
  onVerify: (hash: string) => Promise<void>;
  onSign: (hash: string) => Promise<void>;
  isVerifying: boolean;
  isSigning: boolean;
  signingStep: string | null;
  onViewPdf: () => void;
  rating: number;
  onSetRating: (r: number) => void;
  evaluationNotes: string;
  onSetEvaluationNotes: (n: string) => void;
}

export function CryptoValidModal({
  isOpen, onClose, credential, publicKey,
  verificationResult, verificationNote,
  onVerify, onSign, isVerifying, isSigning, signingStep, onViewPdf,
  rating, onSetRating, evaluationNotes, onSetEvaluationNotes,
}: CryptoValidModalProps) {
  const [showFullHash, setShowFullHash] = useState(false);
  if (!isOpen || !credential) return null;

  const isValid = verificationResult === 'success';
  const isFailed = verificationResult === 'failed';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isValid ? 'bg-emerald-500/15' : isFailed ? 'bg-red-500/15' : 'bg-slate-700/50'}`}>
              {isValid ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-slate-400" />}
            </div>
            Cryptographic Validation
          </h3>
          <button onClick={onClose} className="modal-close-btn"><X className="w-5 h-5" /></button>
        </div>

        {/* Student info */}
        <div className="p-4 rounded-xl border border-slate-700/80 bg-slate-900/40 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{credential.name}</p>
              <p className="text-xs text-slate-400">{credential.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`status-badge ${credential.employer_signed ? 'status-badge-success' : 'status-badge-warning'}`}>
                {credential.employer_signed ? 'Signed' : 'Unsigned'}
              </span>
              <span className={`status-badge ${credential.verified ? 'status-badge-success' : 'status-badge-default'}`}>
                {credential.verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
          </div>
        </div>

        {/* Hash */}
        <div className="p-3 rounded-xl border border-slate-700/80 bg-slate-900/40 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase font-bold text-slate-500">SHA-256 Hash</p>
            <button onClick={() => setShowFullHash(!showFullHash)} className="text-[10px] text-emerald-400 hover:text-emerald-300">
              {showFullHash ? 'Collapse' : 'Expand'}
            </button>
          </div>
          <p className="font-mono text-xs text-emerald-400 break-all">
            {showFullHash ? credential.hash : `${credential.hash.slice(0, 20)}...${credential.hash.slice(-12)}`}
          </p>
        </div>

        {/* Verify button */}
        {!verificationResult && (
          <button onClick={() => onVerify(credential.hash)} disabled={isVerifying} className="btn-secondary w-full py-3 mb-5 flex items-center justify-center gap-2">
            {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {isVerifying ? 'Verifying on-chain...' : 'Verify Authenticity'}
          </button>
        )}

        {/* Valid result */}
        {isValid && (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 mb-5 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <p className="text-sm font-bold text-white">Cryptographically Valid</p>
                <p className="text-xs text-emerald-400/70">Document matches an on-chain credential record.</p>
              </div>
            </div>

            {credential.student_certificate_pdf && (
              <button onClick={onViewPdf} className="w-full mt-2 mb-4 p-2.5 rounded-lg border border-slate-700 bg-slate-900/60 flex items-center gap-2 text-xs text-slate-300 hover:border-emerald-500/30 transition-colors">
                <Eye className="w-3.5 h-3.5 text-emerald-400" /> View Student Uploaded PDF
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/60">
                <p className="text-slate-500 mb-1">Authorized Employer</p>
                <p className="font-mono text-slate-300">{credential.employer_address ? `${credential.employer_address.slice(0, 8)}...${credential.employer_address.slice(-6)}` : 'Not set'}</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/60">
                <p className="text-slate-500 mb-1">Connected Wallet</p>
                <p className="font-mono text-slate-300">{publicKey ? `${publicKey.slice(0, 8)}...${publicKey.slice(-6)}` : 'Not connected'}</p>
              </div>
            </div>

            {credential.employer_address && publicKey && credential.employer_address !== publicKey && (
              <p className="text-xs text-amber-300 mb-4 p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">⚠ Employer wallet differs. Current wallet will be used for on-chain registration.</p>
            )}

            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2 font-medium">Applicant Evaluation</p>
              <div className="flex gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => onSetRating(s)} className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${rating >= s ? 'border-amber-400 bg-amber-400/20 text-amber-400 scale-110' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                    <Star className="w-4 h-4" fill={rating >= s ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <textarea className="input-field min-h-[80px] text-sm" placeholder="Evaluation notes..." value={evaluationNotes} onChange={(e) => onSetEvaluationNotes(e.target.value)} />
            </div>

            <button onClick={() => onSign(credential.hash)} disabled={isSigning || !!credential.employer_signed} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden">
              {isSigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
              <span className="flex flex-col items-center">
                <span>{credential.employer_signed ? 'Already Signed ✓' : (isSigning ? signingStep : 'Sign as Employer')}</span>
                {isSigning && <span className="text-[10px] opacity-70 animate-pulse">Please check your wallet</span>}
              </span>
            </button>
          </div>
        )}

        {isFailed && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-5">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-sm font-bold text-red-300">Verification Failed</p>
                <p className="text-xs text-red-400/70">Hash not found on-chain or in local records.</p>
              </div>
            </div>
          </div>
        )}

        {verificationNote && (
          <p className="text-xs text-amber-300 p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">{verificationNote}</p>
        )}
      </div>
    </div>
  );
}
