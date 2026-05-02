import { useState, useEffect } from 'react';
import { X, Award, Loader2, Download, DollarSign } from 'lucide-react';
import type { Credential } from '../pages/EmployerDashboard';
import { generateCertificateImage, downloadCertificateImage } from '../utils/certificateGenerator';

const CERT_TITLES = [
  'Certificate of Achievement',
  'Certificate of Completion',
  'Professional Development Certificate',
  'Certificate of Excellence',
  'Internship Completion Certificate',
  'Skills Proficiency Certificate',
  'Certificate of Recognition',
  'Task Completion Certificate',
];

function pickCertTitle(hash: string): string {
  let sum = 0;
  for (let i = 0; i < hash.length; i++) sum += hash.charCodeAt(i);
  return CERT_TITLES[sum % CERT_TITLES.length];
}

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential: Credential | null;
  publicKey: string | null;
  onIssueCertificate: (hash: string, certName: string, notes: string, pdfDataUrl: string | null) => Promise<void>;
  onIssueBonus: (hash: string) => Promise<void>;
  isIssuingCertificate: boolean;
  isPaying: boolean;
  paymentError: string | null;
}

export function CertificateModal({
  isOpen, onClose, credential, publicKey,
  onIssueCertificate, onIssueBonus,
  isIssuingCertificate, isPaying, paymentError,
}: CertificateModalProps) {
  const [certName, setCertName] = useState('');
  const [notes, setNotes] = useState('');
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [generatedCert, setGeneratedCert] = useState<string | null>(null);
  const [issued, setIssued] = useState(false);

  useEffect(() => {
    if (credential) {
      setCertName(credential.certificate_name || pickCertTitle(credential.hash));
      setNotes(credential.completion_notes || '');
      setPdfDataUrl(credential.employer_certificate_pdf || null);
      setIssued(!!credential.certificate_name);
      // Auto-generate preview on open
      const img = generateCertificateImage({
        studentName: credential.name,
        certificateTitle: credential.certificate_name || pickCertTitle(credential.hash),
        completionNotes: credential.completion_notes || 'For outstanding completion of assigned tasks.',
        date: new Date().toISOString().split('T')[0],
        employerWallet: '',
        hash: credential.hash,
      });
      setGeneratedCert(img);
    }
  }, [credential?.id, credential?.certificate_name]);

  if (!isOpen || !credential) return null;

  const canIssue = credential.task_status === 'accomplished' || credential.employer_signed;

  const handleGeneratePreview = () => {
    const img = generateCertificateImage({
      studentName: credential.name,
      certificateTitle: certName || 'Certificate of Completion',
      completionNotes: notes || 'For outstanding completion of assigned tasks.',
      date: new Date().toISOString().split('T')[0],
      employerWallet: publicKey || '',
      hash: credential.hash,
    });
    setGeneratedCert(img);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPdfDataUrl(reader.result);
    };
    reader.readAsDataURL(f);
  };

  const handleIssue = async () => {
    await onIssueCertificate(credential.hash, certName.trim(), notes.trim(), pdfDataUrl);
    setIssued(true);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Award className="w-4 h-4 text-purple-400" />
            </div>
            Certificate Generation
          </h3>
          <button onClick={onClose} className="modal-close-btn"><X className="w-5 h-5" /></button>
        </div>

        {/* Student info */}
        <div className="p-3 rounded-xl border border-slate-700/80 bg-slate-900/40 mb-5">
          <p className="text-xs text-slate-500 mb-1">Issuing certificate for</p>
          <p className="text-sm font-semibold text-white">{credential.name}</p>
          <p className="text-xs text-slate-400">{credential.role} • Task: {credential.task_status || 'none'}</p>
        </div>

        {!canIssue && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 mb-5 text-center">
            <p className="text-sm text-amber-300">Student must finish the assigned task before issuing a certificate.</p>
          </div>
        )}

        {canIssue && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Certificate Title</label>
              <input className="input-field text-sm" placeholder="Auto-generated title" value={certName} onChange={(e) => setCertName(e.target.value)} />
              <p className="text-[10px] text-slate-500 mt-1">Auto-filled — you can edit if needed</p>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Accomplishment Notes</label>
              <textarea className="input-field min-h-[80px] text-sm" placeholder="Describe the student's accomplishments..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Upload Custom Certificate PDF (optional)</label>
              <input type="file" accept="application/pdf" onChange={handleUpload} className="input-field text-xs" />
            </div>

            {/* Student PDF inline */}
            {credential.student_certificate_pdf && (
              <div className="rounded-xl border border-slate-700/80 bg-slate-950 p-3">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Student's Submitted Document (Resume/PDF)</p>
                <iframe src={credential.student_certificate_pdf} className="w-full h-48 rounded-lg border border-slate-700" title="Student PDF" />
              </div>
            )}

            {/* Generate preview */}
            <button onClick={handleGeneratePreview} className="btn-secondary w-full py-2.5 text-sm">
              Refresh Certificate Preview
            </button>

            {generatedCert && (
              <div className="rounded-xl border border-slate-700/80 bg-slate-950 p-3">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Certificate Preview</p>
                <img src={generatedCert} alt="Certificate Preview" className="w-full rounded-lg border border-slate-700" />
                <button onClick={() => downloadCertificateImage(generatedCert, credential.name)} className="btn-secondary w-full mt-3 py-2 text-xs flex items-center justify-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Download as PNG
                </button>
              </div>
            )}

            {/* Issue buttons */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <button onClick={handleIssue} disabled={isIssuingCertificate || !certName.trim() || issued} className="btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                {isIssuingCertificate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                {issued ? 'Certificate Issued ✓' : 'Issue Certificate'}
              </button>
              <button onClick={() => onIssueBonus(credential.hash)} disabled={isPaying || !credential.employer_signed} className="btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                Issue 100 XLM Bonus
              </button>
            </div>

            {paymentError && <p className="text-xs text-red-400 p-2 rounded-lg border border-red-500/20 bg-red-500/5">{paymentError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
