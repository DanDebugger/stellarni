import { ExternalLink, Receipt } from 'lucide-react';
import type { Credential } from '../pages/EmployerDashboard';

interface TransactionHistoryPanelProps {
  credentials: Credential[];
}

export function TransactionHistoryPanel({ credentials }: TransactionHistoryPanelProps) {
  const STELLAR_EXPERT_TX_BASE = 'https://stellar.expert/explorer/testnet/tx/';
  const FALLBACK_TX = '4c20e27447d2562ad6a96f95e9b1189b7d6f0e5873b42a795955045ba88fdac2';

  const txItems = credentials
    .filter((c) => c.reward_tx_hash)
    .map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      tx: c.reward_tx_hash as string,
      date: c.date,
      hash: c.hash,
    }));

  return (
    <div className="glass-panel p-6 border border-slate-700/70 mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
          <Receipt className="w-4 h-4 text-teal-400" />
        </div>
        <h3 className="text-lg font-bold text-white">Transaction History</h3>
        <span className="ml-auto text-xs text-slate-500">{txItems.length} transaction{txItems.length !== 1 ? 's' : ''}</span>
      </div>

      {txItems.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-700 rounded-xl">
          <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 mb-2">No reward transactions yet.</p>
          <a
            href={`${STELLAR_EXPERT_TX_BASE}${FALLBACK_TX}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
          >
            View sample transaction on StellarExpert <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="stellarni-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Transaction Hash</th>
                <th>Explorer</th>
              </tr>
            </thead>
            <tbody>
              {txItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="font-medium text-slate-200">{item.name}</div>
                    <div className="text-slate-500 text-[10px]">{item.role}</div>
                  </td>
                  <td className="text-slate-400">{item.date}</td>
                  <td>
                    <span className="text-emerald-400 font-semibold">100 XLM</span>
                  </td>
                  <td>
                    <span className="font-mono text-slate-400 text-[10px]">
                      {item.tx.slice(0, 12)}...{item.tx.slice(-8)}
                    </span>
                  </td>
                  <td>
                    <a
                      href={`${STELLAR_EXPERT_TX_BASE}${item.tx}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 text-xs"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
