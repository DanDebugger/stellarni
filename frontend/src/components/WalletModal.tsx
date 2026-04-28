import { Wallet, X, Loader2, ArrowRight } from 'lucide-react';

const WALLET_OPTIONS = [
  { id: 'albedo', name: 'Albedo', icon: 'A', available: false },
  { id: 'ledger', name: 'Ledger', icon: 'L', available: false },
  { id: 'xbull', name: 'xBull', icon: 'X', available: false },
  { id: 'freighter', name: 'Freighter', icon: 'F', available: true },
  { id: 'lobstr', name: 'LOBSTR', icon: 'O', available: false },
  { id: 'rabet', name: 'Rabet', icon: 'R', available: false },
];

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect: (walletId: string) => void;
  isConnecting: boolean;
  error: string | null;
  message?: string;
}

export function WalletModal({ isOpen, onClose, onWalletSelect, isConnecting, error, message }: WalletModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            Connect a Wallet
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <p className="text-sm text-slate-400 mb-4">
            {message || "Select a Stellar wallet provider to connect to Stellarni."}
          </p>

          {WALLET_OPTIONS.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => onWalletSelect(wallet.id)}
              disabled={!wallet.available || isConnecting}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                wallet.available
                  ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-700 hover:border-emerald-500/50 group cursor-pointer'
                  : 'bg-slate-900/50 border-slate-800/50 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  wallet.available ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-900' : 'bg-slate-800 text-slate-500'
                }`}>
                  {wallet.icon}
                </div>
                <span className={`font-semibold ${wallet.available ? 'text-white' : 'text-slate-400'}`}>
                  {wallet.name}
                </span>
              </div>
              
              {wallet.available ? (
                isConnecting && wallet.id === 'freighter' ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                )
              ) : (
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-slate-800 text-slate-500 rounded-md">
                  Not Available
                </span>
              )}
            </button>
          ))}

          {error && (
            <div className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center animate-pulse">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
