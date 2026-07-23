import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, busy, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={busy ? undefined : onCancel}></div>
      <div role="dialog" aria-modal="true" aria-labelledby="ww-confirm-modal-title" className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-sm relative z-10 transform transition-all scale-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle size={24} />
          </div>
          <h3 id="ww-confirm-modal-title" className="text-xl font-black text-slate-900">{title}</h3>
        </div>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={busy} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={handleConfirm} disabled={busy} className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-100 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2">
            {busy && <Loader2 size={16} className="animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
