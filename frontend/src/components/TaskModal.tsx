import { useState } from 'react';
import { X, ClipboardCheck, Send, CheckCircle2 } from 'lucide-react';
import type { Credential } from '../pages/EmployerDashboard';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  credential: Credential | null;
  onAssignTask: (hash: string, taskTitle: string) => Promise<void>;
}

export function TaskModal({ isOpen, onClose, credential, onAssignTask }: TaskModalProps) {
  const [taskTitle, setTaskTitle] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assigned, setAssigned] = useState(false);

  if (!isOpen || !credential) return null;

  const handleAssign = async () => {
    if (!taskTitle.trim()) return;
    setIsAssigning(true);
    try {
      await onAssignTask(credential.hash, taskTitle.trim());
      setAssigned(true);
      setTimeout(() => {
        setAssigned(false);
        setTaskTitle('');
        onClose();
      }, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAssigning(false);
    }
  };

  const hasTask = !!credential.task_title;
  const isDone = credential.task_status === 'accomplished';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4 text-blue-400" />
            </div>
            Task Assignment
          </h3>
          <button onClick={onClose} className="modal-close-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student info */}
        <div className="p-3 rounded-xl border border-slate-700/80 bg-slate-900/40 mb-5">
          <p className="text-xs text-slate-500 mb-1">Assigning task to</p>
          <p className="text-sm font-semibold text-white">{credential.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{credential.role}</p>
        </div>

        {/* Current task status */}
        {hasTask && (
          <div className="mb-5 p-3 rounded-xl border border-slate-700/80 bg-slate-900/40">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-bold uppercase">Current Task</p>
              <span className={`status-badge ${isDone ? 'status-badge-success' : 'status-badge-info'}`}>
                {isDone ? 'Accomplished' : 'Assigned'}
              </span>
            </div>
            <p className="text-sm text-slate-200">{credential.task_title}</p>
            {credential.completion_notes && (
              <p className="text-xs text-slate-400 mt-2 italic">"{credential.completion_notes}"</p>
            )}
          </div>
        )}

        {/* New task input */}
        {!isDone && (
          <div className="space-y-3">
            <label className="text-xs text-slate-400 font-medium block">
              {hasTask ? 'Update Task' : 'New Task Title'}
            </label>
            <input
              className="input-field text-sm"
              placeholder="e.g. Build responsive portfolio page..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <button
              onClick={handleAssign}
              disabled={isAssigning || !taskTitle.trim() || assigned}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {assigned ? (
                <><CheckCircle2 className="w-4 h-4" /> Task Assigned!</>
              ) : isAssigning ? (
                'Assigning...'
              ) : (
                <><Send className="w-4 h-4" /> Assign Task</>
              )}
            </button>
          </div>
        )}

        {isDone && (
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-emerald-300 font-medium">Task completed by student</p>
            <p className="text-xs text-slate-400 mt-1">You can now issue a certificate and reward.</p>
          </div>
        )}
      </div>
    </div>
  );
}
