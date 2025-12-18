import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel}></div>
      <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-sm relative z-10 transform transition-all scale-100">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900">{title}</h3>
        </div>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-100 transition-all active:scale-95">Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
