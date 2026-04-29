import { useState, useEffect, useCallback } from 'react';
import { Upload, Loader2, CheckCircle2, User, Save, FileCheck, Eye, X } from 'lucide-react';
import { hashFile } from '../utils/hash';
import { useFreighter } from '../hooks/useFreighter';
import { usePersistentState } from '../hooks/usePersistentState';
import { CREDENTIALS_UPDATED_EVENT, fetchCredentials, createCredential, updateCredentialStatus } from '../utils/credentialsApi';
import type { Credential } from './EmployerDashboard';

export function StudentDashboard() {
  const STELLAR_EXPERT_TX_BASE = 'https://stellar.expert/explorer/testnet/tx/';
  const FALLBACK_TX = '4c20e27447d2562ad6a96f95e9b1189b7d6f0e5873b42a795955045ba88fdac2';
  const [activeTab, setActiveTab] = useState<'profile' | 'register' | 'timeline' | 'certificates'>('register');
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);
  const [finishingHash, setFinishingHash] = useState<string | null>(null);
  const [finishingCredential, setFinishingCredential] = useState<Credential | null>(null);
  const [accomplishmentDraft, setAccomplishmentDraft] = useState('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [viewingCredential, setViewingCredential] = useState<Credential | null>(null);
  const { publicKey } = useFreighter();

  const [registeredCredentials, setRegisteredCredentials] = useState<Credential[]>([]);

  const loadCredentials = useCallback(async () => {
    try {
      const creds = await fetchCredentials();
      // MVP: show dashboard records in table immediately (including mock data)
      setRegisteredCredentials(creds);
    } catch (e) {
      console.warn('Failed to load credentials:', e);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
    const interval = setInterval(loadCredentials, 5000);
    return () => clearInterval(interval);
  }, [loadCredentials]);

  const [profile, setProfile] = usePersistentState('stellarni_student_profile', {
    name: '',
    jobPreference: '',
    bio: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(!profile.name);
  const [tempProfile, setTempProfile] = useState(profile);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      const preview = URL.createObjectURL(selected);
      setPdfPreviewUrl(preview);
      const fileHash = await hashFile(selected);
      setHash(fileHash);
      setSuccess(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  const handleRegister = async () => {
    if (!hash || !publicKey) return;
    setIsRegistering(true);
    setError(null);
    
    try {
      const rememberedEmployer = localStorage.getItem('stellarni_last_employer_wallet') || '';
      const resolvedEmployer = rememberedEmployer || publicKey;
      await createCredential({
        name: profile.name || 'Unnamed Applicant',
        role: profile.jobPreference || 'Applicant',
        hash: hash,
        date: new Date().toISOString().split('T')[0],
        address: publicKey,
        employer_address: resolvedEmployer,
        institution_address: resolvedEmployer,
      });
      await loadCredentials();
      setSuccess(true);
      setFile(null);
      setHash(null);
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
      setPdfPreviewUrl(null);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Registration failed.');
    } finally {
      setIsRegistering(false);
    }
  };

  const saveProfile = () => {
    setProfile(tempProfile);
    setIsEditingProfile(false);
  };

  const handleFinishTask = async (credential: Credential) => {
    if (credential.task_status !== 'assigned') return;
    setFinishingHash(credential.hash);
    setTaskMessage(null);
    try {
      await updateCredentialStatus({
        hash: credential.hash,
        task_status: 'accomplished',
        completion_notes: accomplishmentDraft.trim() || credential.completion_notes || 'Student marked this task as completed.',
      });
      await loadCredentials();
      setTaskMessage('Task marked as finished. Employer can now issue certificate and reward.');
      setFinishingCredential(null);
      setAccomplishmentDraft('');
    } catch (e) {
      console.error(e);
      setTaskMessage('Failed to update task status. Please try again.');
    } finally {
      setFinishingHash(null);
    }
  };

  const approvedCount = registeredCredentials.filter((c) => c.verified || c.employer_signed).length;
  const pendingCount = registeredCredentials.length - approvedCount;
  const rewardsEarnedXlm = registeredCredentials.filter((c) => c.verified).length * 100;
  const issuedCertificates = registeredCredentials.filter((c) => c.certificate_name || c.employer_certificate_pdf);
  const rewardTransactions = registeredCredentials
    .filter((c) => c.reward_tx_hash)
    .map((c) => ({ id: c.id, name: c.name, tx: c.reward_tx_hash as string, date: c.date }));

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'stellarni_credentials') {
        loadCredentials();
      }
    };
    const onCredentialsUpdated = () => loadCredentials();
    window.addEventListener('storage', onStorage);
    window.addEventListener(CREDENTIALS_UPDATED_EVENT, onCredentialsUpdated);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CREDENTIALS_UPDATED_EVENT, onCredentialsUpdated);
    };
  }, [loadCredentials]);

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="glass-panel p-6 mb-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-400/20">
        <h2 className="text-2xl font-bold text-white">Student Workspace</h2>
        <p className="text-sm text-slate-300 mt-1">Submit credentials, complete assigned tasks, and track issued certificates.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
      <aside className="lg:col-span-3 glass-panel p-4 h-fit border border-slate-700/70">
        <div className="px-2 py-3 border-b border-slate-700 mb-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Student Workspace</p>
          <p className="text-sm font-semibold text-slate-100">{profile.name || 'Student'}</p>
        </div>
        <div className="space-y-1">
          <button onClick={() => setActiveTab('profile')} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeTab === 'profile' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-slate-800/50'}`}>Profile</button>
          <button onClick={() => setActiveTab('register')} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeTab === 'register' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-slate-800/50'}`}>Register Credential</button>
          <button onClick={() => setActiveTab('timeline')} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeTab === 'timeline' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-slate-800/50'}`}>Verification Timeline</button>
          <button onClick={() => setActiveTab('certificates')} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${activeTab === 'certificates' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-300 hover:bg-slate-800/50'}`}>Certificates Issued</button>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700 space-y-2 text-xs text-slate-300">
          <div className="flex justify-between"><span className="text-slate-500">Pending</span><span className="font-medium text-amber-400">{pendingCount}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Approved</span><span className="font-medium text-emerald-400">{approvedCount}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Rewards</span><span className="font-medium text-white">{rewardsEarnedXlm} XLM</span></div>
        </div>
      </aside>

      <div className="lg:col-span-9 space-y-6">
        {activeTab === 'profile' && (
          <div className="glass-panel p-6 border border-slate-700/70">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                Student Profile
              </h2>
              <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-xs text-emerald-400 hover:underline">
                {isEditingProfile ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {isEditingProfile ? (
              <div className="space-y-4">
                <input className="input-field" placeholder="Full Name" value={tempProfile.name} onChange={e => setTempProfile({...tempProfile, name: e.target.value})} />
                <input className="input-field" placeholder="Desired Role" value={tempProfile.jobPreference} onChange={e => setTempProfile({...tempProfile, jobPreference: e.target.value})} />
                <textarea className="input-field min-h-[100px]" placeholder="Bio..." value={tempProfile.bio} onChange={e => setTempProfile({...tempProfile, bio: e.target.value})} />
                <button onClick={saveProfile} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Save Profile
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 font-bold">Name</p>
                  <p className="text-lg font-semibold">{profile.name || 'Not set'}</p>
                  <p className="text-sm text-emerald-400">{profile.jobPreference || 'No role set yet'}</p>
                </div>
                <p className="text-sm text-slate-400">"{profile.bio || 'No bio provided yet.'}"</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'register' && (
          <div className="glass-panel p-8 text-center border border-slate-700/70">
            <h2 className="text-2xl font-bold mb-2 text-emerald-400">Register New Credential</h2>
            <p className="text-sm text-slate-400 mb-2">Upload and submit for employer review. Student pays nothing.</p>
            <p className="text-xs text-slate-500 mb-6">Employer handles on-chain registration, signing, and reward payment.</p>
            <div className="mb-8">
              <label className="group relative block cursor-pointer">
                <div className="w-24 h-24 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-emerald-500/30">
                  <Upload className="w-10 h-10 text-emerald-400" />
                </div>
                <input type="file" className="hidden" onChange={handleFileChange} />
                <p className="text-slate-200 font-medium">{file ? file.name : 'Choose PDF Certificate'}</p>
              </label>
            </div>

            {hash && (
              <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Verification Code (SHA-256)</p>
                <p className="text-xs font-mono text-emerald-400 break-all">{hash}</p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Same file = same code. Different files generate different codes.
                </p>
              </div>
            )}
            {pdfPreviewUrl && (
              <div className="mb-6 p-3 bg-slate-900/50 rounded-xl border border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">PDF Preview</p>
                <iframe src={pdfPreviewUrl} className="w-full h-56 rounded-lg border border-slate-700" title="Student PDF Preview" />
              </div>
            )}

            <button onClick={handleRegister} disabled={!hash || isRegistering} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
              {isRegistering ? <Loader2 className="animate-spin w-5 h-5" /> : (
                <><FileCheck className="w-5 h-5" /> Submit for Review</>
              )}
            </button>

            {success && (
              <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" /> Registered!
              </div>
            )}
            {error && <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="glass-panel p-6 border border-slate-700/70">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Verification Timeline</h3>
            </div>
            {taskMessage && (
              <div className="mb-4 p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-200 text-xs">
                {taskMessage}
              </div>
            )}
            <div className="overflow-x-auto">
              {registeredCredentials.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-700 rounded-xl">
                  No credentials yet. Upload your first certificate.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left py-2 pr-2">Student</th>
                      <th className="text-left py-2 pr-2">Verification Code</th>
                      <th className="text-left py-2 pr-2">Status</th>
                      <th className="text-left py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredCredentials.map((c) => {
                      const approved = c.verified || c.employer_signed;
                      const taskAssigned = c.task_status === 'assigned';
                      const taskDone = c.task_status === 'accomplished';
                      return (
                        <tr key={c.id} className="border-b border-slate-800/60">
                          <td className="py-2 pr-2 text-slate-100 font-medium">{c.name}</td>
                          <td className="py-2 pr-2 font-mono text-slate-400">{c.hash.slice(0, 12)}...</td>
                          <td className="py-2 pr-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${approved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {approved ? 'Approved' : 'Pending'}
                            </span>
                            {(taskAssigned || taskDone) && (
                              <span className={`ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full ${taskDone ? 'bg-blue-500/20 text-blue-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                                {taskDone ? 'Task Finished' : 'Task Assigned'}
                              </span>
                            )}
                          </td>
                          <td className="py-2">
                            <div className="flex items-center gap-3">
                              <button onClick={() => setViewingCredential(c)} className="text-emerald-300 hover:text-emerald-200 flex items-center gap-1">
                                <Eye className="w-3 h-3" /> View
                              </button>
                              {taskAssigned && (
                                <button
                                  onClick={() => {
                                    setFinishingCredential(c);
                                    setAccomplishmentDraft(c.completion_notes || '');
                                  }}
                                  disabled={finishingHash === c.hash}
                                  className="text-blue-300 hover:text-blue-200 disabled:opacity-60"
                                >
                                  {finishingHash === c.hash ? 'Finishing...' : 'Finish Task'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="glass-panel p-6 border border-slate-700/70">
            <h3 className="font-bold mb-4">Certificates Issued</h3>
            {issuedCertificates.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-8 border border-dashed border-slate-700 rounded-xl">
                No certificate issued yet. Finish assigned tasks and wait for employer approval.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {issuedCertificates.map((cert) => (
                  <div key={cert.id} className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                    <p className="text-xs text-slate-500 mb-1">Certificate Name</p>
                    <p className="font-semibold text-slate-100">{cert.certificate_name || 'Pending name'}</p>
                    <p className="text-xs text-slate-500 mt-3 mb-1">Accomplishment</p>
                    <p className="text-sm text-slate-300 line-clamp-3">{cert.completion_notes || 'Pending accomplishment notes'}</p>
                    <button onClick={() => setViewingCredential(cert)} className="mt-4 text-emerald-300 hover:text-emerald-200 text-sm">
                      View Full Certificate
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 pt-5 border-t border-slate-700">
              <h4 className="text-sm font-semibold text-slate-100 mb-3">Transaction History</h4>
              {rewardTransactions.length === 0 ? (
                <a
                  href={`${STELLAR_EXPERT_TX_BASE}${FALLBACK_TX}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-sm text-emerald-300 hover:text-emerald-200"
                >
                  View sample transaction history on StellarExpert
                </a>
              ) : (
                <div className="space-y-2">
                  {rewardTransactions.map((item) => (
                    <a
                      key={item.id}
                      href={`${STELLAR_EXPERT_TX_BASE}${item.tx}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 hover:border-emerald-500/40"
                    >
                      <p className="text-xs text-slate-500">{item.name} • {item.date}</p>
                      <p className="text-xs font-mono text-emerald-300 break-all">{item.tx}</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>

      {viewingCredential && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Credential Details</h3>
              <button onClick={() => setViewingCredential(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <p><span className="text-slate-500">Student:</span> {viewingCredential.name}</p>
              <p><span className="text-slate-500">Verification Code:</span> <span className="font-mono">{viewingCredential.hash}</span></p>
              <p><span className="text-slate-500">Task:</span> {viewingCredential.task_title || 'No task assigned yet'}</p>
              <p><span className="text-slate-500">Accomplishment:</span> {viewingCredential.completion_notes || 'No accomplishment notes yet'}</p>
              <p><span className="text-slate-500">Certificate Name:</span> {viewingCredential.certificate_name || 'Not issued yet'}</p>
              <p>
                <span className="text-slate-500">Transaction:</span>{' '}
                {viewingCredential.reward_tx_hash ? (
                  <a
                    href={`${STELLAR_EXPERT_TX_BASE}${viewingCredential.reward_tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-emerald-300 hover:text-emerald-200 break-all"
                  >
                    {viewingCredential.reward_tx_hash}
                  </a>
                ) : (
                  <a
                    href={`${STELLAR_EXPERT_TX_BASE}${FALLBACK_TX}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-300 hover:text-emerald-200"
                  >
                    View sample history
                  </a>
                )}
              </p>
            </div>
            {viewingCredential.employer_certificate_pdf && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2 uppercase font-bold">Issued Certificate PDF</p>
                <iframe src={viewingCredential.employer_certificate_pdf} className="w-full h-64 rounded-lg border border-slate-700" title="Issued Certificate Preview" />
              </div>
            )}
          </div>
        </div>
      )}

      {finishingCredential && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Finish Task</h3>
              <button
                onClick={() => {
                  setFinishingCredential(null);
                  setAccomplishmentDraft('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Add your accomplishment details so employer can issue your certificate.
            </p>
            <textarea
              className="input-field min-h-[110px] text-sm"
              placeholder="Describe what you accomplished..."
              value={accomplishmentDraft}
              onChange={(e) => setAccomplishmentDraft(e.target.value)}
            />
            <button
              onClick={() => handleFinishTask(finishingCredential)}
              disabled={finishingHash === finishingCredential.hash}
              className="btn-primary w-full mt-4"
            >
              {finishingHash === finishingCredential.hash ? 'Saving...' : 'Confirm Finish Task'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
