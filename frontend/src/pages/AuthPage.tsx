import { useState } from 'react';
import { LogIn, ArrowRight } from 'lucide-react';
import { signInLocalUser, signInWithGoogle, signUpLocalUser } from '../utils/localUserAuth';

const GOOGLE_CLIENT_ID = '451240191495-v37uum6g5edhjjii6h77gri1gbmfmcb0.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface AuthPageProps {
  onLoginSuccess: (token: string) => void;
}

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        signUpLocalUser(email, password);
      } else {
        signInLocalUser(email, password);
      }
      const token = `local_auth_${email.trim().toLowerCase()}_${Date.now()}`;
      onLoginSuccess(token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseJwtEmail = (credential: string): string | null => {
    try {
      const payload = credential.split('.')[1];
      if (!payload) return null;
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(base64));
      return typeof decoded.email === 'string' ? decoded.email : null;
    } catch {
      return null;
    }
  };

  const loadGoogleScript = async () => {
    if (window.google?.accounts?.id) return;
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="1"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = '1';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google script'));
      document.head.appendChild(script);
    });
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await loadGoogleScript();
      if (!window.google?.accounts?.id) {
        throw new Error('Google Auth SDK unavailable.');
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          try {
            if (!response.credential) throw new Error('Google authentication failed.');
            const email = parseJwtEmail(response.credential);
            if (!email) throw new Error('Could not read Google account email.');
            signInWithGoogle(email);
            const token = `local_google_${email}_${Date.now()}`;
            onLoginSuccess(token);
          } catch (e: any) {
            setError(e?.message || 'Google sign-in failed.');
          } finally {
            setIsSubmitting(false);
          }
        },
      });
      window.google.accounts.id.prompt();
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md glass-panel p-8 space-y-8">
      <div className="text-center">
        <LogIn className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-3xl font-bold">{mode === 'signin' ? 'Sign In to Stellarni' : 'Create Account'}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setMode('signin')} className={`p-3 rounded-xl border-2 text-sm font-semibold ${mode === 'signin' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-300'}`}>
          Log In
        </button>
        <button onClick={() => setMode('signup')} className={`p-3 rounded-xl border-2 text-sm font-semibold ${mode === 'signup' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-300'}`}>
          Sign Up
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          className="input-field"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="input-field"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {mode === 'signup' && (
          <input
            type="password"
            className="input-field"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        )}
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Log In' : 'Create Account'} <ArrowRight className="w-4 h-4" />
        </button>
      </form>
      <div className="pt-2">
        <button onClick={handleGoogleAuth} disabled={isSubmitting} className="btn-secondary w-full py-3 text-sm disabled:opacity-60">
          Continue with Google
        </button>
        <p className="text-[11px] text-slate-500 text-center mt-2">
          Google auth enabled for MVP client-side login.
        </p>
      </div>
      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
          {error}
        </div>
      )}
    </div>
  );
}
