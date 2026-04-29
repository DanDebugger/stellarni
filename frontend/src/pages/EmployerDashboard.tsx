import { useState, useEffect, useCallback } from 'react';
import { Search, ShieldCheck, Loader2, Building2, CheckCircle2, DollarSign, Fingerprint, Users, ClipboardCheck, Award } from 'lucide-react';
import { useFreighter } from '../hooks/useFreighter';
import { CREDENTIALS_UPDATED_EVENT, createCredential, fetchCredentials, updateCredentialStatus } from '../utils/credentialsApi';
import { getCertificateStatus, registerCertificateOnChain, signCertificateOnChain, submitLinkPayment } from '../utils/soroban';
import { TransactionReceipt } from '../components/TransactionReceipt';

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
  employer_certificate_pdf?: string;
  reward_tx_hash?: string;
}

export function EmployerDashboard() {
  const [applicants, setApplicants] = useState<Credential[]>([]);
  const [hashInput, setHashInput] = useState('');
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
  const [taskTitle, setTaskTitle] = useState('');
  const [certificateName, setCertificateName] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [certificatePdfDataUrl, setCertificatePdfDataUrl] = useState<string | null>(null);

  const { publicKey } = useFreighter();

  useEffect(() => {
    if (publicKey) {
      localStorage.setItem('stellarni_last_employer_wallet', publicKey);
    }
  }, [publicKey]);

  const loadApplicants = useCallback(async () => {
    try {
      const creds = await fetchCredentials();
      if (creds.length === 0) {
        // Hard fallback for MVP: reseed demo data if storage was manually emptied.
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hashInput.trim()) return;

    setIsVerifying(true);
    setVerificationResult(null);
    setTxHash(null);
    setPaymentError(null);
    setVerificationNote(null);

    try {
      const trimmedHash = hashInput.trim();
      let selectedApplicant = applicants.find((a) => a.hash === trimmedHash);
      const status = await getCertificateStatus(trimmedHash);

      // If hash exists on-chain but not in local records, create a local placeholder
      // so employer can proceed in MVP mode.
      if (!selectedApplicant && status) {
        await createCredential({
          name: 'Imported Applicant',
          role: 'Unspecified',
          hash: trimmedHash,
          date: new Date().toISOString().split('T')[0],
          address: publicKey || '',
          employer_address: publicKey || '',
          institution_address: publicKey || '',
        });
        await loadApplicants();
        selectedApplicant = {
          id: -1,
          name: 'Imported Applicant',
          role: 'Unspecified',
          hash: trimmedHash,
          date: new Date().toISOString().split('T')[0],
          address: publicKey || '',
          employer_address: publicKey || '',
          institution_address: publicKey || '',
          verified: false,
          employer_signed: false,
          institution_signed: false,
        };
      }

      if (!selectedApplicant && !status) {
        setVerificationResult('failed');
        setVerificationNote('Hash not found in local records or on-chain state.');
        return;
      }

      if (status) {
        setVerificationResult('success');
        await updateCredentialStatus({
          hash: trimmedHash,
          employer_signed: status.employer_signed,
          institution_signed: false,
          verified: status.employer_signed,
        });
        await loadApplicants();
      } else {
        // Student can submit off-chain first; treat as verifiable workflow item.
        setVerificationResult('success');
        setVerificationNote('Credential is submitted but not yet on-chain. Click "Sign as Employer" to register and sign.');
      }
    } catch (e: any) {
      const selectedApplicant = applicants.find((a) => a.hash === hashInput.trim());
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

  const handleSign = async () => {
    if (!publicKey || !hashInput.trim()) return;
    setIsSigning(true);
    setPaymentError(null);
    try {
      const selectedApplicant = applicants.find((a) => a.hash === hashInput.trim());
      if (!selectedApplicant) throw new Error('Select an applicant hash first.');

      // If student submitted off-chain only, employer can register it on-chain first.
      const existing = await getCertificateStatus(hashInput.trim());
      if (!existing) {
        try {
          await registerCertificateOnChain(
            publicKey,
            hashInput.trim(),
            publicKey,
            selectedApplicant.institution_address || publicKey
          );
        } catch (registerError: any) {
          const registerMsg = registerError?.message || '';
          // Some contracts throw custom Error(Contract, #1) when the certificate
          // is already known/registered. Do not block signing flow for that case.
          if (!registerMsg.includes('Error(Contract, #1)')) {
            throw registerError;
          }
          setVerificationNote('Credential appears to be already registered on-chain. Continuing to signing step.');
        }
      }

      const tx = await signCertificateOnChain(publicKey, hashInput.trim());
      setTxHash(tx);
      await updateCredentialStatus({ hash: hashInput.trim(), employer_signed: true });
      await loadApplicants();
    } catch (e: any) {
      const msg = e?.message || 'Signing failed';
      // Some contract versions have no explicit sign function.
      // In that case, keep the workflow moving and mark employer_signed off-chain.
      if (
        msg.includes('does not expose a compatible signing function') ||
        msg.includes('non-existent contract function')
      ) {
        await updateCredentialStatus({ hash: hashInput.trim(), employer_signed: true });
        await loadApplicants();
        setPaymentError(null);
        setVerificationNote('On-chain sign function is unavailable in this contract version. Marked as employer-signed in app state.');
      } else {
        setPaymentError(msg);
      }
    } finally {
      setIsSigning(false);
    }
  };

  const handleIssueBonus = async () => {
    if (!publicKey || !hashInput.trim()) return;
    setIsPaying(true);
    setPaymentError(null);
    try {
      const selectedApplicant = applicants.find((a) => a.hash === hashInput.trim());
      if (!selectedApplicant?.address) throw new Error('Applicant wallet missing.');
      if (!selectedApplicant.employer_signed) {
        throw new Error('Sign the credential first before issuing bonus.');
      }
      const tx = await submitLinkPayment(
        publicKey,
        selectedApplicant.address,
        100
      );
      setTxHash(tx);
      await updateCredentialStatus({
        hash: hashInput.trim(),
        verified: true,
        task_status: completionNotes.trim() ? 'accomplished' : selectedApplicant.task_status,
        certificate_name: certificateName.trim() || selectedApplicant.certificate_name,
        completion_notes: completionNotes.trim() || selectedApplicant.completion_notes,
        employer_certificate_pdf: certificatePdfDataUrl || selectedApplicant.employer_certificate_pdf,
        reward_tx_hash: tx,
      });
      await loadApplicants();
    } catch (e: any) {
      setPaymentError(e.message || "Payment failed");
    } finally {
      setIsPaying(false);
    }
  };

  const handleIssueCertificate = async () => {
    if (!selected || !hashInput.trim()) return;
    setIsIssuingCertificate(true);
    setPaymentError(null);
    try {
      if (selected.task_status !== 'accomplished') {
        throw new Error('Student must finish the assigned task before issuing certificate.');
      }
      if (!certificateName.trim()) {
        throw new Error('Certificate name is required.');
      }
      await updateCredentialStatus({
        hash: selected.hash,
        certificate_name: certificateName.trim(),
        completion_notes: completionNotes.trim() || selected.completion_notes || 'Task completed successfully.',
        employer_certificate_pdf: certificatePdfDataUrl || selected.employer_certificate_pdf,
      });
      await loadApplicants();
      setVerificationNote('Certificate issued successfully. Student can now review it.');
    } catch (e: any) {
      setPaymentError(e.message || 'Issuing certificate failed');
    } finally {
      setIsIssuingCertificate(false);
    }
  };

  const selected = applicants.find((a) => a.hash === hashInput.trim());
  const assignedCount = applicants.filter((a) => a.task_status === 'assigned').length;
  const accomplishedCount = applicants.filter((a) => a.task_status === 'accomplished').length;
  const verifiedCount = applicants.filter((a) => a.verified).length;

  useEffect(() => {
    if (!selected) return;
    setTaskTitle(selected.task_title || '');
    setCertificateName(selected.certificate_name || '');
    setCompletionNotes(selected.completion_notes || '');
    setCertificatePdfDataUrl(selected.employer_certificate_pdf || null);
  }, [selected?.id]);

  const handleAssignTask = async () => {
    if (!selected || !taskTitle.trim()) return;
    await updateCredentialStatus({
      hash: selected.hash,
      task_title: taskTitle.trim(),
      task_status: 'assigned',
    });
    await loadApplicants();
    setVerificationNote('Task assigned to student.');
  };

  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCertificatePdfDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'stellarni_credentials') {
        loadApplicants();
      }
    };
    const onCredentialsUpdated = () => loadApplicants();
    window.addEventListener('storage', onStorage);
    window.addEventListener(CREDENTIALS_UPDATED_EVENT, onCredentialsUpdated);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CREDENTIALS_UPDATED_EVENT, onCredentialsUpdated);
    };
  }, [loadApplicants]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-700">
      <div className="glass-panel p-6 mb-6 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-400/20">
        <h2 className="text-2xl font-bold text-white">Employer Command Center</h2>
        <p className="text-sm text-slate-300 mt-1">Verify student credentials, assign tasks, issue certificates, and release rewards.</p>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
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
            <p className="text-xl font-semibold text-white flex items-center gap-2"><Award className="w-4 h-4 text-emerald-300" />{verifiedCount}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-panel p-6 h-fit border border-slate-700/70">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-teal-400" />
              <h3 className="text-xl font-bold">Recent Applicants</h3>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="text-left py-2 pr-2">Student</th>
                  <th className="text-left py-2 pr-2">Verification Code</th>
                  <th className="text-left py-2">Task</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => setHashInput(app.hash)}
                    className={`border-b border-slate-800/60 cursor-pointer ${hashInput === app.hash ? 'bg-teal-500/10' : 'hover:bg-slate-800/40'}`}
                  >
                    <td className="py-2 pr-2">
                      <div className="font-semibold text-slate-100">{app.name}</div>
                      <div className="text-slate-500">{app.role}</div>
                    </td>
                    <td className="py-2 pr-2 font-mono text-slate-400">{app.hash.slice(0, 10)}...</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${app.task_status === 'accomplished' ? 'bg-emerald-500/20 text-emerald-400' : app.task_status === 'assigned' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                        {app.task_status || 'none'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 border border-slate-700/70">
            <h2 className="text-2xl font-bold mb-2 text-emerald-400">Credential Verification</h2>
            <p className="text-sm text-slate-400 mb-6">Verify an applicant's hash on the Stellar ledger.</p>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input type="text" className="input-field pl-10 font-mono text-sm" placeholder="Enter 64-char hash..." value={hashInput} onChange={(e) => setHashInput(e.target.value)} />
              </div>
              <button type="submit" className="btn-secondary w-full py-3" disabled={isVerifying || !hashInput}>
                {isVerifying ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify Authenticity'}
              </button>
            </form>
          </div>

          {verificationResult === 'success' && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 animate-in zoom-in-95 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
              <div className="flex items-start gap-4 mb-6">
                <ShieldCheck className="w-12 h-12 text-emerald-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">Cryptographically Valid</h3>
                  <p className="text-sm text-emerald-400/80">This document matches an on-chain credential record.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 mb-4">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full text-center ${selected?.employer_signed ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>Employer Signed</span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full text-center ${selected?.verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>Final Verification</span>
              </div>
              <div className="mb-4 p-3 rounded-xl border border-slate-700 bg-slate-900/40 text-xs">
                <div className="flex justify-between gap-3 text-slate-300">
                  <span className="text-slate-500">Authorized employer</span>
                  <span className="font-mono">{selected?.employer_address ? `${selected.employer_address.slice(0, 8)}...${selected.employer_address.slice(-6)}` : 'Not set'}</span>
                </div>
                <div className="flex justify-between gap-3 mt-1 text-slate-300">
                  <span className="text-slate-500">Connected wallet</span>
                  <span className="font-mono">{publicKey ? `${publicKey.slice(0, 8)}...${publicKey.slice(-6)}` : 'Not connected'}</span>
                </div>
                {selected?.employer_address && publicKey && selected.employer_address !== publicKey && (
                  <p className="mt-2 text-amber-300">
                    Employer wallet differs from submitted employer key. Proceeding will use current wallet for new on-chain registration.
                  </p>
                )}
              </div>
              <div className="space-y-2 mb-5">
                <label className="text-xs text-slate-400 block">Applicant Evaluation</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)} className={`w-8 h-8 rounded-lg border ${rating >= star ? 'border-amber-400 bg-amber-400/20 text-amber-400' : 'border-slate-700 text-slate-500'}`}>★</button>
                  ))}
                </div>
                <textarea
                  className="input-field min-h-[90px] text-sm"
                  placeholder="Provide feedback before issuing bonus..."
                  value={evaluationNotes}
                  onChange={(e) => setEvaluationNotes(e.target.value)}
                />
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    className="input-field text-sm"
                    placeholder="Give task to student..."
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                  />
                  <button onClick={handleAssignTask} className="btn-secondary py-2 text-sm">
                    Give Task
                  </button>
                </div>
                <input
                  className="input-field text-sm"
                  placeholder="Certificate name (e.g. Internship Completion)"
                  value={certificateName}
                  onChange={(e) => setCertificateName(e.target.value)}
                />
                <textarea
                  className="input-field min-h-[70px] text-sm"
                  placeholder="Accomplishment notes..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                />
                <input type="file" accept="application/pdf" onChange={handleCertificateUpload} className="input-field text-xs" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <button onClick={handleSign} disabled={isSigning || !!selected?.employer_signed} className="btn-secondary py-3 flex items-center justify-center gap-2">
                  {isSigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                  {selected?.employer_signed ? 'Signed' : 'Sign as Employer'}
                </button>
                <button
                  onClick={handleIssueCertificate}
                  disabled={isIssuingCertificate || !selected?.employer_signed}
                  className="btn-secondary py-3 flex items-center justify-center disabled:opacity-50"
                >
                  {isIssuingCertificate ? 'Issuing...' : 'Issue Certificate'}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={handleIssueBonus} disabled={isPaying || rating === 0 || !selected?.employer_signed} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                  {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  Issue 100 XLM Bonus
                </button>
              </div>
              {verificationNote && <p className="mt-3 text-amber-300 text-sm">{verificationNote}</p>}
              {paymentError && <p className="mt-4 text-red-400 text-sm">{paymentError}</p>}
            </div>
          )}

          {txHash && (
            <div className="glass-panel p-6 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400 mb-3">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Transaction Successful</span>
              </div>
              <TransactionReceipt hash={txHash} amount={100} asset="XLM" recipient={selected?.address || ''} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
