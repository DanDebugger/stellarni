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
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#101217] border border-slate-700/70 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        <div className="flex items-center justify-end p-4 border-b border-slate-800/80">
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-800/80 space-y-8">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Wallet className="w-6 h-6 text-emerald-400" />
              Learn more
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-semibold text-slate-100 mb-2">What is a Wallet?</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Wallets are used to send, receive, and store the keys you use to sign blockchain transactions.
                </p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-100 mb-2">What is Stellar?</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Stellar is a decentralized, public blockchain that helps developers build fast and affordable financial experiences.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 max-h-[65vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-bold text-white mb-5">Connect a Wallet</h3>
            <p className="text-sm text-slate-400 mb-5">
              {message || 'Select a Stellar wallet provider to connect to Stellarni.'}
            </p>

            <div className="space-y-2">
              {WALLET_OPTIONS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => onWalletSelect(wallet.id)}
                  disabled={!wallet.available || isConnecting}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    wallet.available
                      ? 'hover:bg-slate-800/70 group cursor-pointer'
                      : 'opacity-70 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      wallet.available ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-900' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {wallet.icon}
                    </div>
                    <span className={`font-medium ${wallet.available ? 'text-white' : 'text-slate-500'}`}>
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
                    <span className="text-[10px] font-semibold px-2 py-0.5 border border-slate-600 text-slate-400 rounded-full">
                      Not available
                    </span>
                  )}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
