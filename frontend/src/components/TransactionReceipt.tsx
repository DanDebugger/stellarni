import { CheckCircle2, ExternalLink, Activity } from 'lucide-react';
import { NETWORK } from '../contracts/config';

interface TransactionReceiptProps {
  hash: string;
  amount: number;
  asset: string;
  recipient: string;
}

export function TransactionReceipt({ hash, amount, asset, recipient }: TransactionReceiptProps) {
  const shortHash = `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  const shortRecipient = `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;
  
  const explorerUrl = NETWORK === 'testnet' 
    ? `https://stellar.expert/explorer/testnet/tx/${hash}`
    : `https://stellar.expert/explorer/public/tx/${hash}`;

  return (
    <div className="bg-slate-800/80 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl shadow-emerald-500/10 animate-in zoom-in-95 duration-500 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Transaction Successful</h3>
            <p className="text-sm text-emerald-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Settled on Soroban
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400 font-medium">Status</span>
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-md font-medium">Confirmed</span>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400 font-medium">Transaction Hash</span>
            <span className="text-slate-200 font-mono bg-slate-900 px-2 py-1 rounded">{shortHash}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400 font-medium">Amount Transferred</span>
            <span className="text-white font-bold text-base">{amount} {asset}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400 font-medium">Recipient</span>
            <span className="text-slate-200 font-mono bg-slate-900 px-2 py-1 rounded">{shortRecipient}</span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-slate-400 font-medium">Network</span>
            <span className="text-slate-200 capitalize">{NETWORK}</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700">
          <a 
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-slate-900 hover:bg-slate-950 border border-slate-700 rounded-xl text-slate-300 font-medium flex items-center justify-center gap-2 transition-all group"
          >
            View on Stellar Expert
            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </a>
        </div>
      </div>
    </div>
  );
}
