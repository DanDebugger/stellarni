import { useState } from 'react';
import { LogIn, ArrowRight, UserPlus } from 'lucide-react';
import { useFreighter } from '../hooks/useFreighter';
import { WalletModal } from '../components/WalletModal';

interface AuthPageProps {
  onLoginSuccess: (token: string) => void;
}

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const { connect } = useFreighter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleWalletConnect = async (walletId: string) => {
    if (walletId !== 'freighter') return;
    setIsConnecting(true);
    setError(null);
    try {
      const pubKey = await connect();
      if (!pubKey) throw new Error("Wallet not connected");
      const res = await fetch('http://127.0.0.1:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_key: pubKey }),
      });
      const data = await res.json();
      onLoginSuccess(data.token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="w-full max-w-md glass-panel p-8 space-y-8">
      <div className="text-center">
        {mode === 'signin' ? (
          <LogIn className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        ) : (
          <UserPlus className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        )}
        <h2 className="text-3xl font-bold">{mode === 'signin' ? 'Sign In to Stellarni' : 'Create Your Account'}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setMode('signin')} className={`p-3 rounded-xl border-2 text-sm font-semibold ${mode === 'signin' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-300'}`}>
          Sign In
        </button>
        <button onClick={() => setMode('signup')} className={`p-3 rounded-xl border-2 text-sm font-semibold ${mode === 'signup' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-300'}`}>
          Sign Up
        </button>
      </div>
      <p className="text-xs text-slate-400 text-center">
        {mode === 'signin'
          ? 'Sign in with your wallet to continue.'
          : 'Sign up with your wallet. Role selection appears after authentication.'}
      </p>
      <button onClick={() => setShowWalletModal(true)} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
        {mode === 'signin' ? 'Continue to Sign In' : 'Continue to Sign Up'} <ArrowRight className="w-4 h-4" />
      </button>
      <WalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} onWalletSelect={handleWalletConnect} isConnecting={isConnecting} error={error} />
    </div>
  );
}
