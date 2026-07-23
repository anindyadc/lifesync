import React, { useEffect, useRef, useState } from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  const [busy, setBusy] = useState(false);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const cancelRef = useRef(null);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) setBusy(false);
  }

  useEffect(() => {
    if (isOpen) cancelRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setBusy(true);
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-modal-title" className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
