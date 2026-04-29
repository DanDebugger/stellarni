import { useState, useEffect, useCallback } from 'react';
import { WalletConnect } from './components/WalletConnect';
import { StudentDashboard } from './pages/StudentDashboard';
import { EmployerDashboard } from './pages/EmployerDashboard';
import { AuthPage } from './pages/AuthPage';
import { RoleSelection } from './pages/RoleSelection';
import { LogOut, Loader2 } from 'lucide-react';
import { usePersistentState } from './hooks/usePersistentState';
import { useFreighter } from './hooks/useFreighter';
import { clearCurrentUser } from './utils/localUserAuth';

type ViewState = 'auth' | 'role' | 'student' | 'employer';

function getHashView(): ViewState | null {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (hash === 'role') return 'role';
  if (hash === 'student' || hash === 'employer') return hash;
  return null;
}

function setHashView(view: ViewState) {
  if (view === 'auth') {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
    return;
  }
  window.history.replaceState(null, '', `#${view}`);
}

function App() {
  const [jwt, setJwt] = usePersistentState<string | null>('stellarni_jwt', null);
  const [view, setViewRaw] = useState<ViewState>(getHashView() ?? 'auth');
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const { disconnect } = useFreighter();

  const setView = useCallback((next: ViewState) => {
    setViewRaw(next);
    setHashView(next);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hv = getHashView();
      if (hv) setViewRaw(hv);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!jwt) {
      setView('auth');
      setIsVerifyingSession(false);
      return;
    }
    const hashView = getHashView();
    if (hashView && hashView !== 'auth') {
      setView(hashView);
      setIsVerifyingSession(false);
      return;
    }
    const savedRole = localStorage.getItem('stellarni_role');
    if (savedRole === 'employer' || savedRole === 'student') {
      setView(savedRole);
    } else {
      setView('role');
    }
    setIsVerifyingSession(false);
  }, [jwt, setJwt]);

  const handleLoginSuccess = (token: string) => {
    setJwt(token);
    const hashView = getHashView();
    if (hashView && hashView !== 'auth' && hashView !== 'role') {
      setView(hashView);
      return;
    }
    setView('role');
  };

  const handleLogout = async () => {
    await disconnect();
    clearCurrentUser();
    localStorage.removeItem('stellarni_role');
    setJwt(null);
    setView('auth');
    window.history.replaceState(null, '', window.location.pathname);
  };

  if (isVerifyingSession) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      {view !== 'auth' && (
        <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
            <button className="text-2xl font-bold text-white hover:text-emerald-400 transition-colors" onClick={() => setView('student')}>Stellarni</button>
            <div className="flex items-center gap-6">
              <WalletConnect />
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 flex items-center gap-2 text-sm">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </nav>
      )}
      <main className="flex-1 p-6 relative z-10 w-full max-w-6xl mx-auto flex items-center justify-center">
        {view === 'auth' && <AuthPage onLoginSuccess={handleLoginSuccess} />}
        {view === 'role' && (
          <RoleSelection
            onSelectRole={(role) => {
              const normalized = role === 'employer' ? 'employer' : 'student';
              localStorage.setItem('stellarni_role', normalized);
              setView(normalized);
            }}
          />
        )}
        {view === 'student' && <StudentDashboard />}
        {view === 'employer' && <EmployerDashboard />}
      </main>
    </div>
  );
}

export default App;
