import { useState, useEffect, useCallback } from 'react';
import { Upload, Loader2, CheckCircle2, User, Save, FileCheck, Building2, School } from 'lucide-react';
import { hashFile } from '../utils/hash';
import { useFreighter } from '../hooks/useFreighter';
import { usePersistentState } from '../hooks/usePersistentState';
import { fetchCredentials, createCredential } from '../utils/credentialsApi';
import type { Credential } from './EmployerDashboard';

export function StudentDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { publicKey } = useFreighter();

  const [registeredCredentials, setRegisteredCredentials] = useState<Credential[]>([]);

  const loadCredentials = useCallback(async () => {
    try {
      const creds = await fetchCredentials();
      const mine = publicKey ? creds.filter((c) => c.address === publicKey) : creds;
      setRegisteredCredentials(mine);
    } catch (e) {
      console.warn('Failed to load credentials:', e);
    }
  }, [publicKey]);

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
  const [employerAddress, setEmployerAddress] = useState(() => localStorage.getItem('stellarni_last_employer_wallet') || '');
  const [institutionAddress, setInstitutionAddress] = useState('');

  useEffect(() => {
    const rememberedEmployer = localStorage.getItem('stellarni_last_employer_wallet') || '';
    if (!employerAddress.trim() && rememberedEmployer) {
      setEmployerAddress(rememberedEmployer);
    }
  }, [employerAddress]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      const fileHash = await hashFile(selected);
      setHash(fileHash);
      setSuccess(false);
    }
  };

  const handleRegister = async () => {
    if (!hash || !publicKey) return;
    setIsRegistering(true);
    setError(null);
    
    try {
      const rememberedEmployer = localStorage.getItem('stellarni_last_employer_wallet') || '';
      // Keep submission smooth: prefer typed employer, then remembered employer wallet,
      // and finally current wallet so records can still be created.
      const resolvedEmployer = employerAddress.trim() || rememberedEmployer || publicKey;
      const resolvedInstitution = institutionAddress.trim() || resolvedEmployer;
      await createCredential({
        name: profile.name || 'Unnamed Applicant',
        role: profile.jobPreference || 'Applicant',
        hash: hash,
        date: new Date().toISOString().split('T')[0],
        address: publicKey,
        employer_address: resolvedEmployer,
        institution_address: resolvedInstitution,
      });
      await loadCredentials();
      setSuccess(true);
      setFile(null);
      setHash(null);
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

  const approvedCount = registeredCredentials.filter((c) => c.verified || (c.employer_signed && c.institution_signed)).length;
  const pendingCount = registeredCredentials.length - approvedCount;
  const rewardsEarnedXlm = registeredCredentials.filter((c) => c.verified).length * 100;

  return (
    <div className="w-full grid lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="lg:col-span-1 space-y-6">
        <div className="glass-panel p-6 h-fit">
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

          <div className="pt-4 border-t border-slate-700 space-y-2 text-sm text-slate-300">
            <div className="flex justify-between"><span className="text-slate-500">Pending Review</span><span className="font-medium text-amber-400">{pendingCount}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Approved Credentials</span><span className="font-medium text-emerald-400">{approvedCount}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Rewards Earned</span><span className="font-medium text-white">{rewardsEarnedXlm} XLM</span></div>
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Target Parties</h3>
          <div className="space-y-3">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input className="input-field pl-10 text-xs font-mono" placeholder="Employer Public Key (optional, auto-fill supported)" value={employerAddress} onChange={(e) => setEmployerAddress(e.target.value)} />
            </div>
            <div className="relative">
              <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input className="input-field pl-10 text-xs font-mono" placeholder="Institution Public Key (optional)" value={institutionAddress} onChange={(e) => setInstitutionAddress(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 text-center">
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
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">SHA-256 Proof</p>
                <p className="text-xs font-mono text-emerald-400 break-all">{hash}</p>
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

          <div className="glass-panel p-6">
            <h3 className="font-bold mb-4">Verification Timeline</h3>
            <div className="space-y-3">
              {registeredCredentials.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-700 rounded-xl">
                  No credentials yet. Upload your first certificate.
                </div>
              ) : (
                registeredCredentials.map((c) => {
                  const approved = c.verified || (c.employer_signed && c.institution_signed);
                  return (
                    <div key={c.id} className="p-4 bg-slate-800/40 border border-slate-700 rounded-xl">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-mono text-slate-400">{c.hash.slice(0, 16)}...</span>
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${approved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {approved ? 'Approved' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${c.employer_signed ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-500'}`}>Employer Signed</span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${c.institution_signed ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-500'}`}>University Signed</span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${c.verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>Final Verification</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
      </div>
    </div>
  );
}
