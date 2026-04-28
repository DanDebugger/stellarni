import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { useFreighter } from '../hooks/useFreighter';
import { WalletModal } from './WalletModal';

export function WalletConnect() {
  const { publicKey, connect, disconnect, error, isConnecting: isAutoConnecting } = useFreighter();
  const [showModal, setShowModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const shortenAddress = (addr: string) => 
    `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;

  const handleWalletSelect = async (walletId: string) => {
    if (walletId !== 'freighter') return;
    setIsConnecting(true);
    setLocalError(null);
    try {
      await connect();
      setShowModal(false);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setLocalError(e.message);
      } else {
        setLocalError("Failed to connect wallet");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-end">
        {publicKey ? (
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {shortenAddress(publicKey)}
            </div>
            <button onClick={disconnect} className="btn-secondary text-sm px-3 py-1.5">
              Disconnect
            </button>
          </div>
        ) : (
          isAutoConnecting ? (
            <div className="px-3 py-1.5 bg-slate-800/70 border border-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Auto connecting...
            </div>
          ) : (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          )
        )}
        {error && <span className="text-red-400 text-xs mt-1">{error}</span>}
      </div>

      <WalletModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onWalletSelect={handleWalletSelect}
        isConnecting={isConnecting}
        error={localError}
      />
    </>
  );
}
