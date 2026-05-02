import { useState, useEffect, useCallback } from 'react';
import { Search, ShieldCheck, Building2, CheckCircle2, DollarSign, Users, ClipboardCheck, Award, Eye, FileText, Fingerprint, Copy } from 'lucide-react';
import { useFreighter } from '../hooks/useFreighter';
import { CREDENTIALS_UPDATED_EVENT, createCredential, fetchCredentials, updateCredentialStatus } from '../utils/credentialsApi';
import { getCertificateStatus, registerCertificateOnChain, signCertificateOnChain, submitLinkPayment } from '../utils/soroban';
import { TransactionReceipt } from '../components/TransactionReceipt';
import { TransactionHistoryPanel } from '../components/TransactionHistoryPanel';
import { PdfViewerModal } from '../components/PdfViewerModal';
import { TaskModal } from '../components/TaskModal';
import { CryptoValidModal } from '../components/CryptoValidModal';
import { CertificateModal } from '../components/CertificateModal';

export interface Credential {
  id: number;
  name: string;
  role: string;
  hash: string;
  date: string;
  address: string;
  employer_address: string;
  institution_address: string;
  verified: boolean;
  employer_signed: boolean;
  institution_signed: boolean;
  task_title?: string;
  task_status?: 'assigned' | 'accomplished';
  certificate_name?: string;
  completion_notes?: string;
  student_certificate_pdf?: string;
  employer_certificate_pdf?: string;
  reward_tx_hash?: string;
}

export function EmployerDashboard() {
  const [applicants, setApplicants] = useState<Credential[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'success' | 'failed' | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isIssuingCertificate, setIsIssuingCertificate] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [verificationNote, setVerificationNote] = useState<string | null>(null);
  const [evaluationNotes, setEvaluationNotes] = useState('');
  const [rating, setRating] = useState(0);
  const [lastVerifiedStatus, setLastVerifiedStatus] = useState<Record<string, any>>({});
  const [signingStep, setSigningStep] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Modal states
  const [pdfModal, setPdfModal] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });
  const [taskModal, setTaskModal] = useState<{ open: boolean; credential: Credential | null }>({ open: false, credential: null });
  const [cryptoModal, setCryptoModal] = useState<{ open: boolean; credential: Credential | null }>({ open: false, credential: null });
  const [certModal, setCertModal] = useState<{ open: boolean; credential: Credential | null }>({ open: false, credential: null });

  const { publicKey } = useFreighter();

  useEffect(() => {
    if (publicKey) localStorage.setItem('stellarni_last_employer_wallet', publicKey);
  }, [publicKey]);

  const loadApplicants = useCallback(async () => {
    try {
      const creds = await fetchCredentials();
      if (creds.length === 0) {
        localStorage.removeItem('stellarni_credentials');
        const reseeded = await fetchCredentials();
        setApplicants(reseeded);
        return;
      }
      setApplicants(creds);
    } catch (e) {
      console.warn('Failed to load applicants:', e);
    }
  }, []);

  useEffect(() => {
    loadApplicants();
    const interval = setInterval(loadApplicants, 5000);
    return () => clearInterval(interval);
  }, [loadApplicants]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'stellarni_credentials') loadApplicants();
    };
    const onCredentialsUpdated = () => loadApplicants();
    window.addEventListener('storage', onStorage);
    window.addEventListener(CREDENTIALS_UPDATED_EVENT, onCredentialsUpdated);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CREDENTIALS_UPDATED_EVENT, onCredentialsUpdated);
    };
  }, [loadApplicants]);

  // ── Handlers ──

  const handleVerify = async (hash: string) => {
    if (!hash.trim()) return;
    setIsVerifying(true);
    setVerificationResult(null);
    setTxHash(null);
    setPaymentError(null);
    setVerificationNote(null);

    try {
      const trimmedHash = hash.trim();
      let selectedApplicant = applicants.find((a) => a.hash === trimmedHash);
      const status = await getCertificateStatus(trimmedHash);

      if (!selectedApplicant && status) {
        await createCredential({
          name: 'Imported Applicant', role: 'Unspecified', hash: trimmedHash,
          date: new Date().toISOString().split('T')[0],
          address: publicKey || '', employer_address: publicKey || '', institution_address: publicKey || '',
        });
        await loadApplicants();
        selectedApplicant = {
          id: -1, name: 'Imported Applicant', role: 'Unspecified', hash: trimmedHash,
          date: new Date().toISOString().split('T')[0],
          address: publicKey || '', employer_address: publicKey || '', institution_address: publicKey || '',
          verified: false, employer_signed: false, institution_signed: false,
        };
      }

      if (!selectedApplicant && !status) {
        setVerificationResult('failed');
        setVerificationNote('Hash not found in local records or on-chain state.');
        return;
      }

      if (status) {
        setVerificationResult('success');
        setLastVerifiedStatus(prev => ({ ...prev, [trimmedHash]: status }));
        await updateCredentialStatus({
          hash: trimmedHash, employer_signed: status.employer_signed,
          institution_signed: false, verified: status.employer_signed,
        });
        await loadApplicants();
      } else {
        setVerificationResult('success');
        setLastVerifiedStatus(prev => ({ ...prev, [trimmedHash]: { employer_signed: false } }));
        setVerificationNote('Credential is submitted but not yet on-chain. Click "Sign as Employer" to register and sign.');
      }
    } catch (e: any) {
      const selectedApplicant = applicants.find((a) => a.hash === hash.trim());
      if (selectedApplicant) {
        setVerificationResult('success');
        setVerificationNote('Credential found in submissions. You can proceed with "Sign as Employer".');
      } else {
        setVerificationResult('failed');
        setVerificationNote('Unable to verify this hash.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSign = async (hash: string) => {
    if (!publicKey || !hash.trim()) return;
    setIsSigning(true);
    setPaymentError(null);
    setSigningStep('Preparing...');
    try {
      const trimmedHash = hash.trim();
      const selectedApplicant = applicants.find((a) => a.hash === trimmedHash);
      if (!selectedApplicant) throw new Error('Select an applicant hash first.');

      // Use cached status if available to save one simulation
      let existing = lastVerifiedStatus[trimmedHash];
      if (!existing) {
        setSigningStep('Checking on-chain status...');
        existing = await getCertificateStatus(trimmedHash);
      }

      if (!existing || !existing.employer_signed) {
        if (!existing) {
          setSigningStep('Registering on-chain...');
          try {
            await registerCertificateOnChain(publicKey, trimmedHash, publicKey, selectedApplicant.institution_address || publicKey);
            // Small delay after registration to let nodes sync and avoid connection issues
            await new Promise(r => setTimeout(r, 1000));
          } catch (registerError: any) {
            const registerMsg = registerError?.message || '';
            if (!registerMsg.includes('Error(Contract, #1)')) throw registerError;
            setVerificationNote('Credential already registered. Continuing to signing...');
          }
        }

        setSigningStep('Signing credential...');
        const tx = await signCertificateOnChain(publicKey, trimmedHash);
        setTxHash(tx);
      }

      setSigningStep('Saving to backend...');
      await updateCredentialStatus({ 
        hash: trimmedHash, 
        employer_signed: true,
        completion_notes: evaluationNotes || 'Employer verified and signed.',
        // rating could be added here if the API supported it, but we'll stick to notes for now
      });
      
      await loadApplicants();
      setVerificationNote('Credential signed and evaluation saved successfully.');
    } catch (e: any) {
      const msg = e?.message || 'Signing failed';
      if (msg.includes('does not expose a compatible signing function') || msg.includes('non-existent contract function')) {
        await updateCredentialStatus({ hash: hash.trim(), employer_signed: true, completion_notes: evaluationNotes });
        await loadApplicants();
        setPaymentError(null);
        setVerificationNote('On-chain sign function unavailable. Marked as signed in app state.');
      } else {
        setPaymentError(msg);
      }
    } finally {
      setIsSigning(false);
      setSigningStep(null);
    }
  };

  const handleAssignTask = async (hash: string, taskTitle: string) => {
    await updateCredentialStatus({ hash, task_title: taskTitle, task_status: 'assigned' });
    await loadApplicants();
  };

  const handleIssueCertificate = async (hash: string, certName: string, notes: string, pdfDataUrl: string | null) => {
    setIsIssuingCertificate(true);
    setPaymentError(null);
    try {
      await updateCredentialStatus({
        hash,
        certificate_name: certName,
        completion_notes: notes || 'Task completed successfully.',
        employer_certificate_pdf: pdfDataUrl || undefined,
      });
      await loadApplicants();
      setVerificationNote('Certificate issued successfully. Student can now review it.');
    } catch (e: any) {
      setPaymentError(e.message || 'Issuing certificate failed');
    } finally {
      setIsIssuingCertificate(false);
    }
  };

  const handleIssueBonus = async (hash: string) => {
    if (!publicKey) return;
    setIsPaying(true);
    setPaymentError(null);
    try {
      const selectedApplicant = applicants.find((a) => a.hash === hash);
      if (!selectedApplicant?.address) throw new Error('Applicant wallet missing.');
      if (!selectedApplicant.employer_signed) throw new Error('Sign the credential first before issuing bonus.');

      const tx = await submitLinkPayment(publicKey, selectedApplicant.address, 100);
      setTxHash(tx);
      await updateCredentialStatus({
        hash, verified: true,
        task_status: selectedApplicant.task_status === 'accomplished' ? 'accomplished' : selectedApplicant.task_status,
        reward_tx_hash: tx,
      });
      await loadApplicants();
    } catch (e: any) {
      setPaymentError(e.message || 'Payment failed');
    } finally {
      setIsPaying(false);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  // ── Filtered list ──
  const filtered = applicants.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.hash.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
  });

  const assignedCount = applicants.filter((a) => a.task_status === 'assigned').length;
  const accomplishedCount = applicants.filter((a) => a.task_status === 'accomplished').length;
  const verifiedCount = applicants.filter((a) => a.verified).length;
  const rewardsIssued = applicants.filter((a) => a.reward_tx_hash).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="glass-panel p-6 mb-6 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-400/20">
        <h2 className="text-2xl font-bold text-white">Employer Command Center</h2>
        <p className="text-sm text-slate-300 mt-1">Verify student credentials, assign tasks, issue certificates, and release rewards.</p>
        <div className="grid sm:grid-cols-4 gap-3 mt-4">
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-3">
            <p className="text-[11px] uppercase text-slate-500">Applicants</p>
            <p className="text-xl font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-teal-300" />{applicants.length}</p>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-3">
            <p className="text-[11px] uppercase text-slate-500">Tasks</p>
            <p className="text-xl font-semibold text-white flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-blue-300" />{accomplishedCount}/{assignedCount + accomplishedCount}</p>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-3">
            <p className="text-[11px] uppercase text-slate-500">Verified</p>
            <p className="text-xl font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-300" />{verifiedCount}</p>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-3">
            <p className="text-[11px] uppercase text-slate-500">Rewards</p>
            <p className="text-xl font-semibold text-white flex items-center gap-2"><DollarSign className="w-4 h-4 text-amber-300" />{rewardsIssued}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="glass-panel p-4 mb-6 border border-slate-700/70">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            className="input-field pl-10 text-sm"
            placeholder="Search by name, role, or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel border border-slate-700/70 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-slate-700/70">
          <Building2 className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-bold text-white">Student Credentials</h3>
          <span className="ml-auto text-xs text-slate-500">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="stellarni-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Hash Verify</th>
                <th>Student PDF</th>
                <th>Give Task</th>
                <th>Crypto Valid</th>
                <th>Certificate</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    {searchQuery ? 'No matching records found.' : 'No applicants yet.'}
                  </td>
                </tr>
              ) : (
                filtered.map((app) => {
                  const hasPdf = !!app.student_certificate_pdf;
                  const hasTask = !!app.task_title;
                  const taskDone = app.task_status === 'accomplished';
                  const hasCert = !!app.certificate_name;
                  const isSigned = app.employer_signed;
                  const isVerified = app.verified;

                  return (
                    <tr key={app.id}>
                      {/* Student Name */}
                      <td>
                        <div className="font-semibold text-slate-100">{app.name}</div>
                        <div className="text-slate-500 text-[10px]">{app.role}</div>
                      </td>

                      {/* Hash Verify */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-400 text-[10px]">{app.hash.slice(0, 10)}...</span>
                          <button
                            onClick={() => copyHash(app.hash)}
                            className="text-slate-500 hover:text-emerald-400 transition-colors"
                            title="Copy full hash"
                          >
                            {copiedHash === app.hash ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className={`status-badge mt-1 ${isSigned ? 'status-badge-success' : isVerified ? 'status-badge-success' : 'status-badge-warning'}`}>
                          {isSigned ? 'Signed' : isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>

                      {/* Student PDF */}
                      <td>
                        {hasPdf ? (
                          <div className="space-y-1.5">
                            <div
                              onClick={() => setPdfModal({ open: true, url: app.student_certificate_pdf!, title: `${app.name}'s Resume / PDF` })}
                              className="w-28 h-16 rounded-lg border border-slate-700/80 overflow-hidden cursor-pointer hover:border-emerald-500/40 transition-colors relative group"
                            >
                              <iframe
                                src={app.student_certificate_pdf!}
                                className="w-full h-full pointer-events-none"
                                title={`${app.name} PDF thumbnail`}
                                tabIndex={-1}
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-4 h-4 text-emerald-400" />
                              </div>
                            </div>
                            <button
                              onClick={() => setPdfModal({ open: true, url: app.student_certificate_pdf!, title: `${app.name}'s Resume / PDF` })}
                              className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> Open Full View
                            </button>
                          </div>
                        ) : (
                          <div className="w-28 h-16 rounded-lg border border-dashed border-slate-700/60 flex items-center justify-center">
                            <span className="text-slate-600 text-[10px] text-center">No PDF<br />uploaded</span>
                          </div>
                        )}
                      </td>

                      {/* Give Task */}
                      <td>
                        <button
                          onClick={() => setTaskModal({ open: true, credential: app })}
                          className={`table-action-btn table-action-btn-blue`}
                        >
                          <ClipboardCheck className="w-3 h-3" />
                          {hasTask ? (taskDone ? 'Done ✓' : 'View') : 'Assign'}
                        </button>
                      </td>

                      {/* Crypto Valid */}
                      <td>
                        <button
                          onClick={() => {
                            setVerificationResult(null);
                            setVerificationNote(null);
                            setPaymentError(null);
                            setCryptoModal({ open: true, credential: app });
                          }}
                          className={`table-action-btn ${isSigned ? 'table-action-btn-emerald' : 'table-action-btn-teal'}`}
                        >
                          <Fingerprint className="w-3 h-3" />
                          {isSigned ? 'Valid ✓' : 'Verify'}
                        </button>
                      </td>

                      {/* Certificate */}
                      <td>
                        <button
                          onClick={() => {
                            setPaymentError(null);
                            setCertModal({ open: true, credential: app });
                          }}
                          className={`table-action-btn table-action-btn-purple`}
                        >
                          <Award className="w-3 h-3" />
                          {hasCert ? 'View' : 'Generate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Receipt (inline, after bonus) */}
      {txHash && (
        <div className="glass-panel p-6 border border-emerald-500/20 mt-6">
          <div className="flex items-center gap-2 text-emerald-400 mb-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Transaction Successful</span>
          </div>
          <TransactionReceipt hash={txHash} amount={100} asset="XLM" recipient={applicants.find(a => a.reward_tx_hash === txHash)?.address || ''} />
        </div>
      )}

      {/* Transaction History */}
      <TransactionHistoryPanel credentials={applicants} />

      {/* ── Modals ── */}

      <PdfViewerModal
        isOpen={pdfModal.open}
        onClose={() => setPdfModal({ open: false, url: '', title: '' })}
        pdfDataUrl={pdfModal.url}
        title={pdfModal.title}
      />

      <TaskModal
        isOpen={taskModal.open}
        onClose={() => setTaskModal({ open: false, credential: null })}
        credential={taskModal.credential}
        onAssignTask={handleAssignTask}
      />

      <CryptoValidModal
        isOpen={cryptoModal.open}
        onClose={() => setCryptoModal({ open: false, credential: null })}
        credential={cryptoModal.credential}
        publicKey={publicKey}
        verificationResult={verificationResult}
        verificationNote={verificationNote}
        onVerify={handleVerify}
        onSign={handleSign}
        isVerifying={isVerifying}
        isSigning={isSigning}
        signingStep={signingStep}
        onViewPdf={() => {
          const cred = cryptoModal.credential;
          if (cred?.student_certificate_pdf) {
            setPdfModal({ open: true, url: cred.student_certificate_pdf, title: `${cred.name}'s PDF` });
          }
        }}
        rating={rating}
        onSetRating={setRating}
        evaluationNotes={evaluationNotes}
        onSetEvaluationNotes={setEvaluationNotes}
      />

      <CertificateModal
        isOpen={certModal.open}
        onClose={() => setCertModal({ open: false, credential: null })}
        credential={certModal.credential}
        publicKey={publicKey}
        onIssueCertificate={handleIssueCertificate}
        onIssueBonus={handleIssueBonus}
        isIssuingCertificate={isIssuingCertificate}
        isPaying={isPaying}
        paymentError={paymentError}
      />
    </div>
  );
}
